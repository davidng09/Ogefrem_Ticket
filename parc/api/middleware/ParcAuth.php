<?php
declare(strict_types=1);

const PARC_ALLOWED_ROLES = ['TECHNICIEN', 'CHEF_SERVICE', 'SOUS_DIRECTEUR', 'DIRECTEUR', 'SUPER_ADMIN'];

function requireAuth(): array
{
    if (empty($_SESSION['user'])) {
        jsonResponse(['ok' => false, 'message' => 'Session invalide.'], 401);
    }
    return $_SESSION['user'];
}

function requireParcAccess(): array
{
    $user = requireAuth();
    if (!in_array($user['role_code'] ?? '', PARC_ALLOWED_ROLES, true)) {
        jsonResponse(['ok' => false, 'message' => 'Accès réservé au personnel DANTIC.'], 403);
    }
    return $user;
}

function isParcReadOnly(array $user): bool
{
    return ($user['role_code'] ?? '') === 'DIRECTEUR';
}

function requireParcWrite(): array
{
    $user = requireParcAccess();
    if (isParcReadOnly($user)) {
        jsonResponse(['ok' => false, 'message' => 'La directrice a un accès en lecture seule.'], 403);
    }
    return $user;
}

function requireParcReforme(): array
{
    $user = requireParcAccess();
    if (!in_array($user['role_code'] ?? '', ['CHEF_SERVICE', 'SOUS_DIRECTEUR', 'SUPER_ADMIN'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Réforme réservée aux chefs de service et supérieurs.'], 403);
    }
    return $user;
}

function requireReferentielWrite(): array
{
    $user = requireParcAccess();
    if (!in_array($user['role_code'] ?? '', ['CHEF_SERVICE', 'SOUS_DIRECTEUR', 'SUPER_ADMIN'], true)) {
        jsonResponse(['ok' => false, 'message' => 'Modification des paramètres non autorisée.'], 403);
    }
    return $user;
}
