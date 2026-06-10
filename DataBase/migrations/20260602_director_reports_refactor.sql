-- OGEFREM Ops Hub - Refactoring Directeur / Rapports
-- Importer via phpMyAdmin sur la base ogefrem_ops_hub

USE ogefrem_ops_hub;

-- A. Colonnes supplementaires sur tickets
ALTER TABLE tickets
  ADD COLUMN report_submitted_to_director_at DATETIME NULL AFTER closed_at,
  ADD COLUMN director_visible_until DATETIME NULL AFTER report_submitted_to_director_at,
  ADD COLUMN director_assigned_at DATETIME NULL AFTER director_visible_until;

-- B. Etendre les statuts de resolution_reports
ALTER TABLE resolution_reports
  MODIFY COLUMN status ENUM(
    'brouillon',
    'soumis',
    'valide_chef',
    'valide_sd',
    'valide_directeur',
    'rejete',
    'approuve'
  ) NOT NULL DEFAULT 'soumis';

UPDATE resolution_reports rr
SET rr.status = 'valide_directeur'
WHERE rr.status = 'approuve'
  AND EXISTS (
    SELECT 1 FROM report_validations rv
    WHERE rv.report_id = rr.id AND rv.validator_role = 'DIRECTEUR' AND rv.decision = 'approuve'
  );

UPDATE resolution_reports
SET status = 'valide_sd'
WHERE status = 'approuve';

ALTER TABLE resolution_reports
  MODIFY COLUMN status ENUM(
    'brouillon',
    'soumis',
    'valide_chef',
    'valide_sd',
    'valide_directeur',
    'rejete'
  ) NOT NULL DEFAULT 'soumis';

-- C. Table archive rapports valides par la directrice
CREATE TABLE IF NOT EXISTS rapports_valides (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  report_id INT UNSIGNED NOT NULL,
  ticket_id INT UNSIGNED NOT NULL,
  ticket_number VARCHAR(20) NOT NULL,
  sub_directorate_id TINYINT UNSIGNED NULL,
  sub_directorate_code VARCHAR(50) NULL,
  priority ENUM('normale','haute','bloquant') NOT NULL,
  category_label VARCHAR(80) NOT NULL,
  reporter_full_name VARCHAR(150) NOT NULL,
  ticket_description TEXT NOT NULL,
  report_body TEXT NOT NULL,
  author_name VARCHAR(200) NOT NULL,
  validated_by INT UNSIGNED NOT NULL,
  validated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rv_report FOREIGN KEY (report_id) REFERENCES resolution_reports(id),
  CONSTRAINT fk_rv_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  CONSTRAINT fk_rv_validator FOREIGN KEY (validated_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE INDEX idx_rv_validated_at ON rapports_valides(validated_at);
