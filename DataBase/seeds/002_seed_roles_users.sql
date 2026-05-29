USE ogefrem_ops_hub;

INSERT INTO sub_directorates (code, label) VALUES
  ('MAINTENANCE_RESEAU', 'Sous-direction Maintenance et Réseau'),
  ('ANALYSE_DEV', 'Sous-direction Analyse et Développement');

INSERT INTO roles (code, label, hierarchy_level) VALUES
  ('SUPER_ADMIN', 'Super Administrateur', 0),
  ('DIRECTEUR', 'Responsable DANTIC', 1),
  ('SOUS_DIRECTEUR', 'Sous-directeur', 2),
  ('CHEF_SERVICE', 'Chef de service', 3),
  ('TECHNICIEN', 'Technicien', 4);

INSERT INTO ticket_categories (code, label, sort_order) VALUES
  ('RESEAU', 'Réseau & WiFi', 1),
  ('HARDWARE', 'Hardware & PC', 2),
  ('APPLICATIONS', 'Logiciels / Apps', 3),
  ('AUTRES', 'Autres', 4),
  ('IMPRESSION', 'Impression / Scanner', 5),
  ('ACCES', 'Accès & Comptes', 6);

-- Password hash placeholder:
-- Generate with PHP: password_hash('Test@2026', PASSWORD_DEFAULT)
SET @test_hash = '$2y$10$replace_me_with_php_hash';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_label, must_change_password)
SELECT 'ADMIN-001', @test_hash, 'Admin', 'Système', 'admin@ogefrem.local', r.id, NULL, NULL, 0
FROM roles r WHERE r.code = 'SUPER_ADMIN';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_label, must_change_password)
SELECT 'DIR-001', @test_hash, 'KABILA', 'Stéphanie', 'directeur@ogefrem.local', r.id, NULL, 'Direction DANTIC', 0
FROM roles r WHERE r.code = 'DIRECTEUR';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_label, must_change_password)
SELECT 'SDM-001', @test_hash, 'MUTAMBA', 'Arsène', 'sdm@ogefrem.local', r.id, s.id, 'Sous-direction Maintenance et Réseau', 0
FROM roles r
JOIN sub_directorates s ON s.code = 'MAINTENANCE_RESEAU'
WHERE r.code = 'SOUS_DIRECTEUR';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_label, must_change_password)
SELECT 'SDA-001', @test_hash, 'ILUNGA', 'Cynthia', 'sda@ogefrem.local', r.id, s.id, 'Sous-direction Analyse et Développement', 0
FROM roles r
JOIN sub_directorates s ON s.code = 'ANALYSE_DEV'
WHERE r.code = 'SOUS_DIRECTEUR';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_label, must_change_password)
SELECT 'CSM-001', @test_hash, 'MULUMBA', 'Joel', 'csm@ogefrem.local', r.id, s.id, 'Service Maintenance', 0
FROM roles r
JOIN sub_directorates s ON s.code = 'MAINTENANCE_RESEAU'
WHERE r.code = 'CHEF_SERVICE';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_label, must_change_password)
SELECT 'CSA-001', @test_hash, 'BAYA', 'Esther', 'csa@ogefrem.local', r.id, s.id, 'Service Développement', 0
FROM roles r
JOIN sub_directorates s ON s.code = 'ANALYSE_DEV'
WHERE r.code = 'CHEF_SERVICE';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_label, must_change_password)
SELECT 'TCM-001', @test_hash, 'MBALA', 'Jean', 'tcm@ogefrem.local', r.id, s.id, 'Equipe Intervention Réseau', 0
FROM roles r
JOIN sub_directorates s ON s.code = 'MAINTENANCE_RESEAU'
WHERE r.code = 'TECHNICIEN';

INSERT INTO users (matricule, password_hash, nom, prenom, email, role_id, sub_directorate_id, service_label, must_change_password)
SELECT 'TCA-001', @test_hash, 'LUKUSA', 'Sarah', 'tca@ogefrem.local', r.id, s.id, 'Equipe Support Applicatif', 0
FROM roles r
JOIN sub_directorates s ON s.code = 'ANALYSE_DEV'
WHERE r.code = 'TECHNICIEN';
