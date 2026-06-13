<?php
declare(strict_types=1);

require_once __DIR__ . '/config/bootstrap.php';

$pdo = getPdo();
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';

$base = '/Ogefrem/parc/api';
if (str_starts_with($uri, $base)) {
    $path = substr($uri, strlen($base));
    if ($path === '') {
        $path = '/';
    }
} else {
    $path = $uri;
}

if ($method === 'GET' && $path === '/health') {
    jsonResponse(['ok' => true, 'service' => 'OGEFREM Parc Info API']);
}

require_once __DIR__ . '/routes/auth.php';
require_once __DIR__ . '/routes/equipements.php';
require_once __DIR__ . '/routes/referentiel.php';
require_once __DIR__ . '/routes/dashboard.php';

jsonResponse(['ok' => false, 'message' => 'Endpoint introuvable.'], 404);
