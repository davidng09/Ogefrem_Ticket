<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/PeriodicReportService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

if ($method === 'GET' && $path === '/periodic/weekly') {
    $user = requireRoles(['TECHNICIEN', 'SUPER_ADMIN']);
    maybeArchiveAgentResolvedTickets($pdo, $user);
    $year = (int)($_GET['year'] ?? date('Y'));
    $month = (int)($_GET['month'] ?? date('n'));
    $weeks = listWeeklyReports($pdo, $user, $year, $month);
    jsonResponse(['ok' => true, 'weeks' => $weeks, 'year' => $year, 'month' => $month]);
}

if ($method === 'GET' && $path === '/periodic/weekly/pending-reminder') {
    $user = requireRoles(['TECHNICIEN', 'SUPER_ADMIN']);
    jsonResponse(['ok' => true, 'reminder' => getWeeklyPendingReminder($pdo, $user)]);
}

if ($method === 'POST' && $path === '/periodic/weekly') {
    $user = requireRoles(['TECHNICIEN', 'SUPER_ADMIN']);
    $body = readJsonBody();
    $result = saveWeeklyReport($pdo, $user, $body);
    jsonResponse(['ok' => true, 'report' => $result]);
}

if ($method === 'GET' && preg_match('#^/periodic/weekly/(\d+)/export$#', $path, $m)) {
    $user = requireRoles(['TECHNICIEN', 'SUPER_ADMIN']);
    $id = (int)$m[1];
    $stmt = $pdo->prepare('SELECT * FROM weekly_reports WHERE id = :id AND author_id = :author_id');
    $stmt->execute(['id' => $id, 'author_id' => (int)$user['id']]);
    $report = $stmt->fetch();
    if (!$report) {
        jsonResponse(['ok' => false, 'message' => 'Rapport introuvable.'], 404);
    }
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rapport hebdo</title>';
    echo '<style>body{font-family:Segoe UI,sans-serif;padding:24px;max-width:800px;margin:0 auto}pre{white-space:pre-wrap}</style></head><body>';
    echo '<h1>Rapport hebdomadaire</h1><pre>' . htmlspecialchars((string)$report['body']) . '</pre>';
    echo '<script>window.onload=function(){window.print()}</script></body></html>';
    exit;
}

if ($method === 'GET' && $path === '/meta/agents-sub-directorate') {
    $user = requireRoles(['TECHNICIEN', 'SUPER_ADMIN']);
    jsonResponse(['ok' => true, 'agents' => listAgentsSameSubDirectorate($pdo, $user)]);
}

if ($method === 'GET' && $path === '/periodic/monthly-bundle/preview') {
    $user = requireRoles(['TECHNICIEN', 'SUPER_ADMIN']);
    $year = (int)($_GET['year'] ?? date('Y'));
    $month = (int)($_GET['month'] ?? date('n'));
    jsonResponse(['ok' => true, 'preview' => previewMonthlyBundle($pdo, $user, $year, $month)]);
}

if ($method === 'POST' && $path === '/periodic/monthly-bundle') {
    $user = requireRoles(['TECHNICIEN', 'SUPER_ADMIN']);
    $body = readJsonBody();
    $result = sendMonthlyBundle($pdo, $user, $body);
    jsonResponse(['ok' => true, 'bundle' => $result]);
}

if ($method === 'GET' && $path === '/periodic/monthly-bundle/inbox') {
    $user = requireRoles(['TECHNICIEN', 'SUPER_ADMIN']);
    jsonResponse(['ok' => true, 'bundles' => listMonthlyBundleInbox($pdo, (int)$user['id'])]);
}

if ($method === 'POST' && $path === '/periodic/monthly-reports') {
    $user = requireRoles(['TECHNICIEN', 'SUPER_ADMIN']);
    if (empty($_FILES['file'])) {
        jsonResponse(['ok' => false, 'message' => 'Fichier requis.'], 422);
    }
    $year = (int)($_POST['year'] ?? date('Y'));
    $month = (int)($_POST['month'] ?? date('n'));
    $result = uploadMonthlySubdirectorateReport($pdo, $user, $_FILES['file'], $year, $month);
    jsonResponse(['ok' => true, 'report' => $result], 201);
}

if ($method === 'GET' && $path === '/periodic/monthly-reports') {
    requireRoles(['DIRECTEUR', 'SUPER_ADMIN']);
    $visibility = isset($_GET['visibility']) ? (string)$_GET['visibility'] : null;
    jsonResponse(['ok' => true, 'reports' => listMonthlyReportsForDirector($pdo, $visibility)]);
}

if ($method === 'POST' && preg_match('#^/periodic/monthly-reports/(\d+)/comment$#', $path, $m)) {
    $user = requireRoles(['DIRECTEUR', 'SUPER_ADMIN']);
    $body = readJsonBody();
    addMonthlyReportComment($pdo, $user, (int)$m[1], (string)($body['body'] ?? ''));
    jsonResponse(['ok' => true]);
}

if ($method === 'PATCH' && preg_match('#^/periodic/monthly-reports/(\d+)$#', $path, $m)) {
    requireRoles(['DIRECTEUR', 'SUPER_ADMIN']);
    $body = readJsonBody();
    updateMonthlyReportVisibility($pdo, (int)$m[1], (string)($body['visibility'] ?? ''));
    jsonResponse(['ok' => true]);
}

if ($method === 'GET' && preg_match('#^/periodic/monthly-reports/(\d+)/download$#', $path, $m)) {
    requireRoles(['DIRECTEUR', 'SUPER_ADMIN']);
    $file = getMonthlyReportFile($pdo, (int)$m[1]);
    header('Content-Type: ' . $file['meta']['mime_type']);
    header('Content-Disposition: attachment; filename="' . basename((string)$file['meta']['original_name']) . '"');
    readfile($file['path']);
    exit;
}

if ($method === 'POST' && $path === '/periodic/archive-resolved') {
    $user = requireRoles(['TECHNICIEN', 'SUPER_ADMIN']);
    $count = maybeArchiveAgentResolvedTickets($pdo, $user);
    jsonResponse(['ok' => true, 'archived' => $count]);
}
