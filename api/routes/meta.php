<?php
declare(strict_types=1);

require_once __DIR__ . '/../middleware/AuthMiddleware.php';

if ($method === 'GET' && $path === '/meta/users') {
    requireAuth();

    $sql = <<<SQL
SELECT u.id, u.nom, u.prenom, u.sub_directorate_id, u.service_label, r.code AS role_code
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

    $sql .= ' ORDER BY u.nom ASC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['ok' => true, 'users' => $stmt->fetchAll()]);
}
