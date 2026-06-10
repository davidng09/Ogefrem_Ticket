<?php
declare(strict_types=1);

require_once __DIR__ . '/NotificationService.php';

function generateTicketNumber(PDO $pdo): string
{
    $year = date('Y');
    $prefix = "TKT-{$year}-";
    $stmt = $pdo->prepare('SELECT COUNT(*) AS total FROM tickets WHERE ticket_number LIKE :prefix');
    $stmt->execute(['prefix' => $prefix . '%']);
    $count = (int)$stmt->fetch()['total'] + 1;
    return $prefix . str_pad((string)$count, 4, '0', STR_PAD_LEFT);
}

function createPublicTicket(PDO $pdo, array $input): array
{
    $required = ['reporter_full_name', 'reporter_matricule', 'reporter_direction', 'reporter_service', 'reporter_office', 'category_id', 'description'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            jsonResponse(['ok' => false, 'message' => "Champ requis: {$field}"], 422);
        }
    }

    $ticketNumber = generateTicketNumber($pdo);
    $sql = <<<SQL
INSERT INTO tickets
  (ticket_number, reporter_full_name, reporter_matricule, reporter_direction, reporter_service, reporter_office, category_id, description, received_by_director_at)
VALUES
  (:ticket_number, :reporter_full_name, :reporter_matricule, :reporter_direction, :reporter_service, :reporter_office, :category_id, :description, NOW())
SQL;
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'ticket_number' => $ticketNumber,
        'reporter_full_name' => $input['reporter_full_name'],
        'reporter_matricule' => $input['reporter_matricule'],
        'reporter_direction' => $input['reporter_direction'],
        'reporter_service' => $input['reporter_service'],
        'reporter_office' => $input['reporter_office'],
        'category_id' => (int)$input['category_id'],
        'description' => $input['description'],
    ]);

    $ticketId = (int)$pdo->lastInsertId();
    notifyByRole($pdo, 'DIRECTEUR', $ticketId, 'ticket_created', 'Nouveau ticket', "Le ticket {$ticketNumber} vient d'être soumis.");

    return ['id' => $ticketId, 'ticket_number' => $ticketNumber];
}

function getTicketsByUserScope(PDO $pdo, array $user, ?string $scope = null, ?string $view = null): array
{
    $techId = ($user['role_code'] ?? '') === 'TECHNICIEN' ? (int)$user['id'] : 0;
    $archiveSelect = $techId > 0
        ? <<<SQL
       (SELECT ara.year FROM agent_resolved_archives ara WHERE ara.ticket_id = t.id AND ara.agent_id = {$techId} LIMIT 1) AS archive_year,
       (SELECT ara.month FROM agent_resolved_archives ara WHERE ara.ticket_id = t.id AND ara.agent_id = {$techId} LIMIT 1) AS archive_month,
       (SELECT ara.week_index FROM agent_resolved_archives ara WHERE ara.ticket_id = t.id AND ara.agent_id = {$techId} LIMIT 1) AS archive_week_index,
       EXISTS(SELECT 1 FROM agent_resolved_archives ara WHERE ara.ticket_id = t.id AND ara.agent_id = {$techId}) AS is_agent_archived,
SQL
        : '';

    $base = <<<SQL
SELECT t.*, c.label AS category_label, sd.label AS sub_directorate_label, sd.code AS sub_directorate_code,
       CONCAT(u1.prenom, ' ', u1.nom) AS assigned_chef_name,
       CONCAT(u2.prenom, ' ', u2.nom) AS assigned_tech_name,
       {$archiveSelect}
       (SELECT COUNT(*) FROM resolution_reports rr WHERE rr.ticket_id = t.id) AS report_count,
       (SELECT COUNT(*) FROM resolution_reports rr WHERE rr.ticket_id = t.id AND rr.status = 'valide_sd'
        AND rr.id = (SELECT lr.id FROM resolution_reports lr WHERE lr.ticket_id = t.id ORDER BY lr.version DESC, lr.created_at DESC LIMIT 1)) AS has_report_for_director,
       (SELECT COUNT(*) FROM resolution_reports rr WHERE rr.ticket_id = t.id AND t.status = 'resolu'
        AND rr.id = (SELECT lr.id FROM resolution_reports lr WHERE lr.ticket_id = t.id ORDER BY lr.version DESC, lr.created_at DESC LIMIT 1)
        AND (
          rr.status = 'valide_chef'
          OR (rr.status = 'rejete' AND (
            SELECT rv.validator_role FROM report_validations rv
            WHERE rv.report_id = rr.id AND rv.decision = 'rejete'
            ORDER BY rv.created_at DESC LIMIT 1
          ) IN ('DIRECTEUR', 'SUPER_ADMIN'))
        )) AS has_report_for_sd,
       (SELECT COUNT(*) FROM resolution_reports rr WHERE rr.ticket_id = t.id AND t.status = 'resolu'
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
       (SELECT lr.body FROM resolution_reports lr WHERE lr.ticket_id = t.id ORDER BY lr.version DESC, lr.created_at DESC LIMIT 1) AS latest_report_body
FROM tickets t
JOIN ticket_categories c ON c.id = t.category_id
LEFT JOIN sub_directorates sd ON sd.id = t.sub_directorate_id
LEFT JOIN users u1 ON u1.id = t.assigned_chef_id
LEFT JOIN users u2 ON u2.id = t.assigned_technician_id
SQL;
    $where = [];
    $params = [];

    switch ($user['role_code']) {
        case 'DIRECTEUR':
            $where[] = '(t.director_visible_until IS NULL OR t.director_visible_until >= NOW())';
            break;
        case 'SUPER_ADMIN':
            break;
        case 'SOUS_DIRECTEUR':
            $where[] = 't.sub_directorate_id = :sub_directorate_id';
            $params['sub_directorate_id'] = (int)$user['sub_directorate_id'];
            break;
        case 'CHEF_SERVICE':
            if ($scope === 'sub_directorate') {
                $where[] = 't.sub_directorate_id = :sub_directorate_id';
                $params['sub_directorate_id'] = (int)$user['sub_directorate_id'];
            } else {
                $where[] = 't.assigned_chef_id = :chef_id';
                $params['chef_id'] = (int)$user['id'];
            }
            break;
        case 'TECHNICIEN':
            $where[] = 't.assigned_technician_id = :tech_id';
            $params['tech_id'] = (int)$user['id'];
            $params['tech_id2'] = (int)$user['id'];
            $where[] = "t.status IN ('assigne_technicien', 'en_cours', 'resolu')";
            if ($view === 'history') {
                $where[] = 'EXISTS (SELECT 1 FROM agent_resolved_archives ara WHERE ara.ticket_id = t.id AND ara.agent_id = :tech_id2)';
            } else {
                $where[] = "(t.status IN ('assigne_technicien', 'en_cours') OR NOT EXISTS (SELECT 1 FROM agent_resolved_archives ara WHERE ara.ticket_id = t.id AND ara.agent_id = :tech_id2))";
            }
            break;
    }

    if ($where) {
        $base .= ' WHERE ' . implode(' AND ', $where);
    }
    $base .= " ORDER BY FIELD(t.priority, 'bloquant', 'haute', 'normale'), t.created_at DESC";

    $stmt = $pdo->prepare($base);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['has_report_for_director'] = (int)($row['has_report_for_director'] ?? 0) > 0;
        $row['has_report_for_sd'] = (int)($row['has_report_for_sd'] ?? 0) > 0;
        $row['has_report_for_chef'] = (int)($row['has_report_for_chef'] ?? 0) > 0;
        $row['report_count'] = (int)($row['report_count'] ?? 0);
        if (array_key_exists('is_agent_archived', $row)) {
            $row['is_agent_archived'] = (int)($row['is_agent_archived'] ?? 0) > 0;
        }
    }
    unset($row);

    return $rows;
}

function assignToSubDirectorate(PDO $pdo, array $user, int $ticketId, string $priority, ?string $slaDueAt, int $subDirectorateId): void
{
    $allowed = ['normale', 'haute', 'bloquant'];
    if (!in_array($priority, $allowed, true)) {
        jsonResponse(['ok' => false, 'message' => 'Priorité invalide.'], 422);
    }
    if ($subDirectorateId <= 0) {
        jsonResponse(['ok' => false, 'message' => 'Sous-direction requise.'], 422);
    }

    $ticketStmt = $pdo->prepare('SELECT status FROM tickets WHERE id = :id');
    $ticketStmt->execute(['id' => $ticketId]);
    $current = $ticketStmt->fetch();
    if (!$current) {
        jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
    }
    if (!in_array($current['status'], ['nouveau', 'chez_sous_direction'], true)) {
        jsonResponse(['ok' => false, 'message' => 'L\'affectation de ce ticket ne peut plus être modifiée.'], 422);
    }

    $check = $pdo->prepare('SELECT id FROM sub_directorates WHERE id = :id');
    $check->execute(['id' => $subDirectorateId]);
    if (!$check->fetch()) {
        jsonResponse(['ok' => false, 'message' => 'Sous-direction introuvable.'], 404);
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'UPDATE tickets SET
               priority = :priority,
               priority_set_by = :actor_id,
               sla_due_at = :sla_due_at,
               sub_directorate_id = :sub_directorate_id,
               status = :status,
               director_assigned_at = NOW(),
               updated_at = NOW()
             WHERE id = :id'
        );
        $stmt->execute([
            'priority' => $priority,
            'actor_id' => (int)$user['id'],
            'sla_due_at' => $slaDueAt ?: null,
            'sub_directorate_id' => $subDirectorateId,
            'status' => 'chez_sous_direction',
            'id' => $ticketId,
        ]);

        if ($stmt->rowCount() === 0) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
        }

        notifyByRole(
            $pdo,
            'SOUS_DIRECTEUR',
            $ticketId,
            'ticket_escalated',
            'Nouveau ticket pour votre sous-direction',
            'Un ticket vous a été affecté par la direction.',
            $subDirectorateId
        );

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function escalateTicket(PDO $pdo, array $user, int $ticketId, int $subDirectorateId): void
{
    $stmt = $pdo->prepare(
        'UPDATE tickets SET sub_directorate_id = :sub_directorate_id, status = :status, director_assigned_at = NOW(), updated_at = NOW() WHERE id = :id'
    );
    $stmt->execute([
        'sub_directorate_id' => $subDirectorateId,
        'status' => 'chez_sous_direction',
        'id' => $ticketId,
    ]);

    notifyByRole(
        $pdo,
        'SOUS_DIRECTEUR',
        $ticketId,
        'ticket_escalated',
        'Nouveau ticket pour votre sous-direction',
        'Un ticket vous a été affecté par la direction.',
        $subDirectorateId
    );
}

function forwardToChef(PDO $pdo, int $ticketId, int $chefId): void
{
    $ticketStmt = $pdo->prepare('SELECT status FROM tickets WHERE id = :id');
    $ticketStmt->execute(['id' => $ticketId]);
    $ticket = $ticketStmt->fetch();
    if (!$ticket) {
        jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
    }
    if ($ticket['status'] !== 'chez_sous_direction') {
        jsonResponse(['ok' => false, 'message' => 'Ce ticket ne peut plus être transmis à un chef de service.'], 422);
    }

    $stmt = $pdo->prepare('UPDATE tickets SET assigned_chef_id = :chef_id, status = :status, updated_at = NOW() WHERE id = :id');
    $stmt->execute([
        'chef_id' => $chefId,
        'status' => 'chez_chef_service',
        'id' => $ticketId,
    ]);

    createNotification($pdo, $chefId, $ticketId, 'ticket_forwarded', 'Ticket transmis', 'Un ticket vous a été transmis par votre sous-direction.');
}

function assignToTechnician(PDO $pdo, array $chefUser, int $ticketId, int $technicianId): void
{
    $ticketStmt = $pdo->prepare(
        'SELECT id, assigned_chef_id, status FROM tickets WHERE id = :id'
    );
    $ticketStmt->execute(['id' => $ticketId]);
    $ticket = $ticketStmt->fetch();
    if (!$ticket) {
        jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
    }

    $roleCode = $chefUser['role_code'] ?? '';
    if ($roleCode === 'CHEF_SERVICE' && (int)$ticket['assigned_chef_id'] !== (int)$chefUser['id']) {
        jsonResponse(['ok' => false, 'message' => 'Ce ticket ne vous est pas affecté.'], 403);
    }

    if (!in_array($ticket['status'], ['chez_chef_service', 'assigne_technicien'], true)) {
        jsonResponse(['ok' => false, 'message' => 'L\'affectation de cet agent ne peut plus être modifiée.'], 422);
    }

    $reportStmt = $pdo->prepare(
        'SELECT status FROM resolution_reports WHERE ticket_id = :ticket_id ORDER BY version DESC, created_at DESC LIMIT 1'
    );
    $reportStmt->execute(['ticket_id' => $ticketId]);
    $latestReport = $reportStmt->fetch();
    if ($latestReport && in_array($latestReport['status'], ['valide_chef', 'valide_sd', 'valide_directeur'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Le rapport a déjà été validé : réaffectation impossible.'], 422);
    }

    $techStmt = $pdo->prepare(
        'SELECT u.id, u.service_id, r.code AS role_code FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = :id AND u.is_active = 1'
    );
    $techStmt->execute(['id' => $technicianId]);
    $tech = $techStmt->fetch();
    if (!$tech || $tech['role_code'] !== 'TECHNICIEN') {
        jsonResponse(['ok' => false, 'message' => 'Agent introuvable.'], 404);
    }

    if ($roleCode === 'CHEF_SERVICE') {
        $chefServiceId = (int)($chefUser['service_id'] ?? 0);
        $techServiceId = (int)($tech['service_id'] ?? 0);
        if ($chefServiceId <= 0 || $techServiceId !== $chefServiceId) {
            jsonResponse(['ok' => false, 'message' => 'Cet agent n\'appartient pas à votre service.'], 422);
        }
    }

    $stmt = $pdo->prepare(
        'UPDATE tickets SET assigned_technician_id = :tech_id, status = :status, updated_at = NOW() WHERE id = :id'
    );
    $stmt->execute([
        'tech_id' => $technicianId,
        'status' => 'assigne_technicien',
        'id' => $ticketId,
    ]);

    createNotification($pdo, $technicianId, $ticketId, 'ticket_assigned', 'Nouveau ticket à traiter', 'Un ticket vous a été assigné.');
}

function setPriority(PDO $pdo, int $ticketId, string $priority, int $actorId, ?string $slaDueAt): void
{
    $allowed = ['normale', 'haute', 'bloquant'];
    if (!in_array($priority, $allowed, true)) {
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

function takeChargeTicket(PDO $pdo, int $ticketId): void
{
    $ticketStmt = $pdo->prepare('SELECT status FROM tickets WHERE id = :id');
    $ticketStmt->execute(['id' => $ticketId]);
    $ticket = $ticketStmt->fetch();
    if (!$ticket) {
        jsonResponse(['ok' => false, 'message' => 'Ticket introuvable.'], 404);
    }
    if ($ticket['status'] !== 'assigne_technicien') {
        jsonResponse(['ok' => false, 'message' => 'Ce ticket ne peut pas être pris en charge.'], 422);
    }

    $stmt = $pdo->prepare('UPDATE tickets SET status = :status, updated_at = NOW() WHERE id = :id');
    $stmt->execute(['status' => 'en_cours', 'id' => $ticketId]);
}

function resolveTicket(PDO $pdo, int $ticketId): void
{
    $stmt = $pdo->prepare('UPDATE tickets SET status = :status, closed_at = NOW(), updated_at = NOW() WHERE id = :id');
    $stmt->execute(['status' => 'resolu', 'id' => $ticketId]);
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
