-- ============================================================
-- COG ARCHIVE - Schéma de référence MySQL
-- Comité Olympique Gabonais - Système d'Archivage Numérique
-- ============================================================
-- NOTE IMPORTANTE : Ce fichier est fourni à TITRE DE RÉFÉRENCE
-- uniquement. L'application crée et synchronise automatiquement
-- ces tables au démarrage via Sequelize (sequelize.sync()).
-- Vous n'avez PAS besoin d'exécuter ce script manuellement.
--
-- Il reste utile si vous voulez :
--   - inspecter la structure exacte des tables
--   - créer la base sur un serveur où vous n'avez pas accès Node
--   - documenter le schéma pour une revue technique
-- ============================================================

CREATE DATABASE IF NOT EXISTS cog_archive
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cog_archive;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'archiviste', 'consultation') NOT NULL DEFAULT 'consultation',
  service VARCHAR(100),
  avatar VARCHAR(255),
  actif BOOLEAN DEFAULT true,
  derniere_connexion DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: categories
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id CHAR(36) PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  description TEXT,
  couleur VARCHAR(7) DEFAULT '#0057A8',
  icone VARCHAR(50),
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: services
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id CHAR(36) PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  description TEXT,
  responsable VARCHAR(200),
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: archives
-- ============================================================
CREATE TABLE IF NOT EXISTS archives (
  id CHAR(36) PRIMARY KEY,
  reference VARCHAR(50) UNIQUE NOT NULL,
  titre VARCHAR(255) NOT NULL,
  description TEXT,
  categorie_id CHAR(36),
  service_id CHAR(36),
  type_document ENUM('entrant', 'sortant', 'interne') DEFAULT 'interne',
  confidentialite ENUM('public', 'normal', 'confidentiel', 'secret') DEFAULT 'normal',
  statut ENUM('actif', 'archive', 'supprime', 'corbeille') DEFAULT 'actif',
  date_document DATE,
  date_reception DATE,
  expediteur VARCHAR(255),
  destinataire VARCHAR(255),
  tags VARCHAR(1000),
  qr_code LONGTEXT,
  created_by CHAR(36),
  updated_by CHAR(36),
  deleted_at DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  FOREIGN KEY (categorie_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_reference (reference),
  INDEX idx_titre (titre),
  INDEX idx_statut (statut),
  INDEX idx_created_at (created_at),
  INDEX idx_categorie (categorie_id),
  INDEX idx_service (service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: fichiers (pièces jointes)
-- ============================================================
CREATE TABLE IF NOT EXISTS fichiers (
  id CHAR(36) PRIMARY KEY,
  archive_id CHAR(36) NOT NULL,
  nom_original VARCHAR(255) NOT NULL,
  nom_stockage VARCHAR(255) NOT NULL,
  chemin VARCHAR(500) NOT NULL,
  type_mime VARCHAR(100),
  taille BIGINT,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (archive_id) REFERENCES archives(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: historique (journal d'activité)
-- ============================================================
CREATE TABLE IF NOT EXISTS historique (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36),
  action ENUM('connexion','deconnexion','ajout','modification','suppression','restauration','telechargement','consultation','export') NOT NULL,
  entite VARCHAR(50),
  entite_id CHAR(36),
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_created (created_at),
  INDEX idx_entite_id (entite_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  titre VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','succes','avertissement','erreur') DEFAULT 'info',
  lue BOOLEAN DEFAULT false,
  lien VARCHAR(500),
  created_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
