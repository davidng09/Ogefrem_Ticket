<?php
declare(strict_types=1);

function clientIp(): string
{
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', (string)$_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($parts[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

function ensureRateLimitsTable(PDO $pdo): void
{
    static $ready = false;
    if ($ready) {
        return;
    }
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS rate_limits (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
            bucket VARCHAR(64) NOT NULL,
            client_key VARCHAR(128) NOT NULL,
            hit_count INT UNSIGNED NOT NULL DEFAULT 1,
            window_start DATETIME NOT NULL,
            UNIQUE KEY uk_rate_limits_bucket_client (bucket, client_key),
            KEY idx_rate_limits_window (window_start)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $ready = true;
}

function enforceRateLimit(PDO $pdo, string $bucket, string $clientKey, int $maxHits, int $windowSeconds): void
{
    ensureRateLimitsTable($pdo);
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'SELECT id, hit_count, window_start FROM rate_limits WHERE bucket = :bucket AND client_key = :client_key FOR UPDATE'
        );
        $stmt->execute(['bucket' => $bucket, 'client_key' => $clientKey]);
        $row = $stmt->fetch();
        $now = time();

        if (!$row) {
            $ins = $pdo->prepare(
                'INSERT INTO rate_limits (bucket, client_key, hit_count, window_start) VALUES (:bucket, :client_key, 1, NOW())'
            );
            $ins->execute(['bucket' => $bucket, 'client_key' => $clientKey]);
            $pdo->commit();
            return;
        }

        $windowStart = strtotime((string)$row['window_start']);
        if ($windowStart === false || ($now - $windowStart) >= $windowSeconds) {
            $upd = $pdo->prepare(
                'UPDATE rate_limits SET hit_count = 1, window_start = NOW() WHERE id = :id'
            );
            $upd->execute(['id' => (int)$row['id']]);
            $pdo->commit();
            return;
        }

        $hits = (int)$row['hit_count'] + 1;
        if ($hits > $maxHits) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'message' => 'Trop de requêtes. Réessayez plus tard.'], 429);
        }

        $upd = $pdo->prepare('UPDATE rate_limits SET hit_count = :hits WHERE id = :id');
        $upd->execute(['hits' => $hits, 'id' => (int)$row['id']]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}
