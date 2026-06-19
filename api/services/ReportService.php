<?php
declare(strict_types=1);

require_once __DIR__ . '/NotificationService.php';
require_once __DIR__ . '/CoInterventionService.php';

function sqlLatestReportIdForTicket(): string
{
    return '(SELECT lr.id FROM resolution_reports lr WHERE lr.ticket_id = t.id ORDER BY lr.version DESC, lr.created_at DESC LIMIT 1)';
}

function sqlLastRejectValidatorRole(): string
{
    return '(SELECT rv.validator_role FROM report_validations rv WHERE rv.report_id = rr.id AND rv.decision = \'rejete\' ORDER BY rv.created_at DESC LIMIT 1)';
}

function sqlChefReportPendingCondition(): string
{
    $lastReject = sqlLastRejectValidatorRole();
    return "(rr.status = 'soumis' OR (rr.status = 'rejete' AND {$lastReject} = 'SOUS_DIRECTEUR'))";
}

function sqlSubDirectorateReportPendingCondition(): string
{
    $lastReject = sqlLastRejectValidatorRole();
    return "(rr.status = 'valide_chef' OR (rr.status = 'rejete' AND {$lastReject} IN ('DIRECTEUR', 'SUPER_ADMIN')))";
}

function submitResolutionReport(PDO $pdo, int $ticketId, int $authorId, string $body): int
{
    if (trim($body) === '') {
        jsonResponse(['ok' => false, 'message' => 'Le rapport ne peut pas être vide.'], 422);
    }

    $stmt = $pdo->prepare('SELECT MAX(version) AS current_version FROM resolution_reports WHERE ticket_id = :ticket_id');
    $stmt->execute(['ticket_id' => $ticketId]);
    $currentVersion = (int)($stmt->fetch()['current_version'] ?? 0);
    $nextVersion = $currentVersion + 1;

    $insert = $pdo->prepare(
        'INSERT INTO resolution_reports (ticket_id, author_id, body, version, status) VALUES (:ticket_id, :author_id, :body, :version, :status)'
    );
    $insert->execute([
        'ticket_id' => $ticketId,
        'author_id' => $authorId,
        'body' => $body,
        'version' => $nextVersion,
        'status' => 'soumis',
    ]);

    $reportId = (int)$pdo->lastInsertId();

    $ticketStmt = $pdo->prepare('SELECT assigned_chef_id FROM tickets WHERE id = :id');
    $ticketStmt->execute(['id' => $ticketId]);
    $ticket = $ticketStmt->fetch();
    if ($ticket && !empty($ticket['assigned_chef_id'])) {
        createNotification(
            $pdo,
            (int)$ticket['assigned_chef_id'],
            $ticketId,
            'report_submitted',
            'Nouveau rapport agent',
            'Un rapport de résolution est prêt pour validation.'
        );
    }

    return $reportId;
}

function resolveReportStatus(string $validatorRole, string $decision): string
{
    if ($decision === 'rejete') {
        return 'rejete';
    }

    return match ($validatorRole) {
        'CHEF_SERVICE' => 'valide_chef',
        'SOUS_DIRECTEUR' => 'valide_sd',
        'DIRECTEUR', 'SUPER_ADMIN' => 'valide_directeur',
        default => 'soumis',
    };
}

function normalizeArchivePriority(?string $priority): string
{
    $p = (string)($priority ?? 'normale');
    if ($p === 'bloquant' || $p === 'urgent') {
        return 'urgent';
    }
    if ($p === 'haute' || $p === 'elevee') {
        return 'elevee';
    }
    if (in_array($p, ['urgent', 'elevee', 'normale'], true)) {
        return $p;
    }
    return 'normale';
}

function assertUserCanViewTicketReports(PDO $pdo, array $user, int $ticketId): void
{
    $role = $user['role_code'] ?? '';
    $userId = (int)($user['id'] ?? 0);

    if (in_array($role, ['SUPER_ADMIN'], true)) {
        return;
    }

    $stmt = $pdo->prepare(
        'SELECT t.id, t.assigned_technician_id, t.assigned_chef_id, t.sub_directorate_id,
                EXISTS(
                  SELECT 1 FROM ticket_co_interventions tci
                  WHERE tci.ticket_id = t.id AND tci.agent_id = :uid AND tci.status = \'accepted\'
                ) AS is_co
         FROM tickets t WHERE t.id = :id LIMIT 1'
    );
    $stmt->execute(['id' => $ticketId, 'uid' => $userId]);
    $ticket = $stmt->fetch();
    if (!$ticket) {
        jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
    }

    if ($role === 'TECHNICIEN' || $role === 'CHEF_BUREAU') {
        if ((int)$ticket['assigned_technician_id'] === $userId || (int)$ticket['is_co'] > 0) {
            return;
        }
        jsonResponse(['ok' => false, 'message' => 'Accès refusé à ce ticket.'], 403);
    }

    if ($role === 'CHEF_SERVICE') {
        if ((int)$ticket['assigned_chef_id'] === $userId) {
            return;
        }
        jsonResponse(['ok' => false, 'message' => 'Accès refusé à ce ticket.'], 403);
    }

    if ($role === 'SOUS_DIRECTEUR') {
        if ((int)$ticket['sub_directorate_id'] === (int)($user['sub_directorate_id'] ?? 0)) {
            return;
        }
        jsonResponse(['ok' => false, 'message' => 'Ticket hors de votre sous-direction.'], 403);
    }

    if ($role === 'DIRECTEUR') {
        $latestId = sqlLatestReportIdForTicket();
        $check = $pdo->prepare(
            "SELECT 1 FROM tickets t
             WHERE t.id = :ticket_id
               AND (
                 EXISTS (SELECT 1 FROM rapports_valides rv WHERE rv.ticket_id = t.id)
                 OR EXISTS (
                   SELECT 1 FROM resolution_reports rr
                   WHERE rr.ticket_id = t.id AND rr.id = {$latestId}
                     AND rr.status IN ('valide_sd', 'valide_directeur', 'rejete')
                 )
               )
             LIMIT 1"
        );
        $check->execute(['ticket_id' => $ticketId]);
        if ($check->fetch()) {
            return;
        }
        jsonResponse(['ok' => false, 'message' => 'Rapport non accessible à ce stade.'], 403);
    }

    jsonResponse(['ok' => false, 'message' => 'Accès refusé.'], 403);
}

function archiveValidatedReport(PDO $pdo, int $reportId, int $validatorId): void
{
    $stmt = $pdo->prepare(
        'SELECT rr.id AS report_id, rr.body AS report_body, rr.ticket_id,
                t.ticket_number, t.sub_directorate_id, t.priority, t.description AS ticket_description,
                t.reporter_full_name, c.label AS category_label, sd.code AS sub_directorate_code,
                CONCAT(u.prenom, " ", u.nom) AS author_name
         FROM resolution_reports rr
         JOIN tickets t ON t.id = rr.ticket_id
         JOIN ticket_categories c ON c.id = t.category_id
         JOIN users u ON u.id = rr.author_id
         LEFT JOIN sub_directorates sd ON sd.id = t.sub_directorate_id
         WHERE rr.id = :id'
    );
    $stmt->execute(['id' => $reportId]);
    $row = $stmt->fetch();
    if (!$row) {
        return;
    }

    $insert = $pdo->prepare(
        'INSERT INTO rapports_valides
          (report_id, ticket_id, ticket_number, sub_directorate_id, sub_directorate_code, priority,
           category_label, reporter_full_name, ticket_description, report_body, author_name, validated_by)
         VALUES
          (:report_id, :ticket_id, :ticket_number, :sub_directorate_id, :sub_directorate_code, :priority,
           :category_label, :reporter_full_name, :ticket_description, :report_body, :author_name, :validated_by)
         ON DUPLICATE KEY UPDATE
           validated_by = VALUES(validated_by),
           validated_at = CURRENT_TIMESTAMP,
           report_body = VALUES(report_body),
           priority = VALUES(priority)'
    );
    $insert->execute([
        'report_id' => (int)$row['report_id'],
        'ticket_id' => (int)$row['ticket_id'],
        'ticket_number' => $row['ticket_number'],
        'sub_directorate_id' => $row['sub_directorate_id'],
        'sub_directorate_code' => $row['sub_directorate_code'],
        'priority' => normalizeArchivePriority($row['priority'] ?? 'normale'),
        'category_label' => $row['category_label'],
        'reporter_full_name' => $row['reporter_full_name'],
        'ticket_description' => $row['ticket_description'],
        'report_body' => $row['report_body'],
        'author_name' => $row['author_name'],
        'validated_by' => $validatorId,
    ]);
}

function assertValidatorCanProcessReport(array $report, string $validatorRole, int $validatorId): void
{
    if (in_array($validatorRole, ['SUPER_ADMIN'], true)) {
        return;
    }

    if ($validatorRole === 'CHEF_SERVICE') {
        if ((int)$report['assigned_chef_id'] !== $validatorId) {
            jsonResponse(['ok' => false, 'message' => 'Rapport hors de votre périmètre.'], 403);
        }
        if (!in_array($report['ticket_status'], ['resolu', 'non_resolu'], true)) {
            jsonResponse(['ok' => false, 'message' => 'Le ticket doit être clôturé par l\'agent.'], 422);
        }
        $check = in_array($report['status'], ['soumis'], true)
            || ($report['status'] === 'rejete' && reportLastRejectorRole($report) === 'SOUS_DIRECTEUR');
        if (!$check) {
            jsonResponse(['ok' => false, 'message' => 'Ce rapport n\'est pas en attente de validation chef.'], 422);
        }
        return;
    }

    if ($validatorRole === 'SOUS_DIRECTEUR') {
        if ((int)$report['sub_directorate_id'] !== (int)($report['validator_sub_directorate_id'] ?? 0)) {
            jsonResponse(['ok' => false, 'message' => 'Rapport hors de votre sous-direction.'], 403);
        }
        $ok = $report['status'] === 'valide_chef'
            || ($report['status'] === 'rejete' && in_array(reportLastRejectorRole($report), ['DIRECTEUR', 'SUPER_ADMIN'], true));
        if (!$ok) {
            jsonResponse(['ok' => false, 'message' => 'Ce rapport n\'est pas en attente de validation sous-direction.'], 422);
        }
        return;
    }

    if (in_array($validatorRole, ['DIRECTEUR', 'SUPER_ADMIN'], true)) {
        if ($report['status'] !== 'valide_sd') {
            jsonResponse(['ok' => false, 'message' => 'Ce rapport n\'est pas en attente de validation direction.'], 422);
        }
    }
}

function reportLastRejectorRole(array $report): ?string
{
    return $report['last_reject_role'] ?? null;
}

function validateReport(PDO $pdo, int $reportId, int $validatorId, string $validatorRole, string $decision, ?string $comment): void
{
    if (!in_array($decision, ['approuve', 'rejete'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Décision invalide.'], 422);
    }

    if ($decision === 'rejete' && trim((string)$comment) === '') {
        jsonResponse(['ok' => false, 'message' => 'Un commentaire est obligatoire pour rejeter le rapport.'], 422);
    }

    $lastRejectSql = sqlLastRejectValidatorRole();
    $reportStmt = $pdo->prepare(
        "SELECT rr.id, rr.author_id, rr.ticket_id, rr.status, t.assigned_chef_id, t.sub_directorate_id, t.status AS ticket_status,
                {$lastRejectSql} AS last_reject_role
         FROM resolution_reports rr
         JOIN tickets t ON t.id = rr.ticket_id
         WHERE rr.id = :id"
    );
    $reportStmt->execute(['id' => $reportId]);
    $report = $reportStmt->fetch();
    if (!$report) {
        jsonResponse(['ok' => false, 'message' => 'Rapport introuvable.'], 404);
    }

    $report['validator_sub_directorate_id'] = null;
    if ($validatorRole === 'SOUS_DIRECTEUR') {
        $sdStmt = $pdo->prepare('SELECT sub_directorate_id FROM users WHERE id = :id');
        $sdStmt->execute(['id' => $validatorId]);
        $sdUser = $sdStmt->fetch();
        $report['validator_sub_directorate_id'] = $sdUser['sub_directorate_id'] ?? null;
    }

    assertValidatorCanProcessReport($report, $validatorRole, $validatorId);

    $newStatus = resolveReportStatus($validatorRole, $decision);

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment)
             VALUES (:report_id, :validator_id, :validator_role, :decision, :comment)'
        );
        $stmt->execute([
            'report_id' => $reportId,
            'validator_id' => $validatorId,
            'validator_role' => $validatorRole,
            'decision' => $decision,
            'comment' => $comment,
        ]);

        $update = $pdo->prepare('UPDATE resolution_reports SET status = :status, updated_at = NOW() WHERE id = :id');
        $update->execute([
            'status' => $newStatus,
            'id' => $reportId,
        ]);

        if ($decision === 'approuve' && in_array($validatorRole, ['DIRECTEUR', 'SUPER_ADMIN'], true)) {
            archiveValidatedReport($pdo, $reportId, $validatorId);
        }

        if ($decision === 'approuve' && $validatorRole === 'CHEF_SERVICE') {
            archiveTicketForFieldStaff($pdo, (int)$report['ticket_id']);
        }

        if ($decision === 'rejete' && in_array($validatorRole, ['CHEF_SERVICE', 'SOUS_DIRECTEUR'], true)) {
            clearAgentArchivesForTicket($pdo, (int)$report['ticket_id']);
        }

        if ($decision === 'approuve' && $validatorRole === 'SOUS_DIRECTEUR') {
            $ticketUpdate = $pdo->prepare(
                'UPDATE tickets SET report_submitted_to_director_at = NOW(), updated_at = NOW() WHERE id = :id'
            );
            $ticketUpdate->execute(['id' => (int)$report['ticket_id']]);
        }

        if ($decision === 'rejete' && in_array($validatorRole, ['DIRECTEUR', 'SUPER_ADMIN'], true)) {
            $resetSubmitted = $pdo->prepare(
                'UPDATE tickets SET report_submitted_to_director_at = NULL, updated_at = NOW() WHERE id = :id'
            );
            $resetSubmitted->execute(['id' => (int)$report['ticket_id']]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }

    if ($decision === 'approuve') {
        if ($validatorRole === 'CHEF_SERVICE') {
            notifyByRole(
                $pdo,
                'SOUS_DIRECTEUR',
                (int)$report['ticket_id'],
                'report_waiting_validation',
                'Rapport en attente',
                'Un rapport validé par le chef attend votre validation.',
                (int)$report['sub_directorate_id']
            );
        } elseif ($validatorRole === 'SOUS_DIRECTEUR') {
            notifyByRole(
                $pdo,
                'DIRECTEUR',
                (int)$report['ticket_id'],
                'report_waiting_validation',
                'Nouveau rapport remonté',
                'Un rapport validé par la sous-direction est prêt.'
            );
        } elseif (in_array($validatorRole, ['DIRECTEUR', 'SUPER_ADMIN'], true)) {
            createNotification(
                $pdo,
                (int)$report['author_id'],
                (int)$report['ticket_id'],
                'report_approved',
                'Rapport approuvé',
                'Votre rapport a été validé par la direction.'
            );
        }
        return;
    }

    if ($validatorRole === 'CHEF_SERVICE') {
        createNotification(
            $pdo,
            (int)$report['author_id'],
            (int)$report['ticket_id'],
            'report_rejected',
            'Rapport rejeté par le chef',
            $comment ?: 'Veuillez ajouter plus de détails.'
        );
    } elseif ($validatorRole === 'SOUS_DIRECTEUR' && !empty($report['assigned_chef_id'])) {
        createNotification(
            $pdo,
            (int)$report['assigned_chef_id'],
            (int)$report['ticket_id'],
            'report_rejected',
            'Rapport rejeté par la sous-direction',
            $comment ?: 'Rapport à compléter avant remontée.'
        );
    } elseif (in_array($validatorRole, ['DIRECTEUR', 'SUPER_ADMIN'], true)) {
        notifyByRole(
            $pdo,
            'SOUS_DIRECTEUR',
            (int)$report['ticket_id'],
            'report_rejected',
            'Rapport rejeté par la direction',
            $comment ?: 'Merci de renvoyer un rapport plus détaillé.',
            (int)$report['sub_directorate_id']
        );
    }
}

function listValidationsForReport(PDO $pdo, int $reportId): array
{
    $sql = <<<SQL
SELECT rv.decision, rv.comment, rv.validator_role, rv.created_at,
       CONCAT(u.prenom, ' ', u.nom) AS validator_name
FROM report_validations rv
JOIN users u ON u.id = rv.validator_id
WHERE rv.report_id = :report_id
ORDER BY rv.created_at ASC
SQL;
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['report_id' => $reportId]);
    return $stmt->fetchAll();
}

function listReportsForTicket(PDO $pdo, int $ticketId): array
{
    $sql = <<<SQL
SELECT rr.*, CONCAT(u.prenom, ' ', u.nom) AS author_name
FROM resolution_reports rr
JOIN users u ON u.id = rr.author_id
WHERE rr.ticket_id = :ticket_id
ORDER BY rr.version DESC, rr.created_at DESC
SQL;
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['ticket_id' => $ticketId]);
    $reports = $stmt->fetchAll();
    foreach ($reports as &$report) {
        $report['validations'] = listValidationsForReport($pdo, (int)$report['id']);
    }
    unset($report);
    return $reports;
}

function listReportsForDirector(PDO $pdo): array
{
    $sql = <<<SQL
SELECT rr.id, rr.ticket_id, rr.body, rr.version, rr.status, rr.created_at,
       CONCAT(u.prenom, ' ', u.nom) AS author_name,
       t.ticket_number, t.priority, t.description AS ticket_description,
       t.reporter_full_name, c.label AS category_label, t.created_at AS ticket_created_at,
       sd.code AS sub_directorate_code
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN ticket_categories c ON c.id = t.category_id
JOIN users u ON u.id = rr.author_id
LEFT JOIN sub_directorates sd ON sd.id = t.sub_directorate_id
WHERE rr.status = 'valide_sd'
ORDER BY FIELD(t.priority, 'urgent', 'elevee', 'normale'), rr.created_at DESC
SQL;
    $stmt = $pdo->query($sql);
    return $stmt->fetchAll();
}

function parseSimplePaginationFilters(): array
{
    return [
        'page' => max(1, (int)($_GET['page'] ?? 1)),
        'per_page' => min(50, max(5, (int)($_GET['per_page'] ?? 10))),
    ];
}

function parsePendingReportFilters(): array
{
    $filters = parseSimplePaginationFilters();
    $filters['author_id'] = max(0, (int)($_GET['author_id'] ?? 0));
    $filters['reporter_direction'] = trim((string)($_GET['reporter_direction'] ?? ''));
    $filters['category_id'] = max(0, (int)($_GET['category_id'] ?? 0));
    $filters['priority'] = trim((string)($_GET['priority'] ?? ''));
    $filters['date_filter'] = trim((string)($_GET['date_filter'] ?? ''));
    $filters['closed_date_filter'] = trim((string)($_GET['closed_date_filter'] ?? ''));
    $filters['search'] = trim((string)($_GET['search'] ?? ''));
    return $filters;
}

function appendPendingReportListFilters(string &$where, array &$params, array $filters, string $dateColumn = 'rr.created_at'): void
{
    if ($filters['author_id'] > 0) {
        $where .= ' AND rr.author_id = :filter_author_id';
        $params['filter_author_id'] = $filters['author_id'];
    }
    if ($filters['reporter_direction'] !== '') {
        $where .= ' AND t.reporter_direction = :filter_reporter_direction';
        $params['filter_reporter_direction'] = $filters['reporter_direction'];
    }
    if ($filters['category_id'] > 0) {
        $where .= ' AND t.category_id = :filter_category_id';
        $params['filter_category_id'] = $filters['category_id'];
    }
    if ($filters['priority'] !== '' && in_array($filters['priority'], ['urgent', 'bloquant', 'elevee', 'haute', 'normale'], true)) {
        $where .= ' AND t.priority = :filter_priority';
        $params['filter_priority'] = $filters['priority'];
    }
    if ($filters['search'] !== '') {
        $where .= ' AND (t.ticket_number LIKE :filter_search OR t.description LIKE :filter_search2 OR rr.body LIKE :filter_search3 OR t.reporter_full_name LIKE :filter_search4 OR CONCAT(u.prenom, \' \', u.nom) LIKE :filter_search5)';
        $needle = '%' . $filters['search'] . '%';
        $params['filter_search'] = $needle;
        $params['filter_search2'] = $needle;
        $params['filter_search3'] = $needle;
        $params['filter_search4'] = $needle;
        $params['filter_search5'] = $needle;
    }
    $dateFilter = $filters['date_filter'] ?? '';
    if ($dateFilter === 'today') {
        $where .= " AND DATE({$dateColumn}) = CURDATE()";
    } elseif ($dateFilter === 'week') {
        $where .= " AND {$dateColumn} >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
    } elseif ($dateFilter === 'month') {
        $where .= ' AND YEAR(' . $dateColumn . ') = YEAR(CURDATE()) AND MONTH(' . $dateColumn . ') = MONTH(CURDATE())';
    } elseif ($dateFilter === 'year') {
        $where .= ' AND YEAR(' . $dateColumn . ') = YEAR(CURDATE())';
    }

    $closedDateFilter = $filters['closed_date_filter'] ?? '';
    if ($closedDateFilter !== '' && $dateColumn !== 't.closed_at') {
        if ($closedDateFilter === 'today') {
            $where .= ' AND DATE(t.closed_at) = CURDATE()';
        } elseif ($closedDateFilter === 'week') {
            $where .= ' AND t.closed_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
        } elseif ($closedDateFilter === 'month') {
            $where .= ' AND YEAR(t.closed_at) = YEAR(CURDATE()) AND MONTH(t.closed_at) = MONTH(CURDATE())';
        } elseif ($closedDateFilter === 'year') {
            $where .= ' AND YEAR(t.closed_at) = YEAR(CURDATE())';
        }
    }
}

function sqlPendingReportSelectFields(): string
{
    return <<<SQL
SELECT rr.id, rr.ticket_id, rr.body, rr.version, rr.status, rr.created_at,
       rr.author_id,
       CONCAT(u.prenom, ' ', u.nom) AS author_name,
       t.ticket_number, t.priority, t.description AS ticket_description,
       t.reporter_full_name, t.reporter_direction,
       c.id AS category_id, c.label AS category_label,
       t.created_at AS ticket_created_at
SQL;
}

function getPendingReportFilterOptions(PDO $pdo, string $scope, array $userContext): array
{
    $latestId = sqlLatestReportIdForTicket();
    $params = [];
    if ($scope === 'chef_service') {
        $pending = sqlChefReportPendingCondition();
        $where = "t.assigned_chef_id = :chef_id
  AND t.status = 'resolu'
  AND rr.id = {$latestId}
  AND {$pending}";
        $params['chef_id'] = (int)($userContext['chef_id'] ?? 0);
    } elseif ($scope === 'sub_directorate') {
        $pending = sqlSubDirectorateReportPendingCondition();
        $where = "t.sub_directorate_id = :sub_directorate_id
  AND t.status = 'resolu'
  AND rr.id = {$latestId}
  AND {$pending}";
        $params['sub_directorate_id'] = (int)($userContext['sub_directorate_id'] ?? 0);
    } else {
        return ['authors' => [], 'directions' => [], 'categories' => []];
    }

    $baseFrom = "FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN ticket_categories c ON c.id = t.category_id
JOIN users u ON u.id = rr.author_id
WHERE {$where}";

    $authorsStmt = $pdo->prepare(
        "SELECT DISTINCT rr.author_id AS id, CONCAT(u.prenom, ' ', u.nom) AS label {$baseFrom} ORDER BY label"
    );
    $authorsStmt->execute($params);
    $authors = array_map(
        fn($row) => ['id' => (int)$row['id'], 'label' => (string)$row['label']],
        $authorsStmt->fetchAll()
    );

    $directionsStmt = $pdo->prepare(
        "SELECT DISTINCT COALESCE(NULLIF(TRIM(t.reporter_direction), ''), 'Non renseignée') AS label {$baseFrom} ORDER BY label"
    );
    $directionsStmt->execute($params);
    $directions = array_map(
        fn($row) => ['label' => (string)$row['label']],
        $directionsStmt->fetchAll()
    );

    $categoriesStmt = $pdo->prepare(
        "SELECT DISTINCT c.id, c.label {$baseFrom} ORDER BY c.label"
    );
    $categoriesStmt->execute($params);
    $categories = array_map(
        fn($row) => ['id' => (int)$row['id'], 'label' => (string)$row['label']],
        $categoriesStmt->fetchAll()
    );

    return [
        'authors' => $authors,
        'directions' => $directions,
        'categories' => $categories,
    ];
}

function parseReportPaginationFilters(): array
{
    $groupBy = (string)($_GET['group_by'] ?? 'month');
    if (!in_array($groupBy, ['week', 'month', 'year'], true)) {
        $groupBy = 'month';
    }
    return [
        'group_by' => $groupBy,
        'year' => (int)($_GET['year'] ?? date('Y')),
        'month' => (int)($_GET['month'] ?? date('n')),
        'week_start' => isset($_GET['week_start']) ? (string)$_GET['week_start'] : null,
        'week_end' => isset($_GET['week_end']) ? (string)$_GET['week_end'] : null,
        'page' => max(1, (int)($_GET['page'] ?? 1)),
        'per_page' => min(50, max(5, (int)($_GET['per_page'] ?? 15))),
    ];
}

function buildReportDateSql(string $dateColumn, array $filters): array
{
    $parts = [];
    $params = [];
    $groupBy = $filters['group_by'];
    $year = (int)$filters['year'];
    $month = (int)$filters['month'];

    if ($groupBy === 'year') {
        $parts[] = "YEAR({$dateColumn}) = :filter_year";
        $params['filter_year'] = $year;
    } elseif ($groupBy === 'month') {
        $parts[] = "YEAR({$dateColumn}) = :filter_year AND MONTH({$dateColumn}) = :filter_month";
        $params['filter_year'] = $year;
        $params['filter_month'] = $month;
    } elseif ($groupBy === 'week') {
        $weekStart = $filters['week_start'];
        $weekEnd = $filters['week_end'];
        if ($weekStart && $weekEnd && preg_match('/^\d{4}-\d{2}-\d{2}$/', $weekStart) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $weekEnd)) {
            $parts[] = "DATE({$dateColumn}) BETWEEN :week_start AND :week_end";
            $params['week_start'] = $weekStart;
            $params['week_end'] = $weekEnd;
        }
    }

    return [$parts, $params];
}

function paginationMeta(int $total, int $page, int $perPage): array
{
    return [
        'page' => $page,
        'per_page' => $perPage,
        'total' => $total,
        'total_pages' => $perPage > 0 ? (int)ceil($total / $perPage) : 0,
    ];
}

function listReportsForDirectorPaginated(PDO $pdo, array $filters): array
{
    $page = (int)$filters['page'];
    $perPage = (int)$filters['per_page'];
    $offset = ($page - 1) * $perPage;

    [$dateParts, $dateParams] = buildReportDateSql('rr.created_at', $filters);
    $where = "rr.status = 'valide_sd'";
    if ($dateParts) {
        $where .= ' AND ' . implode(' AND ', $dateParts);
    }

    $countSql = "SELECT COUNT(*) FROM resolution_reports rr JOIN tickets t ON t.id = rr.ticket_id WHERE {$where}";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($dateParams);
    $total = (int)$countStmt->fetchColumn();

    $sql = <<<SQL
SELECT rr.id, rr.ticket_id, rr.body, rr.version, rr.status, rr.created_at,
       CONCAT(u.prenom, ' ', u.nom) AS author_name,
       t.ticket_number, t.priority, t.description AS ticket_description,
       t.reporter_full_name, c.label AS category_label, t.created_at AS ticket_created_at,
       sd.code AS sub_directorate_code
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN ticket_categories c ON c.id = t.category_id
JOIN users u ON u.id = rr.author_id
LEFT JOIN sub_directorates sd ON sd.id = t.sub_directorate_id
WHERE {$where}
ORDER BY FIELD(t.priority, 'urgent', 'elevee', 'normale'), rr.created_at DESC
LIMIT :limit OFFSET :offset
SQL;
    $stmt = $pdo->prepare($sql);
    foreach ($dateParams as $k => $v) {
        $stmt->bindValue(':' . $k, $v);
    }
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $yearsStmt = $pdo->query(
        "SELECT DISTINCT YEAR(rr.created_at) AS y FROM resolution_reports rr WHERE rr.status = 'valide_sd' ORDER BY y DESC"
    );
    $availableYears = array_map('intval', array_column($yearsStmt->fetchAll(), 'y'));

    return [
        'reports' => $stmt->fetchAll(),
        'pagination' => paginationMeta($total, $page, $perPage),
        'filters' => [
            'group_by' => $filters['group_by'],
            'year' => $filters['year'],
            'month' => $filters['month'],
            'week_start' => $filters['week_start'],
            'week_end' => $filters['week_end'],
        ],
        'available_years' => $availableYears,
    ];
}

function listValidatedReportsPaginated(PDO $pdo, array $filters): array
{
    $page = (int)$filters['page'];
    $perPage = (int)$filters['per_page'];
    $offset = ($page - 1) * $perPage;

    [$dateParts, $dateParams] = buildReportDateSql('rv.validated_at', $filters);
    $whereParts = ['1=1'];
    if ($dateParts) {
        $whereParts = $dateParts;
    }
    if (!empty($filters['sub_directorate_id'])) {
        $whereParts[] = 'rv.sub_directorate_id = :filter_sub_directorate_id';
        $dateParams['filter_sub_directorate_id'] = (int)$filters['sub_directorate_id'];
    }
    $where = implode(' AND ', $whereParts);

    try {
        $countSql = "SELECT COUNT(*) FROM rapports_valides rv WHERE {$where}";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($dateParams);
        $total = (int)$countStmt->fetchColumn();

        $sql = <<<SQL
SELECT rv.*, CONCAT(v.prenom, ' ', v.nom) AS validator_name
FROM rapports_valides rv
JOIN users v ON v.id = rv.validated_by
WHERE {$where}
ORDER BY rv.validated_at DESC
LIMIT :limit OFFSET :offset
SQL;
        $stmt = $pdo->prepare($sql);
        foreach ($dateParams as $k => $v) {
            $stmt->bindValue(':' . $k, $v);
        }
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $reports = $stmt->fetchAll();

        $yearsStmt = $pdo->query('SELECT DISTINCT YEAR(validated_at) AS y FROM rapports_valides ORDER BY y DESC');
        $availableYears = array_map('intval', array_column($yearsStmt->fetchAll(), 'y'));
    } catch (PDOException) {
        return [
            'reports' => [],
            'pagination' => paginationMeta(0, $page, $perPage),
            'filters' => $filters,
            'available_years' => [],
        ];
    }

    return [
        'reports' => $reports,
        'pagination' => paginationMeta($total, $page, $perPage),
        'filters' => [
            'group_by' => $filters['group_by'],
            'year' => $filters['year'],
            'month' => $filters['month'],
            'week_start' => $filters['week_start'],
            'week_end' => $filters['week_end'],
        ],
        'available_years' => $availableYears,
    ];
}

function listValidatedReports(PDO $pdo): array
{
    $sql = <<<SQL
SELECT rv.*, CONCAT(v.prenom, ' ', v.nom) AS validator_name
FROM rapports_valides rv
JOIN users v ON v.id = rv.validated_by
ORDER BY rv.validated_at DESC
SQL;
    try {
        $stmt = $pdo->query($sql);
        return $stmt->fetchAll();
    } catch (PDOException) {
        return [];
    }
}

function listReportsForSubDirectorate(PDO $pdo, int $subDirectorateId): array
{
    $latestId = sqlLatestReportIdForTicket();
    $pending = sqlSubDirectorateReportPendingCondition();
    $sql = <<<SQL
SELECT rr.id, rr.ticket_id, rr.body, rr.version, rr.status, rr.created_at,
       CONCAT(u.prenom, ' ', u.nom) AS author_name,
       t.ticket_number, t.priority, t.description AS ticket_description,
       t.reporter_full_name, c.label AS category_label, t.created_at AS ticket_created_at,
       t.status AS ticket_status
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN ticket_categories c ON c.id = t.category_id
JOIN users u ON u.id = rr.author_id
WHERE t.sub_directorate_id = :sub_directorate_id
  AND t.status = 'resolu'
  AND rr.id = {$latestId}
  AND {$pending}
ORDER BY FIELD(t.priority, 'urgent', 'elevee', 'normale'), rr.created_at DESC
SQL;
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['sub_directorate_id' => $subDirectorateId]);
    return $stmt->fetchAll();
}

function listReportsForSubDirectoratePaginated(PDO $pdo, int $subDirectorateId, array $filters): array
{
    $page = (int)$filters['page'];
    $perPage = (int)$filters['per_page'];
    $offset = ($page - 1) * $perPage;
    $latestId = sqlLatestReportIdForTicket();
    $pending = sqlSubDirectorateReportPendingCondition();
    $where = "t.sub_directorate_id = :sub_directorate_id
  AND t.status = 'resolu'
  AND rr.id = {$latestId}
  AND {$pending}";
    $params = ['sub_directorate_id' => $subDirectorateId];
    appendPendingReportListFilters($where, $params, $filters);

    $countSql = "SELECT COUNT(*) FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.id = rr.author_id
WHERE {$where}";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $select = sqlPendingReportSelectFields();
    $sql = <<<SQL
{$select}
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN ticket_categories c ON c.id = t.category_id
JOIN users u ON u.id = rr.author_id
WHERE {$where}
ORDER BY FIELD(t.priority, 'urgent', 'elevee', 'normale'), rr.created_at DESC
LIMIT :limit OFFSET :offset
SQL;
    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue(':' . $k, $v);
    }
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    return [
        'reports' => $stmt->fetchAll(),
        'pagination' => paginationMeta($total, $page, $perPage),
    ];
}

function getSubDirectorateReportForTicket(PDO $pdo, int $ticketId, int $subDirectorateId): ?array
{
    $latestId = sqlLatestReportIdForTicket();
    $pending = sqlSubDirectorateReportPendingCondition();
    $sql = <<<SQL
SELECT rr.id, rr.ticket_id, rr.body, rr.version, rr.status, rr.created_at,
       CONCAT(u.prenom, ' ', u.nom) AS author_name,
       t.ticket_number, t.priority, t.description AS ticket_description,
       t.reporter_full_name, c.label AS category_label, t.status AS ticket_status
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN ticket_categories c ON c.id = t.category_id
JOIN users u ON u.id = rr.author_id
WHERE rr.ticket_id = :ticket_id
  AND t.sub_directorate_id = :sub_directorate_id
  AND t.status = 'resolu'
  AND rr.id = {$latestId}
  AND {$pending}
LIMIT 1
SQL;
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'ticket_id' => $ticketId,
        'sub_directorate_id' => $subDirectorateId,
    ]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function listReportsForChef(PDO $pdo, int $chefId): array
{
    $latestId = sqlLatestReportIdForTicket();
    $pending = sqlChefReportPendingCondition();
    $sql = <<<SQL
SELECT rr.id, rr.ticket_id, rr.body, rr.version, rr.status, rr.created_at,
       CONCAT(u.prenom, ' ', u.nom) AS author_name,
       t.ticket_number, t.priority, t.description AS ticket_description,
       t.reporter_full_name, c.label AS category_label, t.created_at AS ticket_created_at,
       t.status AS ticket_status
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN ticket_categories c ON c.id = t.category_id
JOIN users u ON u.id = rr.author_id
WHERE t.assigned_chef_id = :chef_id
  AND t.status = 'resolu'
  AND rr.id = {$latestId}
  AND {$pending}
ORDER BY FIELD(t.priority, 'bloquant', 'haute', 'normale'), rr.created_at DESC
SQL;
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['chef_id' => $chefId]);
    return $stmt->fetchAll();
}

function listReportsForChefPaginated(PDO $pdo, int $chefId, array $filters): array
{
    $page = (int)$filters['page'];
    $perPage = (int)$filters['per_page'];
    $offset = ($page - 1) * $perPage;
    $latestId = sqlLatestReportIdForTicket();
    $pending = sqlChefReportPendingCondition();
    $where = "t.assigned_chef_id = :chef_id
  AND t.status = 'resolu'
  AND rr.id = {$latestId}
  AND {$pending}";
    $params = ['chef_id' => $chefId];
    appendPendingReportListFilters($where, $params, $filters);

    $countSql = "SELECT COUNT(*) FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.id = rr.author_id
WHERE {$where}";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $select = sqlPendingReportSelectFields();
    $sql = <<<SQL
{$select}
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN ticket_categories c ON c.id = t.category_id
JOIN users u ON u.id = rr.author_id
WHERE {$where}
ORDER BY FIELD(t.priority, 'bloquant', 'haute', 'normale'), rr.created_at DESC
LIMIT :limit OFFSET :offset
SQL;
    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue(':' . $k, $v);
    }
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    return [
        'reports' => $stmt->fetchAll(),
        'pagination' => paginationMeta($total, $page, $perPage),
    ];
}

function getChefReportForTicket(PDO $pdo, int $ticketId, int $chefId): ?array
{
    $latestId = sqlLatestReportIdForTicket();
    $pending = sqlChefReportPendingCondition();
    $sql = <<<SQL
SELECT rr.id, rr.ticket_id, rr.body, rr.version, rr.status, rr.created_at,
       CONCAT(u.prenom, ' ', u.nom) AS author_name,
       t.ticket_number, t.priority, t.description AS ticket_description,
       t.reporter_full_name, c.label AS category_label, t.status AS ticket_status
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN ticket_categories c ON c.id = t.category_id
JOIN users u ON u.id = rr.author_id
WHERE rr.ticket_id = :ticket_id
  AND t.assigned_chef_id = :chef_id
  AND t.status = 'resolu'
  AND rr.id = {$latestId}
  AND {$pending}
LIMIT 1
SQL;
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'ticket_id' => $ticketId,
        'chef_id' => $chefId,
    ]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function getDirectorReportForTicket(PDO $pdo, int $ticketId): ?array
{
    $sql = <<<SQL
SELECT rr.id, rr.ticket_id, rr.body, rr.version, rr.status, rr.created_at,
       CONCAT(u.prenom, ' ', u.nom) AS author_name,
       t.ticket_number, t.priority, t.description AS ticket_description,
       t.reporter_full_name, c.label AS category_label
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN ticket_categories c ON c.id = t.category_id
JOIN users u ON u.id = rr.author_id
WHERE rr.ticket_id = :ticket_id AND rr.status = 'valide_sd'
ORDER BY rr.created_at DESC
LIMIT 1
SQL;
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['ticket_id' => $ticketId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function getReportTabStats(PDO $pdo, array $user, string $scope): array
{
    $role = $user['role_code'] ?? '';
    $latestId = sqlLatestReportIdForTicket();
    $total = 0;
    $resolu = 0;
    $nonResolu = 0;

    if ($scope === 'chef_service' && in_array($role, ['CHEF_SERVICE', 'SUPER_ADMIN'], true)) {
        $chefId = (int)$user['id'];
        $pending = sqlChefReportPendingCondition();
        $countSql = "SELECT COUNT(*) FROM resolution_reports rr
            JOIN tickets t ON t.id = rr.ticket_id
            WHERE t.assigned_chef_id = :chef_id AND t.status = 'resolu'
              AND rr.id = {$latestId} AND {$pending}";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute(['chef_id' => $chefId]);
        $total = (int)$countStmt->fetchColumn();

        $breakSql = "SELECT
            SUM(CASE WHEN t.status = 'resolu' THEN 1 ELSE 0 END) AS resolu,
            SUM(CASE WHEN t.status = 'non_resolu' THEN 1 ELSE 0 END) AS non_resolu
            FROM tickets t
            WHERE t.assigned_chef_id = :chef_id
              AND t.status IN ('resolu', 'non_resolu')";
        $breakStmt = $pdo->prepare($breakSql);
        $breakStmt->execute(['chef_id' => $chefId]);
        $breakRow = $breakStmt->fetch() ?: [];
        $resolu = (int)($breakRow['resolu'] ?? 0);
        $nonResolu = (int)($breakRow['non_resolu'] ?? 0);
    } elseif ($scope === 'sub_directorate' && in_array($role, ['SOUS_DIRECTEUR', 'SUPER_ADMIN'], true)) {
        $subId = (int)($user['sub_directorate_id'] ?? 0);
        $pending = sqlSubDirectorateReportPendingCondition();
        $countSql = "SELECT COUNT(*) FROM resolution_reports rr
            JOIN tickets t ON t.id = rr.ticket_id
            WHERE t.sub_directorate_id = :sub_id AND rr.id = {$latestId} AND {$pending}";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute(['sub_id' => $subId]);
        $total = (int)$countStmt->fetchColumn();

        $breakSql = "SELECT
            SUM(CASE WHEN t.status = 'resolu' THEN 1 ELSE 0 END) AS resolu,
            SUM(CASE WHEN t.status = 'non_resolu' THEN 1 ELSE 0 END) AS non_resolu
            FROM tickets t
            WHERE t.sub_directorate_id = :sub_id
              AND t.status IN ('resolu', 'non_resolu')";
        $breakStmt = $pdo->prepare($breakSql);
        $breakStmt->execute(['sub_id' => $subId]);
        $breakRow = $breakStmt->fetch() ?: [];
        $resolu = (int)($breakRow['resolu'] ?? 0);
        $nonResolu = (int)($breakRow['non_resolu'] ?? 0);
    } elseif ($scope === 'director' && in_array($role, ['DIRECTEUR', 'SUPER_ADMIN'], true)) {
        $countSql = "SELECT COUNT(*) FROM resolution_reports rr
            JOIN tickets t ON t.id = rr.ticket_id
            WHERE rr.status = 'valide_sd' AND rr.id = {$latestId}";
        $total = (int)$pdo->query($countSql)->fetchColumn();

        $breakSql = "SELECT
            SUM(CASE WHEN t.status = 'resolu' THEN 1 ELSE 0 END) AS resolu,
            SUM(CASE WHEN t.status = 'non_resolu' THEN 1 ELSE 0 END) AS non_resolu
            FROM tickets t
            WHERE t.status IN ('resolu', 'non_resolu')
              AND EXISTS (
                SELECT 1 FROM resolution_reports rr
                WHERE rr.ticket_id = t.id AND rr.status = 'valide_sd' AND rr.id = {$latestId}
              )";
        $breakRow = $pdo->query($breakSql)->fetch() ?: [];
        $resolu = (int)($breakRow['resolu'] ?? 0);
        $nonResolu = (int)($breakRow['non_resolu'] ?? 0);
    } else {
        jsonResponse(['ok' => false, 'message' => 'Scope invalide.'], 422);
    }

    return [
        'total' => $total,
        'reports' => [
            'resolu' => $resolu,
            'non_resolu' => $nonResolu,
        ],
    ];
}
