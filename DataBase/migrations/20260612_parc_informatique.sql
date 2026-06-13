-- OGEFREM — Module parc informatique (base partagée ogefrem_ops_hub)
-- Prérequis : schéma tickets existant

USE ogefrem_ops_hub;

-- ---------------------------------------------------------------------------
-- Référentiels parc
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS parc_types (
  id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS parc_marques (
  id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nom VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS parc_etats (
  id TINYINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(40) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL,
  couleur VARCHAR(7) NOT NULL DEFAULT '#6B7A99',
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS parc_directions (
  id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL UNIQUE,
  nom VARCHAR(150) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS parc_fournisseurs (
  id SMALLINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  nom VARCHAR(150) NOT NULL,
  contact VARCHAR(120) NULL,
  telephone VARCHAR(40) NULL,
  email VARCHAR(150) NULL,
  adresse VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Détenteurs OGEFREM (hors DANTIC) — alignés sur le portail tickets
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS parc_detenteurs (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  matricule VARCHAR(32) NOT NULL,
  nom_complet VARCHAR(150) NOT NULL,
  direction VARCHAR(120) NOT NULL,
  service VARCHAR(120) NOT NULL,
  bureau VARCHAR(120) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_detenteur_matricule (matricule)
) ENGINE=InnoDB;

CREATE INDEX idx_detenteur_lookup ON parc_detenteurs (matricule, direction, service, bureau);

-- ---------------------------------------------------------------------------
-- Équipements
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS parc_equipements (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  numero_inventaire VARCHAR(30) NOT NULL UNIQUE,
  numero_serie VARCHAR(80) NULL UNIQUE,
  type_id TINYINT UNSIGNED NOT NULL,
  marque_id SMALLINT UNSIGNED NOT NULL,
  modele VARCHAR(120) NOT NULL,
  etat_id TINYINT UNSIGNED NOT NULL,
  direction_id SMALLINT UNSIGNED NULL,
  fournisseur_id SMALLINT UNSIGNED NULL,
  date_acquisition DATE NULL,
  date_garantie_fin DATE NULL,
  prix_acquisition DECIMAL(12,2) NULL,
  emplacement_libre VARCHAR(150) NULL COMMENT 'Salle / zone si pas de détenteur',
  notes TEXT NULL,
  created_by INT UNSIGNED NULL,
  updated_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pe_type FOREIGN KEY (type_id) REFERENCES parc_types(id),
  CONSTRAINT fk_pe_marque FOREIGN KEY (marque_id) REFERENCES parc_marques(id),
  CONSTRAINT fk_pe_etat FOREIGN KEY (etat_id) REFERENCES parc_etats(id),
  CONSTRAINT fk_pe_direction FOREIGN KEY (direction_id) REFERENCES parc_directions(id),
  CONSTRAINT fk_pe_fournisseur FOREIGN KEY (fournisseur_id) REFERENCES parc_fournisseurs(id),
  CONSTRAINT fk_pe_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_pe_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE INDEX idx_pe_etat ON parc_equipements(etat_id);
CREATE INDEX idx_pe_direction ON parc_equipements(direction_id);
CREATE INDEX idx_pe_type ON parc_equipements(type_id);

-- ---------------------------------------------------------------------------
-- Affectations & mouvements
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS parc_affectations (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  equipement_id INT UNSIGNED NOT NULL,
  detenteur_id INT UNSIGNED NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NULL,
  est_active TINYINT(1) NOT NULL DEFAULT 1,
  motif VARCHAR(120) NULL,
  created_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pa_equipement FOREIGN KEY (equipement_id) REFERENCES parc_equipements(id) ON DELETE CASCADE,
  CONSTRAINT fk_pa_detenteur FOREIGN KEY (detenteur_id) REFERENCES parc_detenteurs(id),
  CONSTRAINT fk_pa_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE INDEX idx_pa_equipement_active ON parc_affectations(equipement_id, est_active);

CREATE TABLE IF NOT EXISTS parc_mouvements (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  equipement_id INT UNSIGNED NOT NULL,
  actor_user_id INT UNSIGNED NULL,
  event_type VARCHAR(50) NOT NULL,
  payload_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pm_equipement FOREIGN KEY (equipement_id) REFERENCES parc_equipements(id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE INDEX idx_pm_equipement ON parc_mouvements(equipement_id, created_at);

-- ---------------------------------------------------------------------------
-- Lien futur tickets ↔ équipement
-- ---------------------------------------------------------------------------

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'parc_equipement_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE tickets ADD COLUMN parc_equipement_id INT UNSIGNED NULL AFTER category_id,
   ADD CONSTRAINT fk_tickets_parc_equipement FOREIGN KEY (parc_equipement_id) REFERENCES parc_equipements(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
