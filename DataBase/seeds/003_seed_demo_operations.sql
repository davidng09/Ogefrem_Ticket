-- =============================================================================
-- OGEFREM Tickets — Données de démonstration (tickets, rapports, notifications)
--
-- Prérequis : 001_schema_complet.sql + 002_donnees_dantic.sql déjà importés.
-- Ne modifie pas les utilisateurs — enrichit uniquement les données opérationnelles.
--
-- Contenu :
--   - Avancement des 3 tickets existants (si présents)
--   - ~15 tickets supplémentaires couvrant tous les statuts du workflow
--   - Rapports de résolution (soumis → validé directrice, rejets)
--   - Notifications, événements, rapports hebdo, bundles mensuels
--   - Rapports mensuels sous-direction (fichiers dans api/storage/monthly_reports/)
--   - Archives agent (tickets résolus)
--
-- Import : phpMyAdmin ou  mysql -u root ogefrem_ops_hub < DataBase/seeds/003_seed_demo_operations.sql
-- =============================================================================

USE ogefrem_ops_hub;

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Références utilisateurs (par matricule — portable)
-- ---------------------------------------------------------------------------

SET @dir_id      = (SELECT id FROM users WHERE matricule = 'DIR-001');
SET @sdm_id      = (SELECT id FROM users WHERE matricule = 'SDM-001');
SET @sda_id      = (SELECT id FROM users WHERE matricule = 'SDA-001');
SET @cs_irt_inf  = (SELECT id FROM users WHERE matricule = 'CS-IRT-INF-001');
SET @cs_irt_res  = (SELECT id FROM users WHERE matricule = 'CS-IRT-RES-001');
SET @cs_irt_tel  = (SELECT id FROM users WHERE matricule = 'CS-IRT-TEL-001');
SET @cs_ad_dev   = (SELECT id FROM users WHERE matricule = 'CS-AD-DEV-001');
SET @cs_ad_acm   = (SELECT id FROM users WHERE matricule = 'CS-AD-ACM-001');
SET @cs_ad_lia   = (SELECT id FROM users WHERE matricule = 'CS-AD-LIA-001');
SET @ag_inf_mnt  = (SELECT id FROM users WHERE matricule = 'AG-IRT-INF-MNT');
SET @ag_inf_adm  = (SELECT id FROM users WHERE matricule = 'AG-IRT-INF-ADM');
SET @ag_res_hd   = (SELECT id FROM users WHERE matricule = 'AG-IRT-RES-HD');
SET @ag_tel_bur  = (SELECT id FROM users WHERE matricule = 'AG-IRT-TEL-BUR');
SET @ag_dev_tec  = (SELECT id FROM users WHERE matricule = 'AG-AD-DEV-TEC');
SET @ag_dev_fin  = (SELECT id FROM users WHERE matricule = 'AG-AD-DEV-FIN');
SET @ag_acm_ana  = (SELECT id FROM users WHERE matricule = 'AG-AD-ACM-ANA');
SET @ag_lia_don  = (SELECT id FROM users WHERE matricule = 'AG-AD-LIA-DON');

SET @sd_irt = (SELECT id FROM sub_directorates WHERE code = 'INFRA_RESEAU_TELECOMS');
SET @sd_ad  = (SELECT id FROM sub_directorates WHERE code = 'ANALYSE_DEV_APPS');

SET @cat_reseau = (SELECT id FROM ticket_categories WHERE code = 'RESEAU');
SET @cat_hw     = (SELECT id FROM ticket_categories WHERE code = 'HARDWARE');
SET @cat_app    = (SELECT id FROM ticket_categories WHERE code = 'APPLICATIONS');
SET @cat_autres = (SELECT id FROM ticket_categories WHERE code = 'AUTRES');
SET @cat_imp    = (SELECT id FROM ticket_categories WHERE code = 'IMPRESSION');
SET @cat_acces  = (SELECT id FROM ticket_categories WHERE code = 'ACCES');

-- ---------------------------------------------------------------------------
-- Avancer les tickets déjà soumis via le portail (si présents)
-- ---------------------------------------------------------------------------

UPDATE tickets SET
  status = 'chez_chef_service',
  assigned_chef_id = @cs_ad_dev,
  priority = 'bloquant',
  priority_set_by = @dir_id,
  director_assigned_at = '2026-06-10 09:00:00',
  updated_at = '2026-06-10 09:05:00'
WHERE ticket_number = 'TKT-2026-0001' AND status = 'chez_sous_direction';

UPDATE tickets SET
  status = 'chez_chef_service',
  assigned_chef_id = @cs_irt_tel,
  priority = 'haute',
  priority_set_by = @dir_id,
  sla_due_at = '2026-06-11 17:00:00',
  director_assigned_at = '2026-06-10 10:00:00',
  updated_at = '2026-06-10 10:15:00'
WHERE ticket_number = 'TKT-2026-0003' AND status = 'chez_sous_direction';

UPDATE tickets SET
  priority = 'normale',
  priority_set_by = @dir_id,
  updated_at = '2026-06-11 08:20:00'
WHERE ticket_number = 'TKT-2026-0002' AND status = 'nouveau';

-- ---------------------------------------------------------------------------
-- Nouveaux tickets — couverture complète du workflow
-- ---------------------------------------------------------------------------

INSERT INTO tickets (
  ticket_number, reporter_full_name, reporter_matricule, reporter_direction,
  reporter_service, reporter_office, category_id, description, priority, sla_due_at,
  status, sub_directorate_id, assigned_chef_id, assigned_technician_id,
  received_by_director_at, priority_set_by, closed_at, director_assigned_at, created_at
)
SELECT * FROM (
  SELECT 'TKT-2026-0004' AS tn, 'MUKENDI Grace' AS rfn, 'OGF-4521' AS rm, 'Direction Financière' AS rd,
    'Comptabilité' AS rs, 'Bureau 204' AS ro, @cat_acces AS cid,
    'Impossible de se connecter au VPN depuis le domicile — accès SAP bloqué.' AS desc_,
    'bloquant' AS pri, '2026-06-12 12:00:00' AS sla, 'nouveau' AS st, NULL AS sd, NULL AS chef, NULL AS tech,
    '2026-06-11 07:30:00' AS rbd, NULL AS psb, NULL AS closed, NULL AS dass, '2026-06-11 07:30:00' AS cat
  UNION ALL SELECT 'TKT-2026-0005', 'TSHILANDA Pierre', 'OGF-8834', 'Direction Générale', 'Secrétariat DG', 'Bureau 101',
    @cat_hw, 'Écran noir au démarrage du poste — voyant alimentation fixe, pas de signal BIOS.',
    'haute', '2026-06-13 09:00:00', 'nouveau', NULL, NULL, NULL,
    '2026-06-11 08:45:00', NULL, NULL, NULL, '2026-06-11 08:45:00'
  UNION ALL SELECT 'TKT-2026-0006', 'KABEYA Solange', 'OGF-2210', 'Direction RH', 'Paie', 'Bureau 312',
    @cat_reseau, 'WiFi du 3e étage instable depuis lundi — déconnexions toutes les 10 minutes.',
    'haute', NULL, 'chez_sous_direction', @sd_irt, NULL, NULL,
    '2026-06-09 14:00:00', @dir_id, NULL, '2026-06-09 15:30:00', '2026-06-09 14:00:00'
  UNION ALL SELECT 'TKT-2026-0007', 'LUBOYA Marc', 'OGF-5567', 'Direction Commerciale', 'Ventes', 'Bureau 118',
    @cat_app, 'L''application de suivi des mandats affiche une erreur 500 à l''ouverture des dossiers.',
    'bloquant', '2026-06-10 18:00:00', 'chez_sous_direction', @sd_ad, NULL, NULL,
    '2026-06-08 11:00:00', @dir_id, NULL, '2026-06-08 11:45:00', '2026-06-08 11:00:00'
  UNION ALL SELECT 'TKT-2026-0008', 'NZAU Eric', 'OGF-3344', 'Direction Logistique', 'Stock', 'Entrepôt A',
    @cat_hw, 'PC de gestion stock ne démarre plus après coupure électrique.',
    'normale', NULL, 'chez_chef_service', @sd_irt, @cs_irt_inf, NULL,
    '2026-06-07 09:00:00', @dir_id, NULL, '2026-06-07 10:00:00', '2026-06-07 09:00:00'
  UNION ALL SELECT 'TKT-2026-0009', 'MPUTU Diane', 'OGF-7788', 'Direction Juridique', 'Contentieux', 'Bureau 405',
    @cat_app, 'Module archivage électronique : les pièces jointes ne s''enregistrent plus.',
    'haute', '2026-06-11 16:00:00', 'chez_chef_service', @sd_ad, @cs_ad_acm, NULL,
    '2026-06-06 13:00:00', @dir_id, NULL, '2026-06-06 14:00:00', '2026-06-06 13:00:00'
  UNION ALL SELECT 'TKT-2026-0010', 'KANZA Joseph', 'OGF-1199', 'Direction Technique', 'Maintenance', 'Atelier',
    @cat_reseau, 'Switch salle serveur : port 12 inactif, 8 postes sans réseau.',
    'bloquant', '2026-06-08 08:00:00', 'assigne_technicien', @sd_irt, @cs_irt_res, @ag_res_hd,
    '2026-06-05 08:00:00', @dir_id, NULL, '2026-06-05 09:00:00', '2026-06-05 08:00:00'
  UNION ALL SELECT 'TKT-2026-0011', 'BIBI Sandra', 'OGF-6622', 'Direction Communication', 'Presse', 'Bureau 210',
    @cat_imp, 'Imprimante multifonction HP : bourrage papier récurrent, scan indisponible.',
    'normale', NULL, 'en_cours', @sd_irt, @cs_irt_tel, @ag_tel_bur,
    '2026-06-04 10:00:00', @dir_id, NULL, '2026-06-04 11:00:00', '2026-06-04 10:00:00'
  UNION ALL SELECT 'TKT-2026-0012', 'SANGA Irène', 'OGF-4455', 'Direction Audit', 'Contrôle interne', 'Bureau 303',
    @cat_app, 'Export Excel du tableau de bord audit échoue — fichier vide généré.',
    'normale', NULL, 'resolu', @sd_ad, @cs_ad_dev, @ag_dev_tec,
    '2026-06-03 09:00:00', @dir_id, '2026-06-05 16:30:00', '2026-06-03 10:00:00', '2026-06-03 09:00:00'
  UNION ALL SELECT 'TKT-2026-0013', 'OKITO Daniel', 'OGF-9901', 'Direction Informatique', 'Support', 'Bureau 115',
    @cat_reseau, 'Lenteur réseau généralisée sur le VLAN invités — latence > 500 ms.',
    'haute', NULL, 'resolu', @sd_irt, @cs_irt_res, @ag_res_hd,
    '2026-06-02 08:00:00', @dir_id, '2026-06-04 11:00:00', '2026-06-02 09:00:00', '2026-06-02 08:00:00'
  UNION ALL SELECT 'TKT-2026-0014', 'LUKUSA Sarah', 'OGF-3377', 'Direction Partenariats', 'Relations', 'Bureau 220',
    @cat_app, 'Interface EDI partenaire BCDC : échec synchronisation nocturne.',
    'haute', NULL, 'resolu', @sd_ad, @cs_ad_lia, @ag_lia_don,
    '2026-06-01 14:00:00', @dir_id, '2026-06-03 17:00:00', '2026-06-01 15:00:00', '2026-06-01 14:00:00'
  UNION ALL SELECT 'TKT-2026-0015', 'MWAMBA Grace', 'OGF-2288', 'Direction Formation', 'Planification', 'Bureau 402',
    @cat_autres, 'Vidéoprojecteur salle B : pas de signal HDMI, câble testé OK.',
    'normale', NULL, 'resolu', @sd_irt, @cs_irt_inf, @ag_inf_mnt,
    '2026-05-28 10:00:00', @dir_id, '2026-05-30 15:00:00', '2026-05-28 11:00:00', '2026-05-28 10:00:00'
  UNION ALL SELECT 'TKT-2026-0016', 'KAPENDA Bruno', 'OGF-5512', 'Direction Qualité', 'Normes', 'Bureau 305',
    @cat_app, 'Application qualité ISO : formulaire non-conformité ne se soumet pas.',
    'normale', NULL, 'resolu', @sd_ad, @cs_ad_acm, @ag_acm_ana,
    '2026-05-25 09:00:00', @dir_id, '2026-05-27 14:00:00', '2026-05-25 10:00:00', '2026-05-25 09:00:00'
  UNION ALL SELECT 'TKT-2026-0017', 'MONGA Kevin', 'OGF-7744', 'Direction Trésorerie', 'Encaissements', 'Bureau 201',
    @cat_app, 'Module encaissement : timeout à la validation des opérations > 50 000 USD.',
    'bloquant', NULL, 'resolu', @sd_ad, @cs_ad_dev, @ag_dev_fin,
    '2026-05-20 08:00:00', @dir_id, '2026-05-22 12:00:00', '2026-05-20 09:00:00', '2026-05-20 08:00:00'
  UNION ALL SELECT 'TKT-2026-0018', 'NGANDU Eric', 'OGF-6633', 'Direction Sécurité', 'Accès physique', 'Guérite',
    @cat_acces, 'Badge d''accès ne fonctionne plus — lecteur tourniquet entrée principale.',
    'haute', NULL, 'resolu', @sd_irt, @cs_irt_res, @ag_res_hd,
    '2026-05-15 07:00:00', @dir_id, '2026-05-16 18:00:00', '2026-05-15 08:00:00', '2026-05-15 07:00:00'
) AS demo
WHERE NOT EXISTS (SELECT 1 FROM tickets t WHERE t.ticket_number = demo.tn);

-- ---------------------------------------------------------------------------
-- Rapports de résolution — divers stades de validation
-- ---------------------------------------------------------------------------

-- 0012 : rapport soumis, en attente chef
INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at)
SELECT t.id, @ag_dev_tec,
  'Diagnostic : bug dans la requête SQL du module export (jointure manquante sur la table audit_logs).\nCorrection appliquée en production le 05/06.\nTests : export 500 lignes OK, fichier Excel valide.\nRecommandation : mise à jour du patch v2.3.1 planifiée.',
  1, 'soumis', '2026-06-05 16:45:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0012'
  AND NOT EXISTS (SELECT 1 FROM resolution_reports rr WHERE rr.ticket_id = t.id);

-- 0013 : validé chef, en attente sous-directeur
INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at)
SELECT t.id, @ag_res_hd,
  'Analyse : saturation du VLAN invités (200+ appareils connectés).\nAction : segmentation du réseau invités, limitation à 50 connexions simultanées.\nRésultat : latence réduite à 45 ms en moyenne.\nDocumentation mise à jour dans la base de connaissances.',
  1, 'valide_chef', '2026-06-04 11:30:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0013'
  AND NOT EXISTS (SELECT 1 FROM resolution_reports rr WHERE rr.ticket_id = t.id);

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, @cs_irt_res, 'CHEF_SERVICE', 'approuve', 'Intervention conforme, bon diagnostic.', '2026-06-04 14:00:00'
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id AND t.ticket_number = 'TKT-2026-0013'
WHERE NOT EXISTS (SELECT 1 FROM report_validations rv WHERE rv.report_id = rr.id);

-- 0014 : validé SD, en attente directrice
INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at)
SELECT t.id, @ag_lia_don,
  'Cause : certificat SSL expiré côté partenaire BCDC.\nCoordination avec l''équipe partenaire pour renouvellement.\nRelance manuelle des flux EDI effectuée avec succès à 16h30.\nSurveillance active pendant 48h — aucune anomalie.',
  1, 'valide_sd', '2026-06-03 17:30:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0014'
  AND NOT EXISTS (SELECT 1 FROM resolution_reports rr WHERE rr.ticket_id = t.id);

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, created_at)
SELECT rr.id, @cs_ad_lia, 'CHEF_SERVICE', 'approuve', '2026-06-03 18:00:00'
FROM resolution_reports rr JOIN tickets t ON t.id = rr.ticket_id AND t.ticket_number = 'TKT-2026-0014'
WHERE NOT EXISTS (SELECT 1 FROM report_validations rv WHERE rv.report_id = rr.id AND rv.validator_role = 'CHEF_SERVICE');

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, created_at)
SELECT rr.id, @sda_id, 'SOUS_DIRECTEUR', 'approuve', '2026-06-04 09:00:00'
FROM resolution_reports rr JOIN tickets t ON t.id = rr.ticket_id AND t.ticket_number = 'TKT-2026-0014'
WHERE NOT EXISTS (SELECT 1 FROM report_validations rv WHERE rv.report_id = rr.id AND rv.validator_role = 'SOUS_DIRECTEUR');

UPDATE tickets t
JOIN resolution_reports rr ON rr.ticket_id = t.id AND rr.status = 'valide_sd'
SET t.report_submitted_to_director_at = '2026-06-04 09:05:00'
WHERE t.ticket_number = 'TKT-2026-0014';

-- 0015 : validé directrice → archivé dans rapports_valides
INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at)
SELECT t.id, @ag_inf_mnt,
  'Remplacement du câble HDMI interne du vidéoprojecteur (usure au niveau du connecteur).\nTest sur 3 sources (PC, laptop, tablette) : signal OK.\nFormation rapide utilisateur sur la sélection de source.',
  1, 'valide_directeur', '2026-05-30 15:30:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0015'
  AND NOT EXISTS (SELECT 1 FROM resolution_reports rr WHERE rr.ticket_id = t.id);

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, created_at)
SELECT rr.id, @cs_irt_inf, 'CHEF_SERVICE', 'approuve', '2026-05-30 16:00:00'
FROM resolution_reports rr JOIN tickets t ON t.id = rr.ticket_id AND t.ticket_number = 'TKT-2026-0015'
WHERE NOT EXISTS (SELECT 1 FROM report_validations rv WHERE rv.report_id = rr.id AND rv.validator_role = 'CHEF_SERVICE');

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, created_at)
SELECT rr.id, @sdm_id, 'SOUS_DIRECTEUR', 'approuve', '2026-05-31 08:00:00'
FROM resolution_reports rr JOIN tickets t ON t.id = rr.ticket_id AND t.ticket_number = 'TKT-2026-0015'
WHERE NOT EXISTS (SELECT 1 FROM report_validations rv WHERE rv.report_id = rr.id AND rv.validator_role = 'SOUS_DIRECTEUR');

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, created_at)
SELECT rr.id, @dir_id, 'DIRECTEUR', 'approuve', '2026-05-31 10:00:00'
FROM resolution_reports rr JOIN tickets t ON t.id = rr.ticket_id AND t.ticket_number = 'TKT-2026-0015'
WHERE NOT EXISTS (SELECT 1 FROM report_validations rv WHERE rv.report_id = rr.id AND rv.validator_role = 'DIRECTEUR');

INSERT INTO rapports_valides (
  report_id, ticket_id, ticket_number, sub_directorate_id, sub_directorate_code,
  priority, category_label, reporter_full_name, ticket_description, report_body,
  author_name, validated_by, validated_at, archived_at
)
SELECT rr.id, t.id, t.ticket_number, t.sub_directorate_id, sd.code,
  t.priority, c.label, t.reporter_full_name, t.description, rr.body,
  CONCAT(u.prenom, ' ', u.nom), @dir_id, '2026-05-31 10:00:00', '2026-05-31 10:00:00'
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id AND t.ticket_number = 'TKT-2026-0015'
JOIN ticket_categories c ON c.id = t.category_id
JOIN users u ON u.id = rr.author_id
LEFT JOIN sub_directorates sd ON sd.id = t.sub_directorate_id
WHERE NOT EXISTS (SELECT 1 FROM rapports_valides rv WHERE rv.report_id = rr.id);

UPDATE tickets SET director_visible_until = '2026-06-02 10:00:00'
WHERE ticket_number = 'TKT-2026-0015';

-- 0016 : validé directrice (archive plus ancienne)
INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at)
SELECT t.id, @ag_acm_ana,
  'Bug JavaScript dans le formulaire : event submit non capturé après refonte CSS.\nCorrectif déployé, tests unitaires ajoutés.\nValidation utilisateur métier effectuée.',
  1, 'valide_directeur', '2026-05-27 14:30:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0016'
  AND NOT EXISTS (SELECT 1 FROM resolution_reports rr WHERE rr.ticket_id = t.id);

INSERT INTO rapports_valides (
  report_id, ticket_id, ticket_number, sub_directorate_id, sub_directorate_code,
  priority, category_label, reporter_full_name, ticket_description, report_body,
  author_name, validated_by, validated_at, archived_at
)
SELECT rr.id, t.id, t.ticket_number, t.sub_directorate_id, sd.code,
  t.priority, c.label, t.reporter_full_name, t.description, rr.body,
  CONCAT(u.prenom, ' ', u.nom), @dir_id, '2026-05-28 09:00:00', '2026-05-28 09:00:00'
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id AND t.ticket_number = 'TKT-2026-0016'
JOIN ticket_categories c ON c.id = t.category_id
JOIN users u ON u.id = rr.author_id
LEFT JOIN sub_directorates sd ON sd.id = t.sub_directorate_id
WHERE NOT EXISTS (SELECT 1 FROM rapports_valides rv WHERE rv.report_id = rr.id);

UPDATE tickets SET director_visible_until = '2026-05-30 09:00:00'
WHERE ticket_number = 'TKT-2026-0016';

-- 0017 : rapport rejeté par le chef (v1), v2 soumise
INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at)
SELECT t.id, @ag_dev_fin,
  'Augmentation du timeout PHP à 120s — problème non résolu.',
  1, 'rejete', '2026-05-22 12:30:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0017'
  AND NOT EXISTS (SELECT 1 FROM resolution_reports rr WHERE rr.ticket_id = t.id AND rr.version = 1);

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, @cs_ad_dev, 'CHEF_SERVICE', 'rejete',
  'Le correctif timeout ne traite pas la cause racine. Merci d''analyser la requête SQL et l''indexation.',
  '2026-05-22 15:00:00'
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id AND t.ticket_number = 'TKT-2026-0017' AND rr.version = 1
WHERE NOT EXISTS (SELECT 1 FROM report_validations rv WHERE rv.report_id = rr.id);

INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at)
SELECT t.id, @ag_dev_fin,
  'Analyse approfondie : requête N+1 sur la table operations.\nRefactorisation avec eager loading + index composite (date, montant).\nTemps de réponse réduit de 45s à 2s. Tests charge OK (100 opérations simultanées).',
  2, 'soumis', '2026-05-23 11:00:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0017'
  AND NOT EXISTS (SELECT 1 FROM resolution_reports rr WHERE rr.ticket_id = t.id AND rr.version = 2);

-- 0018 : validé et archivé (mai)
INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at)
SELECT t.id, @ag_res_hd,
  'Lecteur badge défectueux — remplacement du module RFID.\nReprogrammation des badges zone principale (47 badges).\nTest accès : OK pour 5 utilisateurs pilotes.',
  1, 'valide_directeur', '2026-05-16 18:30:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0018'
  AND NOT EXISTS (SELECT 1 FROM resolution_reports rr WHERE rr.ticket_id = t.id);

INSERT INTO rapports_valides (
  report_id, ticket_id, ticket_number, sub_directorate_id, sub_directorate_code,
  priority, category_label, reporter_full_name, ticket_description, report_body,
  author_name, validated_by, validated_at, archived_at
)
SELECT rr.id, t.id, t.ticket_number, t.sub_directorate_id, sd.code,
  t.priority, c.label, t.reporter_full_name, t.description, rr.body,
  CONCAT(u.prenom, ' ', u.nom), @dir_id, '2026-05-17 10:00:00', '2026-05-17 10:00:00'
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id AND t.ticket_number = 'TKT-2026-0018'
JOIN ticket_categories c ON c.id = t.category_id
JOIN users u ON u.id = rr.author_id
LEFT JOIN sub_directorates sd ON sd.id = t.sub_directorate_id
WHERE NOT EXISTS (SELECT 1 FROM rapports_valides rv WHERE rv.report_id = rr.id);

UPDATE tickets SET director_visible_until = '2026-05-19 10:00:00'
WHERE ticket_number = 'TKT-2026-0018';

-- ---------------------------------------------------------------------------
-- Événements tickets (historique)
-- ---------------------------------------------------------------------------

INSERT INTO ticket_events (ticket_id, actor_user_id, event_type, from_status, to_status, created_at)
SELECT t.id, @dir_id, 'assign_sub_directorate', 'nouveau', 'chez_sous_direction', t.director_assigned_at
FROM tickets t
WHERE t.ticket_number IN ('TKT-2026-0006','TKT-2026-0007','TKT-2026-0008','TKT-2026-0009','TKT-2026-0010')
  AND t.director_assigned_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM ticket_events te WHERE te.ticket_id = t.id AND te.event_type = 'assign_sub_directorate'
  );

INSERT INTO ticket_events (ticket_id, actor_user_id, event_type, from_status, to_status, created_at)
SELECT t.id, @sdm_id, 'forward_to_chef', 'chez_sous_direction', 'chez_chef_service', DATE_ADD(t.director_assigned_at, INTERVAL 2 HOUR)
FROM tickets t
WHERE t.ticket_number IN ('TKT-2026-0008','TKT-2026-0010')
  AND NOT EXISTS (
    SELECT 1 FROM ticket_events te WHERE te.ticket_id = t.id AND te.event_type = 'forward_to_chef'
  );

INSERT INTO ticket_events (ticket_id, actor_user_id, event_type, from_status, to_status, created_at)
SELECT t.id, @cs_irt_res, 'assign_technician', 'chez_chef_service', 'assigne_technicien', DATE_ADD(t.created_at, INTERVAL 3 HOUR)
FROM tickets t
WHERE t.ticket_number = 'TKT-2026-0010'
  AND NOT EXISTS (
    SELECT 1 FROM ticket_events te WHERE te.ticket_id = t.id AND te.event_type = 'assign_technician'
  );

-- ---------------------------------------------------------------------------
-- Notifications supplémentaires
-- ---------------------------------------------------------------------------

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT @cs_ad_dev, t.id, 'ticket_forwarded', 'Ticket transmis',
  'Le ticket TKT-2026-0001 vous a été transmis par la sous-direction A&D.', 0, '2026-06-10 09:05:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0001'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.ticket_id = t.id AND n.type = 'ticket_forwarded');

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT @cs_irt_tel, t.id, 'ticket_forwarded', 'Ticket transmis',
  'Le ticket TKT-2026-0003 (imprimante) vous a été transmis.', 0, '2026-06-10 10:15:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0003'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.ticket_id = t.id AND n.type = 'ticket_forwarded' AND n.user_id = @cs_irt_tel);

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT @cs_irt_res, t.id, 'report_submitted', 'Nouveau rapport agent',
  'Rapport de résolution TKT-2026-0013 en attente de votre validation.', 0, '2026-06-04 11:30:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0013'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.ticket_id = t.id AND n.type = 'report_submitted');

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT @sda_id, t.id, 'report_submitted', 'Rapport à valider',
  'Rapport TKT-2026-0014 remonté par le chef de service Liaison.', 0, '2026-06-03 18:00:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0014'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.ticket_id = t.id AND n.type = 'report_submitted' AND n.user_id = @sda_id);

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT @dir_id, t.id, 'report_pending', 'Rapport ticket à valider',
  'Le rapport du ticket TKT-2026-0014 est prêt pour validation direction.', 0, '2026-06-04 09:05:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0014'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.ticket_id = t.id AND n.type = 'report_pending');

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT @ag_dev_fin, t.id, 'report_rejected', 'Rapport rejeté',
  'Votre rapport sur TKT-2026-0017 a été rejeté. Veuillez corriger et resoumettre.', 1, '2026-05-22 15:00:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0017'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.ticket_id = t.id AND n.type = 'report_rejected');

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT @ag_res_hd, t.id, 'ticket_assigned', 'Nouveau ticket à traiter',
  'Le ticket TKT-2026-0010 (switch salle serveur) vous a été assigné.', 0, '2026-06-05 10:00:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0010'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.ticket_id = t.id AND n.type = 'ticket_assigned');

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT @sdm_id, NULL, 'monthly_report_uploaded', 'Rapport mensuel IRT',
  'Rapport mensuel IRT mai 2026 déposé par l''agent rédacteur.', 0, '2026-06-02 09:00:00'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE type = 'monthly_report_uploaded' AND message LIKE '%mai 2026%IRT%');

-- ---------------------------------------------------------------------------
-- Rapports hebdomadaires (mai et juin 2026)
-- ---------------------------------------------------------------------------

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT @ag_inf_mnt, 2026, 5, 1, '2026-05-05', '2026-05-09',
  'Semaine 1 mai : 3 interventions maintenance PC, 1 vidéoprojecteur (TKT-2026-0015 en cours). Formation utilisateur salle réunion.', 'finalise', '2026-05-09 17:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM weekly_reports WHERE author_id = @ag_inf_mnt AND year = 2026 AND month = 5 AND week_index = 1);

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT @ag_inf_mnt, 2026, 5, 2, '2026-05-12', '2026-05-16',
  'Semaine 2 mai : clôture TKT-2026-0015, 2 demandes préventives disques durs.', 'finalise', '2026-05-16 17:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM weekly_reports WHERE author_id = @ag_inf_mnt AND year = 2026 AND month = 5 AND week_index = 2);

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT @ag_res_hd, 2026, 5, 3, '2026-05-19', '2026-05-23',
  'Semaine 3 mai : résolution TKT-2026-0017 (timeout trésorerie), audit VLAN invités.', 'finalise', '2026-05-23 17:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM weekly_reports WHERE author_id = @ag_res_hd AND year = 2026 AND month = 5 AND week_index = 3);

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT @ag_res_hd, 2026, 6, 1, '2026-06-02', '2026-06-06',
  'Semaine 1 juin : TKT-2026-0013 résolu (lenteur VLAN), TKT-2026-0010 assigné (switch).', 'finalise', '2026-06-06 17:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM weekly_reports WHERE author_id = @ag_res_hd AND year = 2026 AND month = 6 AND week_index = 1);

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT @ag_dev_tec, 2026, 6, 1, '2026-06-02', '2026-06-06',
  'Semaine 1 juin : correction export Excel audit (TKT-2026-0012), revue code module reporting.', 'finalise', '2026-06-06 17:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM weekly_reports WHERE author_id = @ag_dev_tec AND year = 2026 AND month = 6 AND week_index = 1);

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT @ag_tel_bur, 2026, 6, 1, '2026-06-02', '2026-06-06',
  'Semaine 1 juin : intervention imprimante HP (TKT-2026-0011 en cours), nettoyage rouleaux.', 'brouillon', '2026-06-06 16:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM weekly_reports WHERE author_id = @ag_tel_bur AND year = 2026 AND month = 6 AND week_index = 1);

-- ---------------------------------------------------------------------------
-- Bundles mensuels agents (mai 2026)
-- ---------------------------------------------------------------------------

INSERT INTO monthly_agent_bundles (sender_id, recipient_id, sub_directorate_id, year, month, concatenated_body, sent_at)
SELECT @ag_inf_mnt, @ag_inf_adm, @sd_irt, 2026, 5,
  '===== RAPPORT HEBDO S1 — KASONGO Moise (AG-IRT-INF-MNT) =====\nSemaine 1 mai : 3 interventions maintenance PC...\n\n===== RAPPORT HEBDO S2 — KASONGO Moise =====\nSemaine 2 mai : clôture vidéoprojecteur...',
  '2026-06-01 08:30:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM monthly_agent_bundles WHERE sender_id = @ag_inf_mnt AND year = 2026 AND month = 5);

INSERT INTO monthly_agent_bundles (sender_id, recipient_id, sub_directorate_id, year, month, concatenated_body, sent_at)
SELECT @ag_res_hd, @ag_inf_adm, @sd_irt, 2026, 5,
  '===== RAPPORT HEBDO S3 — MBALA Jean (AG-IRT-RES-HD) =====\nSemaine 3 mai : résolution timeout trésorerie, audit VLAN...',
  '2026-06-01 09:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM monthly_agent_bundles WHERE sender_id = @ag_res_hd AND year = 2026 AND month = 5);

INSERT INTO monthly_agent_bundles (sender_id, recipient_id, sub_directorate_id, year, month, concatenated_body, sent_at)
SELECT @ag_dev_tec, @ag_dev_fin, @sd_ad, 2026, 5,
  '===== RAPPORT HEBDO S4 — LUKUSA Sarah =====\nDéveloppements correctifs module EDI et exports.',
  '2026-06-01 08:45:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM monthly_agent_bundles WHERE sender_id = @ag_dev_tec AND year = 2026 AND month = 5);

-- ---------------------------------------------------------------------------
-- Rapports mensuels sous-direction (fichiers démo dans api/storage/monthly_reports/)
-- ---------------------------------------------------------------------------

INSERT INTO monthly_subdirectorate_reports (
  sub_directorate_id, uploader_id, year, month, file_path, original_name, mime_type, visibility, uploaded_at
)
SELECT @sd_irt, @ag_inf_adm, 2026, 5, 'demo_irt_mai_2026.pdf', 'Rapport_Mensuel_IRT_Mai_2026.pdf', 'application/pdf', 'active', '2026-06-02 09:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM monthly_subdirectorate_reports WHERE sub_directorate_id = @sd_irt AND year = 2026 AND month = 5);

INSERT INTO monthly_subdirectorate_reports (
  sub_directorate_id, uploader_id, year, month, file_path, original_name, mime_type, visibility, uploaded_at
)
SELECT @sd_ad, @ag_dev_tec, 2026, 5, 'demo_ad_mai_2026.pdf', 'Rapport_Mensuel_AD_Mai_2026.pdf', 'application/pdf', 'archived', '2026-06-02 10:30:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM monthly_subdirectorate_reports WHERE sub_directorate_id = @sd_ad AND year = 2026 AND month = 5);

INSERT INTO monthly_subdirectorate_reports (
  sub_directorate_id, uploader_id, year, month, file_path, original_name, mime_type, visibility, uploaded_at
)
SELECT @sd_irt, @ag_inf_adm, 2026, 4, 'demo_irt_avril_2026.pdf', 'Rapport_Mensuel_IRT_Avril_2026.pdf', 'application/pdf', 'archived', '2026-05-03 09:00:00'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM monthly_subdirectorate_reports WHERE sub_directorate_id = @sd_irt AND year = 2026 AND month = 4);

INSERT INTO monthly_report_comments (monthly_report_id, author_id, body, created_at)
SELECT mr.id, @dir_id, 'Bilan satisfaisant pour mai. Merci de détailler les actions préventives réseau au prochain rapport.', '2026-06-03 11:00:00'
FROM monthly_subdirectorate_reports mr
WHERE mr.sub_directorate_id = @sd_irt AND mr.year = 2026 AND mr.month = 5
  AND NOT EXISTS (SELECT 1 FROM monthly_report_comments mc WHERE mc.monthly_report_id = mr.id);

-- ---------------------------------------------------------------------------
-- Archives agent (tickets résolus des mois précédents)
-- ---------------------------------------------------------------------------

INSERT INTO agent_resolved_archives (agent_id, ticket_id, year, month, week_index, archived_at)
SELECT @ag_inf_mnt, t.id, 2026, 5, 4, '2026-06-01 00:05:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0015'
  AND NOT EXISTS (SELECT 1 FROM agent_resolved_archives ara WHERE ara.agent_id = @ag_inf_mnt AND ara.ticket_id = t.id);

INSERT INTO agent_resolved_archives (agent_id, ticket_id, year, month, week_index, archived_at)
SELECT @ag_acm_ana, t.id, 2026, 5, 4, '2026-06-01 00:05:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0016'
  AND NOT EXISTS (SELECT 1 FROM agent_resolved_archives ara WHERE ara.agent_id = @ag_acm_ana AND ara.ticket_id = t.id);

INSERT INTO agent_resolved_archives (agent_id, ticket_id, year, month, week_index, archived_at)
SELECT @ag_res_hd, t.id, 2026, 5, 3, '2026-06-01 00:05:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0018'
  AND NOT EXISTS (SELECT 1 FROM agent_resolved_archives ara WHERE ara.agent_id = @ag_res_hd AND ara.ticket_id = t.id);

-- ---------------------------------------------------------------------------
-- Résumé
-- ---------------------------------------------------------------------------

SELECT status, COUNT(*) AS nb FROM tickets GROUP BY status ORDER BY nb DESC;
SELECT status, COUNT(*) AS nb FROM resolution_reports GROUP BY status ORDER BY nb DESC;
SELECT COUNT(*) AS rapports_valides FROM rapports_valides;
SELECT COUNT(*) AS notifications FROM notifications;
SELECT COUNT(*) AS weekly_reports FROM weekly_reports;
SELECT COUNT(*) AS monthly_bundles FROM monthly_agent_bundles;
SELECT COUNT(*) AS monthly_sd_reports FROM monthly_subdirectorate_reports;
