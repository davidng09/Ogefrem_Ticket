<?php
declare(strict_types=1);

require_once __DIR__ . '/../../../api/services/AuthService.php';
require_once __DIR__ . '/../middleware/ParcAuth.php';

if ($method === 'POST' && $path === '/auth/login') {
    $body = readJsonBody();
    $matricule = trim((string)($body['matricule'] ?? ''));
    $password = (string)($body['password'] ?? '');
    $user = loginUser($pdo, $matricule, $password);
    if (!in_array($user['role_code'], PARC_ALLOWED_ROLES, true)) {
        session_unset();
        session_destroy();
        jsonResponse(['ok' => false, 'message' => 'Accès réservé au personnel DANTIC.'], 403);
    }
    jsonResponse(['ok' => true, 'user' => $user]);
}

if ($method === 'POST' && $path === '/auth/logout') {
    session_unset();
    session_destroy();
    jsonResponse(['ok' => true]);
}

if ($method === 'GET' && $path === '/auth/me') {
    $user = requireParcAccess();
    jsonResponse(['ok' => true, 'user' => $user, 'read_only' => isParcReadOnly($user)]);
}
