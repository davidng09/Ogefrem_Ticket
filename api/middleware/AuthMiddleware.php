<?php
declare(strict_types=1);

function requireAuth(): array
{
    if (empty($_SESSION['user'])) {
        jsonResponse(['ok' => false, 'message' => 'Session invalide.'], 401);
    }
    return $_SESSION['user'];
}

function requireRoles(array $allowed): array
{
    $user = requireAuth();
    if (!in_array($user['role_code'], $allowed, true)) {
        jsonResponse(['ok' => false, 'message' => 'Accès non autorisé.'], 403);
    }
    return $user;
}
