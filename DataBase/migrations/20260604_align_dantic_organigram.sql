-- Alignement organigramme DANTIC officiel
-- Importer sur ogefrem_ops_hub (apres schema + seed initial)

USE ogefrem_ops_hub;

-- 1. Libelles sous-directions
UPDATE sub_directorates
SET code = 'INFRA_RESEAU_TELECOMS',
    label = 'Sous-direction Infrastructures, Réseaux et Télécoms'
WHERE id = 1 OR code = 'MAINTENANCE_RESEAU';

UPDATE sub_directorates
SET code = 'ANALYSE_DEV_APPS',
    label = 'Sous-direction Analyse et Développement des Applications'
WHERE id = 2 OR code = 'ANALYSE_DEV';

-- 2. Table des services DANTIC
CREATE TABLE IF NOT EXISTS dantic_services (
  id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  sub_directorate_id TINYINT UNSIGNED NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(150) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_service_sub_dir FOREIGN KEY (sub_directorate_id) REFERENCES sub_directorates(id)
) ENGINE=InnoDB;

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
JOIN sub_directorates s ON s.code = v.sd_code
ON DUPLICATE KEY UPDATE label = VALUES(label), sort_order = VALUES(sort_order);

-- 3. Lien utilisateur -> service
ALTER TABLE users
  ADD COLUMN service_id TINYINT UNSIGNED NULL AFTER sub_directorate_id,
  ADD CONSTRAINT fk_users_service FOREIGN KEY (service_id) REFERENCES dantic_services(id);

-- 4. Libelles roles
UPDATE roles SET label = 'Directrice DANTIC' WHERE code = 'DIRECTEUR';
UPDATE roles SET label = 'Sous-directeur DANTIC' WHERE code = 'SOUS_DIRECTEUR';
UPDATE roles SET label = 'Chef de service DANTIC' WHERE code = 'CHEF_SERVICE';
UPDATE roles SET label = 'Agent DANTIC' WHERE code = 'TECHNICIEN';

-- 5. Mise a jour profils existants
UPDATE users u
JOIN sub_directorates s ON s.id = u.sub_directorate_id
SET u.service_label = s.label
WHERE u.matricule IN ('SDM-001', 'SDA-001');

UPDATE users SET service_label = 'Direction DANTIC — Applications NTIC' WHERE matricule = 'DIR-001';

UPDATE users u
JOIN dantic_services ds ON ds.code = 'SVC_IRT_RESEAU'
SET u.service_id = ds.id, u.service_label = ds.label
WHERE u.matricule = 'CSM-001';

UPDATE users u
JOIN dantic_services ds ON ds.code = 'SVC_AD_DEV'
SET u.service_id = ds.id, u.service_label = ds.label
WHERE u.matricule = 'CSA-001';

UPDATE users u
JOIN dantic_services ds ON ds.code = 'SVC_IRT_RESEAU'
SET u.service_id = ds.id, u.service_label = 'B. Réseaux et Help-Desk'
WHERE u.matricule = 'TCM-001';

UPDATE users u
JOIN dantic_services ds ON ds.code = 'SVC_AD_DEV'
SET u.service_id = ds.id, u.service_label = 'B. Dev des Applications Techniques'
WHERE u.matricule = 'TCA-001';

SET @test_hash = '$2y$10$UrJ8u4EBl.RK40amGDvHiu55EFUrt/WTlOSFzFviTIcmYP8BgzZvq';

-- 6. Nouveaux profils (chefs de service et agents par service)
INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CS-IRT-INF-001', @test_hash, 'KABONGO', 'Patrick', 'cs-irt-inf@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r
JOIN sub_directorates sd ON sd.code = 'INFRA_RESEAU_TELECOMS'
JOIN dantic_services ds ON ds.code = 'SVC_IRT_INFRA'
WHERE r.code = 'CHEF_SERVICE'
  AND NOT EXISTS (SELECT 1 FROM users WHERE matricule = 'CS-IRT-INF-001');

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CS-IRT-TEL-001', @test_hash, 'NZAU', 'Grace', 'cs-irt-tel@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r
JOIN sub_directorates sd ON sd.code = 'INFRA_RESEAU_TELECOMS'
JOIN dantic_services ds ON ds.code = 'SVC_IRT_TELECOM'
WHERE r.code = 'CHEF_SERVICE'
  AND NOT EXISTS (SELECT 1 FROM users WHERE matricule = 'CS-IRT-TEL-001');

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CS-AD-ACM-001', @test_hash, 'MPUTU', 'Olivier', 'cs-ad-acm@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r
JOIN sub_directorates sd ON sd.code = 'ANALYSE_DEV_APPS'
JOIN dantic_services ds ON ds.code = 'SVC_AD_ACM'
WHERE r.code = 'CHEF_SERVICE'
  AND NOT EXISTS (SELECT 1 FROM users WHERE matricule = 'CS-AD-ACM-001');

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'CS-AD-LIA-001', @test_hash, 'TSHILOMBO', 'Aline', 'cs-ad-lia@ogefrem.local', r.id, sd.id, ds.id, ds.label, 0
FROM roles r
JOIN sub_directorates sd ON sd.code = 'ANALYSE_DEV_APPS'
JOIN dantic_services ds ON ds.code = 'SVC_AD_LIAISON'
WHERE r.code = 'CHEF_SERVICE'
  AND NOT EXISTS (SELECT 1 FROM users WHERE matricule = 'CS-AD-LIA-001');

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-IRT-INF-001', @test_hash, 'KASONGO', 'Moise', 'ag-irt-inf@ogefrem.local', r.id, sd.id, ds.id, 'B. Maintenance Informatique', 0
FROM roles r
JOIN sub_directorates sd ON sd.code = 'INFRA_RESEAU_TELECOMS'
JOIN dantic_services ds ON ds.code = 'SVC_IRT_INFRA'
WHERE r.code = 'TECHNICIEN'
  AND NOT EXISTS (SELECT 1 FROM users WHERE matricule = 'AG-IRT-INF-001');

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-IRT-TEL-001', @test_hash, 'MULUMBA', 'Chantal', 'ag-irt-tel@ogefrem.local', r.id, sd.id, ds.id, 'B. Télécom et Internet', 0
FROM roles r
JOIN sub_directorates sd ON sd.code = 'INFRA_RESEAU_TELECOMS'
JOIN dantic_services ds ON ds.code = 'SVC_IRT_TELECOM'
WHERE r.code = 'TECHNICIEN'
  AND NOT EXISTS (SELECT 1 FROM users WHERE matricule = 'AG-IRT-TEL-001');

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-AD-ACM-001', @test_hash, 'LUBOYA', 'Fabrice', 'ag-ad-acm@ogefrem.local', r.id, sd.id, ds.id, 'B. Analyse', 0
FROM roles r
JOIN sub_directorates sd ON sd.code = 'ANALYSE_DEV_APPS'
JOIN dantic_services ds ON ds.code = 'SVC_AD_ACM'
WHERE r.code = 'TECHNICIEN'
  AND NOT EXISTS (SELECT 1 FROM users WHERE matricule = 'AG-AD-ACM-001');

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_id, service_label, must_change_password)
SELECT 'AG-AD-LIA-001', @test_hash, 'KANZA', 'Prisca', 'ag-ad-lia@ogefrem.local', r.id, sd.id, ds.id, 'B. Liaisons Données Partenaires', 0
FROM roles r
JOIN sub_directorates sd ON sd.code = 'ANALYSE_DEV_APPS'
JOIN dantic_services ds ON ds.code = 'SVC_AD_LIAISON'
WHERE r.code = 'TECHNICIEN'
  AND NOT EXISTS (SELECT 1 FROM users WHERE matricule = 'AG-AD-LIA-001');
