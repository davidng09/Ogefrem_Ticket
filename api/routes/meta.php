<?php
declare(strict_types=1);

require_once __DIR__ . '/../middleware/AuthMiddleware.php';

if ($method === 'GET' && $path === '/meta/users') {
    $sessionUser = requireAuth();

    $sql = <<<SQL
SELECT u.id, u.nom, u.prenom, u.sub_directorate_id, u.service_id, u.service_label, r.code AS role_code
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE u.is_active = 1
SQL;
    $params = [];

    if (!empty($_GET['role_code'])) {
        $sql .= ' AND r.code = :role_code';
        $params['role_code'] = (string)$_GET['role_code'];
    }

    if (!empty($_GET['sub_directorate_id'])) {
        $sql .= ' AND u.sub_directorate_id = :sub_directorate_id';
        $params['sub_directorate_id'] = (int)$_GET['sub_directorate_id'];
    }

    $serviceId = null;
    if (!empty($_GET['service_id'])) {
        $serviceId = (int)$_GET['service_id'];
    } elseif (($sessionUser['role_code'] ?? '') === 'CHEF_SERVICE' && !empty($sessionUser['service_id'])) {
        $serviceId = (int)$sessionUser['service_id'];
    }
    if ($serviceId !== null && $serviceId > 0) {
        $sql .= ' AND u.service_id = :service_id';
        $params['service_id'] = $serviceId;
    }

    $sql .= ' ORDER BY u.nom ASC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['ok' => true, 'users' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $path === '/meta/sub-directorates') {
    requireAuth();
    $stmt = $pdo->query('SELECT id, code, label FROM sub_directorates ORDER BY id ASC');
    jsonResponse(['ok' => true, 'sub_directorates' => $stmt->fetchAll()]);
}

if ($method === 'GET' && $path === '/meta/services') {
    requireAuth();
    $sql = 'SELECT ds.id, ds.code, ds.label, ds.sub_directorate_id, sd.code AS sub_directorate_code FROM dantic_services ds JOIN sub_directorates sd ON sd.id = ds.sub_directorate_id';
    $params = [];
    if (!empty($_GET['sub_directorate_id'])) {
        $sql .= ' WHERE ds.sub_directorate_id = :sub_directorate_id';
        $params['sub_directorate_id'] = (int)$_GET['sub_directorate_id'];
    }
    $sql .= ' ORDER BY ds.sub_directorate_id ASC, ds.sort_order ASC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['ok' => true, 'services' => $stmt->fetchAll()]);
}
