-- =============================================================================
-- OGEFREM Tickets — Schéma complet de la base de données
-- Moteur : MySQL / MariaDB (XAMPP)
-- Charset : utf8mb4
--
-- Usage (phpMyAdmin ou CLI) :
--   1. Importer CE fichier en premier (structure vide).
--   2. Importer ensuite 002_donnees_dantic.sql (données organigramme).
--
-- Pour réinitialiser entièrement en dev (ATTENTION : efface toutes les données) :
--   DROP DATABASE IF EXISTS ogefrem_ops_hub;
-- =============================================================================

CREATE DATABASE IF NOT EXISTS ogefrem_ops_hub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ogefrem_ops_hub;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- Référentiel organigramme DANTIC
-- ---------------------------------------------------------------------------

CREATE TABLE sub_directorates (
  id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(150) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE dantic_services (
  id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  sub_directorate_id TINYINT UNSIGNED NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(150) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  CONSTRAINT fk_service_sub_dir FOREIGN KEY (sub_directorate_id) REFERENCES sub_directorates(id)
) ENGINE=InnoDB;

CREATE INDEX idx_services_sub_dir ON dantic_services(sub_directorate_id);

-- ---------------------------------------------------------------------------
-- Rôles et utilisateurs
-- ---------------------------------------------------------------------------

CREATE TABLE roles (
  id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL,
  hierarchy_level TINYINT UNSIGNED NOT NULL COMMENT '0=admin,1=directeur,2=sous-directeur,3=chef,4=agent'
) ENGINE=InnoDB;

CREATE TABLE users (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  matricule VARCHAR(32) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(150) NULL,
  role_id TINYINT UNSIGNED NOT NULL,
  sub_directorate_id TINYINT UNSIGNED NULL,
  service_id TINYINT UNSIGNED NULL,
  service_label VARCHAR(150) NULL COMMENT 'Libellé du bureau pour les agents',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_users_sub_dir FOREIGN KEY (sub_directorate_id) REFERENCES sub_directorates(id),
  CONSTRAINT fk_users_service FOREIGN KEY (service_id) REFERENCES dantic_services(id)
) ENGINE=InnoDB;

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_sub_dir ON users(sub_directorate_id);
CREATE INDEX idx_users_service ON users(service_id);

-- ---------------------------------------------------------------------------
-- Tickets
-- ---------------------------------------------------------------------------

CREATE TABLE ticket_categories (
  id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE tickets (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ticket_number VARCHAR(20) NOT NULL UNIQUE,
  reporter_full_name VARCHAR(150) NOT NULL,
  reporter_matricule VARCHAR(32) NOT NULL,
  reporter_direction VARCHAR(120) NOT NULL,
  reporter_service VARCHAR(120) NOT NULL,
  reporter_office VARCHAR(120) NOT NULL,
  category_id TINYINT UNSIGNED NOT NULL,
  description TEXT NOT NULL,
  priority ENUM('normale','haute','bloquant') NOT NULL DEFAULT 'normale',
  sla_due_at DATETIME NULL,
  status ENUM(
    'nouveau',
    'chez_sous_direction',
    'chez_chef_service',
    'assigne_technicien',
    'en_cours',
    'resolu',
    'archive'
  ) NOT NULL DEFAULT 'nouveau',
  sub_directorate_id TINYINT UNSIGNED NULL,
  assigned_chef_id INT UNSIGNED NULL,
  assigned_technician_id INT UNSIGNED NULL,
  received_by_director_at DATETIME NULL,
  priority_set_by INT UNSIGNED NULL,
  closed_at DATETIME NULL,
  report_submitted_to_director_at DATETIME NULL,
  director_visible_until DATETIME NULL,
  director_assigned_at DATETIME NULL,
  archived_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tickets_category FOREIGN KEY (category_id) REFERENCES ticket_categories(id),
  CONSTRAINT fk_tickets_sub_dir FOREIGN KEY (sub_directorate_id) REFERENCES sub_directorates(id),
  CONSTRAINT fk_tickets_chef FOREIGN KEY (assigned_chef_id) REFERENCES users(id),
  CONSTRAINT fk_tickets_tech FOREIGN KEY (assigned_technician_id) REFERENCES users(id),
  CONSTRAINT fk_tickets_priority_by FOREIGN KEY (priority_set_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_sub_dir ON tickets(sub_directorate_id);
CREATE INDEX idx_tickets_tech ON tickets(assigned_technician_id);
CREATE INDEX idx_tickets_created ON tickets(created_at);

CREATE TABLE ticket_events (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ticket_id INT UNSIGNED NOT NULL,
  actor_user_id INT UNSIGNED NULL,
  event_type VARCHAR(50) NOT NULL,
  from_status VARCHAR(40) NULL,
  to_status VARCHAR(40) NULL,
  payload_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_events_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Rapports de résolution (tickets) et validations hiérarchiques
-- ---------------------------------------------------------------------------

CREATE TABLE resolution_reports (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ticket_id INT UNSIGNED NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM(
    'brouillon',
    'soumis',
    'valide_chef',
    'valide_sd',
    'valide_directeur',
    'rejete'
  ) NOT NULL DEFAULT 'soumis',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_author FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE report_validations (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  report_id INT UNSIGNED NOT NULL,
  validator_id INT UNSIGNED NOT NULL,
  validator_role VARCHAR(40) NOT NULL,
  decision ENUM('approuve','rejete') NOT NULL,
  comment TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_validations_report FOREIGN KEY (report_id) REFERENCES resolution_reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_validations_user FOREIGN KEY (validator_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE rapports_valides (
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

-- ---------------------------------------------------------------------------
-- Notifications et sessions
-- ---------------------------------------------------------------------------

CREATE TABLE notifications (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  ticket_id INT UNSIGNED NULL,
  type VARCHAR(60) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_notif_user_unread ON notifications(user_id, is_read, created_at);

CREATE TABLE user_sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Rapports périodiques (hebdo, bundle mensuel agent, rapport mensuel SD)
-- ---------------------------------------------------------------------------

CREATE TABLE weekly_reports (
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

CREATE TABLE monthly_agent_bundles (
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

CREATE TABLE monthly_subdirectorate_reports (
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

CREATE TABLE monthly_report_comments (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  monthly_report_id INT UNSIGNED NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mrc_report FOREIGN KEY (monthly_report_id) REFERENCES monthly_subdirectorate_reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_mrc_author FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE agent_resolved_archives (
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

CREATE INDEX idx_weekly_period ON weekly_reports(year, month);
CREATE INDEX idx_bundle_recipient ON monthly_agent_bundles(recipient_id, year, month);
CREATE INDEX idx_msr_director ON monthly_subdirectorate_reports(visibility, year, month);
CREATE INDEX idx_ara_agent_period ON agent_resolved_archives(agent_id, year, month);

SET FOREIGN_KEY_CHECKS = 1;
