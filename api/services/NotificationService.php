<?php
declare(strict_types=1);

function createNotification(PDO $pdo, int $userId, ?int $ticketId, string $type, string $title, string $message): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO notifications (user_id, ticket_id, type, title, message) VALUES (:user_id, :ticket_id, :type, :title, :message)'
    );
    $stmt->execute([
        'user_id' => $userId,
        'ticket_id' => $ticketId,
        'type' => $type,
        'title' => $title,
        'message' => $message,
    ]);
}

function notifyByRole(PDO $pdo, string $roleCode, ?int $ticketId, string $type, string $title, string $message, ?int $subDirectorateId = null): void
{
    $sql = <<<SQL
SELECT u.id
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.code = :role_code AND u.is_active = 1
SQL;
    $params = ['role_code' => $roleCode];

    if ($subDirectorateId !== null) {
        $sql .= ' AND u.sub_directorate_id = :sub_directorate_id';
        $params['sub_directorate_id'] = $subDirectorateId;
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    foreach ($users as $user) {
        createNotification($pdo, (int)$user['id'], $ticketId, $type, $title, $message);
    }
}
