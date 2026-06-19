-- =============================================================================
-- OGEFREM Tickets — Données initiales DANTIC (état au 2026-06-22)
--
-- Prérequis : DataBase/schema.sql importé sur une base vide.
--
-- Comptes créés :
--   - 1 directrice (DIR-001)
--   - 2 sous-directeurs (SDM-001, SDA-001)
--   - 6 chefs de service
--   - 6 chefs de bureau
--   - 18 agents techniciens
--   - 1 super-admin (ADMIN-001)
--
-- Mot de passe de test (tous les comptes) : Test@2026
-- Hash : php DataBase/tools/generate_password_hash.php "Test@2026"
-- =============================================================================

USE ogefrem_ops_hub;

SET @test_hash = '$2y$10$UrJ8u4EBl.RK40amGDvHiu55EFUrt/WTlOSFzFviTIcmYP8BgzZvq';

-- ---------------------------------------------------------------------------
-- Rôles
-- ---------------------------------------------------------------------------

INSERT INTO roles (code, label, hierarchy_level) VALUES
  ('SUPER_ADMIN', 'Super Administrateur', 0),
  ('DIRECTEUR', 'Directrice DANTIC', 1),
  ('SOUS_DIRECTEUR', 'Sous-directeur DANTIC', 2),
  ('CHEF_SERVICE', 'Chef de service DANTIC', 3),
  ('CHEF_BUREAU', 'Chef de bureau DANTIC', 4),
  ('TECHNICIEN', 'Agent DANTIC', 4);

-- ---------------------------------------------------------------------------
-- Sous-directions
-- ---------------------------------------------------------------------------

INSERT INTO sub_directorates (code, label) VALUES
  ('INFRA_RESEAU_TELECOMS', 'Sous-direction Infrastructures, Réseaux et Télécoms'),
  ('ANALYSE_DEV_APPS', 'Sous-direction Analyse et Développement des Applications');

-- ---------------------------------------------------------------------------
-- Services DANTIC (6 = 3 par sous-direction)
-- ---------------------------------------------------------------------------

INSERT INTO dantic_services (sub_directorate_id, code, label, sort_order)
SELECT s.id, v.code, v.label, v.sort_order
FROM (
  SELECT 'INFRA_RESEAU_TELECOMS' AS sd_code, 'SVC_IRT_INFRA' AS code, 'Service Infrastructure' AS label, 1 AS sort_order
  UNION SELECT 'INFRA_RESEAU_TELECOMS', 'SVC_IRT_RESEAU', 'Service Réseaux et Sécurité Informatique', 2
  UNION SELECT 'INFRA_RESEAU_TELECOMS', 'SVC_IRT_TELECOM', 'Service Télécoms et Bureautique', 3
  UNION SELECT 'ANALYSE_DEV_APPS', 'SVC_AD_DEV', 'Service Développement et Suivi des Applications', 1
  UNION SELECT 'ANALYSE_DEV_APPS', 'SVC_AD_ACM', 'Service Analyse, Conception et Maintenance', 2
  UNION SELECT 'ANALYSE_DEV_APPS', 'SVC_AD_LIAISON', 'Service Liaison Partenaires et Mandataires Tiers', 3
) v
JOIN sub_directorates s ON s.code = v.sd_code;

-- ---------------------------------------------------------------------------
-- Catégories de tickets (portail public)
-- ---------------------------------------------------------------------------

INSERT INTO ticket_categories (code, label, sort_order) VALUES
  ('RESEAU', 'Réseau & WiFi', 1),
  ('HARDWARE', 'Hardware & PC', 2),
  ('APPLICATIONS', 'Logiciels / Apps', 3),
  ('AUTRES', 'Autres', 4),
  ('IMPRESSION', 'Impression / Scanner', 5),
  ('ACCES', 'Accès & Comptes', 6);

-- ---------------------------------------------------------------------------
-- Routage catégorie → service DANTIC (IDs fixes après INSERT ci-dessus)
-- 1=RESEAU→ACM, 2=HARDWARE→LIAISON, 3=APPLICATIONS→TELECOM, 4=AUTRES→DEV,
-- 5=IMPRESSION→DEV, 6=ACCES→ACM
-- ---------------------------------------------------------------------------

INSERT INTO category_service_routing (category_id, dantic_service_id) VALUES
  (1, 5),
  (2, 6),
  (3, 3),
  (4, 4),
  (5, 4),
  (6, 5);

-- ---------------------------------------------------------------------------
-- Direction et sous-directions
-- ---------------------------------------------------------------------------

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'ADMIN-001', @test_hash, 'Admin', 'Système', 'admin@ogefrem.local', r.id, NULL, NULL, NULL, 0
FROM roles r WHERE r.code = 'SUPER_ADMIN';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'DIR-001', @test_hash, 'KABILA', 'Stéphanie', 'directeur@ogefrem.local', r.id, NULL, NULL, 'Direction DANTIC — Applications NTIC', 0
FROM roles r WHERE r.code = 'DIRECTEUR';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'SDM-001', @test_hash, 'MUTAMBA', 'Arsène', 'sdm@ogefrem.local', r.id, s.id, NULL, s.label, 0
FROM roles r
JOIN sub_directorates s ON s.code = 'INFRA_RESEAU_TELECOMS'
WHERE r.code = 'SOUS_DIRECTEUR';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'SDA-001', @test_hash, 'ILUNGA', 'Cynthia', 'sda@ogefrem.local', r.id, s.id, NULL, s.label, 0
FROM roles r
JOIN sub_directorates s ON s.code = 'ANALYSE_DEV_APPS'
WHERE r.code = 'SOUS_DIRECTEUR';

-- ---------------------------------------------------------------------------
-- Chefs de service (6)
-- ---------------------------------------------------------------------------

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CS-IRT-INF-001', @test_hash, 'KABONGO', 'Patrick', 'cs-irt-inf@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'CHEF_SERVICE' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_INFRA';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CS-IRT-RES-001', @test_hash, 'MULUMBA', 'Joel', 'cs-irt-res@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'CHEF_SERVICE' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_RESEAU';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CS-IRT-TEL-001', @test_hash, 'NZAU', 'Grace', 'cs-irt-tel@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'CHEF_SERVICE' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_TELECOM';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CS-AD-DEV-001', @test_hash, 'BAYA', 'Esther', 'cs-ad-dev@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'CHEF_SERVICE' AND sd.code = 'ANALYSE_DEV_APPS' AND ds.code = 'SVC_AD_DEV';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CS-AD-ACM-001', @test_hash, 'MPUTU', 'Olivier', 'cs-ad-acm@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'CHEF_SERVICE' AND sd.code = 'ANALYSE_DEV_APPS' AND ds.code = 'SVC_AD_ACM';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CS-AD-LIA-001', @test_hash, 'TSHILOMBO', 'Aline', 'cs-ad-lia@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'CHEF_SERVICE' AND sd.code = 'ANALYSE_DEV_APPS' AND ds.code = 'SVC_AD_LIAISON';

-- ---------------------------------------------------------------------------
-- Chefs de bureau (6 — un par service)
-- ---------------------------------------------------------------------------

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CB-IRT-INF-001', @test_hash, 'BUKASA', 'Marie', 'cb-irt-inf@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r
JOIN sub_directorates sd ON sd.code = 'INFRA_RESEAU_TELECOMS'
JOIN dantic_services ds ON ds.code = 'SVC_IRT_INFRA'
WHERE r.code = 'CHEF_BUREAU';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CB-IRT-RES-001', @test_hash, 'TSHIMANGA', 'Eric', 'cb-irt-res@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r
JOIN sub_directorates sd ON sd.code = 'INFRA_RESEAU_TELECOMS'
JOIN dantic_services ds ON ds.code = 'SVC_IRT_RESEAU'
WHERE r.code = 'CHEF_BUREAU';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CB-IRT-TEL-001', @test_hash, 'MWANZA', 'Claudia', 'cb-irt-tel@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r
JOIN sub_directorates sd ON sd.code = 'INFRA_RESEAU_TELECOMS'
JOIN dantic_services ds ON ds.code = 'SVC_IRT_TELECOM'
WHERE r.code = 'CHEF_BUREAU';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CB-AD-DEV-001', @test_hash, 'KABEYA', 'Nathan', 'cb-ad-dev@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r
JOIN sub_directorates sd ON sd.code = 'ANALYSE_DEV_APPS'
JOIN dantic_services ds ON ds.code = 'SVC_AD_DEV'
WHERE r.code = 'CHEF_BUREAU';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CB-AD-ACM-001', @test_hash, 'NGOY', 'Solange', 'cb-ad-acm@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r
JOIN sub_directorates sd ON sd.code = 'ANALYSE_DEV_APPS'
JOIN dantic_services ds ON ds.code = 'SVC_AD_ACM'
WHERE r.code = 'CHEF_BUREAU';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CB-AD-LIA-001', @test_hash, 'KALALA', 'Irène', 'cb-ad-lia@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r
JOIN sub_directorates sd ON sd.code = 'ANALYSE_DEV_APPS'
JOIN dantic_services ds ON ds.code = 'SVC_AD_LIAISON'
WHERE r.code = 'CHEF_BUREAU';

-- ---------------------------------------------------------------------------
-- Agents — Sous-direction IRT (9)
-- ---------------------------------------------------------------------------

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-IRT-INF-ADM', @test_hash, 'KIMWANGA', 'Paul', 'ag-irt-inf-adm@ogefrem.local', r.id, sd.id, ds.id, 'B. Administration Système', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_INFRA';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-IRT-INF-MNT', @test_hash, 'KASONGO', 'Moise', 'ag-irt-inf-mnt@ogefrem.local', r.id, sd.id, ds.id, 'B. Maintenance Informatique', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_INFRA';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-IRT-INF-VEI', @test_hash, 'TSHISEKEDI', 'Alice', 'ag-irt-inf-vei@ogefrem.local', r.id, sd.id, ds.id, 'B. Veille Technologique', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_INFRA';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-IRT-RES-HD', @test_hash, 'MBALA', 'Jean', 'ag-irt-res-hd@ogefrem.local', r.id, sd.id, ds.id, 'B. Réseaux et Help-Desk', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_RESEAU';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-IRT-RES-SEC', @test_hash, 'NGANDU', 'Eric', 'ag-irt-res-sec@ogefrem.local', r.id, sd.id, ds.id, 'B. Sécurité et Cyber Attaques', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_RESEAU';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-IRT-RES-ARC', @test_hash, 'KAPENA', 'Marie', 'ag-irt-res-arc@ogefrem.local', r.id, sd.id, ds.id, 'B. Architecture', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_RESEAU';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-IRT-TEL-INT', @test_hash, 'MULUMBA', 'Chantal', 'ag-irt-tel-int@ogefrem.local', r.id, sd.id, ds.id, 'B. Télécom et Internet', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_TELECOM';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-IRT-TEL-FOR', @test_hash, 'BIBI', 'Sandra', 'ag-irt-tel-for@ogefrem.local', r.id, sd.id, ds.id, 'B. Formation', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_TELECOM';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-IRT-TEL-BUR', @test_hash, 'OKITO', 'Daniel', 'ag-irt-tel-bur@ogefrem.local', r.id, sd.id, ds.id, 'B. Maintenance Bureautique', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_TELECOM';

-- ---------------------------------------------------------------------------
-- Agents — Sous-direction A&D (9)
-- ---------------------------------------------------------------------------

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-AD-DEV-TEC', @test_hash, 'LUKUSA', 'Sarah', 'ag-ad-dev-tec@ogefrem.local', r.id, sd.id, ds.id, 'B. Dev des Applications Techniques', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'ANALYSE_DEV_APPS' AND ds.code = 'SVC_AD_DEV';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-AD-DEV-FIN', @test_hash, 'MONGA', 'Kevin', 'ag-ad-dev-fin@ogefrem.local', r.id, sd.id, ds.id, 'B. Dev des Applications Financières', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'ANALYSE_DEV_APPS' AND ds.code = 'SVC_AD_DEV';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-AD-DEV-ADM', @test_hash, 'SANGA', 'Irène', 'ag-ad-dev-adm@ogefrem.local', r.id, sd.id, ds.id, 'B. Dev des Applications ADM', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'ANALYSE_DEV_APPS' AND ds.code = 'SVC_AD_DEV';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-AD-ACM-ANA', @test_hash, 'LUBOYA', 'Fabrice', 'ag-ad-acm-ana@ogefrem.local', r.id, sd.id, ds.id, 'B. Analyse', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'ANALYSE_DEV_APPS' AND ds.code = 'SVC_AD_ACM';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-AD-ACM-CON', @test_hash, 'KAPENDA', 'Bruno', 'ag-ad-acm-con@ogefrem.local', r.id, sd.id, ds.id, 'B. Conception', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'ANALYSE_DEV_APPS' AND ds.code = 'SVC_AD_ACM';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-AD-ACM-MF', @test_hash, 'MWAMBA', 'Grace', 'ag-ad-acm-mf@ogefrem.local', r.id, sd.id, ds.id, 'B. Maintenance et Formation', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'ANALYSE_DEV_APPS' AND ds.code = 'SVC_AD_ACM';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-AD-LIA-PAR', @test_hash, 'KAZADI', 'Joseph', 'ag-ad-lia-par@ogefrem.local', r.id, sd.id, ds.id, 'Liaisons de Données de Partenaire', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'ANALYSE_DEV_APPS' AND ds.code = 'SVC_AD_LIAISON';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-AD-LIA-DON', @test_hash, 'KANZA', 'Prisca', 'ag-ad-lia-don@ogefrem.local', r.id, sd.id, ds.id, 'B. Liaison des Données de Partenaires', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'ANALYSE_DEV_APPS' AND ds.code = 'SVC_AD_LIAISON';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-AD-LIA-TIE', @test_hash, 'MPUNGA', 'Nathalie', 'ag-ad-lia-tie@ogefrem.local', r.id, sd.id, ds.id, 'B. Suivi des Applications des Tiers', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'ANALYSE_DEV_APPS' AND ds.code = 'SVC_AD_LIAISON';

-- ---------------------------------------------------------------------------
-- Vérification
-- ---------------------------------------------------------------------------

SELECT r.code AS role, COUNT(*) AS nb
FROM users u
JOIN roles r ON r.id = u.role_id
GROUP BY r.code
ORDER BY MIN(r.hierarchy_level);
