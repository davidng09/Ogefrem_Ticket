<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/AuthService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../middleware/RateLimitMiddleware.php';

if ($method === 'POST' && $path === '/auth/login') {
    enforceRateLimit($pdo, 'auth_login', clientIp(), 20, 900);
    $body = readJsonBody();
    $matricule = trim((string)($body['matricule'] ?? ''));
    $password = (string)($body['password'] ?? '');
    $user = loginUser($pdo, $matricule, $password);
    jsonResponse(['ok' => true, 'user' => $user]);
}

if ($method === 'POST' && $path === '/auth/change-password') {
    $user = requireAuth();
    $body = readJsonBody();
    changeUserPassword(
        $pdo,
        (int)$user['id'],
        (string)($body['current_password'] ?? ''),
        (string)($body['new_password'] ?? '')
    );
    jsonResponse(['ok' => true, 'user' => $_SESSION['user']]);
}

if ($method === 'PATCH' && $path === '/auth/profile') {
    $user = requireAuth();
    $body = readJsonBody();
    $updated = updateUserProfile($pdo, (int)$user['id'], $body);
    jsonResponse(['ok' => true, 'user' => $updated]);
}

if ($method === 'POST' && $path === '/auth/logout') {
    session_unset();
    session_destroy();
    jsonResponse(['ok' => true]);
}

if ($method === 'GET' && $path === '/auth/me') {
    $sessionUser = $_SESSION['user'] ?? null;
    if ($sessionUser) {
        $row = fetchUserSessionRow($pdo, (int)$sessionUser['id']);
        if ($row) {
            $_SESSION['user'] = sessionUserFromRow($row);
        }
    }
    jsonResponse(['ok' => true, 'user' => $_SESSION['user'] ?? null]);
}
