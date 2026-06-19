<?php
declare(strict_types=1);

require_once __DIR__ . '/../middleware/RateLimitMiddleware.php';

function userSessionSelectSql(bool $withPassword = false): string
{
    $passwordCol = $withPassword ? ', u.password_hash' : '';

    return <<<SQL
SELECT u.id, u.matricule, u.nom, u.prenom, u.email, u.service_id, u.service_label,
       u.must_change_password, r.code AS role_code, r.label AS role_label,
       COALESCE(u.sub_directorate_id, ds.sub_directorate_id) AS sub_directorate_id,
       sd.label AS sub_directorate_label,
       ds.label AS dantic_service_label{$passwordCol}
FROM users u
JOIN roles r ON r.id = u.role_id
LEFT JOIN dantic_services ds ON ds.id = u.service_id
LEFT JOIN sub_directorates sd ON sd.id = COALESCE(u.sub_directorate_id, ds.sub_directorate_id)
SQL;
}

function loginUser(PDO $pdo, string $matricule, string $password): array
{
    $sql = userSessionSelectSql(true) . "\nWHERE u.matricule = :matricule AND u.is_active = 1\nLIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['matricule' => $matricule]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, (string)$user['password_hash'])) {
        jsonResponse(['ok' => false, 'message' => 'Matricule ou mot de passe incorrect.'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['user'] = sessionUserFromRow($user);

    return $_SESSION['user'];
}

function changeUserPassword(PDO $pdo, int $userId, string $currentPassword, string $newPassword): void
{
    if (strlen($newPassword) < 8) {
        jsonResponse(['ok' => false, 'message' => 'Le mot de passe doit contenir au moins 8 caractères.'], 422);
    }

    $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id AND is_active = 1');
    $stmt->execute(['id' => $userId]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($currentPassword, (string)$row['password_hash'])) {
        jsonResponse(['ok' => false, 'message' => 'Mot de passe actuel incorrect.'], 401);
    }

    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $upd = $pdo->prepare(
        'UPDATE users SET password_hash = :hash, must_change_password = 0, updated_at = NOW() WHERE id = :id'
    );
    $upd->execute(['hash' => $hash, 'id' => $userId]);

    if (isset($_SESSION['user']) && (int)$_SESSION['user']['id'] === $userId) {
        $_SESSION['user']['must_change_password'] = false;
    }
}

function sessionUserFromRow(array $user): array
{
    return [
        'id' => (int)$user['id'],
        'matricule' => $user['matricule'],
        'nom' => $user['nom'],
        'prenom' => $user['prenom'],
        'email' => $user['email'] ?? null,
        'role_code' => $user['role_code'],
        'role_label' => $user['role_label'],
        'sub_directorate_id' => $user['sub_directorate_id'] ? (int)$user['sub_directorate_id'] : null,
        'service_id' => $user['service_id'] ? (int)$user['service_id'] : null,
        'service_label' => $user['service_label'],
        'sub_directorate_label' => $user['sub_directorate_label'] ?? null,
        'dantic_service_label' => $user['dantic_service_label'] ?? null,
        'must_change_password' => (int)($user['must_change_password'] ?? 0) === 1,
    ];
}

function fetchUserSessionRow(PDO $pdo, int $userId): ?array
{
    $stmt = $pdo->prepare(userSessionSelectSql() . "\nWHERE u.id = :id AND u.is_active = 1\nLIMIT 1");
    $stmt->execute(['id' => $userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function updateUserProfile(PDO $pdo, int $userId, array $input): array
{
    $nom = trim((string)($input['nom'] ?? ''));
    $prenom = trim((string)($input['prenom'] ?? ''));
    $email = trim((string)($input['email'] ?? ''));

    if ($nom === '' || $prenom === '') {
        jsonResponse(['ok' => false, 'message' => 'Le nom et le prénom sont requis.'], 422);
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['ok' => false, 'message' => 'Adresse e-mail invalide.'], 422);
    }

    $stmt = $pdo->prepare(
        'UPDATE users SET nom = :nom, prenom = :prenom, email = :email, updated_at = NOW() WHERE id = :id AND is_active = 1'
    );
    $stmt->execute([
        'nom' => $nom,
        'prenom' => $prenom,
        'email' => $email !== '' ? $email : null,
        'id' => $userId,
    ]);

    $row = fetchUserSessionRow($pdo, $userId);
    if (!$row) {
        jsonResponse(['ok' => false, 'message' => 'Utilisateur introuvable.'], 404);
    }

    $_SESSION['user'] = sessionUserFromRow($row);
    return $_SESSION['user'];
}
