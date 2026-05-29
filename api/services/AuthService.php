<?php
declare(strict_types=1);

function loginUser(PDO $pdo, string $matricule, string $password): array
{
    $sql = <<<SQL
SELECT u.id, u.matricule, u.nom, u.prenom, u.password_hash, u.sub_directorate_id, u.service_label,
       r.code AS role_code, r.label AS role_label
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE u.matricule = :matricule AND u.is_active = 1
LIMIT 1
SQL;
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['matricule' => $matricule]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, (string)$user['password_hash'])) {
        jsonResponse(['ok' => false, 'message' => 'Matricule ou mot de passe incorrect.'], 401);
    }

    session_regenerate_id(true);
    $_SESSION['user'] = [
        'id' => (int)$user['id'],
        'matricule' => $user['matricule'],
        'nom' => $user['nom'],
        'prenom' => $user['prenom'],
        'role_code' => $user['role_code'],
        'role_label' => $user['role_label'],
        'sub_directorate_id' => $user['sub_directorate_id'] ? (int)$user['sub_directorate_id'] : null,
        'service_label' => $user['service_label'],
    ];

    return $_SESSION['user'];
}
