<?php
declare(strict_types=1);

const PRESENCE_ONLINE_SECONDS = 120;

function touchPresence(PDO $pdo, int $userId): void
{
    $stmt = $pdo->prepare('UPDATE users SET last_seen_at = NOW() WHERE id = :id AND is_active = 1');
    $stmt->execute(['id' => $userId]);
}

function isUserOnline(?string $lastSeenAt): bool
{
    if (!$lastSeenAt) {
        return false;
    }
    $ts = strtotime($lastSeenAt);
    if ($ts === false) {
        return false;
    }
    return (time() - $ts) <= PRESENCE_ONLINE_SECONDS;
}

function listSubordinatesPresence(PDO $pdo, array $chefUser): array
{
    $serviceId = (int)($chefUser['service_id'] ?? 0);
    if ($serviceId <= 0) {
        return ['online_count' => 0, 'users' => []];
    }

    $stmt = $pdo->prepare(
        "SELECT u.id, u.nom, u.prenom, u.matricule, u.service_label, u.last_seen_at, r.code AS role_code
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE u.is_active = 1 AND u.service_id = :service_id
           AND r.code IN ('TECHNICIEN', 'CHEF_BUREAU')
         ORDER BY u.nom ASC, u.prenom ASC"
    );
    $stmt->execute(['service_id' => $serviceId]);
    $users = [];
    $onlineCount = 0;
    foreach ($stmt->fetchAll() as $row) {
        $online = isUserOnline($row['last_seen_at'] ?? null);
        if ($online) {
            $onlineCount++;
        }
        $users[] = [
            'id' => (int)$row['id'],
            'nom' => $row['nom'],
            'prenom' => $row['prenom'],
            'matricule' => $row['matricule'],
            'service_label' => $row['service_label'],
            'role_code' => $row['role_code'],
            'online' => $online,
            'last_seen_at' => $row['last_seen_at'],
        ];
    }

    return ['online_count' => $onlineCount, 'users' => $users];
}

function listChefsForDelegation(PDO $pdo, int $excludeUserId): array
{
    $stmt = $pdo->prepare(
        "SELECT u.id, u.nom, u.prenom, u.service_label, ds.label AS routed_service_label
         FROM users u
         JOIN roles r ON r.id = u.role_id
         LEFT JOIN dantic_services ds ON ds.id = u.service_id
         WHERE r.code = 'CHEF_SERVICE' AND u.is_active = 1 AND u.id != :exclude_id
         ORDER BY u.nom ASC, u.prenom ASC"
    );
    $stmt->execute(['exclude_id' => $excludeUserId]);
    return $stmt->fetchAll();
}
