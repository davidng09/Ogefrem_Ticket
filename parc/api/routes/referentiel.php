<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/ReferentielService.php';
require_once __DIR__ . '/../middleware/ParcAuth.php';

$refMap = [
    '/marques' => ['table' => 'parc_marques', 'order' => 'nom'],
    '/types' => ['table' => 'parc_types', 'order' => 'sort_order'],
    '/etats' => ['table' => 'parc_etats', 'order' => 'sort_order'],
    '/directions' => ['table' => 'parc_directions', 'order' => 'nom'],
    '/fournisseurs' => ['table' => 'parc_fournisseurs', 'order' => 'nom'],
];

foreach ($refMap as $route => $meta) {
    $table = $meta['table'];

    if ($method === 'GET' && $path === $route) {
        requireParcAccess();
        jsonResponse(['ok' => true, 'items' => listReferentiel($pdo, $table, $meta['order'])]);
    }

    if ($method === 'POST' && $path === $route) {
        requireReferentielWrite();
        $result = createReferentiel($pdo, $table, readJsonBody());
        jsonResponse(['ok' => true, 'item' => $result], 201);
    }

    if ($method === 'PATCH' && preg_match('#^' . preg_quote($route, '#') . '/(\d+)$#', $path, $m)) {
        requireReferentielWrite();
        updateReferentiel($pdo, $table, (int)$m[1], readJsonBody());
        jsonResponse(['ok' => true]);
    }

    if ($method === 'DELETE' && preg_match('#^' . preg_quote($route, '#') . '/(\d+)$#', $path, $m)) {
        requireReferentielWrite();
        deleteReferentiel($pdo, $table, (int)$m[1]);
        jsonResponse(['ok' => true]);
    }
}

if ($method === 'GET' && $path === '/meta') {
    requireParcAccess();
    jsonResponse([
        'ok' => true,
        'types' => listReferentiel($pdo, 'parc_types', 'sort_order'),
        'marques' => listReferentiel($pdo, 'parc_marques', 'nom'),
        'etats' => listReferentiel($pdo, 'parc_etats', 'sort_order'),
        'directions' => listReferentiel($pdo, 'parc_directions', 'nom'),
        'fournisseurs' => listReferentiel($pdo, 'parc_fournisseurs', 'nom'),
    ]);
}
