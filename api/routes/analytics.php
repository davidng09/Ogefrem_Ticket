<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/AnalyticsService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

if ($method === 'GET' && $path === '/analytics/dashboard') {
    $user = requireRoles(['DIRECTEUR', 'SOUS_DIRECTEUR', 'SUPER_ADMIN']);
    $period = (string)($_GET['period'] ?? '30d');
    $subDir = isset($_GET['sub_directorate_id']) && $_GET['sub_directorate_id'] !== ''
        ? (int)$_GET['sub_directorate_id']
        : null;
    $data = getAnalyticsDashboard($pdo, $user, $period, $subDir);
    jsonResponse(['ok' => true, 'dashboard' => $data]);
}
