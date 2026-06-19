<?php
declare(strict_types=1);

require_once __DIR__ . '/../services/TicketService.php';
require_once __DIR__ . '/../services/CoInterventionService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';
require_once __DIR__ . '/../middleware/RateLimitMiddleware.php';

if ($method === 'POST' && $path === '/tickets/public') {
    enforceRateLimit($pdo, 'public_submit', clientIp(), 10, 3600);
    $body = readJsonBody();
    $ticket = createPublicTicket($pdo, $body);
    jsonResponse(['ok' => true, 'ticket' => $ticket], 201);
}

if ($method === 'GET' && $path === '/tickets/public/track') {
    enforceRateLimit($pdo, 'public_track', clientIp(), 60, 3600);
    $number = trim((string)($_GET['number'] ?? ''));
    $token = trim((string)($_GET['token'] ?? ''));
    if ($number === '' || $token === '') {
        jsonResponse(['ok' => false, 'message' => 'Numéro et token requis.'], 422);
    }
    $data = trackPublicTicket($pdo, $number, $token);
    jsonResponse(['ok' => true, 'tracking' => $data]);
}

if ($method === 'GET' && $path === '/tickets/pool') {
    $user = requireRoles(['CHEF_SERVICE', 'TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    $filters = parseTicketListFilters();
    $result = getTicketsByUserScope($pdo, $user, 'pool', null, 1, 0, $filters);
    $tickets = is_array($result) && isset($result['tickets']) ? $result['tickets'] : $result;
    jsonResponse(['ok' => true, 'tickets' => $tickets]);
}

if ($method === 'GET' && $path === '/tickets/tab-stats') {
    $user = requireAuth();
    $scope = isset($_GET['scope']) ? (string)$_GET['scope'] : null;
    $view = isset($_GET['view']) ? (string)$_GET['view'] : null;
    if ($view === 'open') {
        requireRoles(['DIRECTEUR', 'SOUS_DIRECTEUR', 'SUPER_ADMIN']);
    }
    $stats = getTicketTabStats($pdo, $user, $scope, $view);
    jsonResponse(['ok' => true, 'stats' => $stats]);
}

if ($method === 'GET' && $path === '/tickets/unresolved-constraints') {
    $user = requireRoles(['SOUS_DIRECTEUR', 'DIRECTEUR', 'SUPER_ADMIN']);
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(50, max(5, (int)($_GET['per_page'] ?? 10)));
    $result = listUnresolvedConstraintTickets($pdo, $user, $page, $perPage);
    jsonResponse(['ok' => true, 'tickets' => $result['tickets'], 'pagination' => $result['pagination']]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/consignes$#', $path, $m)) {
    $user = requireRoles(['SOUS_DIRECTEUR', 'DIRECTEUR', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $body = readJsonBody();
    addTicketConsigne($pdo, $user, $ticketId, (string)($body['body'] ?? ''));
    jsonResponse(['ok' => true]);
}

if ($method === 'GET' && $path === '/tickets') {
    $user = requireAuth();
    $scope = isset($_GET['scope']) ? (string)$_GET['scope'] : null;
    $view = isset($_GET['view']) ? (string)$_GET['view'] : null;
    if ($view !== null && !in_array($view, ['current', 'history', 'open'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Vue invalide.'], 422);
    }
    if ($view === 'open') {
        requireRoles(['DIRECTEUR', 'SOUS_DIRECTEUR', 'SUPER_ADMIN']);
    }
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 0;
    $filters = parseTicketListFilters();
    $result = getTicketsByUserScope($pdo, $user, $scope, $view, $page, $perPage, $filters);
    if (is_array($result) && isset($result['pagination'])) {
        jsonResponse(['ok' => true, 'tickets' => $result['tickets'], 'pagination' => $result['pagination']]);
    }
    jsonResponse(['ok' => true, 'tickets' => $result]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/claim$#', $path, $m)) {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    claimTicket($pdo, $user, $ticketId);
    jsonResponse(['ok' => true]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/claim-chef$#', $path, $m)) {
    $user = requireRoles(['CHEF_SERVICE', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $body = readJsonBody();
    $priority = isset($body['priority']) ? (string)$body['priority'] : null;
    $slaDueAt = isset($body['sla_due_at']) ? (string)$body['sla_due_at'] : null;
    claimTicketAsChef($pdo, $user, $ticketId, $priority, $slaDueAt);
    jsonResponse(['ok' => true]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/delegate-chef$#', $path, $m)) {
    $user = requireRoles(['CHEF_SERVICE', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $body = readJsonBody();
    $targetChefId = (int)($body['chef_id'] ?? 0);
    delegateTicketToChef($pdo, $user, $ticketId, $targetChefId);
    jsonResponse(['ok' => true]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/assign$#', $path, $m)) {
    $user = requireRoles(['CHEF_SERVICE', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $body = readJsonBody();
    $technicianId = (int)($body['technician_id'] ?? 0);
    if ($technicianId <= 0) {
        jsonResponse(['ok' => false, 'message' => 'Technicien requis.'], 422);
    }
    $priority = isset($body['priority']) ? (string)$body['priority'] : null;
    $slaDueAt = isset($body['sla_due_at']) ? (string)$body['sla_due_at'] : null;
    assignToTechnician($pdo, $user, $ticketId, $technicianId, $priority, $slaDueAt);
    jsonResponse(['ok' => true]);
}

if ($method === 'PATCH' && preg_match('#^/tickets/(\d+)/priority$#', $path, $m)) {
    $user = requireRoles(['CHEF_SERVICE', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $body = readJsonBody();
    $priority = (string)($body['priority'] ?? '');
    $slaDueAt = isset($body['sla_due_at']) ? (string)$body['sla_due_at'] : null;
    setPriority($pdo, $ticketId, $priority, (int)$user['id'], $slaDueAt);
    jsonResponse(['ok' => true]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/take-charge$#', $path, $m)) {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    takeChargeTicket($pdo, $user, $ticketId);
    jsonResponse(['ok' => true]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/release$#', $path, $m)) {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    releaseTicketToPool($pdo, $user, $ticketId);
    jsonResponse(['ok' => true]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/resolve$#', $path, $m)) {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    resolveTicket($pdo, $user, $ticketId);
    jsonResponse(['ok' => true]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/close-unresolved$#', $path, $m)) {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    closeUnresolvedTicket($pdo, $user, $ticketId);
    jsonResponse(['ok' => true]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/reopen$#', $path, $m)) {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    reopenUnresolvedTicket($pdo, $user, $ticketId);
    jsonResponse(['ok' => true]);
}

if ($method === 'GET' && preg_match('#^/tickets/(\d+)/co-intervention-candidates$#', $path, $m)) {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $candidates = listCoInterventionCandidates($pdo, $user, $ticketId);
    jsonResponse(['ok' => true, 'candidates' => $candidates]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/co-interventions$#', $path, $m)) {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $body = readJsonBody();
    $agentIds = $body['agent_ids'] ?? [];
    if (!is_array($agentIds)) {
        jsonResponse(['ok' => false, 'message' => 'Liste d\'agents invalide.'], 422);
    }
    $invited = inviteCoIntervenants($pdo, $user, $ticketId, $agentIds);
    jsonResponse(['ok' => true, 'invited' => $invited]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/co-interventions/accept$#', $path, $m)) {
    $user = requireRoles(['TECHNICIEN', 'CHEF_BUREAU', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    acceptCoIntervention($pdo, $user, $ticketId);
    jsonResponse(['ok' => true]);
}

if ($method === 'GET' && preg_match('#^/tickets/(\d+)/transfer-candidates$#', $path, $m)) {
    $user = requireRoles(['CHEF_BUREAU', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $candidates = listTransferAgentCandidates($pdo, $user, $ticketId);
    jsonResponse(['ok' => true, 'candidates' => $candidates]);
}

if ($method === 'POST' && preg_match('#^/tickets/(\d+)/transfer$#', $path, $m)) {
    $user = requireRoles(['CHEF_BUREAU', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $body = readJsonBody();
    $technicianId = (int)($body['technician_id'] ?? 0);
    transferTicketToAgent($pdo, $user, $ticketId, $technicianId);
    jsonResponse(['ok' => true]);
}
