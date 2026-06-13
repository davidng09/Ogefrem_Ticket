<?php
declare(strict_types=1);

function logParcMouvement(PDO $pdo, int $equipementId, ?int $actorId, string $eventType, ?array $payload = null): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO parc_mouvements (equipement_id, actor_user_id, event_type, payload_json)
         VALUES (:equipement_id, :actor_id, :event_type, :payload)'
    );
    $stmt->execute([
        'equipement_id' => $equipementId,
        'actor_id' => $actorId,
        'event_type' => $eventType,
        'payload' => $payload ? json_encode($payload, JSON_UNESCAPED_UNICODE) : null,
    ]);
}

function findOrCreateDetenteur(PDO $pdo, array $data): ?int
{
    $matricule = trim((string)($data['matricule'] ?? ''));
    if ($matricule === '') {
        return null;
    }

    $stmt = $pdo->prepare('SELECT id FROM parc_detenteurs WHERE matricule = :m LIMIT 1');
    $stmt->execute(['m' => $matricule]);
    $row = $stmt->fetch();
    if ($row) {
        return (int)$row['id'];
    }

    $nom = trim((string)($data['nom_complet'] ?? ''));
    $direction = trim((string)($data['direction'] ?? ''));
    $service = trim((string)($data['service'] ?? ''));
    $bureau = trim((string)($data['bureau'] ?? ''));
    if ($nom === '' || $direction === '') {
        return null;
    }

    $ins = $pdo->prepare(
        'INSERT INTO parc_detenteurs (matricule, nom_complet, direction, service, bureau)
         VALUES (:matricule, :nom, :direction, :service, :bureau)'
    );
    $ins->execute([
        'matricule' => $matricule,
        'nom' => $nom,
        'direction' => $direction,
        'service' => $service ?: '-',
        'bureau' => $bureau ?: '-',
    ]);

    return (int)$pdo->lastInsertId();
}
