<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/CalendarWeeks.php';
require_once __DIR__ . '/NotificationService.php';

function weeklyReportTemplate(array $user, array $week, int $year, int $month): string
{
    $sdLabel = $user['sub_directorate_label'] ?? 'Sous-direction DANTIC';
    $serviceLabel = $user['service_label'] ?? 'Service DANTIC';
    $author = trim(($user['prenom'] ?? '') . ' ' . ($user['nom'] ?? ''));
    $matricule = $user['matricule'] ?? '';
    $periodLabel = $week['label'] ?? '';
    $monthName = date('F Y', mktime(0, 0, 0, $month, 1, $year));

    return <<<TEXT
RAPPORT HEBDOMADAIRE D'ACTIVITÉS — DANTIC / OGEFREM
────────────────────────────────────────────────────
Période        : {$week['week_start']} au {$week['week_end']} — {$periodLabel}
Mois           : {$monthName}
Sous-direction : {$sdLabel}
Service        : {$serviceLabel}
Rédacteur      : {$author} ({$matricule})

1. SYNTHÈSE DE LA SEMAINE
(Décrire les activités principales et le volume d'interventions)

2. TICKETS TRAITÉS / INTERVENTIONS
(Référence ticket, nature, statut, actions menées)

3. DIFFICULTÉS RENCONTRÉES

4. ACTIONS PRÉVUES — SEMAINE SUIVANTE

5. OBSERVATIONS COMPLÉMENTAIRES

Date de rédaction :
TEXT;
}

function enrichUserForPeriodic(PDO $pdo, array $user): array
{
    $stmt = $pdo->prepare(
        'SELECT u.*, r.code AS role_code, sd.label AS sub_directorate_label
         FROM users u
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN sub_directorates sd ON sd.id = u.sub_directorate_id
         WHERE u.id = :id'
    );
    $stmt->execute(['id' => (int)$user['id']]);
    return $stmt->fetch() ?: $user;
}

function maybeArchiveAgentResolvedTickets(PDO $pdo, array $user): int
{
    return 0;
}

function listWeeklyReports(PDO $pdo, array $user, int $year, int $month): array
{
    $user = enrichUserForPeriodic($pdo, $user);
    $weeks = calendarMonthWeeks($year, $month);
    $stmt = $pdo->prepare(
        'SELECT * FROM weekly_reports WHERE author_id = :author_id AND year = :year AND month = :month ORDER BY week_index ASC'
    );
    $stmt->execute(['author_id' => (int)$user['id'], 'year' => $year, 'month' => $month]);
    $byWeek = [];
    foreach ($stmt->fetchAll() as $row) {
        $byWeek[(int)$row['week_index']] = $row;
    }

    $result = [];
    foreach ($weeks as $w) {
        $idx = (int)$w['week_index'];
        $existing = $byWeek[$idx] ?? null;
        $result[] = [
            'week_index' => $idx,
            'week_start' => $w['week_start'],
            'week_end' => $w['week_end'],
            'label' => $w['label'],
            'report' => $existing,
            'template' => $existing ? null : weeklyReportTemplate($user, $w, $year, $month),
            'resolution_count' => countWeeklyResolutions(
                $pdo,
                (int)$user['id'],
                (string)$w['week_start'],
                (string)$w['week_end']
            ),
        ];
    }

    return $result;
}

function getWeeklyPendingReminder(PDO $pdo, array $user): array
{
    if (!isFridayOrLater()) {
        return ['pending' => false, 'week_index' => null];
    }
    $ym = currentYearMonth();
    $weeks = calendarMonthWeeks($ym['year'], $ym['month']);
    $today = date('Y-m-d');
    $currentWeek = null;
    foreach ($weeks as $w) {
        if ($today >= $w['week_start'] && $today <= $w['week_end']) {
            $currentWeek = $w;
            break;
        }
    }
    if (!$currentWeek) {
        return ['pending' => false, 'week_index' => null];
    }
    $stmt = $pdo->prepare(
        'SELECT id FROM weekly_reports WHERE author_id = :author_id AND year = :year AND month = :month AND week_index = :week_index LIMIT 1'
    );
    $stmt->execute([
        'author_id' => (int)$user['id'],
        'year' => $ym['year'],
        'month' => $ym['month'],
        'week_index' => (int)$currentWeek['week_index'],
    ]);
    return [
        'pending' => !$stmt->fetch(),
        'week_index' => (int)$currentWeek['week_index'],
        'week_label' => $currentWeek['label'],
    ];
}

function saveWeeklyReport(PDO $pdo, array $user, array $input): array
{
    $year = (int)($input['year'] ?? 0);
    $month = (int)($input['month'] ?? 0);
    $weekIndex = (int)($input['week_index'] ?? 0);
    $body = trim((string)($input['body'] ?? ''));
    $status = ($input['status'] ?? 'finalise') === 'brouillon' ? 'brouillon' : 'finalise';

    if ($year < 2000 || $month < 1 || $month > 12 || $weekIndex < 1) {
        jsonResponse(['ok' => false, 'message' => 'Période invalide.'], 422);
    }
    if ($body === '') {
        jsonResponse(['ok' => false, 'message' => 'Le rapport ne peut pas être vide.'], 422);
    }

    $weeks = calendarMonthWeeks($year, $month);
    $week = null;
    foreach ($weeks as $w) {
        if ((int)$w['week_index'] === $weekIndex) {
            $week = $w;
            break;
        }
    }
    if (!$week) {
        jsonResponse(['ok' => false, 'message' => 'Semaine introuvable.'], 422);
    }

    $existing = $pdo->prepare(
        'SELECT id FROM weekly_reports WHERE author_id = :author_id AND year = :year AND month = :month AND week_index = :week_index'
    );
    $existing->execute([
        'author_id' => (int)$user['id'],
        'year' => $year,
        'month' => $month,
        'week_index' => $weekIndex,
    ]);
    $row = $existing->fetch();

    if ($row) {
        $upd = $pdo->prepare(
            'UPDATE weekly_reports SET body = :body, status = :status, updated_at = NOW() WHERE id = :id'
        );
        $upd->execute(['body' => $body, 'status' => $status, 'id' => (int)$row['id']]);
        return ['id' => (int)$row['id'], 'updated' => true];
    }

    $ins = $pdo->prepare(
        'INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status)
         VALUES (:author_id, :year, :month, :week_index, :week_start, :week_end, :body, :status)'
    );
    $ins->execute([
        'author_id' => (int)$user['id'],
        'year' => $year,
        'month' => $month,
        'week_index' => $weekIndex,
        'week_start' => $week['week_start'],
        'week_end' => $week['week_end'],
        'body' => $body,
        'status' => $status,
    ]);

    return ['id' => (int)$pdo->lastInsertId(), 'updated' => false];
}

function buildMonthlyBundleBody(PDO $pdo, int $agentId, int $year, int $month): string
{
    $stmt = $pdo->prepare(
        'SELECT wr.*, u.prenom, u.nom, u.matricule, u.service_label
         FROM weekly_reports wr
         JOIN users u ON u.id = wr.author_id
         WHERE wr.author_id = :author_id AND wr.year = :year AND wr.month = :month
         ORDER BY wr.week_index ASC'
    );
    $stmt->execute(['author_id' => $agentId, 'year' => $year, 'month' => $month]);
    $reports = $stmt->fetchAll();
    if (!$reports) {
        return '';
    }
    $parts = [];
    foreach ($reports as $r) {
        $author = trim($r['prenom'] . ' ' . $r['nom']) . ' (' . $r['matricule'] . ')';
        $parts[] = "===== RAPPORT HEBDO S{$r['week_index']} — {$author} =====\n{$r['body']}";
    }
    return implode("\n\n", $parts);
}

function sendMonthlyBundle(PDO $pdo, array $user, array $input): array
{
    $recipientId = (int)($input['recipient_id'] ?? 0);
    $year = (int)($input['year'] ?? 0);
    $month = (int)($input['month'] ?? 0);
    $body = trim((string)($input['body'] ?? ''));

    if ($recipientId <= 0 || $year < 2000 || $month < 1 || $month > 12) {
        jsonResponse(['ok' => false, 'message' => 'Paramètres invalides.'], 422);
    }

    $recipientStmt = $pdo->prepare(
        'SELECT u.*, r.code AS role_code FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = :id AND u.is_active = 1'
    );
    $recipientStmt->execute(['id' => $recipientId]);
    $recipient = $recipientStmt->fetch();
    $allowedRecipientRoles = ['TECHNICIEN', 'CHEF_SERVICE', 'CHEF_BUREAU'];
    if (!$recipient || !in_array($recipient['role_code'], $allowedRecipientRoles, true)) {
        jsonResponse(['ok' => false, 'message' => 'Destinataire invalide.'], 422);
    }
    if ((int)$recipient['sub_directorate_id'] !== (int)$user['sub_directorate_id']) {
        jsonResponse(['ok' => false, 'message' => 'Le destinataire doit être de la même sous-direction.'], 422);
    }
    if ($recipient['role_code'] === 'CHEF_SERVICE') {
        $senderServiceId = (int)($user['service_id'] ?? 0);
        $recipientServiceId = (int)($recipient['service_id'] ?? 0);
        if ($senderServiceId > 0 && $recipientServiceId > 0 && $senderServiceId !== $recipientServiceId) {
            jsonResponse(['ok' => false, 'message' => 'Le chef de service doit appartenir à votre service.'], 422);
        }
    }

    if ($body === '') {
        $body = buildMonthlyBundleBody($pdo, (int)$user['id'], $year, $month);
    }
    if ($body === '') {
        jsonResponse(['ok' => false, 'message' => 'Aucun rapport hebdomadaire à envoyer.'], 422);
    }

    $existing = $pdo->prepare(
        'SELECT id FROM monthly_agent_bundles WHERE sender_id = :sender_id AND year = :year AND month = :month'
    );
    $existing->execute(['sender_id' => (int)$user['id'], 'year' => $year, 'month' => $month]);
    $prev = $existing->fetch();

    if ($prev) {
        $upd = $pdo->prepare(
            'UPDATE monthly_agent_bundles SET recipient_id = :recipient_id, concatenated_body = :body, sent_at = NOW()
             WHERE id = :id'
        );
        $upd->execute([
            'recipient_id' => $recipientId,
            'body' => $body,
            'id' => (int)$prev['id'],
        ]);
        $bundleId = (int)$prev['id'];
    } else {
        $ins = $pdo->prepare(
            'INSERT INTO monthly_agent_bundles (sender_id, recipient_id, sub_directorate_id, year, month, concatenated_body)
             VALUES (:sender_id, :recipient_id, :sd_id, :year, :month, :body)'
        );
        $ins->execute([
            'sender_id' => (int)$user['id'],
            'recipient_id' => $recipientId,
            'sd_id' => (int)$user['sub_directorate_id'],
            'year' => $year,
            'month' => $month,
            'body' => $body,
        ]);
        $bundleId = (int)$pdo->lastInsertId();
    }

    $senderName = trim(($user['prenom'] ?? '') . ' ' . ($user['nom'] ?? ''));
    createNotification(
        $pdo,
        $recipientId,
        null,
        'monthly_bundle_received',
        'Rapports hebdomadaires reçus',
        "{$senderName} vous a transmis ses rapports hebdomadaires pour {$month}/{$year}."
    );

    return ['bundle_id' => $bundleId];
}

function listMonthlyBundleInbox(PDO $pdo, int $agentId): array
{
    $stmt = $pdo->prepare(
        'SELECT b.*, u.prenom AS sender_prenom, u.nom AS sender_nom, u.matricule AS sender_matricule
         FROM monthly_agent_bundles b
         JOIN users u ON u.id = b.sender_id
         WHERE b.recipient_id = :recipient_id
         ORDER BY b.year DESC, b.month DESC, b.sent_at DESC'
    );
    $stmt->execute(['recipient_id' => $agentId]);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $cStmt = $pdo->prepare(
            'SELECT mbc.id, mbc.body, mbc.created_at, u.prenom, u.nom
             FROM monthly_bundle_comments mbc
             JOIN users u ON u.id = mbc.author_id
             WHERE mbc.bundle_id = :bundle_id
             ORDER BY mbc.created_at ASC'
        );
        $cStmt->execute(['bundle_id' => (int)$row['id']]);
        $row['comments'] = $cStmt->fetchAll();
    }
    unset($row);

    return $rows;
}

function addMonthlyBundleComment(PDO $pdo, array $user, int $bundleId, string $body): void
{
    $role = $user['role_code'] ?? '';
    if (!in_array($role, ['CHEF_SERVICE', 'SUPER_ADMIN'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Non autorisé.'], 403);
    }
    $body = trim($body);
    if ($body === '') {
        jsonResponse(['ok' => false, 'message' => 'Commentaire requis.'], 422);
    }

    $stmt = $pdo->prepare('SELECT id, recipient_id FROM monthly_agent_bundles WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $bundleId]);
    $bundle = $stmt->fetch();
    if (!$bundle) {
        jsonResponse(['ok' => false, 'message' => 'Bundle introuvable.'], 404);
    }
    if ((int)$bundle['recipient_id'] !== (int)$user['id'] && $role !== 'SUPER_ADMIN') {
        jsonResponse(['ok' => false, 'message' => 'Ce bundle ne vous est pas destiné.'], 403);
    }

    $ins = $pdo->prepare(
        'INSERT INTO monthly_bundle_comments (bundle_id, author_id, body) VALUES (:bundle_id, :author_id, :body)'
    );
    $ins->execute([
        'bundle_id' => $bundleId,
        'author_id' => (int)$user['id'],
        'body' => $body,
    ]);
}

function getMonthlySendAlerts(PDO $pdo, array $user): array
{
    $role = $user['role_code'] ?? '';
    $year = (int)date('Y');
    $month = (int)date('n');
    $alerts = [];

    if ($role === 'CHEF_SERVICE') {
        $serviceId = (int)($user['service_id'] ?? 0);
        $sdId = (int)($user['sub_directorate_id'] ?? 0);
        $senderStmt = $pdo->prepare(
            'SELECT u.id, u.matricule, u.prenom, u.nom
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.is_active = 1 AND u.sub_directorate_id = :sd_id
               AND r.code IN (\'TECHNICIEN\', \'CHEF_BUREAU\')
               AND (:service_id = 0 OR u.service_id = :service_id2)'
        );
        $senderStmt->execute(['sd_id' => $sdId, 'service_id' => $serviceId, 'service_id2' => $serviceId]);
        foreach ($senderStmt->fetchAll() as $sender) {
            $bundleStmt = $pdo->prepare(
                'SELECT id FROM monthly_agent_bundles WHERE sender_id = :sender_id AND year = :year AND month = :month LIMIT 1'
            );
            $bundleStmt->execute([
                'sender_id' => (int)$sender['id'],
                'year' => $year,
                'month' => $month,
            ]);
            if (!$bundleStmt->fetch()) {
                $alerts[] = [
                    'kind' => 'missing_agent_bundle',
                    'label' => trim($sender['prenom'] . ' ' . $sender['nom']) . ' (' . $sender['matricule'] . ')',
                    'year' => $year,
                    'month' => $month,
                ];
            }
        }
    }

    if (in_array($role, ['DIRECTEUR', 'SUPER_ADMIN'], true)) {
        $sdStmt = $pdo->query('SELECT id, code, label FROM sub_directorates ORDER BY id ASC');
        foreach ($sdStmt->fetchAll() as $sd) {
            $pdfStmt = $pdo->prepare(
                'SELECT id FROM monthly_subdirectorate_reports
                 WHERE sub_directorate_id = :sd_id AND year = :year AND month = :month AND visibility = \'active\'
                 LIMIT 1'
            );
            $pdfStmt->execute(['sd_id' => (int)$sd['id'], 'year' => $year, 'month' => $month]);
            if (!$pdfStmt->fetch()) {
                $alerts[] = [
                    'kind' => 'missing_sd_pdf',
                    'label' => $sd['label'] ?? $sd['code'],
                    'year' => $year,
                    'month' => $month,
                ];
            }
        }
    }

    return ['alerts' => $alerts, 'year' => $year, 'month' => $month];
}

function countWeeklyResolutions(PDO $pdo, int $userId, string $weekStart, string $weekEnd): int
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM tickets t
         WHERE t.assigned_technician_id = :user_id
           AND t.status IN (\'resolu\', \'non_resolu\')
           AND t.closed_at IS NOT NULL
           AND DATE(t.closed_at) BETWEEN :start AND :end'
    );
    $stmt->execute(['user_id' => $userId, 'start' => $weekStart, 'end' => $weekEnd]);
    return (int)$stmt->fetchColumn();
}

function listAgentsSameSubDirectorate(PDO $pdo, array $user): array
{
    return listMonthlyBundleRecipients($pdo, $user);
}

function listMonthlyBundleRecipients(PDO $pdo, array $user): array
{
    $sdId = (int)($user['sub_directorate_id'] ?? 0);
    $serviceId = (int)($user['service_id'] ?? 0);
    $selfId = (int)$user['id'];
    $recipients = [];

    $agentStmt = $pdo->prepare(
        'SELECT u.id, u.matricule, u.nom, u.prenom, u.service_label, r.code AS role_code
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE r.code = \'TECHNICIEN\' AND u.is_active = 1
           AND u.sub_directorate_id = :sd_id AND u.id != :self_id
         ORDER BY u.nom ASC, u.prenom ASC'
    );
    $agentStmt->execute(['sd_id' => $sdId, 'self_id' => $selfId]);
    foreach ($agentStmt->fetchAll() as $row) {
        $row['recipient_kind'] = 'agent';
        $recipients[] = $row;
    }

    $chefSql = 'SELECT u.id, u.matricule, u.nom, u.prenom, u.service_label, r.code AS role_code
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE r.code = \'CHEF_SERVICE\' AND u.is_active = 1
           AND u.sub_directorate_id = :sd_id AND u.id != :self_id';
    $chefParams = ['sd_id' => $sdId, 'self_id' => $selfId];
    if ($serviceId > 0) {
        $chefSql .= ' AND u.service_id = :service_id';
        $chefParams['service_id'] = $serviceId;
    }
    $chefSql .= ' ORDER BY u.nom ASC, u.prenom ASC';
    $chefStmt = $pdo->prepare($chefSql);
    $chefStmt->execute($chefParams);
    foreach ($chefStmt->fetchAll() as $row) {
        $row['recipient_kind'] = 'chef_service';
        $recipients[] = $row;
    }

    return $recipients;
}

function monthlyStorageDir(): string
{
    $dir = dirname(__DIR__) . '/storage/monthly_reports';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

function parseMonthlyReportPaginationFilters(): array
{
    return [
        'year' => isset($_GET['year']) ? (int)$_GET['year'] : null,
        'month' => isset($_GET['month']) ? (int)$_GET['month'] : null,
        'sub_directorate_id' => isset($_GET['sub_directorate_id']) ? (int)$_GET['sub_directorate_id'] : null,
        'page' => max(1, (int)($_GET['page'] ?? 1)),
        'per_page' => min(50, max(5, (int)($_GET['per_page'] ?? 12))),
    ];
}

function findMonthlyReportByPeriod(PDO $pdo, int $subDirectorateId, int $year, int $month): ?array
{
    $stmt = $pdo->prepare(
        'SELECT mr.*, sd.label AS sub_directorate_label,
                CONCAT(u.prenom, \' \', u.nom) AS uploader_name
         FROM monthly_subdirectorate_reports mr
         JOIN sub_directorates sd ON sd.id = mr.sub_directorate_id
         JOIN users u ON u.id = mr.uploader_id
         WHERE mr.sub_directorate_id = :sd_id AND mr.year = :year AND mr.month = :month
           AND mr.visibility != \'deleted\'
         LIMIT 1'
    );
    $stmt->execute(['sd_id' => $subDirectorateId, 'year' => $year, 'month' => $month]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function uploadMonthlySubdirectorateReport(
    PDO $pdo,
    array $user,
    array $file,
    int $year,
    int $month,
    ?int $subDirectorateId = null,
    bool $replaceExisting = false
): array {
    if ($year < 2000 || $month < 1 || $month > 12) {
        jsonResponse(['ok' => false, 'message' => 'Période invalide.'], 422);
    }
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        jsonResponse(['ok' => false, 'message' => 'Fichier requis.'], 422);
    }
    if (($file['size'] ?? 0) > 10 * 1024 * 1024) {
        jsonResponse(['ok' => false, 'message' => 'Fichier trop volumineux (max 10 Mo).'], 422);
    }

    $sdId = $subDirectorateId ?? (int)($user['sub_directorate_id'] ?? 0);
    if ($sdId <= 0) {
        jsonResponse(['ok' => false, 'message' => 'Sous-direction requise.'], 422);
    }

    $role = $user['role_code'] ?? '';
    if (in_array($role, ['TECHNICIEN', 'CHEF_BUREAU'], true) && (int)($user['sub_directorate_id'] ?? 0) !== $sdId) {
        jsonResponse(['ok' => false, 'message' => 'Sous-direction non autorisée.'], 403);
    }
    if ($role === 'SOUS_DIRECTEUR' && (int)($user['sub_directorate_id'] ?? 0) !== $sdId) {
        jsonResponse(['ok' => false, 'message' => 'Sous-direction non autorisée.'], 403);
    }

    $existing = findMonthlyReportByPeriod($pdo, $sdId, $year, $month);
    if ($existing && !$replaceExisting) {
        jsonResponse([
            'ok' => false,
            'message' => 'Un rapport existe déjà pour cette sous-direction et cette période.',
            'existing' => [
                'id' => (int)$existing['id'],
                'original_name' => $existing['original_name'],
                'uploaded_at' => $existing['uploaded_at'],
                'uploader_name' => $existing['uploader_name'],
                'sub_directorate_label' => $existing['sub_directorate_label'],
            ],
        ], 409);
    }

    $name = (string)($file['name'] ?? 'rapport');
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $allowed = [
        'pdf' => 'application/pdf',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!isset($allowed[$ext])) {
        jsonResponse(['ok' => false, 'message' => 'Format autorisé : PDF ou Word (.docx).'], 422);
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if (!in_array($mime, [$allowed[$ext], 'application/octet-stream', 'application/zip'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Type MIME non autorisé.'], 422);
    }

    $stored = bin2hex(random_bytes(16)) . '.' . $ext;
    $dest = monthlyStorageDir() . '/' . $stored;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
        jsonResponse(['ok' => false, 'message' => 'Échec enregistrement fichier.'], 500);
    }

    if ($existing && $replaceExisting) {
        $oldPath = monthlyStorageDir() . '/' . $existing['file_path'];
        if (is_file($oldPath)) {
            @unlink($oldPath);
        }
        $upd = $pdo->prepare(
            'UPDATE monthly_subdirectorate_reports
             SET uploader_id = :uploader_id, file_path = :file_path, original_name = :original_name,
                 mime_type = :mime_type, uploaded_at = NOW(), visibility = \'active\'
             WHERE id = :id'
        );
        $upd->execute([
            'uploader_id' => (int)$user['id'],
            'file_path' => $stored,
            'original_name' => $name,
            'mime_type' => $allowed[$ext],
            'id' => (int)$existing['id'],
        ]);
        return ['id' => (int)$existing['id'], 'replaced' => true];
    }

    $ins = $pdo->prepare(
        'INSERT INTO monthly_subdirectorate_reports
         (sub_directorate_id, uploader_id, year, month, file_path, original_name, mime_type)
         VALUES (:sd_id, :uploader_id, :year, :month, :file_path, :original_name, :mime_type)'
    );
    $ins->execute([
        'sd_id' => $sdId,
        'uploader_id' => (int)$user['id'],
        'year' => $year,
        'month' => $month,
        'file_path' => $stored,
        'original_name' => $name,
        'mime_type' => $allowed[$ext],
    ]);
    $reportId = (int)$pdo->lastInsertId();

    notifyByRole(
        $pdo,
        'DIRECTEUR',
        null,
        'monthly_report_uploaded',
        'Rapport mensuel sous-direction',
        "Un rapport mensuel a été déposé pour {$month}/{$year}."
    );

    return ['id' => $reportId, 'replaced' => false];
}

function listMonthlyReportsForDirectorPaginated(PDO $pdo, ?string $visibility, array $filters): array
{
    $page = (int)$filters['page'];
    $perPage = (int)$filters['per_page'];
    $offset = ($page - 1) * $perPage;

    $sql = 'SELECT mr.*, sd.label AS sub_directorate_label, sd.code AS sub_directorate_code,
                   CONCAT(u.prenom, \' \', u.nom) AS uploader_name
            FROM monthly_subdirectorate_reports mr
            JOIN sub_directorates sd ON sd.id = mr.sub_directorate_id
            JOIN users u ON u.id = mr.uploader_id
            WHERE mr.visibility != \'deleted\'';
    $params = [];
    if ($visibility !== null && in_array($visibility, ['active', 'archived'], true)) {
        $sql .= ' AND mr.visibility = :visibility';
        $params['visibility'] = $visibility;
    }
    if (!empty($filters['year'])) {
        $sql .= ' AND mr.year = :filter_year';
        $params['filter_year'] = (int)$filters['year'];
    }
    if (!empty($filters['month'])) {
        $sql .= ' AND mr.month = :filter_month';
        $params['filter_month'] = (int)$filters['month'];
    }
    if (!empty($filters['sub_directorate_id'])) {
        $sql .= ' AND mr.sub_directorate_id = :filter_sd';
        $params['filter_sd'] = (int)$filters['sub_directorate_id'];
    }

    $countSql = 'SELECT COUNT(*) FROM (' . $sql . ') AS counted';
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $sql .= ' ORDER BY mr.year DESC, mr.month DESC, mr.uploaded_at DESC LIMIT :limit OFFSET :offset';
    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue(':' . $k, $v);
    }
    $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $cStmt = $pdo->prepare(
            'SELECT mrc.*, CONCAT(u.prenom, \' \', u.nom) AS author_name
             FROM monthly_report_comments mrc
             JOIN users u ON u.id = mrc.author_id
             WHERE mrc.monthly_report_id = :id ORDER BY mrc.created_at ASC'
        );
        $cStmt->execute(['id' => (int)$row['id']]);
        $row['comments'] = $cStmt->fetchAll();
    }
    unset($row);

    $yearsStmt = $pdo->prepare(
        'SELECT DISTINCT mr.year AS y FROM monthly_subdirectorate_reports mr WHERE mr.visibility != \'deleted\''
        . ($visibility ? ' AND mr.visibility = :visibility' : '')
        . ' ORDER BY y DESC'
    );
    if ($visibility) {
        $yearsStmt->execute(['visibility' => $visibility]);
    } else {
        $yearsStmt->execute();
    }
    $availableYears = array_map('intval', array_column($yearsStmt->fetchAll(), 'y'));

    $groupedByYear = [];
    foreach ($rows as $row) {
        $y = (int)$row['year'];
        if (!isset($groupedByYear[$y])) {
            $groupedByYear[$y] = [];
        }
        $groupedByYear[$y][] = $row;
    }

    return [
        'reports' => $rows,
        'grouped_by_year' => $groupedByYear,
        'pagination' => [
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'total_pages' => $perPage > 0 ? (int)ceil($total / $perPage) : 0,
        ],
        'filters' => [
            'year' => $filters['year'],
            'month' => $filters['month'],
            'sub_directorate_id' => $filters['sub_directorate_id'],
        ],
        'available_years' => $availableYears,
    ];
}

function listMonthlyReportsForDirector(PDO $pdo, ?string $visibility = null): array
{
    $sql = 'SELECT mr.*, sd.label AS sub_directorate_label, sd.code AS sub_directorate_code,
                   CONCAT(u.prenom, \' \', u.nom) AS uploader_name
            FROM monthly_subdirectorate_reports mr
            JOIN sub_directorates sd ON sd.id = mr.sub_directorate_id
            JOIN users u ON u.id = mr.uploader_id
            WHERE mr.visibility != \'deleted\'';
    $params = [];
    if ($visibility !== null && in_array($visibility, ['active', 'archived'], true)) {
        $sql .= ' AND mr.visibility = :visibility';
        $params['visibility'] = $visibility;
    }
    $sql .= ' ORDER BY mr.year DESC, mr.month DESC, mr.uploaded_at DESC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $cStmt = $pdo->prepare(
            'SELECT mrc.*, CONCAT(u.prenom, \' \', u.nom) AS author_name
             FROM monthly_report_comments mrc
             JOIN users u ON u.id = mrc.author_id
             WHERE mrc.monthly_report_id = :id ORDER BY mrc.created_at ASC'
        );
        $cStmt->execute(['id' => (int)$row['id']]);
        $row['comments'] = $cStmt->fetchAll();
    }
    unset($row);

    return $rows;
}

function addMonthlyReportComment(PDO $pdo, array $user, int $reportId, string $body): void
{
    $body = trim($body);
    if ($body === '') {
        jsonResponse(['ok' => false, 'message' => 'Commentaire requis.'], 422);
    }
    $check = $pdo->prepare('SELECT id FROM monthly_subdirectorate_reports WHERE id = :id AND visibility != \'deleted\'');
    $check->execute(['id' => $reportId]);
    if (!$check->fetch()) {
        jsonResponse(['ok' => false, 'message' => 'Rapport introuvable.'], 404);
    }
    $ins = $pdo->prepare(
        'INSERT INTO monthly_report_comments (monthly_report_id, author_id, body) VALUES (:report_id, :author_id, :body)'
    );
    $ins->execute(['report_id' => $reportId, 'author_id' => (int)$user['id'], 'body' => $body]);
}

function updateMonthlyReportVisibility(PDO $pdo, int $reportId, string $visibility): void
{
    if (!in_array($visibility, ['archived', 'deleted'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Visibilité invalide.'], 422);
    }
    $stmt = $pdo->prepare('UPDATE monthly_subdirectorate_reports SET visibility = :visibility WHERE id = :id');
    $stmt->execute(['visibility' => $visibility, 'id' => $reportId]);
    if ($stmt->rowCount() === 0) {
        jsonResponse(['ok' => false, 'message' => 'Rapport introuvable.'], 404);
    }
}

function getMonthlyReportFile(PDO $pdo, int $reportId): array
{
    $stmt = $pdo->prepare('SELECT * FROM monthly_subdirectorate_reports WHERE id = :id AND visibility != \'deleted\'');
    $stmt->execute(['id' => $reportId]);
    $row = $stmt->fetch();
    if (!$row) {
        jsonResponse(['ok' => false, 'message' => 'Rapport introuvable.'], 404);
    }
    $path = monthlyStorageDir() . '/' . $row['file_path'];
    if (!is_file($path)) {
        jsonResponse(['ok' => false, 'message' => 'Fichier absent.'], 404);
    }
    return ['meta' => $row, 'path' => $path];
}

function previewMonthlyBundle(PDO $pdo, array $user, int $year, int $month): array
{
    $body = buildMonthlyBundleBody($pdo, (int)$user['id'], $year, $month);
    $sent = $pdo->prepare(
        'SELECT recipient_id, sent_at FROM monthly_agent_bundles WHERE sender_id = :sender_id AND year = :year AND month = :month'
    );
    $sent->execute(['sender_id' => (int)$user['id'], 'year' => $year, 'month' => $month]);
    $bundle = $sent->fetch();
    return ['body' => $body, 'sent' => (bool)$bundle, 'bundle' => $bundle ?: null];
}
