<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/ReportService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

if ($method === 'POST' && $path === '/reports') {
    $user = requireRoles(['TECHNICIEN', 'SUPER_ADMIN']);
    $body = readJsonBody();
    $ticketId = (int)($body['ticket_id'] ?? 0);
    $content = (string)($body['body'] ?? '');
    if ($ticketId <= 0) {
        jsonResponse(['ok' => false, 'message' => 'Ticket requis.'], 422);
    }
    $reportId = submitResolutionReport($pdo, $ticketId, (int)$user['id'], $content);
    jsonResponse(['ok' => true, 'report_id' => $reportId], 201);
}

if ($method === 'POST' && preg_match('#^/reports/(\d+)/validate$#', $path, $m)) {
    $user = requireRoles(['CHEF_SERVICE', 'SOUS_DIRECTEUR', 'DIRECTEUR', 'SUPER_ADMIN']);
    $reportId = (int)$m[1];
    $body = readJsonBody();
    $decision = (string)($body['decision'] ?? '');
    $comment = isset($body['comment']) ? (string)$body['comment'] : null;
    validateReport($pdo, $reportId, (int)$user['id'], $user['role_code'], $decision, $comment);
    jsonResponse(['ok' => true]);
}

if ($method === 'GET' && preg_match('#^/tickets/(\d+)/reports$#', $path, $m)) {
    requireAuth();
    $ticketId = (int)$m[1];
    $reports = listReportsForTicket($pdo, $ticketId);
    jsonResponse(['ok' => true, 'reports' => $reports]);
}
