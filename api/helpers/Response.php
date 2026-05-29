<?php
declare(strict_types=1);

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function readJsonBody(): array
{
    $input = file_get_contents('php://input');
    if ($input === false || $input === '') {
        return [];
    }

    $decoded = json_decode($input, true);
    if (!is_array($decoded)) {
        jsonResponse(['ok' => false, 'message' => 'Corps JSON invalide.'], 400);
    }

    return $decoded;
}
