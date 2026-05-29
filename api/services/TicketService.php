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

function getTicketsByUserScope(PDO $pdo, array $user, ?string $scope = null): array
{
    $base = <<<SQL
SELECT t.*, c.label AS category_label, sd.label AS sub_directorate_label,
       CONCAT(u1.prenom, ' ', u1.nom) AS assigned_chef_name,
       CONCAT(u2.prenom, ' ', u2.nom) AS assigned_tech_name
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
            break;
    }

    if ($where) {
        $base .= ' WHERE ' . implode(' AND ', $where);
    }
    $base .= ' ORDER BY t.created_at DESC';

    $stmt = $pdo->prepare($base);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function escalateTicket(PDO $pdo, array $user, int $ticketId, int $subDirectorateId): void
{
    $stmt = $pdo->prepare(
        'UPDATE tickets SET sub_directorate_id = :sub_directorate_id, status = :status, updated_at = NOW() WHERE id = :id'
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
    $stmt = $pdo->prepare('UPDATE tickets SET assigned_chef_id = :chef_id, status = :status, updated_at = NOW() WHERE id = :id');
    $stmt->execute([
        'chef_id' => $chefId,
        'status' => 'chez_chef_service',
        'id' => $ticketId,
    ]);

    createNotification($pdo, $chefId, $ticketId, 'ticket_forwarded', 'Ticket transmis', 'Un ticket vous a été transmis par votre sous-direction.');
}

function assignToTechnician(PDO $pdo, int $ticketId, int $technicianId): void
{
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
