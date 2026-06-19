<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/PeriodicReportService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

if ($method === 'GET' && $path === '/periodic/weekly') {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    $year = (int)($_GET['year'] ?? date('Y'));
    $month = (int)($_GET['month'] ?? date('n'));
    $weeks = listWeeklyReports($pdo, $user, $year, $month);
    jsonResponse(['ok' => true, 'weeks' => $weeks, 'year' => $year, 'month' => $month]);
}

if ($method === 'GET' && $path === '/periodic/weekly/pending-reminder') {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    jsonResponse(['ok' => true, 'reminder' => getWeeklyPendingReminder($pdo, $user)]);
}

if ($method === 'POST' && $path === '/periodic/weekly') {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    $body = readJsonBody();
    $result = saveWeeklyReport($pdo, $user, $body);
    jsonResponse(['ok' => true, 'report' => $result]);
}

if ($method === 'GET' && preg_match('#^/periodic/weekly/(\d+)/export$#', $path, $m)) {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
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
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    jsonResponse(['ok' => true, 'agents' => listAgentsSameSubDirectorate($pdo, $user)]);
}

if ($method === 'GET' && $path === '/meta/monthly-bundle-recipients') {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    jsonResponse(['ok' => true, 'recipients' => listMonthlyBundleRecipients($pdo, $user)]);
}

if ($method === 'GET' && $path === '/periodic/monthly-bundle/preview') {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    $year = (int)($_GET['year'] ?? date('Y'));
    $month = (int)($_GET['month'] ?? date('n'));
    jsonResponse(['ok' => true, 'preview' => previewMonthlyBundle($pdo, $user, $year, $month)]);
}

if ($method === 'POST' && $path === '/periodic/monthly-bundle') {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    $body = readJsonBody();
    $result = sendMonthlyBundle($pdo, $user, $body);
    jsonResponse(['ok' => true, 'bundle' => $result]);
}

if ($method === 'GET' && $path === '/periodic/monthly-bundle/inbox') {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'CHEF_SERVICE', 'SUPER_ADMIN']);
    jsonResponse(['ok' => true, 'bundles' => listMonthlyBundleInbox($pdo, (int)$user['id'])]);
}

if ($method === 'POST' && preg_match('#^/periodic/monthly-bundle/(\d+)/comment$#', $path, $m)) {
    $user = requireRoles(['CHEF_SERVICE', 'SUPER_ADMIN']);
    $bundleId = (int)$m[1];
    $body = readJsonBody();
    addMonthlyBundleComment($pdo, $user, $bundleId, (string)($body['body'] ?? ''));
    jsonResponse(['ok' => true]);
}

if ($method === 'GET' && $path === '/periodic/monthly-send-alerts') {
    $user = requireAuth();
    jsonResponse(['ok' => true, ...getMonthlySendAlerts($pdo, $user)]);
}

if ($method === 'POST' && $path === '/periodic/monthly-reports') {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SOUS_DIRECTEUR', 'SUPER_ADMIN']);
    if (empty($_FILES['file'])) {
        jsonResponse(['ok' => false, 'message' => 'Fichier requis.'], 422);
    }
    $year = (int)($_POST['year'] ?? date('Y'));
    $month = (int)($_POST['month'] ?? date('n'));
    $subDirectorateId = isset($_POST['sub_directorate_id']) ? (int)$_POST['sub_directorate_id'] : null;
    $replaceExisting = !empty($_POST['replace_existing']) && $_POST['replace_existing'] !== '0';
    $result = uploadMonthlySubdirectorateReport($pdo, $user, $_FILES['file'], $year, $month, $subDirectorateId, $replaceExisting);
    jsonResponse(['ok' => true, 'report' => $result], $result['replaced'] ?? false ? 200 : 201);
}

if ($method === 'GET' && $path === '/periodic/monthly-reports/check') {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SOUS_DIRECTEUR', 'SUPER_ADMIN']);
    $year = (int)($_GET['year'] ?? 0);
    $month = (int)($_GET['month'] ?? 0);
    $subDirectorateId = (int)($_GET['sub_directorate_id'] ?? $user['sub_directorate_id'] ?? 0);
    if ($year < 2000 || $month < 1 || $month > 12 || $subDirectorateId <= 0) {
        jsonResponse(['ok' => false, 'message' => 'Paramètres invalides.'], 422);
    }
    $existing = findMonthlyReportByPeriod($pdo, $subDirectorateId, $year, $month);
    jsonResponse([
        'ok' => true,
        'exists' => (bool)$existing,
        'report' => $existing ? [
            'id' => (int)$existing['id'],
            'original_name' => $existing['original_name'],
            'uploaded_at' => $existing['uploaded_at'],
            'uploader_name' => $existing['uploader_name'],
            'sub_directorate_label' => $existing['sub_directorate_label'],
        ] : null,
    ]);
}

if ($method === 'GET' && $path === '/periodic/monthly-reports') {
    requireRoles(['DIRECTEUR', 'SUPER_ADMIN']);
    $visibility = isset($_GET['visibility']) ? (string)$_GET['visibility'] : null;
    if (isset($_GET['page']) || isset($_GET['year'])) {
        $result = listMonthlyReportsForDirectorPaginated($pdo, $visibility, parseMonthlyReportPaginationFilters());
        jsonResponse(['ok' => true, ...$result]);
    }
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
