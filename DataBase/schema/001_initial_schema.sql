-- OGEFREM Ops Hub - Schema initial V1
-- Engine: MySQL/MariaDB (XAMPP)
-- Charset: utf8mb4

CREATE DATABASE IF NOT EXISTS ogefrem_ops_hub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ogefrem_ops_hub;

CREATE TABLE sub_directorates (
  id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(120) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE roles (
  id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL,
  hierarchy_level TINYINT UNSIGNED NOT NULL COMMENT '0=admin,1=directeur,2=sous-directeur,3=chef,4=technicien'
) ENGINE=InnoDB;

CREATE TABLE ticket_categories (
  id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0
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
  service_label VARCHAR(120) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT fk_users_sub_dir FOREIGN KEY (sub_directorate_id) REFERENCES sub_directorates(id)
) ENGINE=InnoDB;

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_sub_dir ON users(sub_directorate_id);

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

CREATE TABLE resolution_reports (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  ticket_id INT UNSIGNED NOT NULL,
  author_id INT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  status ENUM('brouillon','soumis','approuve','rejete') NOT NULL DEFAULT 'brouillon',
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
