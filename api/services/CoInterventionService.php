<?php
declare(strict_types=1);

require_once __DIR__ . '/NotificationService.php';

function sqlCoInterventionsJson(): string
{
    return <<<SQL
(SELECT COALESCE(
    (SELECT CONCAT('[', GROUP_CONCAT(
        JSON_OBJECT(
            'id', u.id,
            'prenom', u.prenom,
            'nom', u.nom,
            'status', tci.status,
            'role_code', r.code
        )
    ), ']')
    FROM ticket_co_interventions tci
    INNER JOIN users u ON u.id = tci.agent_id
    INNER JOIN roles r ON r.id = u.role_id
    WHERE tci.ticket_id = t.id),
    '[]'
)) AS co_interventions_json
SQL;
}

function sqlCoInterventionFieldsForAgent(int $agentId): string
{
    return <<<SQL
(SELECT tci.status FROM ticket_co_interventions tci
  WHERE tci.ticket_id = t.id AND tci.agent_id = {$agentId} LIMIT 1) AS co_intervention_status,
(SELECT CONCAT(up.prenom, ' ', up.nom) FROM ticket_co_interventions tci
  INNER JOIN users up ON up.id = t.assigned_technician_id
  WHERE tci.ticket_id = t.id AND tci.agent_id = {$agentId} LIMIT 1) AS co_intervention_primary_name,
(SELECT rp.code FROM ticket_co_interventions tci
  INNER JOIN users up ON up.id = t.assigned_technician_id
  INNER JOIN roles rp ON rp.id = up.role_id
  WHERE tci.ticket_id = t.id AND tci.agent_id = {$agentId} LIMIT 1) AS co_intervention_primary_role
SQL;
}

function decodeCoInterventionsJson(?string $json): array
{
    if ($json === null || $json === '') {
        return [];
    }
    $decoded = json_decode($json, true);
    return is_array($decoded) ? $decoded : [];
}

function assertPrimaryAgentForCoInvite(PDO $pdo, array $user, int $ticketId): array
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
        jsonResponse(['ok' => false, 'message' => 'Seul l\'agent responsable peut inviter des co-intervenants.'], 403);
    }
    if (!in_array($ticket['status'], ['assigne_technicien', 'en_cours'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Co-intervention impossible à ce stade du ticket.'], 422);
    }

    return $ticket;
}

/** Invitations pending > 2 minutes are removed automatically. */
function expirePendingCoInterventions(PDO $pdo, ?int $ticketId = null): void
{
    if ($ticketId !== null) {
        $stmt = $pdo->prepare(
            'DELETE FROM ticket_co_interventions
             WHERE status = \'pending\'
               AND ticket_id = :ticket_id
               AND invited_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE)'
        );
        $stmt->execute(['ticket_id' => $ticketId]);
        return;
    }
    $pdo->exec(
        'DELETE FROM ticket_co_interventions
         WHERE status = \'pending\'
           AND invited_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE)'
    );
}

function listCoInterventionCandidates(PDO $pdo, array $user, int $ticketId): array
{
    expirePendingCoInterventions($pdo, $ticketId);
    assertPrimaryAgentForCoInvite($pdo, $user, $ticketId);

    $serviceId = (int)($user['service_id'] ?? 0);
    if ($serviceId <= 0) {
        jsonResponse(['ok' => false, 'message' => 'Service DANTIC introuvable.'], 422);
    }

    $stmt = $pdo->prepare(
        'SELECT u.id, u.matricule, u.nom, u.prenom, u.service_label, r.code AS role_code
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.is_active = 1
           AND u.service_id = :service_id
           AND r.code IN (\'TECHNICIEN\', \'CHEF_BUREAU\')
           AND u.id != :self_id
           AND u.id != (SELECT assigned_technician_id FROM tickets WHERE id = :ticket_id LIMIT 1)
           AND u.id NOT IN (
             SELECT tci.agent_id FROM ticket_co_interventions tci
             WHERE tci.ticket_id = :ticket_id2
           )
         ORDER BY u.nom ASC, u.prenom ASC'
    );
    $stmt->execute([
        'service_id' => $serviceId,
        'self_id' => (int)$user['id'],
        'ticket_id' => $ticketId,
        'ticket_id2' => $ticketId,
    ]);

    return $stmt->fetchAll();
}

function inviteCoIntervenants(PDO $pdo, array $user, int $ticketId, array $agentIds): array
{
    expirePendingCoInterventions($pdo, $ticketId);
    assertPrimaryAgentForCoInvite($pdo, $user, $ticketId);

    $agentIds = array_values(array_unique(array_map('intval', $agentIds)));
    $agentIds = array_filter($agentIds, fn($id) => $id > 0 && $id !== (int)$user['id']);

    if ($agentIds === []) {
        jsonResponse(['ok' => false, 'message' => 'Sélectionnez au moins un agent.'], 422);
    }
    if (count($agentIds) > 5) {
        jsonResponse(['ok' => false, 'message' => 'Maximum 5 co-intervenants.'], 422);
    }

    $serviceId = (int)($user['service_id'] ?? 0);
    $inviterName = trim(($user['prenom'] ?? '') . ' ' . ($user['nom'] ?? ''));

    $check = $pdo->prepare(
        'SELECT u.id FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.id = :id AND u.is_active = 1 AND u.service_id = :service_id
           AND r.code IN (\'TECHNICIEN\', \'CHEF_BUREAU\')'
    );
    $insert = $pdo->prepare(
        'INSERT INTO ticket_co_interventions (ticket_id, agent_id, invited_by, status)
         VALUES (:ticket_id, :agent_id, :invited_by, \'pending\')'
    );

    $invited = [];
    foreach ($agentIds as $agentId) {
        $check->execute(['id' => $agentId, 'service_id' => $serviceId]);
        if (!$check->fetch()) {
            continue;
        }
        try {
            $insert->execute([
                'ticket_id' => $ticketId,
                'agent_id' => $agentId,
                'invited_by' => (int)$user['id'],
            ]);
            createNotification(
                $pdo,
                $agentId,
                $ticketId,
                'co_intervention_invite',
                'Demande de co-intervention',
                $inviterName !== ''
                    ? "{$inviterName} vous invite en co-intervention sur un ticket."
                    : 'Vous êtes invité en co-intervention sur un ticket.'
            );
            $invited[] = $agentId;
        } catch (PDOException) {
            // déjà invité
        }
    }

    if ($invited === []) {
        jsonResponse(['ok' => false, 'message' => 'Aucun agent éligible sélectionné.'], 422);
    }

    return $invited;
}

function acceptCoIntervention(PDO $pdo, array $user, int $ticketId): void
{
    expirePendingCoInterventions($pdo, $ticketId);
    $roleCode = $user['role_code'] ?? '';
    if (!in_array($roleCode, ['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Non autorisé.'], 403);
    }

    $stmt = $pdo->prepare(
        'SELECT tci.id, tci.status AS invite_status, t.status AS ticket_status
         FROM ticket_co_interventions tci
         INNER JOIN tickets t ON t.id = tci.ticket_id
         WHERE tci.ticket_id = :ticket_id AND tci.agent_id = :agent_id LIMIT 1'
    );
    $stmt->execute(['ticket_id' => $ticketId, 'agent_id' => (int)$user['id']]);
    $row = $stmt->fetch();
    if (!$row) {
        jsonResponse(['ok' => false, 'message' => 'Invitation introuvable.'], 404);
    }
    if ($row['invite_status'] !== 'pending') {
        jsonResponse(['ok' => false, 'message' => 'Cette co-intervention est déjà traitée.'], 422);
    }

    if (!in_array($row['ticket_status'], ['assigne_technicien', 'en_cours'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Ce ticket n\'accepte plus de co-intervention.'], 422);
    }

    $upd = $pdo->prepare(
        'UPDATE ticket_co_interventions
         SET status = \'accepted\', accepted_at = NOW()
         WHERE ticket_id = :ticket_id AND agent_id = :agent_id'
    );
    $upd->execute(['ticket_id' => $ticketId, 'agent_id' => (int)$user['id']]);

    $ticketStmt = $pdo->prepare('SELECT assigned_technician_id FROM tickets WHERE id = :id');
    $ticketStmt->execute(['id' => $ticketId]);
    $primaryId = (int)$ticketStmt->fetchColumn();
    if ($primaryId > 0) {
        $accepterName = trim(($user['prenom'] ?? '') . ' ' . ($user['nom'] ?? ''));
        createNotification(
            $pdo,
            $primaryId,
            $ticketId,
            'co_intervention_accepted',
            'Co-intervention acceptée',
            $accepterName !== ''
                ? "{$accepterName} a accepté la co-intervention."
                : 'Un co-intervenant a accepté votre invitation.'
        );
    }
}

function clearCoInterventionsForTicket(PDO $pdo, int $ticketId): void
{
    $pdo->prepare('DELETE FROM ticket_co_interventions WHERE ticket_id = :id')->execute(['id' => $ticketId]);
}

function removeCoIntervenantArchivesForTicket(PDO $pdo, int $ticketId): void
{
    $pdo->prepare(
        'DELETE ara FROM agent_resolved_archives ara
         INNER JOIN ticket_co_interventions tci ON tci.agent_id = ara.agent_id AND tci.ticket_id = ara.ticket_id
         WHERE ara.ticket_id = :ticket_id'
    )->execute(['ticket_id' => $ticketId]);
}

function clearAgentArchivesForTicket(PDO $pdo, int $ticketId): void
{
    $pdo->prepare('DELETE FROM agent_resolved_archives WHERE ticket_id = :ticket_id')
        ->execute(['ticket_id' => $ticketId]);
}

function archiveTicketForFieldStaff(PDO $pdo, int $ticketId): void
{
    require_once __DIR__ . '/../helpers/CalendarWeeks.php';

    $ticketStmt = $pdo->prepare(
        'SELECT assigned_technician_id, closed_at FROM tickets WHERE id = :id LIMIT 1'
    );
    $ticketStmt->execute(['id' => $ticketId]);
    $ticket = $ticketStmt->fetch();
    if (!$ticket) {
        return;
    }

    $closedAt = (string)($ticket['closed_at'] ?? date('Y-m-d H:i:s'));
    $ts = strtotime($closedAt) ?: time();
    $year = (int)date('Y', $ts);
    $month = (int)date('n', $ts);
    $weekIndex = ticketWeekIndexForMonth($closedAt, $year, $month) ?? 1;

    $agentIds = [];
    $primaryId = (int)($ticket['assigned_technician_id'] ?? 0);
    if ($primaryId > 0) {
        $agentIds[$primaryId] = true;
    }

    $coStmt = $pdo->prepare(
        'SELECT agent_id FROM ticket_co_interventions WHERE ticket_id = :ticket_id'
    );
    $coStmt->execute(['ticket_id' => $ticketId]);
    foreach ($coStmt->fetchAll() as $row) {
        $id = (int)$row['agent_id'];
        if ($id > 0) {
            $agentIds[$id] = true;
        }
    }

    if ($agentIds === []) {
        return;
    }

    $insert = $pdo->prepare(
        'INSERT IGNORE INTO agent_resolved_archives (agent_id, ticket_id, year, month, week_index)
         VALUES (:agent_id, :ticket_id, :year, :month, :week_index)'
    );
    foreach (array_keys($agentIds) as $agentId) {
        $insert->execute([
            'agent_id' => $agentId,
            'ticket_id' => $ticketId,
            'year' => $year,
            'month' => $month,
            'week_index' => $weekIndex,
        ]);
    }
}

/** Réactive les co-intervenants présents à la clôture (acceptation automatique, sans nouvelle invitation). */
function reinstateCoIntervenantsOnReopen(PDO $pdo, int $ticketId): int
{
    $stmt = $pdo->prepare(
        'UPDATE ticket_co_interventions
         SET status = \'accepted\',
             accepted_at = COALESCE(accepted_at, NOW())
         WHERE ticket_id = :ticket_id'
    );
    $stmt->execute(['ticket_id' => $ticketId]);

    return $stmt->rowCount();
}

function notifyCoIntervenantsTicketClosed(PDO $pdo, int $ticketId, int $primaryId, string $outcomeLabel): void
{
    $stmt = $pdo->prepare(
        'SELECT agent_id FROM ticket_co_interventions
         WHERE ticket_id = :ticket_id AND status = \'accepted\''
    );
    $stmt->execute(['ticket_id' => $ticketId]);
    foreach ($stmt->fetchAll() as $row) {
        $agentId = (int)$row['agent_id'];
        if ($agentId === $primaryId) {
            continue;
        }
        createNotification(
            $pdo,
            $agentId,
            $ticketId,
            'co_intervention_closed',
            'Ticket clôturé',
            "Le ticket a été clôturé ({$outcomeLabel}) par l'agent responsable."
        );
    }
}

function notifyCoIntervenantsTicketReopened(PDO $pdo, int $ticketId, int $primaryId): void
{
    $stmt = $pdo->prepare(
        'SELECT agent_id FROM ticket_co_interventions
         WHERE ticket_id = :ticket_id AND status = \'accepted\''
    );
    $stmt->execute(['ticket_id' => $ticketId]);
    foreach ($stmt->fetchAll() as $row) {
        $agentId = (int)$row['agent_id'];
        if ($agentId === $primaryId) {
            continue;
        }
        createNotification(
            $pdo,
            $agentId,
            $ticketId,
            'co_intervention_reopened',
            'Ticket réouvert',
            'Le ticket a été réouvert par l\'agent responsable. Vous êtes de nouveau co-intervenant sur ce dossier.'
        );
    }
}
