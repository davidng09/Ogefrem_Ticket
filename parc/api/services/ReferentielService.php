<?php
declare(strict_types=1);

function listReferentiel(PDO $pdo, string $table, string $orderBy = 'id'): array
{
    $allowed = ['parc_marques', 'parc_types', 'parc_etats', 'parc_directions', 'parc_fournisseurs'];
    if (!in_array($table, $allowed, true)) {
        jsonResponse(['ok' => false, 'message' => 'Table invalide.'], 400);
    }
    return $pdo->query("SELECT * FROM {$table} ORDER BY {$orderBy}")->fetchAll();
}

function createReferentiel(PDO $pdo, string $table, array $data): array
{
    switch ($table) {
        case 'parc_marques':
            $nom = trim((string)($data['nom'] ?? ''));
            if ($nom === '') {
                jsonResponse(['ok' => false, 'message' => 'Nom requis.'], 422);
            }
            $pdo->prepare('INSERT INTO parc_marques (nom) VALUES (:nom)')->execute(['nom' => $nom]);
            break;
        case 'parc_types':
            $code = trim((string)($data['code'] ?? ''));
            $label = trim((string)($data['label'] ?? ''));
            if ($code === '' || $label === '') {
                jsonResponse(['ok' => false, 'message' => 'Code et libellé requis.'], 422);
            }
            $pdo->prepare('INSERT INTO parc_types (code, label, sort_order) VALUES (:c, :l, :s)')
                ->execute(['c' => $code, 'l' => $label, 's' => (int)($data['sort_order'] ?? 99)]);
            break;
        case 'parc_etats':
            $code = trim((string)($data['code'] ?? ''));
            $label = trim((string)($data['label'] ?? ''));
            $pdo->prepare('INSERT INTO parc_etats (code, label, couleur, sort_order) VALUES (:c, :l, :col, :s)')
                ->execute([
                    'c' => $code, 'l' => $label,
                    'col' => ($data['couleur'] ?? '#6B7A99'),
                    's' => (int)($data['sort_order'] ?? 99),
                ]);
            break;
        case 'parc_directions':
            $code = trim((string)($data['code'] ?? ''));
            $nom = trim((string)($data['nom'] ?? ''));
            $pdo->prepare('INSERT INTO parc_directions (code, nom) VALUES (:c, :n)')
                ->execute(['c' => $code, 'n' => $nom]);
            break;
        case 'parc_fournisseurs':
            $nom = trim((string)($data['nom'] ?? ''));
            $pdo->prepare(
                'INSERT INTO parc_fournisseurs (nom, contact, telephone, email, adresse)
                 VALUES (:nom, :contact, :tel, :email, :adr)'
            )->execute([
                'nom' => $nom,
                'contact' => $data['contact'] ?? null,
                'tel' => $data['telephone'] ?? null,
                'email' => $data['email'] ?? null,
                'adr' => $data['adresse'] ?? null,
            ]);
            break;
        default:
            jsonResponse(['ok' => false, 'message' => 'Table invalide.'], 400);
    }
    return ['id' => (int)$pdo->lastInsertId()];
}

function updateReferentiel(PDO $pdo, string $table, int $id, array $data): void
{
    if ($id <= 0) {
        jsonResponse(['ok' => false, 'message' => 'ID invalide.'], 422);
    }
    switch ($table) {
        case 'parc_marques':
            $pdo->prepare('UPDATE parc_marques SET nom = :nom WHERE id = :id')
                ->execute(['nom' => trim((string)($data['nom'] ?? '')), 'id' => $id]);
            break;
        case 'parc_types':
            $pdo->prepare('UPDATE parc_types SET label = :l, sort_order = :s WHERE id = :id')
                ->execute(['l' => $data['label'], 's' => (int)($data['sort_order'] ?? 0), 'id' => $id]);
            break;
        case 'parc_etats':
            $pdo->prepare('UPDATE parc_etats SET label = :l, couleur = :c WHERE id = :id')
                ->execute(['l' => $data['label'], 'c' => $data['couleur'] ?? '#6B7A99', 'id' => $id]);
            break;
        case 'parc_directions':
            $pdo->prepare('UPDATE parc_directions SET nom = :n WHERE id = :id')
                ->execute(['n' => $data['nom'], 'id' => $id]);
            break;
        case 'parc_fournisseurs':
            $pdo->prepare(
                'UPDATE parc_fournisseurs SET nom = :nom, contact = :c, telephone = :t, email = :e, adresse = :a WHERE id = :id'
            )->execute([
                'nom' => $data['nom'], 'c' => $data['contact'] ?? null,
                't' => $data['telephone'] ?? null, 'e' => $data['email'] ?? null,
                'a' => $data['adresse'] ?? null, 'id' => $id,
            ]);
            break;
        default:
            jsonResponse(['ok' => false, 'message' => 'Table invalide.'], 400);
    }
}

function deleteReferentiel(PDO $pdo, string $table, int $id): void
{
    if ($id <= 0) {
        jsonResponse(['ok' => false, 'message' => 'ID invalide.'], 422);
    }
    $allowed = ['parc_marques', 'parc_types', 'parc_etats', 'parc_directions', 'parc_fournisseurs'];
    if (!in_array($table, $allowed, true)) {
        jsonResponse(['ok' => false, 'message' => 'Table invalide.'], 400);
    }
    try {
        $pdo->prepare("DELETE FROM {$table} WHERE id = :id")->execute(['id' => $id]);
    } catch (PDOException $e) {
        jsonResponse(['ok' => false, 'message' => 'Suppression impossible (références existantes).'], 422);
    }
}
