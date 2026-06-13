<?php
declare(strict_types=1);

require_once __DIR__ . '/MouvementService.php';

function equipementSelectSql(): string
{
    return <<<SQL
SELECT pe.*,
       pt.label AS type_label, pt.code AS type_code,
       pm.nom AS marque_nom,
       pe_et.label AS etat_label, pe_et.code AS etat_code, pe_et.couleur AS etat_couleur,
       pd_dir.nom AS direction_nom, pd_dir.code AS direction_code,
       pf.nom AS fournisseur_nom,
       pd.id AS detenteur_id, pd.matricule AS detenteur_matricule,
       pd.nom_complet AS detenteur_nom, pd.direction AS detenteur_direction,
       pd.service AS detenteur_service, pd.bureau AS detenteur_bureau
FROM parc_equipements pe
JOIN parc_types pt ON pt.id = pe.type_id
JOIN parc_marques pm ON pm.id = pe.marque_id
JOIN parc_etats pe_et ON pe_et.id = pe.etat_id
LEFT JOIN parc_directions pd_dir ON pd_dir.id = pe.direction_id
LEFT JOIN parc_fournisseurs pf ON pf.id = pe.fournisseur_id
LEFT JOIN parc_affectations pa ON pa.equipement_id = pe.id AND pa.est_active = 1
LEFT JOIN parc_detenteurs pd ON pd.id = pa.detenteur_id
SQL;
}

function listEquipements(PDO $pdo, array $filters = []): array
{
    $sql = equipementSelectSql() . ' WHERE 1=1';
    $params = [];

    if (!empty($filters['etat_id'])) {
        $sql .= ' AND pe.etat_id = :etat_id';
        $params['etat_id'] = (int)$filters['etat_id'];
    }
    if (!empty($filters['type_id'])) {
        $sql .= ' AND pe.type_id = :type_id';
        $params['type_id'] = (int)$filters['type_id'];
    }
    if (!empty($filters['direction_id'])) {
        $sql .= ' AND pe.direction_id = :direction_id';
        $params['direction_id'] = (int)$filters['direction_id'];
    }
    if (!empty($filters['q'])) {
        $sql .= ' AND (pe.numero_inventaire LIKE :q OR pe.numero_serie LIKE :q OR pe.modele LIKE :q
                    OR pd.nom_complet LIKE :q OR pd.matricule LIKE :q)';
        $params['q'] = '%' . $filters['q'] . '%';
    }

    $sql .= ' ORDER BY pe.numero_inventaire ASC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function getEquipement(PDO $pdo, int $id): ?array
{
    $sql = equipementSelectSql() . ' WHERE pe.id = :id LIMIT 1';
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }

    $mov = $pdo->prepare(
        'SELECT pm.*, CONCAT(u.prenom, " ", u.nom) AS actor_name
         FROM parc_mouvements pm
         LEFT JOIN users u ON u.id = pm.actor_user_id
         WHERE pm.equipement_id = :id ORDER BY pm.created_at DESC LIMIT 50'
    );
    $mov->execute(['id' => $id]);
    $row['mouvements'] = $mov->fetchAll();

    return $row;
}

function generateNumeroInventaire(PDO $pdo, string $typeCode): string
{
    $prefix = match ($typeCode) {
        'PORTABLE' => 'OGF-LAP',
        'IMPRIMANTE' => 'OGF-PRT',
        'SWITCH', 'SERVEUR' => 'OGF-NET',
        default => 'OGF-PC',
    };
    $year = date('Y');
    $stmt = $pdo->prepare('SELECT COUNT(*) AS c FROM parc_equipements WHERE numero_inventaire LIKE :p');
    $stmt->execute(['p' => $prefix . '-' . $year . '-%']);
    $n = (int)$stmt->fetch()['c'] + 1;
    return sprintf('%s-%s-%04d', $prefix, $year, $n);
}

function createEquipement(PDO $pdo, array $user, array $input): array
{
    $typeId = (int)($input['type_id'] ?? 0);
    $marqueId = (int)($input['marque_id'] ?? 0);
    $modele = trim((string)($input['modele'] ?? ''));
    if ($typeId <= 0 || $marqueId <= 0 || $modele === '') {
        jsonResponse(['ok' => false, 'message' => 'Type, marque et modèle requis.'], 422);
    }

    $typeStmt = $pdo->prepare('SELECT code FROM parc_types WHERE id = :id');
    $typeStmt->execute(['id' => $typeId]);
    $typeCode = $typeStmt->fetch()['code'] ?? 'PC_FIXE';

    $numero = trim((string)($input['numero_inventaire'] ?? ''));
    if ($numero === '') {
        $numero = generateNumeroInventaire($pdo, $typeCode);
    }

    $etatId = (int)($input['etat_id'] ?? 0);
    if ($etatId <= 0) {
        $stock = $pdo->query("SELECT id FROM parc_etats WHERE code = 'STOCK' LIMIT 1")->fetch();
        $etatId = (int)($stock['id'] ?? 1);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO parc_equipements
         (numero_inventaire, numero_serie, type_id, marque_id, modele, etat_id, direction_id,
          fournisseur_id, date_acquisition, date_garantie_fin, prix_acquisition, emplacement_libre, notes, created_by, updated_by)
         VALUES
         (:numero, :serie, :type_id, :marque_id, :modele, :etat_id, :direction_id,
          :fournisseur_id, :date_acquisition, :date_garantie_fin, :prix, :emplacement, :notes, :uid, :uid2)'
    );
    $stmt->execute([
        'numero' => $numero,
        'serie' => ($input['numero_serie'] ?? '') ?: null,
        'type_id' => $typeId,
        'marque_id' => $marqueId,
        'modele' => $modele,
        'etat_id' => $etatId,
        'direction_id' => !empty($input['direction_id']) ? (int)$input['direction_id'] : null,
        'fournisseur_id' => !empty($input['fournisseur_id']) ? (int)$input['fournisseur_id'] : null,
        'date_acquisition' => ($input['date_acquisition'] ?? '') ?: null,
        'date_garantie_fin' => ($input['date_garantie_fin'] ?? '') ?: null,
        'prix' => isset($input['prix_acquisition']) && $input['prix_acquisition'] !== '' ? $input['prix_acquisition'] : null,
        'emplacement' => ($input['emplacement_libre'] ?? '') ?: null,
        'notes' => ($input['notes'] ?? '') ?: null,
        'uid' => (int)$user['id'],
        'uid2' => (int)$user['id'],
    ]);

    $id = (int)$pdo->lastInsertId();
    logParcMouvement($pdo, $id, (int)$user['id'], 'creation', ['numero_inventaire' => $numero]);

    if (!empty($input['detenteur']) && is_array($input['detenteur'])) {
        assignEquipement($pdo, $user, $id, $input['detenteur']);
    }

    return getEquipement($pdo, $id) ?? ['id' => $id];
}

function updateEquipement(PDO $pdo, array $user, int $id, array $input): array
{
    $existing = getEquipement($pdo, $id);
    if (!$existing) {
        jsonResponse(['ok' => false, 'message' => 'Équipement introuvable.'], 404);
    }

    $fields = [
        'numero_serie' => $input['numero_serie'] ?? $existing['numero_serie'],
        'type_id' => (int)($input['type_id'] ?? $existing['type_id']),
        'marque_id' => (int)($input['marque_id'] ?? $existing['marque_id']),
        'modele' => trim((string)($input['modele'] ?? $existing['modele'])),
        'etat_id' => (int)($input['etat_id'] ?? $existing['etat_id']),
        'direction_id' => isset($input['direction_id']) ? ($input['direction_id'] ? (int)$input['direction_id'] : null) : $existing['direction_id'],
        'fournisseur_id' => isset($input['fournisseur_id']) ? ($input['fournisseur_id'] ? (int)$input['fournisseur_id'] : null) : $existing['fournisseur_id'],
        'date_acquisition' => $input['date_acquisition'] ?? $existing['date_acquisition'],
        'date_garantie_fin' => $input['date_garantie_fin'] ?? $existing['date_garantie_fin'],
        'prix_acquisition' => $input['prix_acquisition'] ?? $existing['prix_acquisition'],
        'emplacement_libre' => $input['emplacement_libre'] ?? $existing['emplacement_libre'],
        'notes' => $input['notes'] ?? $existing['notes'],
    ];

    $stmt = $pdo->prepare(
        'UPDATE parc_equipements SET
           numero_serie = :serie, type_id = :type_id, marque_id = :marque_id, modele = :modele,
           etat_id = :etat_id, direction_id = :direction_id, fournisseur_id = :fournisseur_id,
           date_acquisition = :date_acquisition, date_garantie_fin = :date_garantie_fin,
           prix_acquisition = :prix, emplacement_libre = :emplacement, notes = :notes,
           updated_by = :uid, updated_at = NOW()
         WHERE id = :id'
    );
    $stmt->execute([
        'serie' => $fields['numero_serie'] ?: null,
        'type_id' => $fields['type_id'],
        'marque_id' => $fields['marque_id'],
        'modele' => $fields['modele'],
        'etat_id' => $fields['etat_id'],
        'direction_id' => $fields['direction_id'],
        'fournisseur_id' => $fields['fournisseur_id'],
        'date_acquisition' => $fields['date_acquisition'] ?: null,
        'date_garantie_fin' => $fields['date_garantie_fin'] ?: null,
        'prix' => $fields['prix_acquisition'] !== null && $fields['prix_acquisition'] !== '' ? $fields['prix_acquisition'] : null,
        'emplacement' => $fields['emplacement_libre'] ?: null,
        'notes' => $fields['notes'] ?: null,
        'uid' => (int)$user['id'],
        'id' => $id,
    ]);

    logParcMouvement($pdo, $id, (int)$user['id'], 'modification', $fields);
    return getEquipement($pdo, $id) ?? [];
}

function assignEquipement(PDO $pdo, array $user, int $id, array $detenteurData): void
{
    $pdo->prepare(
        'UPDATE parc_affectations SET est_active = 0, date_fin = CURDATE() WHERE equipement_id = :id AND est_active = 1'
    )->execute(['id' => $id]);

    $detenteurId = findOrCreateDetenteur($pdo, $detenteurData);

    $pdo->prepare(
        'INSERT INTO parc_affectations (equipement_id, detenteur_id, date_debut, est_active, motif, created_by)
         VALUES (:eq, :det, CURDATE(), 1, :motif, :uid)'
    )->execute([
        'eq' => $id,
        'det' => $detenteurId,
        'motif' => $detenteurData['motif'] ?? 'Affectation',
        'uid' => (int)$user['id'],
    ]);

    $serviceEtat = $pdo->query("SELECT id FROM parc_etats WHERE code = 'SERVICE' LIMIT 1")->fetch();
    if ($serviceEtat) {
        $pdo->prepare('UPDATE parc_equipements SET etat_id = :eid, updated_by = :uid WHERE id = :id')
            ->execute(['eid' => (int)$serviceEtat['id'], 'uid' => (int)$user['id'], 'id' => $id]);
    }

    logParcMouvement($pdo, $id, (int)$user['id'], 'affectation', $detenteurData);
}

function returnEquipementStock(PDO $pdo, array $user, int $id): void
{
    $pdo->prepare(
        'UPDATE parc_affectations SET est_active = 0, date_fin = CURDATE() WHERE equipement_id = :id AND est_active = 1'
    )->execute(['id' => $id]);

    $stock = $pdo->query("SELECT id FROM parc_etats WHERE code = 'STOCK' LIMIT 1")->fetch();
    if ($stock) {
        $pdo->prepare('UPDATE parc_equipements SET etat_id = :eid, updated_by = :uid WHERE id = :id')
            ->execute(['eid' => (int)$stock['id'], 'uid' => (int)$user['id'], 'id' => $id]);
    }

    logParcMouvement($pdo, $id, (int)$user['id'], 'retour_stock', null);
}

function reformEquipement(PDO $pdo, array $user, int $id, ?string $motif): void
{
    $pdo->prepare(
        'UPDATE parc_affectations SET est_active = 0, date_fin = CURDATE() WHERE equipement_id = :id AND est_active = 1'
    )->execute(['id' => $id]);

    $reforme = $pdo->query("SELECT id FROM parc_etats WHERE code = 'REFORME' LIMIT 1")->fetch();
    if (!$reforme) {
        jsonResponse(['ok' => false, 'message' => 'État réformé introuvable.'], 500);
    }

    $pdo->prepare('UPDATE parc_equipements SET etat_id = :eid, updated_by = :uid WHERE id = :id')
        ->execute(['eid' => (int)$reforme['id'], 'uid' => (int)$user['id'], 'id' => $id]);

    logParcMouvement($pdo, $id, (int)$user['id'], 'reforme', ['motif' => $motif]);
}

function lookupEquipementsByDetenteur(PDO $pdo, array $params): array
{
    $sql = equipementSelectSql() . ' WHERE pa.est_active = 1';
    $bind = [];

    if (!empty($params['matricule'])) {
        $sql .= ' AND pd.matricule = :matricule';
        $bind['matricule'] = trim((string)$params['matricule']);
    }
    if (!empty($params['direction'])) {
        $sql .= ' AND pd.direction LIKE :direction';
        $bind['direction'] = '%' . trim((string)$params['direction']) . '%';
    }
    if (!empty($params['service'])) {
        $sql .= ' AND pd.service LIKE :service';
        $bind['service'] = '%' . trim((string)$params['service']) . '%';
    }
    if (!empty($params['bureau'])) {
        $sql .= ' AND pd.bureau LIKE :bureau';
        $bind['bureau'] = '%' . trim((string)$params['bureau']) . '%';
    }

    if (!$bind) {
        return [];
    }

    $sql .= " AND pe_et.code NOT IN ('REFORME') ORDER BY pe.numero_inventaire";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($bind);
    return $stmt->fetchAll();
}

function dashboardStats(PDO $pdo): array
{
    $byEtat = $pdo->query(
        'SELECT pe_et.code, pe_et.label, pe_et.couleur, COUNT(*) AS total
         FROM parc_equipements pe
         JOIN parc_etats pe_et ON pe_et.id = pe.etat_id
         GROUP BY pe_et.id ORDER BY pe_et.sort_order'
    )->fetchAll();

    $total = (int)$pdo->query('SELECT COUNT(*) AS c FROM parc_equipements')->fetch()['c'];
    $garantieExpire = (int)$pdo->query(
        'SELECT COUNT(*) AS c FROM parc_equipements
         WHERE date_garantie_fin IS NOT NULL AND date_garantie_fin < CURDATE()
           AND etat_id NOT IN (SELECT id FROM parc_etats WHERE code = "REFORME")'
    )->fetch()['c'];

    $enStock = 0;
    $enService = 0;
    foreach ($byEtat as $row) {
        if ($row['code'] === 'STOCK') {
            $enStock = (int)$row['total'];
        }
        if ($row['code'] === 'SERVICE') {
            $enService = (int)$row['total'];
        }
    }

    return [
        'total' => $total,
        'en_stock' => $enStock,
        'en_service' => $enService,
        'garantie_expiree' => $garantieExpire,
        'par_etat' => $byEtat,
    ];
}
