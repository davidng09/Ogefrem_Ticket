<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/PresenceService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

if ($method === 'POST' && $path === '/presence/heartbeat') {
    $user = requireAuth();
    touchPresence($pdo, (int)$user['id']);
    jsonResponse(['ok' => true]);
}

if ($method === 'GET' && $path === '/presence/subordinates') {
    $user = requireRoles(['CHEF_SERVICE', 'SUPER_ADMIN']);
    $data = listSubordinatesPresence($pdo, $user);
    jsonResponse(['ok' => true, ...$data]);
}

if ($method === 'GET' && $path === '/presence/chefs') {
    $user = requireRoles(['CHEF_SERVICE', 'SUPER_ADMIN']);
    $chefs = listChefsForDelegation($pdo, (int)$user['id']);
    jsonResponse(['ok' => true, 'chefs' => $chefs]);
}
