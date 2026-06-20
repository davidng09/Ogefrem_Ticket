<?php
declare(strict_types=1);

function listUsers(PDO $pdo): array
{
    $sql = <<<SQL
SELECT u.id, u.matricule, u.nom, u.prenom, u.email, u.is_active, u.service_label, u.sub_directorate_id,
       r.code AS role_code, r.label AS role_label
FROM users u
JOIN roles r ON r.id = u.role_id
ORDER BY u.created_at DESC
SQL;
    $stmt = $pdo->query($sql);
    return $stmt->fetchAll();
}

function createUser(PDO $pdo, array $input): int
{
    require_once __DIR__ . '/../middleware/SecurityMiddleware.php';
    validatePasswordStrength((string)($input['password'] ?? ''));

    $required = ['matricule', 'password', 'nom', 'prenom', 'role_code'];
    foreach ($required as $field) {
        if (empty($input[$field])) {
            jsonResponse(['ok' => false, 'message' => "Champ requis: {$field}"], 422);
        }
    }

    $roleStmt = $pdo->prepare('SELECT id FROM roles WHERE code = :code LIMIT 1');
    $roleStmt->execute(['code' => $input['role_code']]);
    $role = $roleStmt->fetch();
    if (!$role) {
        jsonResponse(['ok' => false, 'message' => 'Rôle invalide.'], 422);
    }

    $serviceId = !empty($input['service_id']) ? (int)$input['service_id'] : null;
    $serviceLabel = $input['service_label'] ?? null;
    if ($serviceId) {
        $svcStmt = $pdo->prepare('SELECT label FROM dantic_services WHERE id = :id');
        $svcStmt->execute(['id' => $serviceId]);
        $svc = $svcStmt->fetch();
        if ($svc) {
            $serviceLabel = $svc['label'];
        }
    }

    $insert = $pdo->prepare(
        'INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
         VALUES (:matricule, :password_hash, :nom, :prenom, :email, :role_id, :sub_directorate_id, :service_id, :service_label, 1)'
    );
    $insert->execute([
        'matricule' => $input['matricule'],
        'password_hash' => password_hash($input['password'], PASSWORD_DEFAULT),
        'nom' => $input['nom'],
        'prenom' => $input['prenom'],
        'email' => $input['email'] ?? null,
        'role_id' => (int)$role['id'],
        'sub_directorate_id' => $input['sub_directorate_id'] ?? null,
        'service_id' => $serviceId,
        'service_label' => $serviceLabel,
    ]);

    return (int)$pdo->lastInsertId();
}

function resetUserPassword(PDO $pdo, int $userId, string $newPassword): void
{
    require_once __DIR__ . '/../middleware/SecurityMiddleware.php';
    validatePasswordStrength($newPassword);

    $stmt = $pdo->prepare('UPDATE users SET password_hash = :password_hash, must_change_password = 1, updated_at = NOW() WHERE id = :id');
    $stmt->execute([
        'password_hash' => password_hash($newPassword, PASSWORD_DEFAULT),
        'id' => $userId,
    ]);
}

function setUserActive(PDO $pdo, int $userId, bool $active): void
{
    $stmt = $pdo->prepare('UPDATE users SET is_active = :active, updated_at = NOW() WHERE id = :id');
    $stmt->execute([
        'active' => $active ? 1 : 0,
        'id' => $userId,
    ]);
}
