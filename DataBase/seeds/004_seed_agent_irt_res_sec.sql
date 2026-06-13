-- =============================================================================
-- OGEFREM Tickets — Données agent AG-IRT-RES-SEC (Eric NGANDU)
--
-- Prérequis : schéma + 002_donnees_dantic.sql (+ 003 optionnel).
-- Cible : B. Sécurité et Cyber Attaques — Service Réseaux et Sécurité Informatique
--
-- Contenu :
--   - Tickets affectés (assigne_technicien, en_cours)
--   - Tickets résolus du mois en cours (onglet « Résolus par semaine »)
--   - Historique archivé (mai 2026)
--   - Rapports hebdomadaires (mai + juin 2026)
--   - Rapports de résolution + validations associées
--
-- Import :
--   cmd /c "mysql -u root ogefrem_ops_hub < DataBase\seeds\004_seed_agent_irt_res_sec.sql"
-- =============================================================================

USE ogefrem_ops_hub;

SET NAMES utf8mb4;

SET @agent_id   = (SELECT id FROM users WHERE matricule = 'AG-IRT-RES-SEC');
SET @chef_id    = (SELECT id FROM users WHERE matricule = 'CS-IRT-RES-001');
SET @sdm_id     = (SELECT id FROM users WHERE matricule = 'SDM-001');
SET @dir_id     = (SELECT id FROM users WHERE matricule = 'DIR-001');
SET @sd_irt     = (SELECT id FROM sub_directorates WHERE code = 'INFRA_RESEAU_TELECOMS');
SET @cat_reseau = (SELECT id FROM ticket_categories WHERE code = 'RESEAU');
SET @cat_acces  = (SELECT id FROM ticket_categories WHERE code = 'ACCES');
SET @cat_autres = (SELECT id FROM ticket_categories WHERE code = 'AUTRES');

-- ---------------------------------------------------------------------------
-- Tickets — affectés à AG-IRT-RES-SEC
-- ---------------------------------------------------------------------------

INSERT INTO tickets (
  ticket_number, reporter_full_name, reporter_matricule, reporter_direction,
  reporter_service, reporter_office, category_id, description, priority, sla_due_at,
  status, sub_directorate_id, assigned_chef_id, assigned_technician_id,
  received_by_director_at, priority_set_by, closed_at, director_assigned_at, created_at
)
SELECT * FROM (
  -- Affecté, pas encore pris en charge
  SELECT 'TKT-2026-0020' AS tn, 'MUKENDI André' AS rfn, 'OGF-3102' AS rm,
    'Direction Audit Interne' AS rd, 'Contrôle permanent' AS rs, 'Bureau 208' AS ro,
    @cat_acces AS cid,
    'Alerte phishing : plusieurs collaborateurs ont reçu un e-mail usurpant l''identité DG. Demande de blocage domaine et sensibilisation urgente.' AS desc_,
    'bloquant' AS pri, '2026-06-12 17:00:00' AS sla, 'assigne_technicien' AS st,
    @sd_irt AS sd, @chef_id AS chef, @agent_id AS tech,
    '2026-06-10 08:00:00' AS rbd, @dir_id AS psb, NULL AS closed,
    '2026-06-10 09:30:00' AS dass, '2026-06-10 08:00:00' AS cat

  UNION ALL
  -- En cours d''intervention
  SELECT 'TKT-2026-0021', 'TSHILANDA Marie', 'OGF-4418',
    'Direction des Systèmes d''Information', 'Exploitation', 'Salle serveurs B',
    @cat_reseau,
    'Mise à jour règles pare-feu périmétrique : ouverture port 8443 pour nouvelle passerelle API partenaire.',
    'haute', '2026-06-13 12:00:00', 'en_cours',
    @sd_irt, @chef_id, @agent_id,
    '2026-06-09 10:00:00', @dir_id, NULL,
    '2026-06-09 11:00:00', '2026-06-09 10:00:00'

  UNION ALL
  -- Résolu juin S1 — rapport validé chef → onglet « Résolus »
  SELECT 'TKT-2026-0022', 'KABEYA Paul', 'OGF-5520',
    'Direction Financière', 'Trésorerie', 'Bureau 105',
    @cat_reseau,
    'Scan réseau interne : poste infecté détecté (VLAN comptabilité). Isolation et nettoyage effectués.',
    'haute', NULL, 'resolu',
    @sd_irt, @chef_id, @agent_id,
    '2026-06-02 07:30:00', @dir_id, '2026-06-04 16:00:00',
    '2026-06-02 08:30:00', '2026-06-02 07:30:00'

  UNION ALL
  -- Résolu juin S2 — rapport validé SD → onglet « Résolus »
  SELECT 'TKT-2026-0023', 'NZAU Claudine', 'OGF-6671',
    'Direction RH', 'Sécurité sociale', 'Bureau 301',
    @cat_acces,
    'Compte AD verrouillé après 15 tentatives de connexion échouées — suspicion brute force.',
    'normale', NULL, 'resolu',
    @sd_irt, @chef_id, @agent_id,
    '2026-06-05 09:00:00', @dir_id, '2026-06-09 14:30:00',
    '2026-06-05 10:00:00', '2026-06-05 09:00:00'

  UNION ALL
  -- Résolu juin S2 — rapport soumis, en attente chef → reste dans « Affectés »
  SELECT 'TKT-2026-0024', 'LUBOYA Jean', 'OGF-7782',
    'Direction Communication', 'Relations presse', 'Bureau 212',
    @cat_autres,
    'Fuite potentielle de données : clé USB non chiffrée retrouvée sur poste partagé. Audit et recommandations.',
    'haute', NULL, 'resolu',
    @sd_irt, @chef_id, @agent_id,
    '2026-06-08 11:00:00', @dir_id, '2026-06-11 10:00:00',
    '2026-06-08 12:00:00', '2026-06-08 11:00:00'

  UNION ALL
  -- Historique mai S4 — archivé agent
  SELECT 'TKT-2026-0025', 'MPUTU Diane', 'OGF-8890',
    'Direction Juridique', 'Contentieux', 'Bureau 406',
    @cat_acces,
    'Révocation accès SI pour agent parti en retraite — 12 comptes désactivés.',
    'normale', NULL, 'resolu',
    @sd_irt, @chef_id, @agent_id,
    '2026-05-18 08:00:00', @dir_id, '2026-05-22 17:00:00',
    '2026-05-18 09:00:00', '2026-05-18 08:00:00'

  UNION ALL
  SELECT 'TKT-2026-0026', 'OKITO Sandra', 'OGF-9012',
    'Direction Logistique', 'Approvisionnement', 'Entrepôt C',
    @cat_reseau,
    'Tentative d''intrusion WiFi invité bloquée — MAC address blacklistée, logs transmis à la direction.',
    'haute', NULL, 'resolu',
    @sd_irt, @chef_id, @agent_id,
    '2026-05-12 07:00:00', @dir_id, '2026-05-15 15:30:00',
    '2026-05-12 08:00:00', '2026-05-12 07:00:00'

  UNION ALL
  SELECT 'TKT-2026-0027', 'SANGA Michel', 'OGF-3340',
    'Direction Qualité', 'Certification', 'Bureau 308',
    @cat_autres,
    'Audit sécurité ISO 27001 : 3 écarts mineurs corrigés (politique mots de passe, MFA admin).',
    'normale', NULL, 'resolu',
    @sd_irt, @chef_id, @agent_id,
    '2026-05-05 09:30:00', @dir_id, '2026-05-08 16:00:00',
    '2026-05-05 10:30:00', '2026-05-05 09:30:00'
) AS seed
WHERE @agent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM tickets t WHERE t.ticket_number = seed.tn);

-- ---------------------------------------------------------------------------
-- Rapports de résolution
-- ---------------------------------------------------------------------------

-- 0022 : validé chef
INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at)
SELECT t.id, @agent_id,
  'Poste OGF-PC-4521 isolé du VLAN comptabilité à 10h15.\nAnalyse antivirus : trojan Emotet neutralisé.\nRéimage complète + restauration données depuis sauvegarde D-1.\nScan réseau étendu : aucun autre poste compromis.\nSensibilisation envoyée au service Trésorerie.',
  1, 'valide_chef', '2026-06-04 16:30:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0022'
  AND NOT EXISTS (SELECT 1 FROM resolution_reports rr WHERE rr.ticket_id = t.id);

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, @chef_id, 'CHEF_SERVICE', 'approuve',
  'Intervention rapide et documentée. Bon travail.', '2026-06-05 09:00:00'
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id AND t.ticket_number = 'TKT-2026-0022'
WHERE NOT EXISTS (SELECT 1 FROM report_validations rv WHERE rv.report_id = rr.id);

-- 0023 : validé SD
INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at)
SELECT t.id, @agent_id,
  'Compte AD verrouillé automatiquement par la GPO sécurité.\nAnalyse logs : attaque brute force depuis IP externe (géolocalisation hors RDC).\nRéinitialisation mot de passe utilisateur + activation MFA.\nRègle pare-feu renforcée sur le segment RH.',
  1, 'valide_sd', '2026-06-09 15:00:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0023'
  AND NOT EXISTS (SELECT 1 FROM resolution_reports rr WHERE rr.ticket_id = t.id);

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, created_at)
SELECT rr.id, @chef_id, 'CHEF_SERVICE', 'approuve', '2026-06-09 16:00:00'
FROM resolution_reports rr JOIN tickets t ON t.id = rr.ticket_id AND t.ticket_number = 'TKT-2026-0023'
WHERE NOT EXISTS (SELECT 1 FROM report_validations rv WHERE rv.report_id = rr.id AND rv.validator_role = 'CHEF_SERVICE');

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, created_at)
SELECT rr.id, @sdm_id, 'SOUS_DIRECTEUR', 'approuve', '2026-06-10 08:30:00'
FROM resolution_reports rr JOIN tickets t ON t.id = rr.ticket_id AND t.ticket_number = 'TKT-2026-0023'
WHERE NOT EXISTS (SELECT 1 FROM report_validations rv WHERE rv.report_id = rr.id AND rv.validator_role = 'SOUS_DIRECTEUR');

-- 0024 : soumis, en attente chef
INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at)
SELECT t.id, @agent_id,
  'Clé USB saisie et analysée : aucun malware détecté, mais données sensibles non chiffrées.\nRecommandation : déploiement BitLocker sur postes partagés.\nNote de service rédigée pour la direction Communication.\nFormation courte prévue le 13/06.',
  1, 'soumis', '2026-06-11 10:30:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0024'
  AND NOT EXISTS (SELECT 1 FROM resolution_reports rr WHERE rr.ticket_id = t.id);

-- Historique mai — rapports validés
INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at)
SELECT t.id, @agent_id,
  '12 comptes AD désactivés, accès VPN révoqués, badge désactivé.\nProcédure checklist départ validée avec RH.',
  1, 'valide_directeur', '2026-05-22 17:30:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0025'
  AND NOT EXISTS (SELECT 1 FROM resolution_reports rr WHERE rr.ticket_id = t.id);

INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at)
SELECT t.id, @agent_id,
  'MAC 00:1A:2B:3C:4D:5E ajoutée à la blacklist.\nRenforcement WPA3 sur borne invité B-12.\nRapport incident transmis à la direction.',
  1, 'valide_chef', '2026-05-15 16:00:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0026'
  AND NOT EXISTS (SELECT 1 FROM resolution_reports rr WHERE rr.ticket_id = t.id);

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, created_at)
SELECT rr.id, @chef_id, 'CHEF_SERVICE', 'approuve', '2026-05-16 09:00:00'
FROM resolution_reports rr JOIN tickets t ON t.id = rr.ticket_id AND t.ticket_number = 'TKT-2026-0026'
WHERE NOT EXISTS (SELECT 1 FROM report_validations rv WHERE rv.report_id = rr.id);

INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at)
SELECT t.id, @agent_id,
  'Écarts ISO 27001 : politique mots de passe mise à jour (14 car., complexité).\nMFA activé pour 8 comptes admin.\nPreuves documentaires jointes au dossier certification.',
  1, 'valide_directeur', '2026-05-08 16:30:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0027'
  AND NOT EXISTS (SELECT 1 FROM resolution_reports rr WHERE rr.ticket_id = t.id);

-- ---------------------------------------------------------------------------
-- Archives agent (historique mai 2026)
-- ---------------------------------------------------------------------------

INSERT INTO agent_resolved_archives (agent_id, ticket_id, year, month, week_index, archived_at)
SELECT @agent_id, t.id, 2026, 5, 4, '2026-06-01 00:10:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0025'
  AND NOT EXISTS (SELECT 1 FROM agent_resolved_archives ara WHERE ara.agent_id = @agent_id AND ara.ticket_id = t.id);

INSERT INTO agent_resolved_archives (agent_id, ticket_id, year, month, week_index, archived_at)
SELECT @agent_id, t.id, 2026, 5, 3, '2026-06-01 00:10:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0026'
  AND NOT EXISTS (SELECT 1 FROM agent_resolved_archives ara WHERE ara.agent_id = @agent_id AND ara.ticket_id = t.id);

INSERT INTO agent_resolved_archives (agent_id, ticket_id, year, month, week_index, archived_at)
SELECT @agent_id, t.id, 2026, 5, 2, '2026-06-01 00:10:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0027'
  AND NOT EXISTS (SELECT 1 FROM agent_resolved_archives ara WHERE ara.agent_id = @agent_id AND ara.ticket_id = t.id);

-- ---------------------------------------------------------------------------
-- Rapports hebdomadaires — AG-IRT-RES-SEC
-- ---------------------------------------------------------------------------

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT @agent_id, 2026, 5, 1, '2026-05-05', '2026-05-09',
  'Semaine 1 mai — Sécurité :\n• Audit ISO 27001 lancé (TKT-2026-0027 en cours)\n• Revue des comptes admin AD (23 comptes audités)\n• Mise à jour signatures antivirus centralisées',
  'finalise', '2026-05-09 17:00:00'
FROM DUAL WHERE @agent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM weekly_reports WHERE author_id = @agent_id AND year = 2026 AND month = 5 AND week_index = 1);

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT @agent_id, 2026, 5, 2, '2026-05-12', '2026-05-16',
  'Semaine 2 mai — Sécurité :\n• Blocage intrusion WiFi invité (TKT-2026-0026 résolu)\n• Déploiement correctif CVE-2026-1234 sur 45 postes\n• Simulation phishing : taux de clic 8% (objectif < 5%)',
  'finalise', '2026-05-16 17:00:00'
FROM DUAL WHERE @agent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM weekly_reports WHERE author_id = @agent_id AND year = 2026 AND month = 5 AND week_index = 2);

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT @agent_id, 2026, 5, 3, '2026-05-19', '2026-05-23',
  'Semaine 3 mai — Sécurité :\n• Révocation accès départ retraite (TKT-2026-0025 clôturé)\n• Renforcement MFA sur comptes sensibles (+12 comptes)\n• Revue logs pare-feu hebdomadaire',
  'finalise', '2026-05-23 17:00:00'
FROM DUAL WHERE @agent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM weekly_reports WHERE author_id = @agent_id AND year = 2026 AND month = 5 AND week_index = 3);

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT @agent_id, 2026, 5, 4, '2026-05-26', '2026-05-30',
  'Semaine 4 mai — Sécurité :\n• Bilan mensuel incidents sécurité (4 traités, 0 critique ouvert)\n• Préparation bundle mensuel pour rédacteur\n• Formation courte cybersécurité service RH',
  'finalise', '2026-05-30 17:00:00'
FROM DUAL WHERE @agent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM weekly_reports WHERE author_id = @agent_id AND year = 2026 AND month = 5 AND week_index = 4);

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT @agent_id, 2026, 6, 1, '2026-06-02', '2026-06-06',
  'Semaine 1 juin — Sécurité :\n• Neutralisation poste infecté Trésorerie (TKT-2026-0022)\n• Analyse brute force compte RH (TKT-2026-0023 en cours)\n• Mise à jour règles IPS',
  'finalise', '2026-06-06 17:00:00'
FROM DUAL WHERE @agent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM weekly_reports WHERE author_id = @agent_id AND year = 2026 AND month = 6 AND week_index = 1);

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT @agent_id, 2026, 6, 2, '2026-06-09', '2026-06-13',
  'Semaine 2 juin — Sécurité :\n• Alerte phishing DG en cours (TKT-2026-0020)\n• Mise à jour pare-feu API partenaire (TKT-2026-0021)\n• Audit clé USB Communication (TKT-2026-0024 rapport soumis)',
  'brouillon', '2026-06-11 16:00:00'
FROM DUAL WHERE @agent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM weekly_reports WHERE author_id = @agent_id AND year = 2026 AND month = 6 AND week_index = 2);

-- ---------------------------------------------------------------------------
-- Notifications agent
-- ---------------------------------------------------------------------------

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT @agent_id, t.id, 'ticket_assigned', 'Nouveau ticket à traiter',
  'Le ticket TKT-2026-0020 (alerte phishing) vous a été assigné.', 0, '2026-06-10 10:00:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0020'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.ticket_id = t.id AND n.user_id = @agent_id AND n.type = 'ticket_assigned');

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT @agent_id, t.id, 'ticket_assigned', 'Nouveau ticket à traiter',
  'Le ticket TKT-2026-0021 (pare-feu API) vous a été assigné.', 1, '2026-06-09 12:00:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0021'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.ticket_id = t.id AND n.user_id = @agent_id AND n.type = 'ticket_assigned');

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT @chef_id, t.id, 'report_submitted', 'Nouveau rapport agent',
  'Rapport TKT-2026-0024 (audit clé USB) en attente de validation.', 0, '2026-06-11 10:30:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0024'
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.ticket_id = t.id AND n.type = 'report_submitted' AND n.user_id = @chef_id);

-- ---------------------------------------------------------------------------
-- Événements
-- ---------------------------------------------------------------------------

INSERT INTO ticket_events (ticket_id, actor_user_id, event_type, from_status, to_status, created_at)
SELECT t.id, @chef_id, 'assign_technician', 'chez_chef_service', 'assigne_technicien', '2026-06-10 10:00:00'
FROM tickets t WHERE t.ticket_number IN ('TKT-2026-0020', 'TKT-2026-0021')
  AND NOT EXISTS (SELECT 1 FROM ticket_events te WHERE te.ticket_id = t.id AND te.event_type = 'assign_technician');

INSERT INTO ticket_events (ticket_id, actor_user_id, event_type, from_status, to_status, created_at)
SELECT t.id, @agent_id, 'take_charge', 'assigne_technicien', 'en_cours', '2026-06-09 13:00:00'
FROM tickets t WHERE t.ticket_number = 'TKT-2026-0021'
  AND NOT EXISTS (SELECT 1 FROM ticket_events te WHERE te.ticket_id = t.id AND te.event_type = 'take_charge');

-- ---------------------------------------------------------------------------
-- Résumé pour AG-IRT-RES-SEC
-- ---------------------------------------------------------------------------

SELECT 'Tickets affectés' AS vue, COUNT(*) AS nb
FROM tickets t
WHERE t.assigned_technician_id = @agent_id
  AND t.status IN ('assigne_technicien', 'en_cours')
UNION ALL
SELECT 'Tickets résolus (mois en cours, non archivés)', COUNT(*)
FROM tickets t
WHERE t.assigned_technician_id = @agent_id AND t.status = 'resolu'
  AND NOT EXISTS (SELECT 1 FROM agent_resolved_archives ara WHERE ara.ticket_id = t.id AND ara.agent_id = @agent_id)
UNION ALL
SELECT 'Historique archivé', COUNT(*)
FROM agent_resolved_archives WHERE agent_id = @agent_id
UNION ALL
SELECT 'Rapports hebdomadaires', COUNT(*)
FROM weekly_reports WHERE author_id = @agent_id;
