-- =============================================================================
-- OGEFREM Tickets — Données de démonstration (workflows complets)
--
-- Prérequis : schema.sql + seed.sql déjà importés.
-- Idempotent : supprime puis recrée les données préfixées TKT-2026-9xxx / [DEMO].
--
-- Couverture :
--   • Tickets : tous les statuts (pool chef, assigné, en cours, résolu, non résolu, archive)
--   • Rapports : soumis, rejeté (chef / SD / directrice), validé chef / SD / directrice
--   • Co-interventions (pending + accepted), consignes non_resolu
--   • Archives agent, rapports_valides directrice
--   • Rapports hebdo, bundles mensuels + commentaires chef, PDF mensuels SD
--   • Notifications staff cliquables
-- =============================================================================

USE ogefrem_ops_hub;

SET FOREIGN_KEY_CHECKS = 0;

DELETE mrc FROM monthly_report_comments mrc
INNER JOIN monthly_subdirectorate_reports msr ON msr.id = mrc.monthly_report_id
WHERE msr.original_name LIKE 'DEMO-%';

DELETE FROM monthly_subdirectorate_reports WHERE original_name LIKE 'DEMO-%';

DELETE mbc FROM monthly_bundle_comments mbc
INNER JOIN monthly_agent_bundles mab ON mab.id = mbc.bundle_id
WHERE mab.concatenated_body LIKE '[DEMO]%';

DELETE FROM monthly_agent_bundles WHERE concatenated_body LIKE '[DEMO]%';

DELETE FROM weekly_reports WHERE body LIKE '[DEMO]%';

DELETE FROM notifications WHERE title LIKE '[DEMO]%';

DELETE rv FROM rapports_valides rv
INNER JOIN tickets t ON t.id = rv.ticket_id
WHERE t.ticket_number LIKE 'TKT-2026-9%';

DELETE ara FROM agent_resolved_archives ara
INNER JOIN tickets t ON t.id = ara.ticket_id
WHERE t.ticket_number LIKE 'TKT-2026-9%';

DELETE FROM tickets WHERE ticket_number LIKE 'TKT-2026-9%';

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Présence (badges en ligne)
-- ---------------------------------------------------------------------------

UPDATE users SET last_seen_at = NOW() WHERE matricule IN (
  'DIR-001', 'SDM-001', 'CS-IRT-RES-001', 'AG-IRT-RES-HD', 'AG-AD-DEV-TEC'
);

UPDATE users SET last_seen_at = DATE_SUB(NOW(), INTERVAL 2 HOUR) WHERE matricule IN (
  'SDA-001', 'CS-AD-DEV-001', 'AG-AD-ACM-ANA'
);

-- ---------------------------------------------------------------------------
-- Tickets démo (TKT-2026-9001 … 9020)
-- ---------------------------------------------------------------------------

INSERT INTO tickets (
  ticket_number, tracking_token,
  reporter_full_name, reporter_matricule, reporter_direction, reporter_service, reporter_office,
  category_id, routed_service_id, routed_at, description, priority, sla_due_at, status,
  sub_directorate_id, assigned_chef_id, assigned_technician_id,
  received_by_director_at, priority_set_by, closed_at, report_submitted_to_director_at,
  archived_at, created_at, updated_at
) VALUES
-- 9001 : pool interservice (aucun chef) — RESEAU → ACM
('TKT-2026-9001', 'demo0001aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
 'MUKENDI Jean', 'FIN-0142', 'Direction Financière', 'Comptabilité', 'Bureau Trésorerie',
 1, 5, '2026-06-10 08:30:00', '[DEMO] WiFi salle de réunion indisponible — pool chefs (à prendre).', 'urgent',
 DATE_ADD(NOW(), INTERVAL 2 DAY), 'chez_chef_service', 2, NULL, NULL,
 NOW(), NULL, NULL, NULL, NULL, '2026-06-10 08:30:00', '2026-06-10 08:30:00'),

-- 9002 : pris par chef liaison, file agents
('TKT-2026-9002', 'demo0002bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
 'KABEYA Nathalie', 'RH-0088', 'Direction RH', 'Paie', 'Bureau Paie',
 2, 6, '2026-06-09 10:00:00', '[DEMO] PC ne démarre plus — chef liaison a pris le ticket.', 'elevee',
 '2026-06-15 17:00:00', 'chez_chef_service', 2,
 (SELECT id FROM users WHERE matricule = 'CS-AD-LIA-001'), NULL,
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-AD-LIA-001'), NULL, NULL, NULL,
 '2026-06-09 10:00:00', '2026-06-09 11:00:00'),

-- 9003 : chef télécom + chef de bureau assigné
('TKT-2026-9003', 'demo0003cccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
 'TSHILOMBO Eric', 'LOG-0021', 'Direction Logistique', 'Stock', 'Magasin central',
 3, 3, '2026-06-08 14:00:00', '[DEMO] Application métier plantée — assigné au chef de bureau télécom.', 'normale',
 '2026-06-14 17:00:00', 'assigne_technicien', 1,
 (SELECT id FROM users WHERE matricule = 'CS-IRT-TEL-001'),
 (SELECT id FROM users WHERE matricule = 'CB-IRT-TEL-001'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-IRT-TEL-001'), NULL, NULL, NULL,
 '2026-06-08 14:00:00', '2026-06-08 15:30:00'),

-- 9004 : assigné agent dev
('TKT-2026-9004', 'demo0004dddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
 'ILUNGA Prisca', 'JUR-0033', 'Direction Juridique', 'Contentieux', 'Secrétariat',
 4, 4, '2026-06-07 09:00:00', '[DEMO] Demande diverse (Autres) — assigné technicien dev.', 'normale',
 '2026-06-13 17:00:00', 'assigne_technicien', 2,
 (SELECT id FROM users WHERE matricule = 'CS-AD-DEV-001'),
 (SELECT id FROM users WHERE matricule = 'AG-AD-DEV-TEC'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-AD-DEV-001'), NULL, NULL, NULL,
 '2026-06-07 09:00:00', '2026-06-07 10:00:00'),

-- 9005 : en cours + co-intervention pending
('TKT-2026-9005', 'demo0005eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
 'MWAMBA Grace', 'COM-0055', 'Direction Communication', 'Presse', 'Rédaction',
 5, 4, '2026-06-06 11:00:00', '[DEMO] Imprimante réseau bloquée — en cours, co-intervention en attente.', 'elevee',
 '2026-06-12 17:00:00', 'en_cours', 2,
 (SELECT id FROM users WHERE matricule = 'CS-AD-DEV-001'),
 (SELECT id FROM users WHERE matricule = 'AG-AD-DEV-FIN'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-AD-DEV-001'), NULL, NULL, NULL,
 '2026-06-06 11:00:00', '2026-06-06 13:00:00'),

-- 9006 : en cours + co-intervention acceptée
('TKT-2026-9006', 'demo0006ffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
 'KAZADI Joseph', 'SEC-0010', 'Secrétariat Général', 'Courrier', 'Réception',
 6, 5, '2026-06-05 08:00:00', '[DEMO] Compte verrouillé — en cours avec co-intervenant accepté.', 'urgent',
 '2026-06-11 17:00:00', 'en_cours', 2,
 (SELECT id FROM users WHERE matricule = 'CS-AD-ACM-001'),
 (SELECT id FROM users WHERE matricule = 'AG-AD-ACM-ANA'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-AD-ACM-001'), NULL, NULL, NULL,
 '2026-06-05 08:00:00', '2026-06-05 09:30:00'),

-- 9007 : résolu — rapport soumis (file chef)
('TKT-2026-9007', 'demo000711111111111111111111111111111111111111111111111111111111',
 'BUKASA Marie', 'FIN-0200', 'Direction Financière', 'Budget', 'Planification',
 1, 5, '2026-06-04 10:00:00', '[DEMO] Lenteur réseau — résolu, rapport soumis au chef.', 'normale',
 NULL, 'resolu', 2,
 (SELECT id FROM users WHERE matricule = 'CS-AD-ACM-001'),
 (SELECT id FROM users WHERE matricule = 'AG-AD-ACM-ANA'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-AD-ACM-001'),
 '2026-06-04 16:00:00', NULL, NULL,
 '2026-06-04 10:00:00', '2026-06-04 16:00:00'),

-- 9008 : résolu — rapport rejeté par le chef
('TKT-2026-9008', 'demo000822222222222222222222222222222222222222222222222222222222',
 'TSHIMANGA Eric', 'RH-0111', 'Direction RH', 'Formation', 'Bureau formation',
 2, 6, '2026-06-03 09:00:00', '[DEMO] Écran noir — résolu, rapport rejeté par le chef.', 'normale',
 NULL, 'resolu', 2,
 (SELECT id FROM users WHERE matricule = 'CS-AD-LIA-001'),
 (SELECT id FROM users WHERE matricule = 'AG-AD-LIA-PAR'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-AD-LIA-001'),
 '2026-06-03 15:00:00', NULL, NULL,
 '2026-06-03 09:00:00', '2026-06-03 15:00:00'),

-- 9009 : résolu — rapport validé chef (file SD IRT)
('TKT-2026-9009', 'demo000933333333333333333333333333333333333333333333333333333333',
 'NZAU Grace', 'LOG-0044', 'Direction Logistique', 'Parc auto', 'Garage',
 3, 3, '2026-06-02 08:00:00', '[DEMO] Messagerie indisponible — rapport validé chef, attente SD IRT.', 'elevee',
 NULL, 'resolu', 1,
 (SELECT id FROM users WHERE matricule = 'CS-IRT-TEL-001'),
 (SELECT id FROM users WHERE matricule = 'AG-IRT-TEL-INT'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-IRT-TEL-001'),
 '2026-06-02 17:00:00', NULL, NULL,
 '2026-06-02 08:00:00', '2026-06-02 17:00:00'),

-- 9010 : résolu — rapport validé SD (file directrice)
('TKT-2026-9010', 'demo001044444444444444444444444444444444444444444444444444444444',
 'BAYA Esther', 'JUR-0077', 'Direction Juridique', 'Contrats', 'Archives',
 4, 4, '2026-06-01 09:00:00', '[DEMO] Correctif applicatif — rapport validé SD, attente directrice.', 'normale',
 NULL, 'resolu', 2,
 (SELECT id FROM users WHERE matricule = 'CS-AD-DEV-001'),
 (SELECT id FROM users WHERE matricule = 'AG-AD-DEV-TEC'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-AD-DEV-001'),
 '2026-06-01 16:30:00', '2026-06-02 09:00:00', NULL,
 '2026-06-01 09:00:00', '2026-06-02 09:00:00'),

-- 9011 : résolu — validé directrice + archive rapports_valides
('TKT-2026-9011', 'demo001155555555555555555555555555555555555555555555555555555555',
 'MPUTU Olivier', 'COM-0099', 'Direction Communication', 'Événements', 'Logistique événements',
 6, 5, '2026-05-28 10:00:00', '[DEMO] Réinitialisation MFA — clôturé et archivé par la directrice.', 'normale',
 NULL, 'resolu', 2,
 (SELECT id FROM users WHERE matricule = 'CS-AD-ACM-001'),
 (SELECT id FROM users WHERE matricule = 'AG-AD-ACM-MF'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-AD-ACM-001'),
 '2026-05-28 15:00:00', '2026-05-29 11:00:00', NULL,
 '2026-05-28 10:00:00', '2026-05-29 11:00:00'),

-- 9012 : résolu — rapport rejeté par le SD
('TKT-2026-9012', 'demo001266666666666666666666666666666666666666666666666666666666',
 'KALALA Irène', 'SEC-0022', 'Secrétariat Général', 'Archives', 'Salle archives',
 2, 6, '2026-05-27 11:00:00', '[DEMO] Remplacement disque — rapport rejeté par le sous-directeur A&D.', 'normale',
 NULL, 'resolu', 2,
 (SELECT id FROM users WHERE matricule = 'CS-AD-LIA-001'),
 (SELECT id FROM users WHERE matricule = 'AG-AD-LIA-DON'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-AD-LIA-001'),
 '2026-05-27 16:00:00', NULL, NULL,
 '2026-05-27 11:00:00', '2026-05-28 10:00:00'),

-- 9013 : résolu — rapport rejeté par la directrice
('TKT-2026-9013', 'demo001377777777777777777777777777777777777777777777777777777777',
 'MULUMBA Joel', 'FIN-0301', 'Direction Financière', 'Audit interne', 'Contrôle',
 1, 2, '2026-05-26 08:00:00', '[DEMO] Panne switch — rapport rejeté par la directrice.', 'urgent',
 NULL, 'resolu', 1,
 (SELECT id FROM users WHERE matricule = 'CS-IRT-RES-001'),
 (SELECT id FROM users WHERE matricule = 'AG-IRT-RES-HD'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-IRT-RES-001'),
 '2026-05-26 17:00:00', '2026-05-27 14:00:00', NULL,
 '2026-05-26 08:00:00', '2026-05-27 15:00:00'),

-- 9014 : non résolu + consignes SD / directrice
('TKT-2026-9014', 'demo001488888888888888888888888888888888888888888888888888888888',
 'MONGA Kevin', 'RH-0155', 'Direction RH', 'Recrutement', 'Bureau sélection',
 5, 4, '2026-05-25 09:00:00', '[DEMO] Imprimante toujours en panne — clôturé non résolu, consignes actives.', 'elevee',
 NULL, 'non_resolu', 2,
 (SELECT id FROM users WHERE matricule = 'CS-AD-DEV-001'),
 (SELECT id FROM users WHERE matricule = 'AG-AD-DEV-FIN'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-AD-DEV-001'),
 '2026-05-25 15:00:00', NULL, NULL,
 '2026-05-25 09:00:00', '2026-05-25 15:00:00'),

-- 9015 : réouvert depuis non_resolu (en_cours, ancien rapport brouillon)
('TKT-2026-9015', 'demo001599999999999999999999999999999999999999999999999999999999',
 'KASONGO Moise', 'LOG-0066', 'Direction Logistique', 'Inventaire', 'Entrepôt',
 2, 6, '2026-05-24 10:00:00', '[DEMO] Matériel non réparé — réouvert par le chef après non résolu.', 'normale',
 NULL, 'en_cours', 2,
 (SELECT id FROM users WHERE matricule = 'CS-AD-LIA-001'),
 (SELECT id FROM users WHERE matricule = 'AG-AD-LIA-TIE'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-AD-LIA-001'),
 NULL, NULL, NULL,
 '2026-05-24 10:00:00', '2026-06-09 08:00:00'),

-- 9016 : archive système (> 30 j)
('TKT-2026-9016', 'demo0016aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
 'LUKUSA Sarah', 'JUR-0044', 'Direction Juridique', 'Litiges', 'Greffe',
 4, 4, '2026-04-10 09:00:00', '[DEMO] Correctif déployé — ticket archivé système.', 'normale',
 NULL, 'archive', 2,
 (SELECT id FROM users WHERE matricule = 'CS-AD-DEV-001'),
 (SELECT id FROM users WHERE matricule = 'AG-AD-DEV-ADM'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-AD-DEV-001'),
 '2026-04-10 16:00:00', '2026-04-11 10:00:00', '2026-05-15 00:00:00',
 '2026-04-10 09:00:00', '2026-05-15 00:00:00'),

-- 9017 : SLA dépassé (en cours)
('TKT-2026-9017', 'demo0017bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
 'LUBOYA Fabrice', 'COM-0033', 'Direction Communication', 'Web', 'Portail web',
 6, 5, '2026-06-01 07:00:00', '[DEMO] Accès VPN expiré — SLA dépassé, toujours en cours.', 'urgent',
 '2026-06-05 12:00:00', 'en_cours', 2,
 (SELECT id FROM users WHERE matricule = 'CS-AD-ACM-001'),
 (SELECT id FROM users WHERE matricule = 'AG-AD-ACM-CON'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-AD-ACM-001'), NULL, NULL, NULL,
 '2026-06-01 07:00:00', '2026-06-01 08:00:00'),

-- 9018 : résolu mai — historique agent (archive champ)
('TKT-2026-9018', 'demo0018cccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
 'KAPENDA Bruno', 'SEC-0044', 'Secrétariat Général', 'Protocole', 'Accueil',
 6, 5, '2026-05-12 09:00:00', '[DEMO] Compte invité créé — dans l historique agent (mai).', 'normale',
 NULL, 'resolu', 2,
 (SELECT id FROM users WHERE matricule = 'CS-AD-ACM-001'),
 (SELECT id FROM users WHERE matricule = 'AG-AD-ACM-ANA'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-AD-ACM-001'),
 '2026-05-12 14:00:00', '2026-05-13 09:00:00', NULL,
 '2026-05-12 09:00:00', '2026-05-13 09:00:00'),

-- 9019 : résolu IRT + co-intervenant archivé
('TKT-2026-9019', 'demo0019dddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
 'MBALA Jean', 'FIN-0400', 'Direction Financière', 'Recouvrement', 'Contentieux',
 1, 2, '2026-05-10 08:00:00', '[DEMO] Coupure réseau bureau — résolu avec co-intervention sécurité.', 'elevee',
 NULL, 'resolu', 1,
 (SELECT id FROM users WHERE matricule = 'CS-IRT-RES-001'),
 (SELECT id FROM users WHERE matricule = 'AG-IRT-RES-HD'),
 NOW(), (SELECT id FROM users WHERE matricule = 'CS-IRT-RES-001'),
 '2026-05-10 16:00:00', '2026-05-11 10:00:00', NULL,
 '2026-05-10 08:00:00', '2026-05-11 10:00:00'),

-- 9020 : pool IRT (APPLICATIONS → télécoms)
('TKT-2026-9020', 'demo0020eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
 'NGOY Solange', 'RH-0200', 'Direction RH', 'Carrières', 'Évaluation',
 3, 3, '2026-06-11 07:30:00', '[DEMO] Suite bureautique HS — pool interservice IRT.', 'normale',
 DATE_ADD(NOW(), INTERVAL 3 DAY), 'chez_chef_service', 1, NULL, NULL,
 NOW(), NULL, NULL, NULL, NULL, '2026-06-11 07:30:00', '2026-06-11 07:30:00');

-- ---------------------------------------------------------------------------
-- Événements ticket (historique workflow)
-- ---------------------------------------------------------------------------

INSERT INTO ticket_events (ticket_id, actor_user_id, event_type, from_status, to_status, created_at)
SELECT t.id, u.id, 'ticket_claimed', 'chez_chef_service', 'chez_chef_service', t.created_at
FROM tickets t
JOIN users u ON u.matricule = 'CS-AD-LIA-001'
WHERE t.ticket_number = 'TKT-2026-9002';

INSERT INTO ticket_events (ticket_id, actor_user_id, event_type, from_status, to_status, created_at)
SELECT t.id, u.id, 'ticket_assigned', 'chez_chef_service', 'assigne_technicien', t.updated_at
FROM tickets t
JOIN users u ON u.matricule = 'CS-IRT-TEL-001'
WHERE t.ticket_number = 'TKT-2026-9003';

INSERT INTO ticket_events (ticket_id, actor_user_id, event_type, from_status, to_status, created_at)
SELECT t.id, u.id, 'ticket_in_progress', 'assigne_technicien', 'en_cours', t.updated_at
FROM tickets t
JOIN users u ON u.matricule = 'AG-AD-DEV-FIN'
WHERE t.ticket_number = 'TKT-2026-9005';

INSERT INTO ticket_events (ticket_id, actor_user_id, event_type, from_status, to_status, created_at)
SELECT t.id, u.id, 'ticket_unresolved', 'en_cours', 'non_resolu', t.closed_at
FROM tickets t
JOIN users u ON u.matricule = 'AG-AD-DEV-FIN'
WHERE t.ticket_number = 'TKT-2026-9014';

INSERT INTO ticket_events (ticket_id, actor_user_id, event_type, from_status, to_status, created_at)
SELECT t.id, u.id, 'ticket_reopened', 'non_resolu', 'en_cours', '2026-06-09 08:00:00'
FROM tickets t
JOIN users u ON u.matricule = 'CS-AD-LIA-001'
WHERE t.ticket_number = 'TKT-2026-9015';

INSERT INTO ticket_events (ticket_id, actor_user_id, event_type, from_status, to_status, created_at)
SELECT t.id, u.id, 'ticket_resolved', 'en_cours', 'resolu', t.closed_at
FROM tickets t
JOIN users u ON u.matricule = 'AG-AD-ACM-ANA'
WHERE t.ticket_number IN (
  'TKT-2026-9007', 'TKT-2026-9008', 'TKT-2026-9009', 'TKT-2026-9010',
  'TKT-2026-9011', 'TKT-2026-9012', 'TKT-2026-9013', 'TKT-2026-9018', 'TKT-2026-9019'
);

-- ---------------------------------------------------------------------------
-- Co-interventions
-- ---------------------------------------------------------------------------

INSERT INTO ticket_co_interventions (ticket_id, agent_id, invited_by, status, invited_at)
SELECT t.id, a.id, c.id, 'pending', '2026-06-06 13:30:00'
FROM tickets t
JOIN users a ON a.matricule = 'AG-AD-DEV-ADM'
JOIN users c ON c.matricule = 'AG-AD-DEV-FIN'
WHERE t.ticket_number = 'TKT-2026-9005';

INSERT INTO ticket_co_interventions (ticket_id, agent_id, invited_by, status, invited_at, accepted_at)
SELECT t.id, a.id, c.id, 'accepted', '2026-06-05 10:00:00', '2026-06-05 10:15:00'
FROM tickets t
JOIN users a ON a.matricule = 'AG-AD-ACM-CON'
JOIN users c ON c.matricule = 'AG-AD-ACM-ANA'
WHERE t.ticket_number = 'TKT-2026-9006';

INSERT INTO ticket_co_interventions (ticket_id, agent_id, invited_by, status, invited_at, accepted_at)
SELECT t.id, a.id, c.id, 'accepted', '2026-05-10 09:00:00', '2026-05-10 09:20:00'
FROM tickets t
JOIN users a ON a.matricule = 'AG-IRT-RES-SEC'
JOIN users c ON c.matricule = 'AG-IRT-RES-HD'
WHERE t.ticket_number = 'TKT-2026-9019';

-- ---------------------------------------------------------------------------
-- Consignes (ticket non_resolu 9014)
-- ---------------------------------------------------------------------------

INSERT INTO ticket_consignes (ticket_id, author_id, author_role, body, created_at)
SELECT t.id, u.id, 'SOUS_DIRECTEUR', '[DEMO] Prioriser le remplacement matériel avant vendredi.', '2026-05-26 09:00:00'
FROM tickets t
JOIN users u ON u.matricule = 'SDA-001'
WHERE t.ticket_number = 'TKT-2026-9014';

INSERT INTO ticket_consignes (ticket_id, author_id, author_role, body, created_at)
SELECT t.id, u.id, 'DIRECTEUR', '[DEMO] Tenir le demandeur informé chaque 48 h.', '2026-05-27 10:00:00'
FROM tickets t
JOIN users u ON u.matricule = 'DIR-001'
WHERE t.ticket_number = 'TKT-2026-9014';

-- ---------------------------------------------------------------------------
-- Rapports de résolution
-- ---------------------------------------------------------------------------

INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at, updated_at)
SELECT t.id, u.id, '[DEMO] Rétablissement du lien réseau et tests utilisateur OK.', 1, 'soumis', t.closed_at, t.closed_at
FROM tickets t
JOIN users u ON u.matricule = 'AG-AD-ACM-ANA'
WHERE t.ticket_number = 'TKT-2026-9007';

INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at, updated_at)
SELECT t.id, u.id, '[DEMO] Remplacement câble HDMI — rapport initial incomplet.', 1, 'rejete', t.closed_at, t.closed_at
FROM tickets t
JOIN users u ON u.matricule = 'AG-AD-LIA-PAR'
WHERE t.ticket_number = 'TKT-2026-9008';

INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at, updated_at)
SELECT t.id, u.id, '[DEMO] Messagerie rétablie après redémarrage serveur relais.', 1, 'valide_chef', t.closed_at, t.closed_at
FROM tickets t
JOIN users u ON u.matricule = 'AG-IRT-TEL-INT'
WHERE t.ticket_number = 'TKT-2026-9009';

INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at, updated_at)
SELECT t.id, u.id, '[DEMO] Patch correctif déployé en production.', 1, 'valide_sd', t.closed_at, t.closed_at
FROM tickets t
JOIN users u ON u.matricule = 'AG-AD-DEV-TEC'
WHERE t.ticket_number = 'TKT-2026-9010';

INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at, updated_at)
SELECT t.id, u.id, '[DEMO] MFA réinitialisé et procédure documentée.', 1, 'valide_directeur', t.closed_at, t.closed_at
FROM tickets t
JOIN users u ON u.matricule = 'AG-AD-ACM-MF'
WHERE t.ticket_number = 'TKT-2026-9011';

INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at, updated_at)
SELECT t.id, u.id, '[DEMO] Disque remplacé — en attente validation hiérarchique.', 1, 'rejete', t.closed_at, t.closed_at
FROM tickets t
JOIN users u ON u.matricule = 'AG-AD-LIA-DON'
WHERE t.ticket_number = 'TKT-2026-9012';

INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at, updated_at)
SELECT t.id, u.id, '[DEMO] Switch de bureau remplacé — rapport soumis à la directrice.', 1, 'rejete', t.closed_at, t.closed_at
FROM tickets t
JOIN users u ON u.matricule = 'AG-IRT-RES-HD'
WHERE t.ticket_number = 'TKT-2026-9013';

INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at, updated_at)
SELECT t.id, u.id, '[DEMO] Compte invité créé et droits limités appliqués.', 1, 'valide_chef', t.closed_at, t.closed_at
FROM tickets t
JOIN users u ON u.matricule = 'AG-AD-ACM-ANA'
WHERE t.ticket_number = 'TKT-2026-9018';

INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at, updated_at)
SELECT t.id, u.id, '[DEMO] Liaison rétablie — analyse IDS jointe.', 1, 'valide_sd', t.closed_at, t.closed_at
FROM tickets t
JOIN users u ON u.matricule = 'AG-IRT-RES-HD'
WHERE t.ticket_number = 'TKT-2026-9019';

INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at, updated_at)
SELECT t.id, u.id, '[DEMO] Correctif appliqué — archivé direction.', 1, 'valide_directeur', t.closed_at, t.closed_at
FROM tickets t
JOIN users u ON u.matricule = 'AG-AD-DEV-ADM'
WHERE t.ticket_number = 'TKT-2026-9016';

INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at, updated_at)
SELECT t.id, u.id, '[DEMO] Rapport initial invalidé après réouverture.', 1, 'brouillon', '2026-05-25 15:30:00', '2026-06-09 08:00:00'
FROM tickets t
JOIN users u ON u.matricule = 'AG-AD-LIA-TIE'
WHERE t.ticket_number = 'TKT-2026-9015';

INSERT INTO resolution_reports (ticket_id, author_id, body, version, status, created_at, updated_at)
SELECT t.id, u.id, '[DEMO] Pièce défectueuse — clôture non résolue documentée.', 1, 'soumis', t.closed_at, t.closed_at
FROM tickets t
JOIN users u ON u.matricule = 'AG-AD-DEV-FIN'
WHERE t.ticket_number = 'TKT-2026-9014';

-- ---------------------------------------------------------------------------
-- Validations hiérarchiques des rapports
-- ---------------------------------------------------------------------------

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'CHEF_SERVICE', 'rejete', '[DEMO] Préciser le numéro de série du matériel remplacé.', rr.created_at
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'CS-AD-LIA-001'
WHERE t.ticket_number = 'TKT-2026-9008';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'CHEF_SERVICE', 'approuve', '[DEMO] Rapport conforme.', rr.created_at
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'CS-IRT-TEL-001'
WHERE t.ticket_number = 'TKT-2026-9009';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'CHEF_SERVICE', 'approuve', '[DEMO] OK pour transmission SD.', rr.created_at
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'CS-AD-DEV-001'
WHERE t.ticket_number = 'TKT-2026-9010';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'SOUS_DIRECTEUR', 'approuve', '[DEMO] Validé sous-direction A&D.', rr.created_at
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'SDA-001'
WHERE t.ticket_number = 'TKT-2026-9010';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'CHEF_SERVICE', 'approuve', NULL, rr.created_at
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'CS-AD-ACM-001'
WHERE t.ticket_number = 'TKT-2026-9011';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'SOUS_DIRECTEUR', 'approuve', NULL, DATE_ADD(rr.created_at, INTERVAL 1 DAY)
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'SDA-001'
WHERE t.ticket_number = 'TKT-2026-9011';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'DIRECTEUR', 'approuve', '[DEMO] Archivé direction.', DATE_ADD(rr.created_at, INTERVAL 2 DAY)
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'DIR-001'
WHERE t.ticket_number = 'TKT-2026-9011';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'CHEF_SERVICE', 'approuve', NULL, rr.created_at
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'CS-AD-LIA-001'
WHERE t.ticket_number = 'TKT-2026-9012';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'SOUS_DIRECTEUR', 'rejete', '[DEMO] Joindre le bon de sortie stock.', DATE_ADD(rr.created_at, INTERVAL 1 DAY)
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'SDA-001'
WHERE t.ticket_number = 'TKT-2026-9012';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'CHEF_SERVICE', 'approuve', NULL, rr.created_at
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'CS-IRT-RES-001'
WHERE t.ticket_number = 'TKT-2026-9013';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'SOUS_DIRECTEUR', 'approuve', NULL, DATE_ADD(rr.created_at, INTERVAL 1 DAY)
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'SDM-001'
WHERE t.ticket_number = 'TKT-2026-9013';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'DIRECTEUR', 'rejete', '[DEMO] Reformuler l analyse de cause racine.', DATE_ADD(rr.created_at, INTERVAL 2 DAY)
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'DIR-001'
WHERE t.ticket_number = 'TKT-2026-9013';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'CHEF_SERVICE', 'approuve', NULL, rr.created_at
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'CS-AD-ACM-001'
WHERE t.ticket_number = 'TKT-2026-9018';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'CHEF_SERVICE', 'approuve', NULL, rr.created_at
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'CS-IRT-RES-001'
WHERE t.ticket_number = 'TKT-2026-9019';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'SOUS_DIRECTEUR', 'approuve', NULL, DATE_ADD(rr.created_at, INTERVAL 1 DAY)
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'SDM-001'
WHERE t.ticket_number = 'TKT-2026-9019';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'CHEF_SERVICE', 'approuve', NULL, rr.created_at
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'CS-AD-DEV-001'
WHERE t.ticket_number = 'TKT-2026-9016';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'SOUS_DIRECTEUR', 'approuve', NULL, DATE_ADD(rr.created_at, INTERVAL 1 DAY)
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'SDA-001'
WHERE t.ticket_number = 'TKT-2026-9016';

INSERT INTO report_validations (report_id, validator_id, validator_role, decision, comment, created_at)
SELECT rr.id, u.id, 'DIRECTEUR', 'approuve', NULL, DATE_ADD(rr.created_at, INTERVAL 2 DAY)
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN users u ON u.matricule = 'DIR-001'
WHERE t.ticket_number = 'TKT-2026-9016';

-- ---------------------------------------------------------------------------
-- Archives rapports validés (directrice)
-- ---------------------------------------------------------------------------

INSERT INTO rapports_valides (
  report_id, ticket_id, ticket_number, sub_directorate_id, sub_directorate_code,
  priority, category_label, reporter_full_name, ticket_description, report_body,
  author_name, validated_by, validated_at, archived_at
)
SELECT
  rr.id, t.id, t.ticket_number, t.sub_directorate_id, sd.code,
  t.priority, c.label, t.reporter_full_name, t.description, rr.body,
  CONCAT(ua.prenom, ' ', ua.nom), dir.id, '2026-05-29 11:00:00', '2026-05-29 11:00:00'
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN ticket_categories c ON c.id = t.category_id
JOIN users ua ON ua.id = rr.author_id
JOIN users dir ON dir.matricule = 'DIR-001'
LEFT JOIN sub_directorates sd ON sd.id = t.sub_directorate_id
WHERE t.ticket_number = 'TKT-2026-9011';

INSERT INTO rapports_valides (
  report_id, ticket_id, ticket_number, sub_directorate_id, sub_directorate_code,
  priority, category_label, reporter_full_name, ticket_description, report_body,
  author_name, validated_by, validated_at, archived_at
)
SELECT
  rr.id, t.id, t.ticket_number, t.sub_directorate_id, sd.code,
  t.priority, c.label, t.reporter_full_name, t.description, rr.body,
  CONCAT(ua.prenom, ' ', ua.nom), dir.id, '2026-04-11 10:00:00', '2026-04-11 10:00:00'
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
JOIN ticket_categories c ON c.id = t.category_id
JOIN users ua ON ua.id = rr.author_id
JOIN users dir ON dir.matricule = 'DIR-001'
LEFT JOIN sub_directorates sd ON sd.id = t.sub_directorate_id
WHERE t.ticket_number = 'TKT-2026-9016';

-- ---------------------------------------------------------------------------
-- Archives agent (historique)
-- ---------------------------------------------------------------------------

INSERT INTO agent_resolved_archives (agent_id, ticket_id, year, month, week_index, archived_at)
SELECT u.id, t.id, 2026, 5, 2, '2026-05-13 09:30:00'
FROM tickets t
JOIN users u ON u.matricule = 'AG-AD-ACM-ANA'
WHERE t.ticket_number = 'TKT-2026-9018';

INSERT INTO agent_resolved_archives (agent_id, ticket_id, year, month, week_index, archived_at)
SELECT u.id, t.id, 2026, 5, 2, '2026-05-11 10:30:00'
FROM tickets t
JOIN users u ON u.matricule = 'AG-IRT-RES-HD'
WHERE t.ticket_number = 'TKT-2026-9019';

INSERT INTO agent_resolved_archives (agent_id, ticket_id, year, month, week_index, archived_at)
SELECT u.id, t.id, 2026, 5, 2, '2026-05-11 10:30:00'
FROM tickets t
JOIN users u ON u.matricule = 'AG-IRT-RES-SEC'
WHERE t.ticket_number = 'TKT-2026-9019';

-- ---------------------------------------------------------------------------
-- Rapports hebdomadaires agents
-- ---------------------------------------------------------------------------

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT u.id, 2026, 5, 2, '2026-05-05', '2026-05-11', '[DEMO] Semaine 2 mai — 3 tickets résolus, 1 en cours.', 'finalise', '2026-05-11 17:00:00'
FROM users u WHERE u.matricule = 'AG-AD-DEV-TEC';

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT u.id, 2026, 5, 3, '2026-05-12', '2026-05-18', '[DEMO] Semaine 3 mai — support applications financières.', 'finalise', '2026-05-18 16:00:00'
FROM users u WHERE u.matricule = 'AG-AD-ACM-ANA';

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT u.id, 2026, 6, 1, '2026-06-02', '2026-06-08', '[DEMO] Semaine 1 juin — incidents réseau help-desk.', 'finalise', '2026-06-08 17:30:00'
FROM users u WHERE u.matricule = 'AG-IRT-RES-HD';

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT u.id, 2026, 6, 2, '2026-06-09', '2026-06-15', '[DEMO] Semaine 2 juin — brouillon en cours de rédaction.', 'brouillon', NOW()
FROM users u WHERE u.matricule = 'AG-IRT-TEL-INT';

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT u.id, 2026, 6, 1, '2026-06-02', '2026-06-08', '[DEMO] Semaine 1 juin — liaison partenaires.', 'finalise', '2026-06-08 15:00:00'
FROM users u WHERE u.matricule = 'AG-AD-LIA-PAR';

INSERT INTO weekly_reports (author_id, year, month, week_index, week_start, week_end, body, status, created_at)
SELECT u.id, 2026, 5, 4, '2026-05-19', '2026-05-25', '[DEMO] Semaine 4 mai — aucune résolution cette semaine.', 'finalise', '2026-05-25 17:00:00'
FROM users u WHERE u.matricule = 'AG-AD-DEV-FIN';

-- ---------------------------------------------------------------------------
-- Bundles mensuels agents → chefs de service
-- ---------------------------------------------------------------------------

INSERT INTO monthly_agent_bundles (sender_id, recipient_id, sub_directorate_id, year, month, concatenated_body, sent_at)
SELECT s.id, r.id, 2, 2026, 5,
  '[DEMO] Bundle mensuel mai — AG-AD-DEV-TEC\n- Correctifs apps\n- 2 tickets escaladés', '2026-06-02 09:00:00'
FROM users s, users r
WHERE s.matricule = 'AG-AD-DEV-TEC' AND r.matricule = 'CS-AD-DEV-001';

INSERT INTO monthly_agent_bundles (sender_id, recipient_id, sub_directorate_id, year, month, concatenated_body, sent_at)
SELECT s.id, r.id, 2, 2026, 5,
  '[DEMO] Bundle mensuel mai — AG-AD-ACM-ANA\n- Analyses conception\n- Formation utilisateurs', '2026-06-02 09:30:00'
FROM users s, users r
WHERE s.matricule = 'AG-AD-ACM-ANA' AND r.matricule = 'CS-AD-ACM-001';

INSERT INTO monthly_agent_bundles (sender_id, recipient_id, sub_directorate_id, year, month, concatenated_body, sent_at)
SELECT s.id, r.id, 1, 2026, 5,
  '[DEMO] Bundle mensuel mai — AG-IRT-RES-HD\n- Incidents help-desk\n- Patch sécurité', '2026-06-02 10:00:00'
FROM users s, users r
WHERE s.matricule = 'AG-IRT-RES-HD' AND r.matricule = 'CS-IRT-RES-001';

INSERT INTO monthly_bundle_comments (bundle_id, author_id, body, created_at)
SELECT b.id, u.id, '[DEMO] Merci — préciser les numéros de tickets dans le prochain bundle.', '2026-06-03 11:00:00'
FROM monthly_agent_bundles b
JOIN users u ON u.matricule = 'CS-AD-DEV-001'
WHERE b.concatenated_body LIKE '[DEMO] Bundle mensuel mai — AG-AD-DEV-TEC%';

INSERT INTO monthly_bundle_comments (bundle_id, author_id, body, created_at)
SELECT b.id, u.id, '[DEMO] RAS — bon récapitulatif.', '2026-06-03 14:00:00'
FROM monthly_agent_bundles b
JOIN users u ON u.matricule = 'CS-IRT-RES-001'
WHERE b.concatenated_body LIKE '[DEMO] Bundle mensuel mai — AG-IRT-RES-HD%';

-- ---------------------------------------------------------------------------
-- Rapports mensuels sous-directions (PDF démo)
-- Fichiers : api/storage/monthly_reports/demo_irt_2026_05.pdf
--            api/storage/monthly_reports/demo_ad_2026_05.pdf
-- ---------------------------------------------------------------------------

INSERT INTO monthly_subdirectorate_reports (
  sub_directorate_id, uploader_id, year, month, file_path, original_name, mime_type, visibility, uploaded_at
)
SELECT sd.id, u.id, 2026, 5, 'demo_irt_2026_05.pdf', 'DEMO-IRT-2026-05.pdf', 'application/pdf', 'active', '2026-06-03 16:00:00'
FROM sub_directorates sd
JOIN users u ON u.matricule = 'SDM-001'
WHERE sd.code = 'INFRA_RESEAU_TELECOMS';

INSERT INTO monthly_subdirectorate_reports (
  sub_directorate_id, uploader_id, year, month, file_path, original_name, mime_type, visibility, uploaded_at
)
SELECT sd.id, u.id, 2026, 5, 'demo_ad_2026_05.pdf', 'DEMO-AD-2026-05.pdf', 'application/pdf', 'active', '2026-06-03 16:30:00'
FROM sub_directorates sd
JOIN users u ON u.matricule = 'SDA-001'
WHERE sd.code = 'ANALYSE_DEV_APPS';

INSERT INTO monthly_subdirectorate_reports (
  sub_directorate_id, uploader_id, year, month, file_path, original_name, mime_type, visibility, uploaded_at
)
SELECT sd.id, u.id, 2026, 4, 'demo_irt_2026_04.pdf', 'DEMO-IRT-2026-04.pdf', 'application/pdf', 'archived', '2026-05-05 10:00:00'
FROM sub_directorates sd
JOIN users u ON u.matricule = 'SDM-001'
WHERE sd.code = 'INFRA_RESEAU_TELECOMS';

INSERT INTO monthly_report_comments (monthly_report_id, author_id, body, created_at)
SELECT mr.id, u.id, '[DEMO] Rapport IRT mai reçu — merci.', '2026-06-04 09:00:00'
FROM monthly_subdirectorate_reports mr
JOIN users u ON u.matricule = 'DIR-001'
WHERE mr.original_name = 'DEMO-IRT-2026-05.pdf';

-- ---------------------------------------------------------------------------
-- Notifications staff
-- ---------------------------------------------------------------------------

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT u.id, t.id, 'ticket_assigned', '[DEMO] Nouveau ticket', '[DEMO] Un ticket vous a été assigné (9003).', 0, NOW()
FROM users u, tickets t
WHERE u.matricule = 'CB-IRT-TEL-001' AND t.ticket_number = 'TKT-2026-9003';

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT u.id, t.id, 'report_waiting_validation', '[DEMO] Rapport à valider', '[DEMO] Rapport soumis — ticket 9007.', 0, NOW()
FROM users u, tickets t
WHERE u.matricule = 'CS-AD-ACM-001' AND t.ticket_number = 'TKT-2026-9007';

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT u.id, t.id, 'report_waiting_validation', '[DEMO] Rapport chef validé', '[DEMO] Rapport en attente SD — ticket 9009.', 0, NOW()
FROM users u, tickets t
WHERE u.matricule = 'SDM-001' AND t.ticket_number = 'TKT-2026-9009';

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT u.id, t.id, 'report_waiting_validation', '[DEMO] Rapport SD validé', '[DEMO] Rapport en attente directrice — ticket 9010.', 0, NOW()
FROM users u, tickets t
WHERE u.matricule = 'DIR-001' AND t.ticket_number = 'TKT-2026-9010';

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT u.id, t.id, 'report_rejected', '[DEMO] Rapport rejeté', '[DEMO] Votre rapport a été rejeté — ticket 9008.', 1, DATE_SUB(NOW(), INTERVAL 1 DAY)
FROM users u, tickets t
WHERE u.matricule = 'AG-AD-LIA-PAR' AND t.ticket_number = 'TKT-2026-9008';

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT u.id, t.id, 'co_intervention_invite', '[DEMO] Co-intervention', '[DEMO] Invitation co-intervention — ticket 9005.', 0, NOW()
FROM users u, tickets t
WHERE u.matricule = 'AG-AD-DEV-ADM' AND t.ticket_number = 'TKT-2026-9005';

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT u.id, t.id, 'ticket_unresolved', '[DEMO] Ticket non résolu', '[DEMO] Ticket clôturé non résolu — ticket 9014.', 0, NOW()
FROM users u, tickets t
WHERE u.matricule = 'SDA-001' AND t.ticket_number = 'TKT-2026-9014';

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT u.id, NULL, 'monthly_bundle_received', '[DEMO] Bundle mensuel', '[DEMO] Bundle mensuel agent reçu (mai 2026).', 0, NOW()
FROM users u WHERE u.matricule = 'CS-AD-ACM-001';

INSERT INTO notifications (user_id, ticket_id, type, title, message, is_read, created_at)
SELECT u.id, NULL, 'monthly_report_uploaded', '[DEMO] Rapport mensuel SD', '[DEMO] Rapport mensuel IRT mai déposé.', 0, NOW()
FROM users u WHERE u.matricule = 'DIR-001';

-- ---------------------------------------------------------------------------
-- Synthèse
-- ---------------------------------------------------------------------------

SELECT status, COUNT(*) AS nb
FROM tickets
WHERE ticket_number LIKE 'TKT-2026-9%'
GROUP BY status
ORDER BY status;

SELECT rr.status, COUNT(*) AS nb
FROM resolution_reports rr
JOIN tickets t ON t.id = rr.ticket_id
WHERE t.ticket_number LIKE 'TKT-2026-9%'
GROUP BY rr.status
ORDER BY rr.status;
