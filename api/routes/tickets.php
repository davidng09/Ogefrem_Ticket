<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/TicketService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

if ($method === 'POST' && $path === '/tickets/public') {
    $body = readJsonBody();
    $ticket = createPublicTicket($pdo, $body);
    jsonResponse(['ok' => true, 'ticket' => $ticket], 201);
}

if ($method === 'GET' && $path === '/tickets') {
    $user = requireAuth();
    $scope = isset($_GET['scope']) ? (string)$_GET['scope'] : null;
    $tickets = getTicketsByUserScope($pdo, $user, $scope);
    jsonResponse(['ok' => true, 'tickets' => $tickets]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/escalate$#', $path, $m)) {
    $user = requireRoles(['DIRECTEUR', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $body = readJsonBody();
    $subDirectorateId = (int)($body['sub_directorate_id'] ?? 0);
    if ($subDirectorateId <= 0) {
        jsonResponse(['ok' => false, 'message' => 'Sous-direction requise.'], 422);
    }
    escalateTicket($pdo, $user, $ticketId, $subDirectorateId);
    jsonResponse(['ok' => true]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/forward-to-chef$#', $path, $m)) {
    requireRoles(['SOUS_DIRECTEUR', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $body = readJsonBody();
    $chefId = (int)($body['chef_id'] ?? 0);
    if ($chefId <= 0) {
        jsonResponse(['ok' => false, 'message' => 'Chef requis.'], 422);
    }
    forwardToChef($pdo, $ticketId, $chefId);
    jsonResponse(['ok' => true]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/assign$#', $path, $m)) {
    requireRoles(['CHEF_SERVICE', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $body = readJsonBody();
    $technicianId = (int)($body['technician_id'] ?? 0);
    if ($technicianId <= 0) {
        jsonResponse(['ok' => false, 'message' => 'Technicien requis.'], 422);
    }
    assignToTechnician($pdo, $ticketId, $technicianId);
    jsonResponse(['ok' => true]);
}

if ($method === 'PATCH' && preg_match('#^/tickets/(\d+)/priority$#', $path, $m)) {
    $user = requireRoles(['DIRECTEUR', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $body = readJsonBody();
    $priority = (string)($body['priority'] ?? '');
    $slaDueAt = isset($body['sla_due_at']) ? (string)$body['sla_due_at'] : null;
    setPriority($pdo, $ticketId, $priority, (int)$user['id'], $slaDueAt);
    jsonResponse(['ok' => true]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/take-charge$#', $path, $m)) {
    requireRoles(['TECHNICIEN', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    takeChargeTicket($pdo, $ticketId);
    jsonResponse(['ok' => true]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/resolve$#', $path, $m)) {
    requireRoles(['TECHNICIEN', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    resolveTicket($pdo, $ticketId);
    jsonResponse(['ok' => true]);
}
