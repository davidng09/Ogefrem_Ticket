<?php
declare(strict_types=1);

require_once __DIR__ . '/NotificationService.php';

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
            'Nouveau rapport technicien',
            'Un rapport de résolution est prêt pour validation.'
        );
    }

    return $reportId;
}

function validateReport(PDO $pdo, int $reportId, int $validatorId, string $validatorRole, string $decision, ?string $comment): void
{
    if (!in_array($decision, ['approuve', 'rejete'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Décision invalide.'], 422);
    }

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
        'status' => $decision === 'approuve' ? 'approuve' : 'rejete',
        'id' => $reportId,
    ]);

    $reportStmt = $pdo->prepare(
        'SELECT rr.author_id, rr.ticket_id, t.assigned_chef_id, t.sub_directorate_id
         FROM resolution_reports rr
         JOIN tickets t ON t.id = rr.ticket_id
         WHERE rr.id = :id'
    );
    $reportStmt->execute(['id' => $reportId]);
    $report = $reportStmt->fetch();
    if (!$report) {
        return;
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
        } elseif ($validatorRole === 'DIRECTEUR') {
            createNotification(
                $pdo,
                (int)$report['author_id'],
                (int)$report['ticket_id'],
                'report_approved',
                'Rapport approuvé',
                'Votre rapport a été validé.'
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
    } elseif ($validatorRole === 'DIRECTEUR') {
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

function listReportsForTicket(PDO $pdo, int $ticketId): array
{
    $sql = <<<SQL
SELECT rr.*, CONCAT(u.prenom, ' ', u.nom) AS author_name
FROM resolution_reports rr
JOIN users u ON u.id = rr.author_id
WHERE rr.ticket_id = :ticket_id
ORDER BY rr.created_at DESC
SQL;
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['ticket_id' => $ticketId]);
    return $stmt->fetchAll();
}
