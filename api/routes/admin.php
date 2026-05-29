<?php
declare(strict_types=1);

require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../services/AdminService.php';
require_once __DIR__ . '/../services/TicketService.php';

if ($method === 'GET' && $path === '/admin/users') {
    requireRoles(['SUPER_ADMIN']);
    jsonResponse(['ok' => true, 'users' => listUsers($pdo)]);
}

if ($method === 'POST' && $path === '/admin/users') {
    requireRoles(['SUPER_ADMIN']);
    $body = readJsonBody();
    $id = createUser($pdo, $body);
    jsonResponse(['ok' => true, 'id' => $id], 201);
}

if ($method === 'PATCH' && preg_match('#^/admin/users/(\d+)/password$#', $path, $m)) {
    requireRoles(['SUPER_ADMIN']);
    $body = readJsonBody();
    $password = (string)($body['password'] ?? '');
    if ($password === '') {
        jsonResponse(['ok' => false, 'message' => 'Mot de passe requis.'], 422);
    }
    resetUserPassword($pdo, (int)$m[1], $password);
    jsonResponse(['ok' => true]);
}

if ($method === 'PATCH' && preg_match('#^/admin/users/(\d+)/active$#', $path, $m)) {
    requireRoles(['SUPER_ADMIN']);
    $body = readJsonBody();
    setUserActive($pdo, (int)$m[1], (bool)($body['is_active'] ?? false));
    jsonResponse(['ok' => true]);
}

if ($method === 'POST' && $path === '/admin/archive-resolved') {
    requireRoles(['SUPER_ADMIN']);
    $count = archiveOldResolvedTickets($pdo);
    jsonResponse(['ok' => true, 'archived' => $count]);
}
