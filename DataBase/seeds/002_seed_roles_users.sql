USE ogefrem_ops_hub;

INSERT INTO sub_directorates (code, label) VALUES
  ('INFRA_RESEAU_TELECOMS', 'Sous-direction Infrastructures, Réseaux et Télécoms'),
  ('ANALYSE_DEV_APPS', 'Sous-direction Analyse et Développement des Applications');

INSERT INTO roles (code, label, hierarchy_level) VALUES
  ('SUPER_ADMIN', 'Super Administrateur', 0),
  ('DIRECTEUR', 'Directrice DANTIC', 1),
  ('SOUS_DIRECTEUR', 'Sous-directeur DANTIC', 2),
  ('CHEF_SERVICE', 'Chef de service DANTIC', 3),
  ('TECHNICIEN', 'Agent DANTIC', 4);

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

INSERT INTO ticket_categories (code, label, sort_order) VALUES
  ('RESEAU', 'Réseau & WiFi', 1),
  ('HARDWARE', 'Hardware & PC', 2),
  ('APPLICATIONS', 'Logiciels / Apps', 3),
  ('AUTRES', 'Autres', 4),
  ('IMPRESSION', 'Impression / Scanner', 5),
  ('ACCES', 'Accès & Comptes', 6);

-- Password hash: password_hash('Test@2026', PASSWORD_DEFAULT)
SET @test_hash = '$2y$10$UrJ8u4EBl.RK40amGDvHiu55EFUrt/WTlOSFzFviTIcmYP8BgzZvq';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'ADMIN-001', @test_hash, 'Admin', 'Système', 'admin@ogefrem.local', r.id, NULL, NULL, NULL, 0
FROM roles r WHERE r.code = 'SUPER_ADMIN';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'DIR-001', @test_hash, 'KABILA', 'Stéphanie', 'directeur@ogefrem.local', r.id, NULL, NULL, 'Direction DANTIC — Applications NTIC', 0
FROM roles r WHERE r.code = 'DIRECTEUR';

-- Sous-directeurs
INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'SDM-001', @test_hash, 'MUTAMBA', 'Arsène', 'sd-irt@ogefrem.local', r.id, s.id, NULL, s.label, 0
FROM roles r
JOIN sub_directorates s ON s.code = 'INFRA_RESEAU_TELECOMS'
WHERE r.code = 'SOUS_DIRECTEUR';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'SDA-001', @test_hash, 'ILUNGA', 'Cynthia', 'sd-ad@ogefrem.local', r.id, s.id, NULL, s.label, 0
FROM roles r
JOIN sub_directorates s ON s.code = 'ANALYSE_DEV_APPS'
WHERE r.code = 'SOUS_DIRECTEUR';

-- Chefs de service — IRT
INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CS-IRT-INF-001', @test_hash, 'KABONGO', 'Patrick', 'cs-irt-inf@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'CHEF_SERVICE' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_INFRA';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CSM-001', @test_hash, 'MULUMBA', 'Joel', 'cs-irt-res@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'CHEF_SERVICE' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_RESEAU';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CS-IRT-TEL-001', @test_hash, 'NZAU', 'Grace', 'cs-irt-tel@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'CHEF_SERVICE' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_TELECOM';

-- Chefs de service — A&D
INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CSA-001', @test_hash, 'BAYA', 'Esther', 'cs-ad-dev@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
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

-- Agents — IRT
INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-IRT-INF-001', @test_hash, 'KASONGO', 'Moise', 'ag-irt-inf@ogefrem.local', r.id, sd.id, ds.id, 'B. Maintenance Informatique', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_INFRA';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'TCM-001', @test_hash, 'MBALA', 'Jean', 'ag-irt-res@ogefrem.local', r.id, sd.id, ds.id, 'B. Réseaux et Help-Desk', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_RESEAU';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-IRT-TEL-001', @test_hash, 'MULUMBA', 'Chantal', 'ag-irt-tel@ogefrem.local', r.id, sd.id, ds.id, 'B. Télécom et Internet', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'INFRA_RESEAU_TELECOMS' AND ds.code = 'SVC_IRT_TELECOM';

-- Agents — A&D
INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'TCA-001', @test_hash, 'LUKUSA', 'Sarah', 'ag-ad-dev@ogefrem.local', r.id, sd.id, ds.id, 'B. Dev des Applications Techniques', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'ANALYSE_DEV_APPS' AND ds.code = 'SVC_AD_DEV';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-AD-ACM-001', @test_hash, 'LUBOYA', 'Fabrice', 'ag-ad-acm@ogefrem.local', r.id, sd.id, ds.id, 'B. Analyse', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'ANALYSE_DEV_APPS' AND ds.code = 'SVC_AD_ACM';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-AD-LIA-001', @test_hash, 'KANZA', 'Prisca', 'ag-ad-lia@ogefrem.local', r.id, sd.id, ds.id, 'B. Liaisons Données Partenaires', 0
FROM roles r, sub_directorates sd, dantic_services ds
WHERE r.code = 'TECHNICIEN' AND sd.code = 'ANALYSE_DEV_APPS' AND ds.code = 'SVC_AD_LIAISON';
