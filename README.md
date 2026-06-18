# 🏅 COG Archive — Comité Olympique Gabonais
## Système d'Archivage Numérique

**Stack :** Node.js · Express · EJS · MySQL · Sequelize · Socket.io

---

## 📋 PRÉREQUIS

- **Node.js** v18+
- **npm** v9+
- **MySQL** 8.0+ ou **MariaDB** 10.6+ (local ou distant)

---

## 🚀 INSTALLATION

### 1. Extraire le ZIP et installer les dépendances
```bash
unzip cog-archive.zip
cd cog-archive
npm install
```

### 2. Créer la base de données MySQL
```sql
CREATE DATABASE cog_archive CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> Vous pouvez aussi exécuter `database/schema-reference.sql` à titre de référence/documentation, mais ce n'est **pas obligatoire** : l'application crée et synchronise automatiquement toutes les tables au démarrage grâce à Sequelize.

### 3. Configurer le fichier `.env`
```env
PORT=3000
SESSION_SECRET=changez_cette_cle_secrete

DB_HOST=localhost
DB_PORT=3306
DB_NAME=cog_archive
DB_USER=root
DB_PASSWORD=votre_mot_de_passe_mysql
```

### 4. Initialiser les données de base (catégories, services, super admin)
```bash
npm run seed
```
Ce script :
- synchronise les tables (les crée si elles n'existent pas)
- insère les catégories et services par défaut
- crée le compte super administrateur

### 5. Démarrer l'application
```bash
npm start
```

L'application est accessible sur → **http://localhost:3000**

---

## 🔐 CONNEXION INITIALE

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| `admin@cog-gabon.ga` | `Admin2024!` | Super Admin |

> ⚠️ **Changez le mot de passe** après la première connexion (menu profil → Changer le mot de passe).

---

## 👤 RÔLES UTILISATEURS

| Rôle | Accès |
|------|-------|
| **Super Admin** | Accès complet (CRUD archives, utilisateurs, paramètres) |
| **Archiviste** | Gestion des archives (création, modification, suppression) |
| **Consultation** | Lecture seule. N'a pas accès aux documents classés "secret" |

---

## 📦 FONCTIONNALITÉS

### Archives
- ✅ CRUD complet (Créer, Lire, Modifier, Supprimer)
- ✅ QR Code unique généré par archive
- ✅ Upload multi-fichiers (PDF, DOCX, XLSX, JPG, PNG)
- ✅ Suppression et téléchargement de pièces jointes individuelles (journalisés)
- ✅ Corbeille avec restauration et suppression définitive
- ✅ Export PDF (fiche individuelle + liste globale), Excel, CSV
- ✅ Recherche avancée multi-critères
- ✅ Restriction de confidentialité par rôle

### Boîte de réception
- ✅ Vue dédiée aux courriers entrants avec compteurs par type
- ✅ Action "Marquer comme traité"

### Dashboard
- ✅ Statistiques en temps réel
- ✅ Graphiques (archives par mois, par catégorie) via Chart.js
- ✅ Activités récentes

### Profil utilisateur
- ✅ Page dédiée avec statistiques personnelles
- ✅ Modification des informations personnelles
- ✅ Historique de ses propres actions

### Sécurité
- ✅ Authentification sécurisée (bcrypt)
- ✅ Sessions Express
- ✅ Contrôle d'accès par rôle (RBAC)
- ✅ Journal d'audit complet (connexion, ajout, modification, suppression, téléchargement, export...)

### Notifications
- ✅ Notifications en temps réel (Socket.io) déclenchées à la création/modification d'archives
- ✅ Panel de notifications avec marquage lu/non lu

---

## 🗂️ STRUCTURE DU PROJET

```
cog-archive/
├── database/
│   └── schema-reference.sql   # Schéma SQL de référence (non obligatoire)
├── public/
│   ├── css/main.css            # Styles (Charte COG: Bleu, Blanc, Vert, Jaune · Poppins)
│   ├── js/main.js              # JavaScript client
│   └── uploads/                # Fichiers uploadés
├── src/
│   ├── app.js                  # Point d'entrée serveur
│   ├── config/
│   │   └── database.js         # Connexion Sequelize / MySQL
│   ├── models/                 # Modèles Sequelize + associations
│   │   ├── User.js
│   │   ├── Categorie.js
│   │   ├── Service.js
│   │   ├── Archive.js
│   │   ├── Fichier.js
│   │   ├── Historique.js
│   │   ├── Notification.js
│   │   └── index.js             # Associations entre modèles
│   ├── seeders/
│   │   └── seed.js              # Initialisation données de base
│   ├── middleware/
│   │   └── auth.js              # Auth, RBAC, journalisation
│   └── routes/
│       ├── auth.js              # Login, logout, mot de passe
│       ├── archives.js          # CRUD archives, export, QR, fichiers
│       ├── dashboard.js         # Statistiques
│       ├── inbox.js             # Boîte de réception
│       ├── users.js             # Gestion utilisateurs
│       ├── historique.js        # Journal d'activité
│       ├── settings.js          # Catégories & services
│       └── profile.js           # Profil utilisateur connecté
└── views/
    ├── partials/                # Header & Footer EJS
    ├── auth/                    # Login, mot de passe
    ├── dashboard/                # Tableau de bord
    ├── archives/                 # Liste, détail, formulaire, corbeille, recherche
    ├── inbox/                    # Boîte de réception
    ├── users/                    # Gestion utilisateurs
    ├── historique/                # Journal activité
    ├── settings/                  # Catégories & services
    └── profile/                   # Profil utilisateur
```

---

## 🗃️ MODÈLE DE DONNÉES (Sequelize)

| Modèle | Table | Description |
|--------|-------|--------------|
| `User` | `users` | Utilisateurs et leurs rôles |
| `Categorie` | `categories` | Catégories de documents |
| `Service` | `services` | Services/départements du COG |
| `Archive` | `archives` | Document archivé (entité centrale) |
| `Fichier` | `fichiers` | Pièces jointes d'une archive |
| `Historique` | `historique` | Journal d'audit |
| `Notification` | `notifications` | Notifications utilisateur |

**Associations principales :**
- `Archive belongsTo Categorie` (alias: `categorie`)
- `Archive belongsTo Service` (alias: `service`)
- `Archive belongsTo User` (alias: `createur`, `modificateur`)
- `Archive hasMany Fichier` (alias: `fichiers`, cascade delete)
- `Historique belongsTo User` (alias: `utilisateur`)
- `Notification belongsTo User` (alias: `utilisateur`)

> ⚠️ Si vous modifiez les vues EJS, gardez à l'esprit ces alias **singuliers** (`archive.categorie`, pas `archive.categories`).

---

## 🎨 CHARTE GRAPHIQUE

| Couleur | Code HEX | Usage |
|---------|----------|-------|
| Bleu COG | `#0057A8` | Couleur principale, sidebar |
| Vert | `#009A44` | Succès, documents actifs |
| Jaune | `#F4C300` | Accents, logo, avertissements |
| Blanc | `#FFFFFF` | Fond, texte sur bleu |

**Police :** Poppins (Google Fonts)

---

## 🛠️ DÉVELOPPEMENT

```bash
npm run dev     # Démarrage avec rechargement automatique (nodemon)
npm run seed    # Réinitialiser/compléter les données de base
```

### Variables d'environnement disponibles

| Variable | Description | Défaut |
|----------|--------------|--------|
| `PORT` | Port du serveur Express | `3000` |
| `SESSION_SECRET` | Clé de signature des sessions | — |
| `DB_HOST` | Hôte MySQL | `localhost` |
| `DB_PORT` | Port MySQL | `3306` |
| `DB_NAME` | Nom de la base | `cog_archive` |
| `DB_USER` | Utilisateur MySQL | `root` |
| `DB_PASSWORD` | Mot de passe MySQL | — |

---

## ⚠️ Notes de déploiement

- En production, désactivez `sequelize.sync({ alter: false })` et migrez plutôt vers de vraies migrations Sequelize (`sequelize-cli`) pour éviter toute perte de données accidentelle.
- Le champ `tags` est stocké en CSV (`VARCHAR(1000)`) avec un getter/setter Sequelize qui le convertit automatiquement en tableau JavaScript. Ne modifiez pas cette colonne manuellement en SQL brut sans respecter ce format.
- Pensez à sauvegarder régulièrement le dossier `public/uploads/` (fichiers physiques), qui n'est pas inclus dans les sauvegardes de la base de données.

---

## 📄 LICENCE
© 2024 Comité Olympique Gabonais — Tous droits réservés
