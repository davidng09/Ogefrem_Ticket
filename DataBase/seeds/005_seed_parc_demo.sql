-- Données de démonstration — parc informatique OGEFREM
-- Prérequis : migration 20260612_parc_informatique.sql + 002_donnees_dantic.sql

USE ogefrem_ops_hub;

INSERT INTO parc_etats (code, label, couleur, sort_order) VALUES
  ('STOCK', 'En stock', '#6B7A99', 1),
  ('SERVICE', 'En service', '#00C48C', 2),
  ('MAINTENANCE', 'En maintenance', '#FFB020', 3),
  ('PANNE', 'En panne', '#FF4D4D', 4),
  ('REFORME', 'Réformé', '#4c4546', 5)
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO parc_types (code, label, sort_order) VALUES
  ('PC_FIXE', 'PC fixe', 1),
  ('PORTABLE', 'Ordinateur portable', 2),
  ('IMPRIMANTE', 'Imprimante', 3),
  ('SWITCH', 'Switch réseau', 4),
  ('SERVEUR', 'Serveur', 5),
  ('TELEPHONE', 'Téléphone', 6),
  ('ONDULEUR', 'Onduleur', 7),
  ('SCANNER', 'Scanner', 8)
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO parc_marques (nom) VALUES
  ('HP'), ('Dell'), ('Lenovo'), ('Cisco'), ('Epson'), ('Canon'), ('APC'), ('Fortinet')
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO parc_directions (code, nom) VALUES
  ('DFIN', 'Direction Financière'),
  ('DGIT', 'Direction des Systèmes d''Information'),
  ('DRH', 'Direction des Ressources Humaines'),
  ('DG', 'Direction Générale'),
  ('DCOM', 'Direction Communication'),
  ('DANTIC', 'Direction DANTIC'),
  ('DLOG', 'Direction Logistique'),
  ('DAUD', 'Direction Audit Interne')
ON DUPLICATE KEY UPDATE nom = VALUES(nom);

INSERT INTO parc_fournisseurs (nom, contact, telephone, email) VALUES
  ('Société Informatique Kinshasa', 'M. Kabila', '+243 81 000 0001', 'contact@sik.cd'),
  ('TechAfrica RDC', 'Mme Ilunga', '+243 82 000 0002', 'ventes@techafrica.cd'),
  ('Global IT Supplies', 'M. Mutamba', '+243 99 000 0003', 'info@globalit.cd'),
  ('Cisco Partner RDC', 'Support', '+243 81 000 0004', 'support@cisco-rdc.cd')
ON DUPLICATE KEY UPDATE contact = VALUES(contact);

INSERT INTO parc_detenteurs (matricule, nom_complet, direction, service, bureau) VALUES
  ('OGF-4521', 'MUKENDI Grace', 'Direction Financière', 'Comptabilité', 'Bureau 204'),
  ('OGF-8834', 'TSHILANDA Pierre', 'Direction Générale', 'Secrétariat DG', 'Bureau 101'),
  ('OGF-2210', 'KABEYA Solange', 'Direction des Ressources Humaines', 'Paie', 'Bureau 312'),
  ('OGF-5567', 'LUBOYA Marc', 'Direction Communication', 'Ventes', 'Bureau 118'),
  ('OGF-3102', 'MUKENDI André', 'Direction Audit Interne', 'Contrôle permanent', 'Bureau 208'),
  ('OGF-6671', 'NZAU Claudine', 'Direction des Ressources Humaines', 'Sécurité sociale', 'Bureau 301'),
  ('OGF-5520', 'KABEYA Paul', 'Direction Financière', 'Trésorerie', 'Bureau 105'),
  ('OGF-86982', 'Lenoir', 'DGIT', 'DGTIS', '089')
ON DUPLICATE KEY UPDATE nom_complet = VALUES(nom_complet);

-- Équipements (idempotent par numero_inventaire)
INSERT INTO parc_equipements (
  numero_inventaire, numero_serie, type_id, marque_id, modele, etat_id, direction_id,
  fournisseur_id, date_acquisition, date_garantie_fin, prix_acquisition, emplacement_libre, notes
)
SELECT v.inv, v.serie, t.id, m.id, v.modele, e.id, d.id, f.id, v.d_acq, v.d_gar, v.prix, v.empl, v.notes
FROM (
  SELECT 'OGF-PC-2024-0001' AS inv, 'SN-HP-001' AS serie, 'PC_FIXE' AS tcode, 'HP' AS mnom, 'EliteDesk 800 G9' AS modele,
    'SERVICE' AS ecode, 'DFIN' AS dcode, 1 AS fidx, '2024-03-15' AS d_acq, '2027-03-15' AS d_gar, 850.00 AS prix, NULL AS empl, 'Poste comptabilité' AS notes
  UNION SELECT 'OGF-PC-2024-0002', 'SN-DL-002', 'PORTABLE', 'Dell', 'Latitude 5540', 'SERVICE', 'DG', 2, '2024-05-01', '2027-05-01', 1200.00, NULL, 'Portable DG'
  UNION SELECT 'OGF-PC-2023-0015', 'SN-LN-015', 'PC_FIXE', 'Lenovo', 'ThinkCentre M70q', 'STOCK', 'DANTIC', 1, '2023-11-10', '2026-11-10', 720.00, 'Magasin DANTIC', 'Stock disponible'
  UNION SELECT 'OGF-PRT-2024-0003', 'SN-EP-003', 'IMPRIMANTE', 'Epson', 'WorkForce Pro WF-4830', 'SERVICE', 'DCOM', 3, '2024-01-20', '2026-01-20', 450.00, 'Open space Communication', NULL
  UNION SELECT 'OGF-NET-2023-0008', 'SN-CS-008', 'SWITCH', 'Cisco', 'Catalyst 2960-X', 'SERVICE', 'DGIT', 4, '2023-06-01', '2028-06-01', 3200.00, 'Salle serveurs A', 'Cœur réseau étage 2'
  UNION SELECT 'OGF-SRV-2022-0001', 'SN-DL-S01', 'SERVEUR', 'Dell', 'PowerEdge R750', 'SERVICE', 'DGIT', 2, '2022-09-01', '2027-09-01', 8500.00, 'Baie principale', 'Hyperviseur prod'
  UNION SELECT 'OGF-PC-2022-0099', 'SN-HP-099', 'PC_FIXE', 'HP', 'ProDesk 400 G7', 'REFORME', 'DLOG', 1, '2020-01-15', '2023-01-15', 600.00, NULL, 'Réformé 2025'
  UNION SELECT 'OGF-PC-2024-0010', 'SN-LN-010', 'PORTABLE', 'Lenovo', 'ThinkPad E14', 'MAINTENANCE', 'DAUD', 3, '2024-08-01', '2027-08-01', 980.00, NULL, 'Réparation écran'
  UNION SELECT 'OGF-OND-2024-0001', 'SN-APC-01', 'ONDULEUR', 'APC', 'Smart-UPS 1500', 'SERVICE', 'DGIT', 3, '2024-02-01', '2029-02-01', 550.00, 'Salle serveurs A', NULL
) v
JOIN parc_types t ON t.code = v.tcode
JOIN parc_marques m ON m.nom = v.mnom
JOIN parc_etats e ON e.code = v.ecode
LEFT JOIN parc_directions d ON d.code = v.dcode
LEFT JOIN parc_fournisseurs f ON f.id = v.fidx
WHERE NOT EXISTS (SELECT 1 FROM parc_equipements pe WHERE pe.numero_inventaire = v.inv);

-- Affectations actives
INSERT INTO parc_affectations (equipement_id, detenteur_id, date_debut, est_active, motif, created_by)
SELECT pe.id, pd.id, '2024-03-20', 1, 'Affectation initiale', (SELECT id FROM users WHERE matricule = 'AG-IRT-INF-MNT' LIMIT 1)
FROM parc_equipements pe
JOIN parc_detenteurs pd ON pd.matricule = 'OGF-4521'
WHERE pe.numero_inventaire = 'OGF-PC-2024-0001'
  AND NOT EXISTS (SELECT 1 FROM parc_affectations pa WHERE pa.equipement_id = pe.id AND pa.est_active = 1);

INSERT INTO parc_affectations (equipement_id, detenteur_id, date_debut, est_active, motif, created_by)
SELECT pe.id, pd.id, '2024-05-10', 1, 'Affectation initiale', (SELECT id FROM users WHERE matricule = 'AG-IRT-INF-MNT' LIMIT 1)
FROM parc_equipements pe
JOIN parc_detenteurs pd ON pd.matricule = 'OGF-8834'
WHERE pe.numero_inventaire = 'OGF-PC-2024-0002'
  AND NOT EXISTS (SELECT 1 FROM parc_affectations pa WHERE pa.equipement_id = pe.id AND pa.est_active = 1);

SELECT 'Équipements' AS entite, COUNT(*) AS total FROM parc_equipements
UNION SELECT 'Détenteurs', COUNT(*) FROM parc_detenteurs
UNION SELECT 'Affectations actives', COUNT(*) FROM parc_affectations WHERE est_active = 1;
