<?php
declare(strict_types=1);

function sessionIdleSeconds(): int
{
    $raw = getenv('SESSION_IDLE_SECONDS');
    $seconds = $raw !== false && $raw !== '' ? (int)$raw : 3600;
    return max(300, min($seconds, 86400));
}

function touchSessionActivity(): void
{
    $_SESSION['last_activity'] = time();
}

function assertSessionNotExpired(): void
{
    if (empty($_SESSION['user'])) {
        return;
    }

    $last = (int)($_SESSION['last_activity'] ?? 0);
    $idleLimit = sessionIdleSeconds();

    if ($last > 0 && (time() - $last) > $idleLimit) {
        session_unset();
        session_destroy();
        jsonResponse(['ok' => false, 'message' => 'Session expirée. Veuillez vous reconnecter.'], 401);
    }

    touchSessionActivity();
}

function isPasswordChangeExemptRequest(string $method, string $path): bool
{
    if ($method === 'GET' && $path === '/auth/me') {
        return true;
    }
    if ($method === 'POST' && in_array($path, ['/auth/change-password', '/auth/logout'], true)) {
        return true;
    }
    return false;
}

function assertPasswordChangedIfRequired(array $user, string $method, string $path): void
{
    if (empty($user['must_change_password'])) {
        return;
    }
    if (isPasswordChangeExemptRequest($method, $path)) {
        return;
    }
    jsonResponse([
        'ok' => false,
        'message' => 'Vous devez changer votre mot de passe avant de continuer.',
        'code' => 'password_change_required',
    ], 403);
}

function validatePasswordStrength(string $password): void
{
    if (strlen($password) < 8) {
        jsonResponse(['ok' => false, 'message' => 'Le mot de passe doit contenir au moins 8 caractères.'], 422);
    }
    if (!preg_match('/[a-z]/', $password)) {
        jsonResponse(['ok' => false, 'message' => 'Le mot de passe doit contenir au moins une minuscule.'], 422);
    }
    if (!preg_match('/[A-Z]/', $password)) {
        jsonResponse(['ok' => false, 'message' => 'Le mot de passe doit contenir au moins une majuscule.'], 422);
    }
    if (!preg_match('/\d/', $password)) {
        jsonResponse(['ok' => false, 'message' => 'Le mot de passe doit contenir au moins un chiffre.'], 422);
    }
    if (!preg_match('/[^A-Za-z0-9]/', $password)) {
        jsonResponse(['ok' => false, 'message' => 'Le mot de passe doit contenir au moins un caractère spécial.'], 422);
    }
}

function assertPublicHoneypotClean(array $input): void
{
    $trap = trim((string)($input['_hp_website'] ?? ''));
    if ($trap !== '') {
        jsonResponse(['ok' => false, 'message' => 'Soumission refusée.'], 422);
    }
}

function normalizePublicTicketInput(array $input): array
{
    $limits = [
        'reporter_full_name' => 150,
        'reporter_matricule' => 32,
        'reporter_direction' => 120,
        'reporter_service' => 120,
        'reporter_office' => 120,
        'description' => 5000,
    ];

    $normalized = [];
    foreach ($limits as $field => $maxLen) {
        $value = trim((string)($input[$field] ?? ''));
        if ($value === '') {
            $normalized[$field] = '';
            continue;
        }
        if (mb_strlen($value) > $maxLen) {
            jsonResponse(['ok' => false, 'message' => "Le champ {$field} est trop long (max {$maxLen} caractères)."], 422);
        }
        $normalized[$field] = $value;
    }

    $normalized['category_id'] = (int)($input['category_id'] ?? 0);
    return $normalized;
}
