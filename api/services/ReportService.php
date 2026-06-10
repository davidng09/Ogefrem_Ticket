<?php
declare(strict_types=1);

require_once __DIR__ . '/NotificationService.php';

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
           :category_label, :reporter_full_name, :ticket_description, :report_body, :author_name, :validated_by)'
    );
    $insert->execute([
        'report_id' => (int)$row['report_id'],
        'ticket_id' => (int)$row['ticket_id'],
        'ticket_number' => $row['ticket_number'],
        'sub_directorate_id' => $row['sub_directorate_id'],
        'sub_directorate_code' => $row['sub_directorate_code'],
        'priority' => $row['priority'],
        'category_label' => $row['category_label'],
        'reporter_full_name' => $row['reporter_full_name'],
        'ticket_description' => $row['ticket_description'],
        'report_body' => $row['report_body'],
        'author_name' => $row['author_name'],
        'validated_by' => $validatorId,
    ]);

    $hours = defined('DIRECTOR_VISIBILITY_HOURS') ? (int)DIRECTOR_VISIBILITY_HOURS : 48;
    $updateTicket = $pdo->prepare(
        'UPDATE tickets SET director_visible_until = DATE_ADD(NOW(), INTERVAL :hours HOUR), updated_at = NOW() WHERE id = :id'
    );
    $updateTicket->bindValue(':hours', $hours, PDO::PARAM_INT);
    $updateTicket->bindValue(':id', (int)$row['ticket_id'], PDO::PARAM_INT);
    $updateTicket->execute();
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
        if ($report['ticket_status'] !== 'resolu') {
            jsonResponse(['ok' => false, 'message' => 'Le ticket doit être résolu.'], 422);
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
ORDER BY FIELD(t.priority, 'bloquant', 'haute', 'normale'), rr.created_at DESC
SQL;
    $stmt = $pdo->query($sql);
    return $stmt->fetchAll();
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
ORDER BY FIELD(t.priority, 'bloquant', 'haute', 'normale'), rr.created_at DESC
SQL;
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['sub_directorate_id' => $subDirectorateId]);
    return $stmt->fetchAll();
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
