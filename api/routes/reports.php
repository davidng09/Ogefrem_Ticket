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

if ($method === 'GET' && $path === '/reports') {
    $user = requireAuth();
    $scope = isset($_GET['scope']) ? (string)$_GET['scope'] : '';
    if ($scope === 'director') {
        requireRoles(['DIRECTEUR', 'SUPER_ADMIN']);
        $reports = listReportsForDirector($pdo);
        jsonResponse(['ok' => true, 'reports' => $reports]);
    }
    if ($scope === 'sub_directorate') {
        $user = requireRoles(['SOUS_DIRECTEUR', 'SUPER_ADMIN']);
        $subId = (int)($user['sub_directorate_id'] ?? 0);
        if ($subId <= 0) {
            jsonResponse(['ok' => false, 'message' => 'Sous-direction introuvable.'], 422);
        }
        $reports = listReportsForSubDirectorate($pdo, $subId);
        jsonResponse(['ok' => true, 'reports' => $reports]);
    }
    if ($scope === 'chef_service') {
        $user = requireRoles(['CHEF_SERVICE', 'SUPER_ADMIN']);
        $chefId = (int)($user['id'] ?? 0);
        $reports = listReportsForChef($pdo, $chefId);
        jsonResponse(['ok' => true, 'reports' => $reports]);
    }
    jsonResponse(['ok' => false, 'message' => 'Scope invalide.'], 422);
}

if ($method === 'GET' && $path === '/reports/validated') {
    requireRoles(['DIRECTEUR', 'SUPER_ADMIN']);
    $reports = listValidatedReports($pdo);
    jsonResponse(['ok' => true, 'reports' => $reports]);
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

if ($method === 'GET' && preg_match('#^/tickets/(\d+)/director-report$#', $path, $m)) {
    requireRoles(['DIRECTEUR', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $report = getDirectorReportForTicket($pdo, $ticketId);
    jsonResponse(['ok' => true, 'report' => $report]);
}

if ($method === 'GET' && preg_match('#^/tickets/(\d+)/sub-directorate-report$#', $path, $m)) {
    $user = requireRoles(['SOUS_DIRECTEUR', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $subId = (int)($user['sub_directorate_id'] ?? 0);
    $report = getSubDirectorateReportForTicket($pdo, $ticketId, $subId);
    jsonResponse(['ok' => true, 'report' => $report]);
}

if ($method === 'GET' && preg_match('#^/tickets/(\d+)/chef-report$#', $path, $m)) {
    $user = requireRoles(['CHEF_SERVICE', 'SUPER_ADMIN']);
    $ticketId = (int)$m[1];
    $chefId = (int)($user['id'] ?? 0);
    $report = getChefReportForTicket($pdo, $ticketId, $chefId);
    jsonResponse(['ok' => true, 'report' => $report]);
}
