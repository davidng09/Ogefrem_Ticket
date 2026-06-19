-- =============================================================================
-- OGEFREM Tickets — Migration cumulative (bases existantes → état 2026-06-22)
--
-- Usage (base déjà créée avec un ancien schéma) :
--   mysql -u root ogefrem_ops_hub < DataBase/migrations_up.sql
--
-- Idempotent autant que possible : relancer ne doit pas casser une base à jour.
-- Pour une installation neuve, préférer schema.sql + seed.sql.
-- =============================================================================

USE ogefrem_ops_hub;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- Helpers idempotents (colonnes / index)
-- ---------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS ogefrem_add_column_if_missing;
DROP PROCEDURE IF EXISTS ogefrem_add_index_if_missing;

DELIMITER //

CREATE PROCEDURE ogefrem_add_column_if_missing(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

CREATE PROCEDURE ogefrem_add_index_if_missing(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table, '` ADD ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END//

DELIMITER ;

-- ---------------------------------------------------------------------------
-- 20260602 — Colonnes directrice + rapports_valides
-- ---------------------------------------------------------------------------

CALL ogefrem_add_column_if_missing('tickets', 'report_submitted_to_director_at', 'DATETIME NULL AFTER closed_at');
CALL ogefrem_add_column_if_missing('tickets', 'director_visible_until', 'DATETIME NULL AFTER report_submitted_to_director_at');
CALL ogefrem_add_column_if_missing('tickets', 'director_assigned_at', 'DATETIME NULL AFTER director_visible_until');

CREATE TABLE IF NOT EXISTS rapports_valides (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  report_id INT UNSIGNED NOT NULL,
  ticket_id INT UNSIGNED NOT NULL,
  ticket_number VARCHAR(20) NOT NULL,
  sub_directorate_id TINYINT UNSIGNED NULL,
  sub_directorate_code VARCHAR(50) NULL,
  priority ENUM('urgent','elevee','normale') NOT NULL DEFAULT 'normale',
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

-- ---------------------------------------------------------------------------
-- 20260604 — service_id utilisateurs + dantic_services
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dantic_services (
  id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  sub_directorate_id TINYINT UNSIGNED NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(150) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_service_sub_dir FOREIGN KEY (sub_directorate_id) REFERENCES sub_directorates(id)
) ENGINE=InnoDB;

CALL ogefrem_add_column_if_missing('users', 'service_id', 'TINYINT UNSIGNED NULL AFTER sub_directorate_id');

-- ---------------------------------------------------------------------------
-- 20260606 — Rapports périodiques
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS weekly_reports (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  author_id INT UNSIGNED NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  month TINYINT UNSIGNED NOT NULL,
  week_index TINYINT UNSIGNED NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  body TEXT NOT NULL,
  status ENUM('brouillon', 'finalise') NOT NULL DEFAULT 'brouillon',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_weekly_author FOREIGN KEY (author_id) REFERENCES users(id),
  UNIQUE KEY uq_weekly_author_period (author_id, year, month, week_index)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS monthly_agent_bundles (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  sender_id INT UNSIGNED NOT NULL,
  recipient_id INT UNSIGNED NOT NULL,
  sub_directorate_id TINYINT UNSIGNED NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  month TINYINT UNSIGNED NOT NULL,
  concatenated_body TEXT NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bundle_sender FOREIGN KEY (sender_id) REFERENCES users(id),
  CONSTRAINT fk_bundle_recipient FOREIGN KEY (recipient_id) REFERENCES users(id),
  CONSTRAINT fk_bundle_sd FOREIGN KEY (sub_directorate_id) REFERENCES sub_directorates(id),
  UNIQUE KEY uq_bundle_sender_period (sender_id, year, month)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS monthly_subdirectorate_reports (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  sub_directorate_id TINYINT UNSIGNED NOT NULL,
  uploader_id INT UNSIGNED NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  month TINYINT UNSIGNED NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  visibility ENUM('active', 'archived', 'deleted') NOT NULL DEFAULT 'active',
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msr_sd FOREIGN KEY (sub_directorate_id) REFERENCES sub_directorates(id),
  CONSTRAINT fk_msr_uploader FOREIGN KEY (uploader_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS monthly_report_comments (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  monthly_report_id INT UNSIGNED NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mrc_report FOREIGN KEY (monthly_report_id) REFERENCES monthly_subdirectorate_reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_mrc_author FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agent_resolved_archives (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  agent_id INT UNSIGNED NOT NULL,
  ticket_id INT UNSIGNED NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  month TINYINT UNSIGNED NOT NULL,
  week_index TINYINT UNSIGNED NOT NULL,
  archived_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ara_agent FOREIGN KEY (agent_id) REFERENCES users(id),
  CONSTRAINT fk_ara_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  UNIQUE KEY uq_ara_agent_ticket (agent_id, ticket_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 20260611 — Co-interventions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ticket_co_interventions (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ticket_id INT UNSIGNED NOT NULL,
  agent_id INT UNSIGNED NOT NULL,
  invited_by INT UNSIGNED NOT NULL,
  status ENUM('pending', 'accepted') NOT NULL DEFAULT 'pending',
  invited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME NULL,
  CONSTRAINT fk_tci_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_tci_agent FOREIGN KEY (agent_id) REFERENCES users(id),
  CONSTRAINT fk_tci_inviter FOREIGN KEY (invited_by) REFERENCES users(id),
  UNIQUE KEY uk_tci_ticket_agent (ticket_id, agent_id)
) ENGINE=InnoDB;

CALL ogefrem_add_index_if_missing('ticket_co_interventions', 'idx_tci_agent_status', 'INDEX idx_tci_agent_status (agent_id, status)');

-- ---------------------------------------------------------------------------
-- 20260616 — Routage service + tracking + priorités
-- ---------------------------------------------------------------------------

CALL ogefrem_add_column_if_missing('tickets', 'tracking_token', 'CHAR(64) NULL AFTER ticket_number');
CALL ogefrem_add_column_if_missing('tickets', 'routed_service_id', 'TINYINT UNSIGNED NULL AFTER category_id');
CALL ogefrem_add_column_if_missing('tickets', 'routed_at', 'DATETIME NULL AFTER routed_service_id');

CREATE TABLE IF NOT EXISTS category_service_routing (
  category_id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  dantic_service_id TINYINT UNSIGNED NOT NULL,
  CONSTRAINT fk_csr_category FOREIGN KEY (category_id) REFERENCES ticket_categories(id),
  CONSTRAINT fk_csr_service FOREIGN KEY (dantic_service_id) REFERENCES dantic_services(id)
) ENGINE=InnoDB;

INSERT INTO category_service_routing (category_id, dantic_service_id) VALUES
  (1, 5), (2, 6), (3, 3), (4, 4), (5, 4), (6, 5)
ON DUPLICATE KEY UPDATE dantic_service_id = VALUES(dantic_service_id);

CALL ogefrem_add_index_if_missing('tickets', 'uk_tickets_tracking_token', 'UNIQUE KEY uk_tickets_tracking_token (tracking_token)');
CALL ogefrem_add_index_if_missing('tickets', 'idx_tickets_routed_service', 'INDEX idx_tickets_routed_service (routed_service_id)');

-- Priorités tickets (élargir → migrer → réduire)
ALTER TABLE tickets
  MODIFY COLUMN priority ENUM('normale','haute','bloquant','urgent','elevee') NOT NULL DEFAULT 'normale';

UPDATE tickets SET priority = 'urgent' WHERE priority = 'bloquant';
UPDATE tickets SET priority = 'elevee' WHERE priority = 'haute';

ALTER TABLE tickets
  MODIFY COLUMN priority ENUM('urgent','elevee','normale') NOT NULL DEFAULT 'normale';

UPDATE tickets
SET tracking_token = LOWER(MD5(CONCAT(id, '-', ticket_number, '-', UNIX_TIMESTAMP())))
WHERE tracking_token IS NULL;

-- ---------------------------------------------------------------------------
-- 20260619 — Présence en ligne
-- ---------------------------------------------------------------------------

CALL ogefrem_add_column_if_missing('users', 'last_seen_at', 'DATETIME NULL');
CALL ogefrem_add_index_if_missing('users', 'idx_users_last_seen', 'INDEX idx_users_last_seen (last_seen_at)');

-- ---------------------------------------------------------------------------
-- 20260620 — Statut non_resolu
-- ---------------------------------------------------------------------------

ALTER TABLE tickets
  MODIFY COLUMN status ENUM(
    'nouveau',
    'chez_sous_direction',
    'chez_chef_service',
    'assigne_technicien',
    'en_cours',
    'resolu',
    'non_resolu',
    'archive'
  ) NOT NULL DEFAULT 'chez_chef_service';

-- ---------------------------------------------------------------------------
-- 20260621 — Archives rapports_valides
-- ---------------------------------------------------------------------------

ALTER TABLE rapports_valides
  MODIFY COLUMN priority ENUM('normale','haute','bloquant','urgent','elevee') NOT NULL DEFAULT 'normale';

UPDATE rapports_valides SET priority = 'urgent' WHERE priority = 'bloquant';
UPDATE rapports_valides SET priority = 'elevee' WHERE priority = 'haute';

ALTER TABLE rapports_valides
  MODIFY COLUMN priority ENUM('urgent','elevee','normale') NOT NULL DEFAULT 'normale';

CALL ogefrem_add_index_if_missing('rapports_valides', 'uk_rv_report_id', 'UNIQUE KEY uk_rv_report_id (report_id)');

-- ---------------------------------------------------------------------------
-- 20260622 — Consignes + commentaires bundles mensuels
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ticket_consignes (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ticket_id INT UNSIGNED NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  author_role VARCHAR(40) NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_consignes_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_consignes_author FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB;

CALL ogefrem_add_index_if_missing('ticket_consignes', 'idx_consignes_ticket', 'INDEX idx_consignes_ticket (ticket_id, created_at)');

CREATE TABLE IF NOT EXISTS monthly_bundle_comments (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  bundle_id INT UNSIGNED NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mbc_bundle FOREIGN KEY (bundle_id) REFERENCES monthly_agent_bundles(id) ON DELETE CASCADE,
  CONSTRAINT fk_mbc_author FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB;

CALL ogefrem_add_index_if_missing('monthly_bundle_comments', 'idx_mbc_bundle', 'INDEX idx_mbc_bundle (bundle_id, created_at)');

-- ---------------------------------------------------------------------------
-- Rôle CHEF_BUREAU + rate_limits
-- ---------------------------------------------------------------------------

INSERT INTO roles (code, label, hierarchy_level) VALUES
  ('CHEF_BUREAU', 'Chef de bureau DANTIC', 4)
ON DUPLICATE KEY UPDATE label = VALUES(label), hierarchy_level = VALUES(hierarchy_level);

CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  bucket VARCHAR(64) NOT NULL,
  client_key VARCHAR(128) NOT NULL,
  hit_count INT UNSIGNED NOT NULL DEFAULT 1,
  window_start DATETIME NOT NULL,
  UNIQUE KEY uk_rate_limits_bucket_client (bucket, client_key),
  KEY idx_rate_limits_window (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Nettoyage helpers
-- ---------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS ogefrem_add_column_if_missing;
DROP PROCEDURE IF EXISTS ogefrem_add_index_if_missing;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Migration cumulative terminée.' AS status;
