<?php
declare(strict_types=1);

require_once __DIR__ . '/../middleware/AuthMiddleware.php';

if ($method === 'GET' && $path === '/notifications') {
    $user = requireAuth();
    $stmt = $pdo->prepare('SELECT * FROM notifications WHERE user_id = :user_id ORDER BY created_at DESC LIMIT 100');
    $stmt->execute(['user_id' => (int)$user['id']]);
    jsonResponse(['ok' => true, 'notifications' => $stmt->fetchAll()]);
}

if ($method === 'PATCH' && preg_match('#^/notifications/(\d+)/read$#', $path, $m)) {
    $user = requireAuth();
    $id = (int)$m[1];
    $stmt = $pdo->prepare('UPDATE notifications SET is_read = 1 WHERE id = :id AND user_id = :user_id');
    $stmt->execute(['id' => $id, 'user_id' => (int)$user['id']]);
    jsonResponse(['ok' => true]);
}
