-- OGEFREM — Rapports périodiques (hebdo, bundle mensuel agent, rapport mensuel SD)
USE ogefrem_ops_hub;

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

CREATE INDEX idx_weekly_period ON weekly_reports(year, month);
CREATE INDEX idx_bundle_recipient ON monthly_agent_bundles(recipient_id, year, month);
CREATE INDEX idx_msr_director ON monthly_subdirectorate_reports(visibility, year, month);
CREATE INDEX idx_ara_agent_period ON agent_resolved_archives(agent_id, year, month);
