<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/EquipementService.php';
require_once __DIR__ . '/../middleware/ParcAuth.php';

if ($method === 'GET' && $path === '/equipements') {
    requireParcAccess();
    $filters = [
        'q' => $_GET['q'] ?? null,
        'etat_id' => $_GET['etat_id'] ?? null,
        'type_id' => $_GET['type_id'] ?? null,
        'direction_id' => $_GET['direction_id'] ?? null,
    ];
    jsonResponse(['ok' => true, 'equipements' => listEquipements($pdo, $filters)]);
}

if ($method === 'GET' && $path === '/lookup') {
    $items = lookupEquipementsByDetenteur($pdo, $_GET);
    jsonResponse(['ok' => true, 'equipements' => $items]);
}

if ($method === 'GET' && preg_match('#^/equipements/(\d+)$#', $path, $m)) {
    requireParcAccess();
    $item = getEquipement($pdo, (int)$m[1]);
    if (!$item) {
        jsonResponse(['ok' => false, 'message' => 'Équipement introuvable.'], 404);
    }
    jsonResponse(['ok' => true, 'equipement' => $item]);
}

if ($method === 'POST' && $path === '/equipements') {
    $user = requireParcWrite();
    $body = readJsonBody();
    $item = createEquipement($pdo, $user, $body);
    jsonResponse(['ok' => true, 'equipement' => $item], 201);
}

if ($method === 'PATCH' && preg_match('#^/equipements/(\d+)$#', $path, $m)) {
    $user = requireParcWrite();
    $body = readJsonBody();
    $item = updateEquipement($pdo, $user, (int)$m[1], $body);
    jsonResponse(['ok' => true, 'equipement' => $item]);
}

if ($method === 'POST' && preg_match('#^/equipements/(\d+)/assign$#', $path, $m)) {
    $user = requireParcWrite();
    $body = readJsonBody();
    assignEquipement($pdo, $user, (int)$m[1], $body);
    jsonResponse(['ok' => true, 'equipement' => getEquipement($pdo, (int)$m[1])]);
}

if ($method === 'POST' && preg_match('#^/equipements/(\d+)/return-stock$#', $path, $m)) {
    $user = requireParcWrite();
    returnEquipementStock($pdo, $user, (int)$m[1]);
    jsonResponse(['ok' => true, 'equipement' => getEquipement($pdo, (int)$m[1])]);
}

if ($method === 'POST' && preg_match('#^/equipements/(\d+)/reform$#', $path, $m)) {
    $user = requireParcReforme();
    $body = readJsonBody();
    reformEquipement($pdo, $user, (int)$m[1], $body['motif'] ?? null);
    jsonResponse(['ok' => true, 'equipement' => getEquipement($pdo, (int)$m[1])]);
}
