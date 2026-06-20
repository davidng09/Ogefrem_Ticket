<?php
declare(strict_types=1);

require_once __DIR__ . '/NotificationService.php';
require_once __DIR__ . '/CoInterventionService.php';

const TICKET_PRIORITIES = ['urgent', 'elevee', 'normale'];

function normalizePriority(string $priority): string
{
    $map = [
        'bloquant' => 'urgent',
        'haute' => 'elevee',
        'urgent' => 'urgent',
        'elevee' => 'elevee',
        'élevée' => 'elevee',
        'normale' => 'normale',
    ];
    return $map[$priority] ?? 'normale';
}

function generateTicketNumber(PDO $pdo): string
{
    $year = date('Y');
    $prefix = "TKT-{$year}-";
    $stmt = $pdo->prepare(
        'SELECT MAX(CAST(SUBSTRING(ticket_number, LENGTH(:prefix) + 1) AS UNSIGNED)) AS max_seq
         FROM tickets
         WHERE ticket_number LIKE :like_prefix'
    );
    $stmt->execute([
        'prefix' => $prefix,
        'like_prefix' => $prefix . '%',
    ]);
    $next = (int)($stmt->fetch()['max_seq'] ?? 0) + 1;

    return $prefix . str_pad((string)$next, 4, '0', STR_PAD_LEFT);
}

function generateTrackingToken(): string
{
    return bin2hex(random_bytes(32));
}

function logTicketEvent(
    PDO $pdo,
    int $ticketId,
    ?int $actorUserId,
    string $eventType,
    ?string $fromStatus = null,
    ?string $toStatus = null,
    ?array $payload = null
): void {
    $stmt = $pdo->prepare(
        'INSERT INTO ticket_events (ticket_id, actor_user_id, event_type, from_status, to_status, payload_json)
         VALUES (:ticket_id, :actor_user_id, :event_type, :from_status, :to_status, :payload_json)'
    );
    $stmt->execute([
        'ticket_id' => $ticketId,
        'actor_user_id' => $actorUserId,
        'event_type' => $eventType,
        'from_status' => $fromStatus,
        'to_status' => $toStatus,
        'payload_json' => $payload ? json_encode($payload, JSON_UNESCAPED_UNICODE) : null,
    ]);
}

function resolveRoutedServiceId(PDO $pdo, int $categoryId): int
{
    $stmt = $pdo->prepare(
        'SELECT dantic_service_id FROM category_service_routing WHERE category_id = :category_id LIMIT 1'
    );
    $stmt->execute(['category_id' => $categoryId]);
    $row = $stmt->fetch();
    if ($row) {
        return (int)$row['dantic_service_id'];
    }
    return 6;
}

function resolveDefaultChefForService(PDO $pdo, int $serviceId): ?array
{
    $stmt = $pdo->prepare(
        "SELECT u.id, u.service_id, ds.sub_directorate_id
         FROM users u
         JOIN roles r ON r.id = u.role_id
         JOIN dantic_services ds ON ds.id = u.service_id
         WHERE r.code = 'CHEF_SERVICE' AND u.service_id = :service_id AND u.is_active = 1
         ORDER BY u.id ASC
         LIMIT 1"
    );
    $stmt->execute(['service_id' => $serviceId]);
    $chef = $stmt->fetch();
    return $chef ?: null;
}

function routeTicketToInterservicePool(PDO $pdo, int $ticketId, int $categoryId): void
{
    $serviceId = resolveRoutedServiceId($pdo, $categoryId);
    $sdStmt = $pdo->prepare('SELECT sub_directorate_id FROM dantic_services WHERE id = :id LIMIT 1');
    $sdStmt->execute(['id' => $serviceId]);
    $sdId = (int)($sdStmt->fetchColumn() ?: 0);

    $ticketStmt = $pdo->prepare('SELECT status FROM tickets WHERE id = :id');
    $ticketStmt->execute(['id' => $ticketId]);
    $current = $ticketStmt->fetch();
    if (!$current) {
        return;
    }

    $fromStatus = $current['status'];
    $stmt = $pdo->prepare(
        'UPDATE tickets SET
           routed_service_id = :routed_service_id,
           routed_at = NOW(),
           sub_directorate_id = :sub_directorate_id,
           assigned_chef_id = NULL,
           status = :status,
           updated_at = NOW()
         WHERE id = :id'
    );
    $stmt->execute([
        'routed_service_id' => $serviceId,
        'sub_directorate_id' => $sdId > 0 ? $sdId : null,
        'status' => 'chez_chef_service',
        'id' => $ticketId,
    ]);

    logTicketEvent($pdo, $ticketId, null, 'ticket_routed', $fromStatus, 'chez_chef_service', [
        'service_id' => $serviceId,
        'pool' => 'interservice',
    ]);

    $chefStmt = $pdo->query(
        "SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
         WHERE r.code = 'CHEF_SERVICE' AND u.is_active = 1"
    );
    foreach ($chefStmt->fetchAll() as $chef) {
        createNotification(
            $pdo,
            (int)$chef['id'],
            $ticketId,
            'ticket_pool_interservice',
            'Nouveau ticket — espace interservice',
            'Un ticket est disponible dans l\'espace interservice des chefs de service.'
        );
    }
}

/** @deprecated alias */
function routeTicketToChef(PDO $pdo, int $ticketId, int $categoryId): void
{
    routeTicketToInterservicePool($pdo, $ticketId, $categoryId);
}

function isAutresCategory(PDO $pdo, int $categoryId): bool
{
    $stmt = $pdo->prepare('SELECT code FROM ticket_categories WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $categoryId]);
    $code = strtoupper(trim((string)($stmt->fetchColumn() ?: '')));
    return $code === 'AUTRES';
}

function assertNoDuplicateOpenTicketForReporter(PDO $pdo, string $matricule, int $categoryId): void
{
    $matricule = trim($matricule);
    if ($matricule === '' || isAutresCategory($pdo, $categoryId)) {
        return;
    }

    $stmt = $pdo->prepare(
        "SELECT t.ticket_number FROM tickets t
         WHERE UPPER(TRIM(t.reporter_matricule)) = UPPER(:matricule)
           AND t.category_id = :category_id
           AND t.status NOT IN ('resolu', 'non_resolu', 'archive')
         LIMIT 1"
    );
    $stmt->execute([
        'matricule' => $matricule,
        'category_id' => $categoryId,
    ]);
    $existing = $stmt->fetch();
    if ($existing) {
        jsonResponse([
            'ok' => false,
            'message' => 'Vous avez déjà un ticket en cours dans cette catégorie ('
                . $existing['ticket_number']
                . '). Attendez sa clôture avant d\'en soumettre un autre.',
        ], 422);
    }
}

function createPublicTicket(PDO $pdo, array $input): array
{
    require_once __DIR__ . '/../middleware/SecurityMiddleware.php';
    assertPublicHoneypotClean($input);
    $input = normalizePublicTicketInput($input);

    $required = ['reporter_full_name', 'reporter_matricule', 'reporter_direction', 'reporter_service', 'reporter_office', 'category_id', 'description'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            jsonResponse(['ok' => false, 'message' => "Champ requis: {$field}"], 422);
        }
    }

    $ticketNumber = generateTicketNumber($pdo);
    $trackingToken = generateTrackingToken();
    $categoryId = (int)$input['category_id'];
    if ($categoryId <= 0) {
        jsonResponse(['ok' => false, 'message' => 'Catégorie invalide.'], 422);
    }

    $serviceId = resolveRoutedServiceId($pdo, $categoryId);
    $sdStmt = $pdo->prepare('SELECT sub_directorate_id FROM dantic_services WHERE id = :id LIMIT 1');
    $sdStmt->execute(['id' => $serviceId]);
    $sdId = (int)($sdStmt->fetchColumn() ?: 0);

    $pdo->beginTransaction();
    try {
        assertNoDuplicateOpenTicketForReporter($pdo, (string)$input['reporter_matricule'], $categoryId);
        $sql = <<<SQL
INSERT INTO tickets
  (ticket_number, tracking_token, reporter_full_name, reporter_matricule, reporter_direction, reporter_service, reporter_office, category_id, description, status, received_by_director_at, routed_service_id, sub_directorate_id, routed_at)
VALUES
  (:ticket_number, :tracking_token, :reporter_full_name, :reporter_matricule, :reporter_direction, :reporter_service, :reporter_office, :category_id, :description, 'chez_chef_service', NOW(), :routed_service_id, :sub_directorate_id, NOW())
SQL;
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'ticket_number' => $ticketNumber,
            'tracking_token' => $trackingToken,
            'reporter_full_name' => $input['reporter_full_name'],
            'reporter_matricule' => $input['reporter_matricule'],
            'reporter_direction' => $input['reporter_direction'],
            'reporter_service' => $input['reporter_service'],
            'reporter_office' => $input['reporter_office'],
            'category_id' => $categoryId,
            'description' => $input['description'],
            'routed_service_id' => $serviceId,
            'sub_directorate_id' => $sdId > 0 ? $sdId : null,
        ]);

        $ticketId = (int)$pdo->lastInsertId();
        logTicketEvent($pdo, $ticketId, null, 'ticket_submitted', null, 'chez_chef_service', [
            'service_id' => $serviceId,
            'pool' => 'interservice',
        ]);

        $chefStmt = $pdo->query(
            "SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
             WHERE r.code = 'CHEF_SERVICE' AND u.is_active = 1"
        );
        foreach ($chefStmt->fetchAll() as $chef) {
            createNotification(
                $pdo,
                (int)$chef['id'],
                $ticketId,
                'ticket_pool_interservice',
                'Nouveau ticket — espace interservice',
                'Un ticket est disponible dans l\'espace interservice des chefs de service.'
            );
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    return [
        'id' => $ticketId,
        'ticket_number' => $ticketNumber,
        'tracking_token' => $trackingToken,
    ];
}

function ticketsBaseSelectSql(int $techId = 0): string
{
    $archiveSelect = $techId > 0
        ? <<<SQL
       (SELECT ara.year FROM agent_resolved_archives ara WHERE ara.ticket_id = t.id AND ara.agent_id = {$techId} LIMIT 1) AS archive_year,
       (SELECT ara.month FROM agent_resolved_archives ara WHERE ara.ticket_id = t.id AND ara.agent_id = {$techId} LIMIT 1) AS archive_month,
       (SELECT ara.week_index FROM agent_resolved_archives ara WHERE ara.ticket_id = t.id AND ara.agent_id = {$techId} LIMIT 1) AS archive_week_index,
       (SELECT ara.archived_at FROM agent_resolved_archives ara WHERE ara.ticket_id = t.id AND ara.agent_id = {$techId} LIMIT 1) AS archived_at,
       EXISTS(SELECT 1 FROM agent_resolved_archives ara WHERE ara.ticket_id = t.id AND ara.agent_id = {$techId}) AS is_agent_archived,
SQL
        : '';

    $coSelect = sqlCoInterventionsJson();
    if ($techId > 0) {
        $coSelect .= ",\n       " . trim(sqlCoInterventionFieldsForAgent($techId));
    }

    return <<<SQL
SELECT t.*, c.label AS category_label, sd.label AS sub_directorate_label, sd.code AS sub_directorate_code,
       ds.label AS routed_service_label,
       CONCAT(u1.prenom, ' ', u1.nom) AS assigned_chef_name,
       CONCAT(u2.prenom, ' ', u2.nom) AS assigned_tech_name,
       (SELECT r2.code FROM users u3 JOIN roles r2 ON r2.id = u3.role_id WHERE u3.id = t.assigned_technician_id LIMIT 1) AS assigned_tech_role,
       (SELECT te.event_type FROM ticket_events te
         WHERE te.ticket_id = t.id
         AND te.event_type IN ('ticket_assigned', 'ticket_claimed', 'bureau_claimed')
         ORDER BY te.created_at DESC LIMIT 1) AS agent_assignment_event_type,
       (SELECT CONCAT(u.prenom, ' ', u.nom) FROM ticket_events te
         INNER JOIN users u ON u.id = te.actor_user_id
         WHERE te.ticket_id = t.id AND te.event_type = 'ticket_assigned'
         ORDER BY te.created_at DESC LIMIT 1) AS assigned_by_supervisor_name,
       (SELECT r.code FROM ticket_events te
         INNER JOIN users u ON u.id = te.actor_user_id
         INNER JOIN roles r ON r.id = u.role_id
         WHERE te.ticket_id = t.id AND te.event_type = 'ticket_assigned'
         ORDER BY te.created_at DESC LIMIT 1) AS assigned_by_supervisor_role,
       (SELECT te.from_status FROM ticket_events te
         WHERE te.ticket_id = t.id AND te.event_type = 'ticket_reopened'
         ORDER BY te.created_at DESC LIMIT 1) AS last_reopened_from_status,
       {$archiveSelect}
       (SELECT COUNT(*) FROM resolution_reports rr WHERE rr.ticket_id = t.id) AS report_count,
       (SELECT COUNT(*) FROM resolution_reports rr WHERE rr.ticket_id = t.id AND rr.status = 'valide_sd'
        AND rr.id = (SELECT lr.id FROM resolution_reports lr WHERE lr.ticket_id = t.id ORDER BY lr.version DESC, lr.created_at DESC LIMIT 1)) AS has_report_for_director,
       (SELECT COUNT(*) FROM resolution_reports rr WHERE rr.ticket_id = t.id
        AND rr.id = (SELECT lr.id FROM resolution_reports lr WHERE lr.ticket_id = t.id ORDER BY lr.version DESC, lr.created_at DESC LIMIT 1)
        AND (
          rr.status = 'valide_chef'
          OR (rr.status = 'rejete' AND (
            SELECT rv.validator_role FROM report_validations rv
            WHERE rv.report_id = rr.id AND rv.decision = 'rejete'
            ORDER BY rv.created_at DESC LIMIT 1
          ) IN ('DIRECTEUR', 'SUPER_ADMIN'))
        )) AS has_report_for_sd,
       (SELECT COUNT(*) FROM resolution_reports rr WHERE rr.ticket_id = t.id
        AND rr.id = (SELECT lr.id FROM resolution_reports lr WHERE lr.ticket_id = t.id ORDER BY lr.version DESC, lr.created_at DESC LIMIT 1)
        AND (
          rr.status = 'soumis'
          OR (rr.status = 'rejete' AND (
            SELECT rv.validator_role FROM report_validations rv
            WHERE rv.report_id = rr.id AND rv.decision = 'rejete'
            ORDER BY rv.created_at DESC LIMIT 1
          ) = 'SOUS_DIRECTEUR')
        )) AS has_report_for_chef,
       (SELECT lr.status FROM resolution_reports lr WHERE lr.ticket_id = t.id ORDER BY lr.version DESC, lr.created_at DESC LIMIT 1) AS latest_report_status,
       (SELECT lr.body FROM resolution_reports lr WHERE lr.ticket_id = t.id ORDER BY lr.version DESC, lr.created_at DESC LIMIT 1) AS latest_report_body,
       (SELECT rv.validator_role FROM report_validations rv
         WHERE rv.report_id = (SELECT lr.id FROM resolution_reports lr WHERE lr.ticket_id = t.id ORDER BY lr.version DESC, lr.created_at DESC LIMIT 1)
           AND rv.decision = 'rejete'
         ORDER BY rv.created_at DESC LIMIT 1) AS latest_report_reject_role,
       {$coSelect}
FROM tickets t
JOIN ticket_categories c ON c.id = t.category_id
LEFT JOIN sub_directorates sd ON sd.id = t.sub_directorate_id
LEFT JOIN dantic_services ds ON ds.id = t.routed_service_id
LEFT JOIN users u1 ON u1.id = t.assigned_chef_id
LEFT JOIN users u2 ON u2.id = t.assigned_technician_id
SQL;
}

function hydrateTicketRows(array $rows): array
{
    foreach ($rows as &$row) {
        $row['has_report_for_director'] = (int)($row['has_report_for_director'] ?? 0) > 0;
        $row['has_report_for_sd'] = (int)($row['has_report_for_sd'] ?? 0) > 0;
        $row['has_report_for_chef'] = (int)($row['has_report_for_chef'] ?? 0) > 0;
        $row['report_count'] = (int)($row['report_count'] ?? 0);
        if (array_key_exists('is_agent_archived', $row)) {
            $row['is_agent_archived'] = (int)($row['is_agent_archived'] ?? 0) > 0;
        }
        if (array_key_exists('co_interventions_json', $row)) {
            $row['co_interventions'] = decodeCoInterventionsJson($row['co_interventions_json'] ?? null);
            unset($row['co_interventions_json']);
        }
    }
    unset($row);
    return $rows;
}

function parseTicketListFilters(): array
{
    $filters = [];
    if (!empty($_GET['category_id'])) {
        $filters['category_id'] = (int)$_GET['category_id'];
    }
    if (!empty($_GET['priority']) && in_array($_GET['priority'], TICKET_PRIORITIES, true)) {
        $filters['priority'] = (string)$_GET['priority'];
    }
    if (!empty($_GET['service_id'])) {
        $filters['service_id'] = (int)$_GET['service_id'];
    }
    if (!empty($_GET['date_filter']) && in_array($_GET['date_filter'], ['today', 'week', 'month'], true)) {
        $filters['date'] = (string)$_GET['date_filter'];
    }
    if (isset($_GET['mine_only']) && $_GET['mine_only'] === '1') {
        $filters['mine_only'] = true;
    }
    $allowedSorts = [
        'priority_desc', 'priority_asc', 'date_desc', 'date_asc',
        'ticket_asc', 'ticket_desc', 'category_asc', 'service_asc', 'chef_asc',
    ];
    if (!empty($_GET['sort_by']) && in_array($_GET['sort_by'], $allowedSorts, true)) {
        $filters['sort_by'] = (string)$_GET['sort_by'];
    }
    if (!empty($_GET['reporter_direction'])) {
        $filters['reporter_direction'] = trim((string)$_GET['reporter_direction']);
    }
    if (isset($_GET['unassigned_sd']) && $_GET['unassigned_sd'] === '1') {
        $filters['unassigned_sd'] = true;
    }
    if (!empty($_GET['sub_directorate_id'])) {
        $filters['sub_directorate_id'] = (int)$_GET['sub_directorate_id'];
    }
    if (!empty($_GET['status'])) {
        $filters['status'] = (string)$_GET['status'];
    }
    return $filters;
}

function applyTicketListFilters(array &$where, array &$params, array $filters, array $user = []): void
{
    if (!empty($filters['category_id'])) {
        $where[] = 't.category_id = :filter_category_id';
        $params['filter_category_id'] = (int)$filters['category_id'];
    }
    if (!empty($filters['priority'])) {
        $where[] = 't.priority = :filter_priority';
        $params['filter_priority'] = (string)$filters['priority'];
    }
    if (!empty($filters['service_id'])) {
        $where[] = 't.routed_service_id = :filter_service_id';
        $params['filter_service_id'] = (int)$filters['service_id'];
    }
    if (!empty($filters['date'])) {
        if ($filters['date'] === 'today') {
            $where[] = 'DATE(t.created_at) = CURDATE()';
        } elseif ($filters['date'] === 'week') {
            $where[] = 'YEARWEEK(t.created_at, 1) = YEARWEEK(CURDATE(), 1)';
        } elseif ($filters['date'] === 'month') {
            $where[] = 'YEAR(t.created_at) = YEAR(CURDATE()) AND MONTH(t.created_at) = MONTH(CURDATE())';
        }
    }
    if (!empty($filters['mine_only']) && ($user['role_code'] ?? '') === 'CHEF_SERVICE') {
        $where[] = 't.assigned_chef_id = :mine_chef_id';
        $params['mine_chef_id'] = (int)$user['id'];
    }
    if (!empty($filters['reporter_direction'])) {
        $where[] = 't.reporter_direction = :filter_reporter_direction';
        $params['filter_reporter_direction'] = (string)$filters['reporter_direction'];
    }
    if (!empty($filters['unassigned_sd'])) {
        $where[] = 't.sub_directorate_id IS NULL';
    }
    if (!empty($filters['sub_directorate_id'])) {
        $where[] = 't.sub_directorate_id = :filter_sub_directorate_id';
        $params['filter_sub_directorate_id'] = (int)$filters['sub_directorate_id'];
    }
    if (!empty($filters['status'])) {
        $where[] = 't.status = :filter_status';
        $params['filter_status'] = (string)$filters['status'];
    }
}

function applyTicketUserScope(array &$where, array &$params, array $user, ?string $scope, ?string $view): void
{
    switch ($user['role_code']) {
        case 'DIRECTEUR':
        case 'SUPER_ADMIN':
            break;
        case 'SOUS_DIRECTEUR':
            $where[] = 't.sub_directorate_id = :sub_directorate_id';
            $params['sub_directorate_id'] = (int)$user['sub_directorate_id'];
            break;
        case 'CHEF_SERVICE':
            $chefId = (int)$user['id'];
            if ($scope === 'interservice_pool') {
                $where[] = 't.assigned_chef_id IS NULL';
                $where[] = "t.status = 'chez_chef_service'";
            } elseif ($scope === 'interservice_taken') {
                $where[] = 't.assigned_chef_id IS NOT NULL';
                $where[] = "t.status IN ('chez_chef_service', 'assigne_technicien', 'en_cours')";
            } elseif ($scope === 'my_claimed') {
                $where[] = 't.assigned_chef_id = :chef_id';
                $params['chef_id'] = $chefId;
            } elseif ($scope === 'pool') {
                $where[] = 't.assigned_chef_id = :chef_id';
                $where[] = 't.assigned_technician_id IS NULL';
                $where[] = "t.status = 'chez_chef_service'";
                $params['chef_id'] = $chefId;
            } elseif ($scope === 'assigned') {
                $where[] = 't.assigned_chef_id = :chef_id';
                $where[] = '(t.assigned_technician_id IS NOT NULL OR t.status NOT IN (\'chez_chef_service\', \'archive\'))';
                $params['chef_id'] = $chefId;
            } else {
                $where[] = 't.assigned_chef_id = :chef_id';
                $params['chef_id'] = $chefId;
            }
            break;
        case 'TECHNICIEN':
        case 'CHEF_BUREAU':
            $serviceId = (int)($user['service_id'] ?? 0);
            if ($scope === 'pool') {
                $where[] = 't.assigned_technician_id IS NULL';
                $where[] = "t.status = 'chez_chef_service'";
                $where[] = '(t.routed_service_id = :service_id OR EXISTS (
                    SELECT 1 FROM users uc WHERE uc.id = t.assigned_chef_id AND uc.service_id = :service_id2
                ))';
                $params['service_id'] = $serviceId;
                $params['service_id2'] = $serviceId;
            } elseif ($view === 'history') {
                $where[] = '(
                    t.assigned_technician_id = :tech_id
                    OR EXISTS (
                        SELECT 1 FROM ticket_co_interventions tci
                        WHERE tci.ticket_id = t.id AND tci.agent_id = :tech_id_co AND tci.status = \'accepted\'
                    )
                )';
                $params['tech_id'] = (int)$user['id'];
                $params['tech_id_co'] = (int)$user['id'];
                $where[] = 'EXISTS (SELECT 1 FROM agent_resolved_archives ara WHERE ara.ticket_id = t.id AND ara.agent_id = :tech_id2)';
                $params['tech_id2'] = (int)$user['id'];
            } else {
                $techId = (int)$user['id'];
                $where[] = '(
                    (t.assigned_technician_id = :tech_id AND t.status IN (\'assigne_technicien\', \'en_cours\', \'resolu\', \'non_resolu\'))
                    OR EXISTS (
                        SELECT 1 FROM ticket_co_interventions tci
                        WHERE tci.ticket_id = t.id AND tci.agent_id = :tech_id_co
                          AND tci.status IN (\'pending\', \'accepted\')
                          AND t.status IN (\'assigne_technicien\', \'en_cours\', \'resolu\', \'non_resolu\')
                    )
                )';
                $params['tech_id'] = $techId;
                $params['tech_id_co'] = $techId;
                $where[] = "(t.status IN ('assigne_technicien', 'en_cours') OR NOT EXISTS (SELECT 1 FROM agent_resolved_archives ara WHERE ara.ticket_id = t.id AND ara.agent_id = :tech_id2))";
                $params['tech_id2'] = $techId;
            }
            break;
    }

    if ($view === 'open') {
        $where[] = "t.status NOT IN ('resolu', 'non_resolu', 'archive')";
    }
}

function sqlTicketPriorityBreakdown(): string
{
    return "SUM(CASE WHEN t.priority IN ('urgent', 'bloquant') THEN 1 ELSE 0 END) AS urgent,
        SUM(CASE WHEN t.priority IN ('elevee', 'haute') THEN 1 ELSE 0 END) AS elevee,
        SUM(CASE WHEN t.priority IN ('normale') OR t.priority IS NULL OR t.priority NOT IN ('urgent', 'bloquant', 'elevee', 'haute', 'normale') THEN 1 ELSE 0 END) AS normale";
}

function fetchTicketDirectionBreakdown(PDO $pdo, string $whereSql, array $params, int $limit = 12): array
{
    $sql = "SELECT COALESCE(NULLIF(TRIM(t.reporter_direction), ''), 'Non renseignée') AS label, COUNT(*) AS c
        FROM tickets t{$whereSql}
        GROUP BY label ORDER BY c DESC LIMIT " . (int)$limit;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return array_map(
        fn($r) => ['label' => $r['label'], 'count' => (int)$r['c']],
        $stmt->fetchAll()
    );
}

function fetchTicketCategoryBreakdown(PDO $pdo, string $whereSql, array $params, int $limit = 8): array
{
    $sql = "SELECT c.label AS label, COUNT(*) AS c
        FROM tickets t
        JOIN ticket_categories c ON c.id = t.category_id
        {$whereSql}
        GROUP BY t.category_id, c.label
        ORDER BY c DESC
        LIMIT " . (int)$limit;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return array_map(
        fn($r) => ['label' => $r['label'], 'count' => (int)$r['c']],
        $stmt->fetchAll()
    );
}

function getTicketTabStats(PDO $pdo, array $user, ?string $scope, ?string $view = null): array
{
    $where = [];
    $params = [];
    applyTicketUserScope($where, $params, $user, $scope, $view);
    $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';

    $sql = 'SELECT COUNT(*) AS total, ' . sqlTicketPriorityBreakdown() . ',
        SUM(CASE WHEN t.sub_directorate_id IS NULL THEN 1 ELSE 0 END) AS unassigned_sd
        FROM tickets t' . $whereSql;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch() ?: [];

    $directionsSql = "SELECT DISTINCT COALESCE(NULLIF(TRIM(t.reporter_direction), ''), 'Non renseignée') AS label
        FROM tickets t{$whereSql} ORDER BY label ASC";
    $dirStmt = $pdo->prepare($directionsSql);
    $dirStmt->execute($params);
    $directions = array_column($dirStmt->fetchAll(), 'label');

    return [
        'total' => (int)($row['total'] ?? 0),
        'priority' => [
            'urgent' => (int)($row['urgent'] ?? 0),
            'elevee' => (int)($row['elevee'] ?? 0),
            'normale' => (int)($row['normale'] ?? 0),
        ],
        'unassigned_sd' => (int)($row['unassigned_sd'] ?? 0),
        'by_direction' => fetchTicketDirectionBreakdown($pdo, $whereSql, $params),
        'by_category' => fetchTicketCategoryBreakdown($pdo, $whereSql, $params),
        'directions' => $directions,
    ];
}

function buildTicketOrderSql(array $filters): string
{
    $sort = $filters['sort_by'] ?? 'priority_desc';
    return match ($sort) {
        'priority_asc' => " ORDER BY FIELD(t.priority, 'normale', 'elevee', 'urgent'), t.created_at DESC",
        'date_asc' => ' ORDER BY t.created_at ASC',
        'date_desc' => ' ORDER BY t.created_at DESC',
        'ticket_asc' => ' ORDER BY t.ticket_number ASC',
        'ticket_desc' => ' ORDER BY t.ticket_number DESC',
        'category_asc' => ' ORDER BY c.label ASC, t.created_at DESC',
        'service_asc' => ' ORDER BY ds.label ASC, t.created_at DESC',
        'chef_asc' => ' ORDER BY u1.nom ASC, u1.prenom ASC, t.created_at DESC',
        default => " ORDER BY FIELD(t.priority, 'urgent', 'elevee', 'normale'), t.created_at DESC",
    };
}

function getTicketsByUserScope(
    PDO $pdo,
    array $user,
    ?string $scope = null,
    ?string $view = null,
    int $page = 1,
    int $perPage = 0,
    array $filters = []
): array {
    $techId = in_array($user['role_code'] ?? '', ['TECHNICIEN', 'CHEF_BUREAU'], true)
        ? (int)$user['id']
        : 0;
    $base = ticketsBaseSelectSql($techId);
    $where = [];
    $params = [];

    applyTicketUserScope($where, $params, $user, $scope, $view);
    applyTicketListFilters($where, $params, $filters, $user);

    $whereSql = $where ? ' WHERE ' . implode(' AND ', $where) : '';
    $orderSql = $view === 'history'
        ? ' ORDER BY COALESCE(t.closed_at, t.updated_at) DESC, t.id DESC'
        : buildTicketOrderSql($filters);

    $countStmt = $pdo->prepare("SELECT COUNT(*) AS total FROM tickets t{$whereSql}");
    $countStmt->execute($params);
    $total = (int)($countStmt->fetch()['total'] ?? 0);

    $sql = $base . $whereSql . $orderSql;
    if ($perPage > 0) {
        $page = max(1, $page);
        $perPage = min(100, max(1, $perPage));
        $offset = ($page - 1) * $perPage;
        $sql .= ' LIMIT ' . (int)$perPage . ' OFFSET ' . (int)$offset;
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = hydrateTicketRows($stmt->fetchAll());

    if ($perPage > 0) {
        return [
            'tickets' => $rows,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => (int)ceil($total / $perPage),
            ],
        ];
    }

    return $rows;
}

function claimTicket(PDO $pdo, array $user, int $ticketId): void
{
    $serviceId = (int)($user['service_id'] ?? 0);
    if ($serviceId <= 0) {
        jsonResponse(['ok' => false, 'message' => 'Service agent non configuré.'], 422);
    }

    $pdo->beginTransaction();
    try {
        $ticketStmt = $pdo->prepare(
            'SELECT t.id, t.status, t.assigned_technician_id, t.routed_service_id, t.assigned_chef_id,
                    uc.service_id AS chef_service_id
             FROM tickets t
             LEFT JOIN users uc ON uc.id = t.assigned_chef_id
             WHERE t.id = :id FOR UPDATE'
        );
        $ticketStmt->execute(['id' => $ticketId]);
        $ticket = $ticketStmt->fetch();
        if (!$ticket) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
        }
        $effectiveService = (int)($ticket['assigned_chef_id'] ? ($ticket['chef_service_id'] ?? 0) : ($ticket['routed_service_id'] ?? 0));
        if ($effectiveService !== $serviceId) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'message' => 'Ce ticket n\'appartient pas à votre service.'], 403);
        }
        if ($ticket['assigned_technician_id'] !== null) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'message' => 'Ce ticket est déjà assigné.'], 422);
        }
        if (!in_array($ticket['status'], ['chez_chef_service'], true)) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'message' => 'Ce ticket ne peut pas être pris en main.'], 422);
        }

        $fromStatus = $ticket['status'];
        $roleCode = $user['role_code'] ?? '';
        $toStatus = $roleCode === 'CHEF_BUREAU' ? 'en_cours' : 'assigne_technicien';
        $eventType = $roleCode === 'CHEF_BUREAU' ? 'bureau_claimed' : 'ticket_claimed';

        $stmt = $pdo->prepare(
            'UPDATE tickets SET assigned_technician_id = :tech_id, status = :status, updated_at = NOW() WHERE id = :id'
        );
        $stmt->execute([
            'tech_id' => (int)$user['id'],
            'status' => $toStatus,
            'id' => $ticketId,
        ]);

        logTicketEvent($pdo, $ticketId, (int)$user['id'], $eventType, $fromStatus, $toStatus);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function claimTicketAsChef(PDO $pdo, array $user, int $ticketId, ?string $priority = null, ?string $slaDueAt = null): void
{
    if (($user['role_code'] ?? '') !== 'CHEF_SERVICE' && ($user['role_code'] ?? '') !== 'SUPER_ADMIN') {
        jsonResponse(['ok' => false, 'message' => 'Réservé aux chefs de service.'], 403);
    }

    $priorityValue = $priority !== null ? normalizePriority($priority) : null;
    if ($priorityValue === null || !in_array($priorityValue, TICKET_PRIORITIES, true)) {
        jsonResponse(['ok' => false, 'message' => 'La priorité doit être définie avant la prise en charge.'], 422);
    }

    $chefId = (int)$user['id'];
    $serviceId = (int)($user['service_id'] ?? 0);
    $sdId = (int)($user['sub_directorate_id'] ?? 0);
    if ($serviceId <= 0) {
        jsonResponse(['ok' => false, 'message' => 'Service chef non configuré.'], 422);
    }

    $pdo->beginTransaction();
    try {
        $ticketStmt = $pdo->prepare(
            'SELECT id, status, assigned_chef_id FROM tickets WHERE id = :id FOR UPDATE'
        );
        $ticketStmt->execute(['id' => $ticketId]);
        $ticket = $ticketStmt->fetch();
        if (!$ticket) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
        }
        if ($ticket['assigned_chef_id'] !== null) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'message' => 'Ce ticket est déjà pris en charge par un chef.'], 422);
        }
        if ($ticket['status'] !== 'chez_chef_service') {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'message' => 'Ce ticket ne peut pas être pris en charge.'], 422);
        }

        $fromStatus = $ticket['status'];
        $upd = $pdo->prepare(
            'UPDATE tickets SET assigned_chef_id = :chef_id, routed_service_id = :service_id,
             sub_directorate_id = :sd_id, priority = :priority, priority_set_by = :actor_id,
             sla_due_at = :sla_due_at, updated_at = NOW() WHERE id = :id'
        );
        $upd->execute([
            'chef_id' => $chefId,
            'service_id' => $serviceId,
            'sd_id' => $sdId > 0 ? $sdId : null,
            'priority' => $priorityValue,
            'actor_id' => $chefId,
            'sla_due_at' => $slaDueAt,
            'id' => $ticketId,
        ]);

        logTicketEvent($pdo, $ticketId, $chefId, 'chef_claimed', $fromStatus, 'chez_chef_service', [
            'chef_id' => $chefId,
            'service_id' => $serviceId,
        ]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function delegateTicketToChef(PDO $pdo, array $user, int $ticketId, int $targetChefId): void
{
    $chefId = (int)$user['id'];
    if ($targetChefId <= 0 || $targetChefId === $chefId) {
        jsonResponse(['ok' => false, 'message' => 'Chef destinataire invalide.'], 422);
    }

    $targetStmt = $pdo->prepare(
        "SELECT u.id, u.service_id, u.sub_directorate_id FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.id = :id AND r.code = 'CHEF_SERVICE' AND u.is_active = 1"
    );
    $targetStmt->execute(['id' => $targetChefId]);
    $target = $targetStmt->fetch();
    if (!$target) {
        jsonResponse(['ok' => false, 'message' => 'Chef de service introuvable.'], 404);
    }

    $ticketStmt = $pdo->prepare('SELECT id, assigned_chef_id, status FROM tickets WHERE id = :id');
    $ticketStmt->execute(['id' => $ticketId]);
    $ticket = $ticketStmt->fetch();
    if (!$ticket) {
        jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
    }
    if ((int)$ticket['assigned_chef_id'] !== $chefId && ($user['role_code'] ?? '') !== 'SUPER_ADMIN') {
        jsonResponse(['ok' => false, 'message' => 'Seul le chef en charge peut céder ce ticket.'], 403);
    }
    if ($ticket['assigned_chef_id'] === null) {
        jsonResponse(['ok' => false, 'message' => 'Le ticket doit d\'abord être pris en charge.'], 422);
    }

    $upd = $pdo->prepare(
        'UPDATE tickets SET assigned_chef_id = :chef_id, routed_service_id = :service_id,
         sub_directorate_id = :sd_id, assigned_technician_id = NULL, updated_at = NOW() WHERE id = :id'
    );
    $upd->execute([
        'chef_id' => $targetChefId,
        'service_id' => (int)$target['service_id'],
        'sd_id' => (int)$target['sub_directorate_id'],
        'id' => $ticketId,
    ]);

    logTicketEvent($pdo, $ticketId, $chefId, 'chef_delegated', $ticket['status'], $ticket['status'], [
        'from_chef_id' => $chefId,
        'to_chef_id' => $targetChefId,
    ]);

    createNotification(
        $pdo,
        $targetChefId,
        $ticketId,
        'ticket_delegated',
        'Ticket cédé par un chef de service',
        'Un collègue chef vous a cédé la prise en charge d\'un ticket.'
    );
}

function assignToTechnician(PDO $pdo, array $chefUser, int $ticketId, int $technicianId, ?string $priority = null, ?string $slaDueAt = null): void
{
    $ticketStmt = $pdo->prepare(
        'SELECT id, assigned_chef_id, status, routed_service_id FROM tickets WHERE id = :id'
    );
    $ticketStmt->execute(['id' => $ticketId]);
    $ticket = $ticketStmt->fetch();
    if (!$ticket) {
        jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
    }

    $roleCode = $chefUser['role_code'] ?? '';
    $chefServiceId = (int)($chefUser['service_id'] ?? 0);
    if ($roleCode === 'CHEF_SERVICE') {
        if ((int)$ticket['assigned_chef_id'] !== (int)$chefUser['id']) {
            jsonResponse(['ok' => false, 'message' => 'Vous devez avoir pris en charge ce ticket avant d\'affecter un agent.'], 403);
        }
    }

    if (!in_array($ticket['status'], ['chez_chef_service', 'assigne_technicien'], true)) {
        jsonResponse(['ok' => false, 'message' => 'L\'affectation de cet agent ne peut plus être modifiée.'], 422);
    }

    $techStmt = $pdo->prepare(
        'SELECT u.id, u.service_id, r.code AS role_code FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = :id AND u.is_active = 1'
    );
    $techStmt->execute(['id' => $technicianId]);
    $tech = $techStmt->fetch();
    if (!$tech || $tech['role_code'] !== 'TECHNICIEN') {
        jsonResponse(['ok' => false, 'message' => 'Agent introuvable.'], 404);
    }

    if ($roleCode === 'CHEF_SERVICE' && (int)$tech['service_id'] !== $chefServiceId) {
        jsonResponse(['ok' => false, 'message' => 'Cet agent n\'appartient pas à votre service.'], 422);
    }

    $priorityValue = $priority !== null && $priority !== '' ? normalizePriority($priority) : null;
    if ($priorityValue !== null && !in_array($priorityValue, TICKET_PRIORITIES, true)) {
        jsonResponse(['ok' => false, 'message' => 'Priorité invalide.'], 422);
    }

    $fromStatus = $ticket['status'];
    $sql = 'UPDATE tickets SET assigned_technician_id = :tech_id, assigned_chef_id = :chef_id, status = :status, updated_at = NOW()';
    $params = [
        'tech_id' => $technicianId,
        'chef_id' => (int)$chefUser['id'],
        'status' => 'assigne_technicien',
        'id' => $ticketId,
    ];
    if ($priorityValue !== null) {
        $sql .= ', priority = :priority, priority_set_by = :actor_id';
        $params['priority'] = $priorityValue;
        $params['actor_id'] = (int)$chefUser['id'];
    }
    if ($slaDueAt !== null) {
        $sql .= ', sla_due_at = :sla_due_at';
        $params['sla_due_at'] = $slaDueAt !== '' ? $slaDueAt : null;
    }
    $sql .= ' WHERE id = :id';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    logTicketEvent($pdo, $ticketId, (int)$chefUser['id'], 'ticket_assigned', $fromStatus, 'assigne_technicien', [
        'technician_id' => $technicianId,
        'priority' => $priorityValue,
    ]);

    createNotification($pdo, $technicianId, $ticketId, 'ticket_assigned', 'Nouveau ticket à traiter', 'Un ticket vous a été assigné.');
}

function assertChefBureauCanTransfer(PDO $pdo, array $user, int $ticketId): array
{
    $roleCode = $user['role_code'] ?? '';
    if (!in_array($roleCode, ['CHEF_BUREAU', 'SUPER_ADMIN'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Non autorisé.'], 403);
    }

    $stmt = $pdo->prepare(
        'SELECT id, status, assigned_technician_id FROM tickets WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $ticketId]);
    $ticket = $stmt->fetch();
    if (!$ticket) {
        jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
    }
    if ((int)$ticket['assigned_technician_id'] !== (int)$user['id'] && $roleCode !== 'SUPER_ADMIN') {
        jsonResponse(['ok' => false, 'message' => 'Ce ticket ne vous est pas assigné.'], 403);
    }
    if (!in_array($ticket['status'], ['assigne_technicien', 'en_cours'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Ce ticket ne peut pas être transmis à ce stade.'], 422);
    }

    return $ticket;
}

function listTransferAgentCandidates(PDO $pdo, array $user, int $ticketId): array
{
    assertChefBureauCanTransfer($pdo, $user, $ticketId);

    $serviceId = (int)($user['service_id'] ?? 0);
    if ($serviceId <= 0) {
        jsonResponse(['ok' => false, 'message' => 'Service DANTIC introuvable.'], 422);
    }

    $stmt = $pdo->prepare(
        'SELECT u.id, u.matricule, u.nom, u.prenom, u.service_label
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.is_active = 1
           AND u.service_id = :service_id
           AND r.code = \'TECHNICIEN\'
           AND u.id != :self_id
         ORDER BY u.nom ASC, u.prenom ASC'
    );
    $stmt->execute([
        'service_id' => $serviceId,
        'self_id' => (int)$user['id'],
    ]);

    return $stmt->fetchAll();
}

function transferTicketToAgent(PDO $pdo, array $user, int $ticketId, int $technicianId): void
{
    $ticket = assertChefBureauCanTransfer($pdo, $user, $ticketId);

    if ($technicianId <= 0 || $technicianId === (int)$user['id']) {
        jsonResponse(['ok' => false, 'message' => 'Agent invalide.'], 422);
    }

    $serviceId = (int)($user['service_id'] ?? 0);
    $techStmt = $pdo->prepare(
        'SELECT u.id FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.id = :id AND u.is_active = 1 AND u.service_id = :service_id AND r.code = \'TECHNICIEN\''
    );
    $techStmt->execute(['id' => $technicianId, 'service_id' => $serviceId]);
    if (!$techStmt->fetch()) {
        jsonResponse(['ok' => false, 'message' => 'Agent introuvable dans votre service.'], 404);
    }

    $fromStatus = $ticket['status'];
    $upd = $pdo->prepare(
        'UPDATE tickets SET assigned_technician_id = :tech_id, status = :status, updated_at = NOW() WHERE id = :id'
    );
    $upd->execute([
        'tech_id' => $technicianId,
        'status' => 'assigne_technicien',
        'id' => $ticketId,
    ]);

    clearCoInterventionsForTicket($pdo, $ticketId);
    logTicketEvent($pdo, $ticketId, (int)$user['id'], 'ticket_transferred', $fromStatus, 'assigne_technicien', [
        'technician_id' => $technicianId,
    ]);

    $chefName = trim(($user['prenom'] ?? '') . ' ' . ($user['nom'] ?? ''));
    createNotification(
        $pdo,
        $technicianId,
        $ticketId,
        'ticket_transferred',
        'Ticket transmis',
        $chefName !== ''
            ? "{$chefName} (chef de bureau) vous a transmis un ticket."
            : 'Un chef de bureau vous a transmis un ticket.'
    );
}

function setPriority(PDO $pdo, int $ticketId, string $priority, int $actorId, ?string $slaDueAt): void
{
    $priority = normalizePriority($priority);
    if (!in_array($priority, TICKET_PRIORITIES, true)) {
        jsonResponse(['ok' => false, 'message' => 'Priorité invalide.'], 422);
    }

    $stmt = $pdo->prepare(
        'UPDATE tickets SET priority = :priority, priority_set_by = :actor_id, sla_due_at = :sla_due_at, updated_at = NOW() WHERE id = :id'
    );
    $stmt->execute([
        'priority' => $priority,
        'actor_id' => $actorId,
        'sla_due_at' => $slaDueAt,
        'id' => $ticketId,
    ]);
}

function takeChargeTicket(PDO $pdo, array $user, int $ticketId): void
{
    $ticketStmt = $pdo->prepare('SELECT status, assigned_technician_id FROM tickets WHERE id = :id');
    $ticketStmt->execute(['id' => $ticketId]);
    $ticket = $ticketStmt->fetch();
    if (!$ticket) {
        jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
    }
    if ((int)$ticket['assigned_technician_id'] !== (int)$user['id'] && ($user['role_code'] ?? '') !== 'SUPER_ADMIN') {
        jsonResponse(['ok' => false, 'message' => 'Ce ticket ne vous est pas assigné.'], 403);
    }
    if ($ticket['status'] !== 'assigne_technicien') {
        jsonResponse(['ok' => false, 'message' => 'Ce ticket ne peut pas être pris en charge.'], 422);
    }

    $stmt = $pdo->prepare('UPDATE tickets SET status = :status, updated_at = NOW() WHERE id = :id');
    $stmt->execute(['status' => 'en_cours', 'id' => $ticketId]);
    logTicketEvent($pdo, $ticketId, (int)$user['id'], 'take_charge', 'assigne_technicien', 'en_cours');
}

function releaseTicketToPool(PDO $pdo, array $user, int $ticketId): void
{
    $roleCode = $user['role_code'] ?? '';
    if (!in_array($roleCode, ['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Non autorisé.'], 403);
    }

    $ticketStmt = $pdo->prepare(
        'SELECT t.id, t.status, t.assigned_technician_id, t.routed_service_id, t.assigned_chef_id,
                uc.service_id AS chef_service_id
         FROM tickets t
         LEFT JOIN users uc ON uc.id = t.assigned_chef_id
         WHERE t.id = :id'
    );
    $ticketStmt->execute(['id' => $ticketId]);
    $ticket = $ticketStmt->fetch();
    if (!$ticket) {
        jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
    }
    if ((int)$ticket['assigned_technician_id'] !== (int)$user['id'] && $roleCode !== 'SUPER_ADMIN') {
        jsonResponse(['ok' => false, 'message' => 'Ce ticket ne vous est pas assigné.'], 403);
    }
    if (!in_array($ticket['status'], ['assigne_technicien', 'en_cours'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Ce ticket ne peut pas être remis à la file.'], 422);
    }

    $serviceId = (int)($user['service_id'] ?? 0);
    if ($roleCode !== 'SUPER_ADMIN' && $serviceId > 0) {
        $effectiveService = (int)($ticket['assigned_chef_id']
            ? ($ticket['chef_service_id'] ?? 0)
            : ($ticket['routed_service_id'] ?? 0));
        if ($effectiveService !== $serviceId) {
            jsonResponse(['ok' => false, 'message' => 'Ce ticket n\'appartient pas à votre service.'], 403);
        }
    }

    $fromStatus = $ticket['status'];
    $stmt = $pdo->prepare(
        'UPDATE tickets SET assigned_technician_id = NULL, status = :status, updated_at = NOW() WHERE id = :id'
    );
    $stmt->execute(['status' => 'chez_chef_service', 'id' => $ticketId]);
    logTicketEvent($pdo, $ticketId, (int)$user['id'], 'ticket_released', $fromStatus, 'chez_chef_service');
    clearCoInterventionsForTicket($pdo, $ticketId);
}

function assertTicketClosableByAssignee(PDO $pdo, array $user, int $ticketId): array
{
    $stmt = $pdo->prepare(
        'SELECT id, status, assigned_technician_id FROM tickets WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $ticketId]);
    $ticket = $stmt->fetch();
    if (!$ticket) {
        jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
    }
    if ((int)$ticket['assigned_technician_id'] !== (int)$user['id'] && ($user['role_code'] ?? '') !== 'SUPER_ADMIN') {
        jsonResponse(['ok' => false, 'message' => 'Ce ticket ne vous est pas assigné.'], 403);
    }
    if ($ticket['status'] !== 'en_cours') {
        jsonResponse(['ok' => false, 'message' => 'Ce ticket ne peut pas être clôturé.'], 422);
    }

    return $ticket;
}

function resolveTicket(PDO $pdo, array $user, int $ticketId): void
{
    $ticket = assertTicketClosableByAssignee($pdo, $user, $ticketId);
    $fromStatus = $ticket['status'];
    $stmt = $pdo->prepare('UPDATE tickets SET status = :status, closed_at = NOW(), updated_at = NOW() WHERE id = :id');
    $stmt->execute(['status' => 'resolu', 'id' => $ticketId]);
    logTicketEvent($pdo, $ticketId, (int)$user['id'], 'ticket_resolved', $fromStatus, 'resolu');
    notifyCoIntervenantsTicketClosed($pdo, $ticketId, (int)$user['id'], 'résolu');
}

function closeUnresolvedTicket(PDO $pdo, array $user, int $ticketId): void
{
    $ticket = assertTicketClosableByAssignee($pdo, $user, $ticketId);
    $fromStatus = $ticket['status'];
    $stmt = $pdo->prepare('UPDATE tickets SET status = :status, closed_at = NOW(), updated_at = NOW() WHERE id = :id');
    $stmt->execute(['status' => 'non_resolu', 'id' => $ticketId]);
    logTicketEvent($pdo, $ticketId, (int)$user['id'], 'ticket_unresolved', $fromStatus, 'non_resolu');
    notifyCoIntervenantsTicketClosed($pdo, $ticketId, (int)$user['id'], 'non résolu');
}

function reopenUnresolvedTicket(PDO $pdo, array $user, int $ticketId): void
{
    $roleCode = $user['role_code'] ?? '';
    if (!in_array($roleCode, ['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Non autorisé.'], 403);
    }

    $stmt = $pdo->prepare(
        'SELECT id, status, assigned_technician_id FROM tickets WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $ticketId]);
    $ticket = $stmt->fetch();
    if (!$ticket) {
        jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
    }
    if ((int)$ticket['assigned_technician_id'] !== (int)$user['id'] && $roleCode !== 'SUPER_ADMIN') {
        jsonResponse(['ok' => false, 'message' => 'Ce ticket ne vous est pas assigné.'], 403);
    }
    if ($ticket['status'] !== 'non_resolu') {
        jsonResponse(['ok' => false, 'message' => 'Seuls les tickets clôturés non résolus peuvent être réouverts.'], 422);
    }

    $upd = $pdo->prepare(
        'UPDATE tickets SET status = :status, closed_at = NULL, sla_due_at = NULL, report_submitted_to_director_at = NULL, updated_at = NOW() WHERE id = :id'
    );
    $upd->execute(['status' => 'en_cours', 'id' => $ticketId]);

    $invalidateReports = $pdo->prepare(
        "UPDATE resolution_reports SET status = 'brouillon', updated_at = NOW() WHERE ticket_id = :id AND status != 'brouillon'"
    );
    $invalidateReports->execute(['id' => $ticketId]);

    logTicketEvent($pdo, $ticketId, (int)$user['id'], 'ticket_reopened', 'non_resolu', 'en_cours');
    reinstateCoIntervenantsOnReopen($pdo, $ticketId);
    clearAgentArchivesForTicket($pdo, $ticketId);
    notifyCoIntervenantsTicketReopened($pdo, $ticketId, (int)$user['id']);
}

function trackPublicTicket(PDO $pdo, string $ticketNumber, string $token): array
{
    $stmt = $pdo->prepare(
        'SELECT t.id, t.ticket_number, t.status, t.created_at, t.closed_at,
                t.reporter_full_name, t.description, c.label AS category_label
         FROM tickets t
         JOIN ticket_categories c ON c.id = t.category_id
         WHERE t.ticket_number = :number AND t.tracking_token = :token
         LIMIT 1'
    );
    $stmt->execute(['number' => $ticketNumber, 'token' => $token]);
    $ticket = $stmt->fetch();
    if (!$ticket) {
        jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
    }

    $eventsStmt = $pdo->prepare(
        'SELECT event_type, to_status, created_at FROM ticket_events WHERE ticket_id = :id ORDER BY created_at ASC'
    );
    $eventsStmt->execute(['id' => (int)$ticket['id']]);
    $events = $eventsStmt->fetchAll();

    $steps = buildPublicTimeline($ticket, $events);

    return [
        'ticket_number' => $ticket['ticket_number'],
        'status_label' => mapPublicStatusLabel($ticket['status']),
        'category_label' => $ticket['category_label'],
        'description' => $ticket['description'],
        'reporter_full_name' => $ticket['reporter_full_name'],
        'submitted_at' => $ticket['created_at'],
        'timeline' => $steps,
    ];
}

function mapPublicStatusLabel(string $status): string
{
    return match ($status) {
        'nouveau', 'chez_sous_direction', 'chez_chef_service' => 'Reçu',
        'assigne_technicien', 'en_cours' => 'En traitement',
        'resolu' => 'Résolu',
        'non_resolu' => 'Non résolu',
        'archive' => 'Clôturé',
        default => 'En traitement',
    };
}

function buildPublicTimeline(array $ticket, array $events): array
{
    $defs = [
        ['code' => 'submitted', 'label' => 'Ticket soumis', 'match' => ['ticket_submitted']],
        ['code' => 'received', 'label' => 'Reçu par DANTIC', 'match' => ['ticket_routed']],
        ['code' => 'assigned', 'label' => 'Pris en charge', 'match' => ['ticket_assigned', 'ticket_claimed', 'take_charge']],
        ['code' => 'resolved', 'label' => 'Problème résolu', 'match' => ['ticket_resolved', 'ticket_unresolved']],
    ];

    $timeline = [];
    foreach ($defs as $def) {
        $at = null;
        $done = false;
        foreach ($events as $ev) {
            if (in_array($ev['event_type'], $def['match'], true)) {
                $done = true;
                $at = $ev['created_at'];
            }
        }
        if ($def['code'] === 'resolved' && in_array($ticket['status'], ['resolu', 'non_resolu'], true)) {
            $done = true;
            $at = $ticket['closed_at'] ?? $at;
            if ($ticket['status'] === 'non_resolu') {
                $def['label'] = 'Non résolu';
            }
        }
        $timeline[] = [
            'code' => $def['code'],
            'label' => $def['label'],
            'at' => $at,
            'done' => $done,
        ];
    }
    return $timeline;
}

function archiveOldResolvedTickets(PDO $pdo): int
{
    $stmt = $pdo->prepare(
        "UPDATE tickets
         SET status = 'archive', archived_at = NOW(), updated_at = NOW()
         WHERE status = 'resolu'
           AND closed_at IS NOT NULL
           AND closed_at < DATE_SUB(NOW(), INTERVAL 30 DAY)"
    );
    $stmt->execute();
    return $stmt->rowCount();
}

function listUnresolvedConstraintTickets(PDO $pdo, array $user, int $page, int $perPage): array
{
    $role = $user['role_code'] ?? '';
    if (!in_array($role, ['SOUS_DIRECTEUR', 'DIRECTEUR', 'SUPER_ADMIN'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Non autorisé.'], 403);
    }

    $where = ["t.status = 'non_resolu'"];
    $params = [];
    if ($role === 'SOUS_DIRECTEUR') {
        $where[] = 't.sub_directorate_id = :sd_id';
        $params['sd_id'] = (int)($user['sub_directorate_id'] ?? 0);
    }

    $whereSql = ' WHERE ' . implode(' AND ', $where);
    $page = max(1, $page);
    $perPage = min(50, max(5, $perPage));
    $offset = ($page - 1) * $perPage;

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM tickets t{$whereSql}");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $sql = <<<SQL
SELECT t.id, t.ticket_number, t.description, t.closed_at, t.priority, t.assigned_technician_id,
       c.label AS category_label, sd.code AS sub_directorate_code,
       u2.prenom AS tech_prenom, u2.nom AS tech_nom,
       (SELECT rr.body FROM resolution_reports rr
         WHERE rr.ticket_id = t.id ORDER BY rr.version DESC, rr.created_at DESC LIMIT 1) AS latest_report_body
FROM tickets t
JOIN ticket_categories c ON c.id = t.category_id
LEFT JOIN sub_directorates sd ON sd.id = t.sub_directorate_id
LEFT JOIN users u2 ON u2.id = t.assigned_technician_id
{$whereSql}
ORDER BY t.closed_at DESC, t.id DESC
LIMIT {$perPage} OFFSET {$offset}
SQL;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $tickets = $stmt->fetchAll();

    foreach ($tickets as &$ticket) {
        $cStmt = $pdo->prepare(
            'SELECT tc.id, tc.body, tc.author_role, tc.created_at, u.prenom, u.nom
             FROM ticket_consignes tc
             JOIN users u ON u.id = tc.author_id
             WHERE tc.ticket_id = :ticket_id
             ORDER BY tc.created_at ASC'
        );
        $cStmt->execute(['ticket_id' => (int)$ticket['id']]);
        $ticket['consignes'] = $cStmt->fetchAll();
    }
    unset($ticket);

    return [
        'tickets' => $tickets,
        'pagination' => [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'total_pages' => (int)ceil($total / max(1, $perPage)),
        ],
    ];
}

function addTicketConsigne(PDO $pdo, array $user, int $ticketId, string $body): void
{
    $role = $user['role_code'] ?? '';
    if (!in_array($role, ['SOUS_DIRECTEUR', 'DIRECTEUR', 'SUPER_ADMIN'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Non autorisé.'], 403);
    }
    $body = trim($body);
    if ($body === '') {
        jsonResponse(['ok' => false, 'message' => 'Consigne requise.'], 422);
    }

    $stmt = $pdo->prepare(
        'SELECT id, status, sub_directorate_id, assigned_technician_id FROM tickets WHERE id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $ticketId]);
    $ticket = $stmt->fetch();
    if (!$ticket) {
        jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
    }
    if ($ticket['status'] !== 'non_resolu') {
        jsonResponse(['ok' => false, 'message' => 'Consignes réservées aux tickets non résolus.'], 422);
    }
    if ($role === 'SOUS_DIRECTEUR' && (int)$ticket['sub_directorate_id'] !== (int)($user['sub_directorate_id'] ?? 0)) {
        jsonResponse(['ok' => false, 'message' => 'Ticket hors périmètre.'], 403);
    }

    $ins = $pdo->prepare(
        'INSERT INTO ticket_consignes (ticket_id, author_id, author_role, body) VALUES (:ticket_id, :author_id, :author_role, :body)'
    );
    $ins->execute([
        'ticket_id' => $ticketId,
        'author_id' => (int)$user['id'],
        'author_role' => $role,
        'body' => $body,
    ]);

    if (!empty($ticket['assigned_technician_id'])) {
        createNotification(
            $pdo,
            (int)$ticket['assigned_technician_id'],
            $ticketId,
            'ticket_consigne',
            'Nouvelle consigne',
            'Une consigne a été ajoutée sur un ticket non résolu.'
        );
    }
}
