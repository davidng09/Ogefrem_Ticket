<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/EquipementService.php';
require_once __DIR__ . '/../middleware/ParcAuth.php';

if ($method === 'GET' && $path === '/dashboard') {
    requireParcAccess();
    jsonResponse(['ok' => true, 'stats' => dashboardStats($pdo)]);
}
