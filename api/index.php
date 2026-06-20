<?php
declare(strict_types=1);

require_once __DIR__ . '/config/bootstrap.php';

$pdo = getPdo();
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';

$base = '/Ogefrem/api';
if (str_starts_with($uri, $base)) {
    $path = substr($uri, strlen($base));
    if ($path === '') {
        $path = '/';
    }
} else {
    $path = $uri;
}

$GLOBALS['api_path'] = $path;

if ($method === 'GET' && $path === '/health') {
    jsonResponse(['ok' => true, 'service' => 'OGEFREM Ops Hub API']);
}

require_once __DIR__ . '/routes/auth.php';
require_once __DIR__ . '/routes/meta.php';
require_once __DIR__ . '/routes/tickets.php';
require_once __DIR__ . '/routes/analytics.php';
require_once __DIR__ . '/routes/reports.php';
require_once __DIR__ . '/routes/periodic_reports.php';
require_once __DIR__ . '/routes/notifications.php';
require_once __DIR__ . '/routes/presence.php';
require_once __DIR__ . '/routes/admin.php';

jsonResponse(['ok' => false, 'message' => 'Endpoint introuvable.'], 404);
