<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/AuthService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

if ($method === 'POST' && $path === '/auth/login') {
    $body = readJsonBody();
    $matricule = trim((string)($body['matricule'] ?? ''));
    $password = (string)($body['password'] ?? '');
    $user = loginUser($pdo, $matricule, $password);
    jsonResponse(['ok' => true, 'user' => $user]);
}

if ($method === 'POST' && $path === '/auth/logout') {
    session_unset();
    session_destroy();
    jsonResponse(['ok' => true]);
}

if ($method === 'GET' && $path === '/auth/me') {
    $user = requireAuth();
    jsonResponse(['ok' => true, 'user' => $user]);
}
