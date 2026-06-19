<?php
declare(strict_types=1);

function parseAnalyticsPeriod(string $period): array
{
    $map = [
        '7d' => 7,
        '30d' => 30,
        '90d' => 90,
        '365d' => 365,
    ];
    $days = $map[$period] ?? 30;
    $from = (new DateTimeImmutable())->modify("-{$days} days")->format('Y-m-d 00:00:00');
    return ['days' => $days, 'from' => $from];
}

function getAnalyticsDashboard(PDO $pdo, array $user, string $period, ?int $subDirectorateFilter): array
{
    $role = $user['role_code'] ?? '';
    $scopeSubDir = null;

    if ($role === 'SOUS_DIRECTEUR') {
        $scopeSubDir = (int)($user['sub_directorate_id'] ?? 0);
    } elseif (in_array($role, ['DIRECTEUR', 'SUPER_ADMIN'], true) && $subDirectorateFilter) {
        $scopeSubDir = $subDirectorateFilter;
    }

    if (!in_array($role, ['DIRECTEUR', 'SOUS_DIRECTEUR', 'SUPER_ADMIN'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Accès refusé.'], 403);
    }

    $parsed = parseAnalyticsPeriod($period);
    $from = $parsed['from'];
    $where = 't.created_at >= :from';
    $params = ['from' => $from];
    if ($scopeSubDir) {
        $where .= ' AND t.sub_directorate_id = :sub_dir';
        $params['sub_dir'] = $scopeSubDir;
    }

    $kpis = buildAnalyticsKpis($pdo, $where, $params);
    $series = buildAnalyticsSeries($pdo, $where, $params, $parsed['days']);
    $breakdowns = buildAnalyticsBreakdowns($pdo, $where, $params, $scopeSubDir);
    $alerts = buildAnalyticsAlerts($pdo, $where, $params);
    $tables = buildAnalyticsTables($pdo, $where, $params);

    return [
        'period' => $period,
        'sub_directorate_id' => $scopeSubDir,
        'kpis' => $kpis,
        'series' => $series,
        'breakdowns' => $breakdowns,
        'alerts' => $alerts,
        'tables' => $tables,
    ];
}

function buildAnalyticsKpis(PDO $pdo, string $where, array $params): array
{
    $sql = "SELECT
        SUM(CASE WHEN t.status NOT IN ('resolu','non_resolu','archive') THEN 1 ELSE 0 END) AS open_count,
        SUM(CASE WHEN t.status IN ('resolu','archive') AND t.closed_at >= :from THEN 1 ELSE 0 END) AS resolved_count,
        SUM(CASE WHEN t.sla_due_at IS NOT NULL AND t.sla_due_at < NOW() AND t.status NOT IN ('resolu','non_resolu','archive') THEN 1 ELSE 0 END) AS sla_breached,
        AVG(CASE WHEN t.closed_at IS NOT NULL AND t.closed_at >= :from THEN TIMESTAMPDIFF(HOUR, t.created_at, t.closed_at) END) AS avg_resolution_hours
      FROM tickets t WHERE {$where}";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch() ?: [];

    $frSql = "SELECT AVG(TIMESTAMPDIFF(HOUR, t.created_at, te.created_at)) AS avg_first_response_hours
      FROM tickets t
      JOIN ticket_events te ON te.ticket_id = t.id
        AND te.event_type IN ('ticket_assigned','ticket_claimed')
      WHERE {$where}";
    $frStmt = $pdo->prepare($frSql);
    $frStmt->execute($params);
    $fr = $frStmt->fetch();

    $pendingSql = "SELECT COUNT(*) AS c FROM resolution_reports rr
      JOIN tickets t ON t.id = rr.ticket_id
      WHERE rr.status IN ('soumis','valide_chef') AND {$where}";
    $pendingStmt = $pdo->prepare($pendingSql);
    $pendingStmt->execute($params);
    $pending = (int)($pendingStmt->fetch()['c'] ?? 0);

    return [
        'open' => (int)($row['open_count'] ?? 0),
        'resolved' => (int)($row['resolved_count'] ?? 0),
        'sla_breached' => (int)($row['sla_breached'] ?? 0),
        'avg_resolution_hours' => round((float)($row['avg_resolution_hours'] ?? 0), 1),
        'avg_first_response_hours' => round((float)($fr['avg_first_response_hours'] ?? 0), 1),
        'pending_reports' => $pending,
    ];
}

function buildAnalyticsSeries(PDO $pdo, string $where, array $params, int $days): array
{
    $submitted = [];
    $resolved = [];
    $sla = [];

    $subSql = "SELECT DATE_FORMAT(t.created_at, '%Y-%u') AS wk, COUNT(*) AS c
      FROM tickets t WHERE {$where} GROUP BY wk ORDER BY wk ASC LIMIT 12";
    $subStmt = $pdo->prepare($subSql);
    $subStmt->execute($params);
    $subRows = $subStmt->fetchAll();
    if ($subRows) {
        $submitted = array_map(fn($r) => ['week' => $r['wk'], 'count' => (int)$r['c']], $subRows);
    }

    $resSql = "SELECT DATE_FORMAT(t.closed_at, '%Y-%u') AS wk, COUNT(*) AS c
      FROM tickets t WHERE t.closed_at IS NOT NULL AND {$where} GROUP BY wk ORDER BY wk ASC LIMIT 12";
    $resStmt = $pdo->prepare($resSql);
    $resStmt->execute($params);
    $resRows = $resStmt->fetchAll();
    if ($resRows) {
        $resolved = array_map(fn($r) => ['week' => $r['wk'], 'count' => (int)$r['c']], $resRows);
    }

    $slaSql = "SELECT DATE_FORMAT(t.created_at, '%Y-%u') AS wk,
        ROUND(100 * SUM(CASE WHEN t.sla_due_at IS NULL OR t.closed_at <= t.sla_due_at OR (t.closed_at IS NULL AND t.sla_due_at >= NOW()) THEN 1 ELSE 0 END) / COUNT(*), 1) AS rate
      FROM tickets t WHERE {$where} AND t.sla_due_at IS NOT NULL
      GROUP BY wk ORDER BY wk ASC LIMIT 12";
    $slaStmt = $pdo->prepare($slaSql);
    $slaStmt->execute($params);
    $slaRows = $slaStmt->fetchAll();
    if ($slaRows) {
        $sla = array_map(fn($r) => ['week' => $r['wk'], 'rate' => (float)$r['rate']], $slaRows);
    }

    return [
        'submitted_by_week' => $submitted,
        'resolved_by_week' => $resolved,
        'sla_compliance_by_week' => $sla,
    ];
}

function buildAnalyticsBreakdowns(PDO $pdo, string $where, array $params, ?int $scopeSubDir = null): array
{
    $bySub = fetchGrouped($pdo, "SELECT sd.label AS label, COUNT(*) AS c FROM tickets t LEFT JOIN sub_directorates sd ON sd.id = t.sub_directorate_id WHERE {$where} GROUP BY t.sub_directorate_id, sd.label", $params);
    $byService = fetchGrouped($pdo, "SELECT ds.label AS label, COUNT(*) AS c FROM tickets t LEFT JOIN dantic_services ds ON ds.id = t.routed_service_id WHERE {$where} GROUP BY t.routed_service_id, ds.label", $params);
    $byCategory = fetchGrouped($pdo, "SELECT c.label AS label, COUNT(*) AS c FROM tickets t JOIN ticket_categories c ON c.id = t.category_id WHERE {$where} GROUP BY t.category_id, c.label", $params);
    $byPriority = fetchGrouped($pdo, "SELECT t.priority AS label, COUNT(*) AS c FROM tickets t WHERE {$where} GROUP BY t.priority", $params);
    $byReporterDirection = fetchGrouped(
        $pdo,
        "SELECT COALESCE(NULLIF(TRIM(t.reporter_direction), ''), 'Non renseignée') AS label, COUNT(*) AS c
         FROM tickets t WHERE {$where} GROUP BY label ORDER BY c DESC LIMIT 12",
        $params
    );

    $interventionWhere = $where . " AND t.status NOT IN ('nouveau', 'chez_sous_direction', 'archive')";
    $byInterventionDirection = fetchGrouped(
        $pdo,
        "SELECT COALESCE(NULLIF(TRIM(t.reporter_direction), ''), 'Non renseignée') AS label, COUNT(*) AS c
         FROM tickets t WHERE {$interventionWhere} GROUP BY label ORDER BY c DESC LIMIT 12",
        $params
    );

    return [
        'by_sub_directorate' => $bySub,
        'by_service' => $byService,
        'by_category' => $byCategory,
        'by_priority' => $byPriority,
        'by_reporter_direction' => $byReporterDirection,
        'by_intervention_direction' => $byInterventionDirection,
    ];
}

function fetchGrouped(PDO $pdo, string $sql, array $params): array
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return array_map(fn($r) => ['label' => $r['label'] ?: 'Non défini', 'count' => (int)$r['c']], $stmt->fetchAll());
}

function buildAnalyticsAlerts(PDO $pdo, string $where, array $params): array
{
    $sql = "SELECT t.ticket_number, t.sla_due_at, ds.label AS service_label
      FROM tickets t
      LEFT JOIN dantic_services ds ON ds.id = t.routed_service_id
      WHERE {$where} AND t.sla_due_at IS NOT NULL AND t.sla_due_at < NOW() AND t.status NOT IN ('resolu','non_resolu','archive')
      ORDER BY t.sla_due_at ASC LIMIT 5";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $alerts = [];
    foreach ($stmt->fetchAll() as $row) {
        $alerts[] = [
            'type' => 'sla_breach',
            'ticket_number' => $row['ticket_number'],
            'service_label' => $row['service_label'],
            'sla_due_at' => $row['sla_due_at'],
        ];
    }
    return $alerts;
}

function buildAnalyticsTables(PDO $pdo, string $where, array $params): array
{
    $delaysSql = "SELECT t.ticket_number, ds.label AS service_label,
        TIMESTAMPDIFF(HOUR, t.created_at, COALESCE(t.closed_at, NOW())) AS delay_hours
      FROM tickets t
      LEFT JOIN dantic_services ds ON ds.id = t.routed_service_id
      WHERE {$where} AND t.status NOT IN ('resolu','non_resolu','archive')
      ORDER BY delay_hours DESC LIMIT 8";
    $delaysStmt = $pdo->prepare($delaysSql);
    $delaysStmt->execute($params);
    $topDelays = $delaysStmt->fetchAll();

    $servicesSql = "SELECT ds.label AS service_label, COUNT(*) AS ticket_count
      FROM tickets t
      LEFT JOIN dantic_services ds ON ds.id = t.routed_service_id
      WHERE {$where}
      GROUP BY t.routed_service_id, ds.label
      ORDER BY ticket_count DESC LIMIT 8";
    $servicesStmt = $pdo->prepare($servicesSql);
    $servicesStmt->execute($params);
    $topServices = $servicesStmt->fetchAll();

    return [
        'top_delays' => $topDelays,
        'top_services' => $topServices,
    ];
}
