<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/database.php';

$allowedOrigins = array_filter(array_map('trim', explode(',', getenv('CORS_ORIGINS') ?: 'http://localhost:5173,http://127.0.0.1:5173')));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
header('Access-Control-Allow-Credentials: true');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header("Content-Security-Policy: default-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");

$cookieSecure = filter_var(getenv('APP_HTTPS') ?: '0', FILTER_VALIDATE_BOOLEAN)
    || (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'httponly' => true,
    'secure' => $cookieSecure,
    'samesite' => 'Lax',
]);
session_start();

define('DIRECTOR_VISIBILITY_HOURS', 48);
define('AGENT_VISIBILITY_HOURS', 48);
