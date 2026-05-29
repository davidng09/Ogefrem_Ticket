# OGEFREM Ops Hub

Application web de **gestion des tickets IT** pour l’OGEFREM (pannes matérielles, logicielles, réseau).  
La **Direction DANTIC** traite les signalements selon une hiérarchie : Responsable DANTIC → sous-directions → chefs de service → techniciens.

## Architecture du projet

```text
Ogefrem/
├── api/                 # Backend PHP (REST + sessions)
├── frontend/            # Application React (interface active)
├── DataBase/            # Schéma SQL, seeds, migrations
├── legacy/              # Maquettes HTML de référence (statiques)
├── stark_precision/     # Design system (couleurs, typo)
├── index.html           # Page d’accueil locale (liens utiles)
└── README.md            # Ce fichier
```

| Dossier | Rôle |
|---------|------|
| **`api/`** | API PHP : authentification DANTIC, tickets, rapports, notifications, admin. Point d’entrée : `api/index.php`. |
| **`frontend/`** | Interface React + Vite + Tailwind. Portail public, dashboards par rôle, simulateur de rôles (dev). |
| **`DataBase/`** | Scripts MySQL/MariaDB : création de la base `ogefrem_ops_hub`, comptes de test, migrations futures. |
| **`legacy/`** | Anciennes maquettes HTML (non branchées à l’API). Utiles pour comparer le design. |
| **`stark_precision/`** | Documentation du design system « Stark Precision ». |

## Fonctionnement (résumé)

1. **Tout agent OGEFREM** dépose un ticket via le **portail public** (sans mot de passe).
2. Le ticket arrive chez la **Responsable DANTIC**, qui fixe la priorité et l’**escalade** vers une sous-direction :
   - Maintenance et Réseau (hardware, réseau, impression…)
   - Analyse et Développement (logiciels, applications…)
3. Le **sous-directeur** transmet au **chef de service**, qui **assigne** un **technicien**.
4. Le technicien **prend en charge**, rédige un **rapport** et marque le ticket **résolu** (clôture immédiate).
5. Le rapport remonte la hiérarchie (chef → sous-directeur → direction) avec validation ou rejet (notifications in-app).

## Prérequis

Installer sur la machine de développement :

| Outil | Version conseillée | Usage |
|-------|-------------------|--------|
| [XAMPP](https://www.apachefriends.org/) | Dernière stable | Apache + PHP + MySQL/MariaDB |
| [Node.js](https://nodejs.org/) | 20+ LTS | Frontend React (`npm`) |
| [Git](https://git-scm.com/) | Optionnel | Versionnement |

Vérifier que ces services tournent dans XAMPP :

- **Apache**
- **MySQL** (ou MariaDB)

Extensions PHP utiles (souvent déjà activées dans XAMPP) : `pdo_mysql`, `json`, `session`.

## 1. Installation du projet

Cloner ou copier le projet dans le dossier web XAMPP :

```text
c:\xampp\htdocs\Ogefrem
```

URL de base : **http://localhost/Ogefrem/**

### Frontend (Node)

```powershell
cd c:\xampp\htdocs\Ogefrem\frontend
copy .env.example .env
npm install
```

Fichier `frontend/.env` :

```env
VITE_API_URL=http://localhost/Ogefrem/api
VITE_DEV_ROLE_SIMULATOR=true
```

## 2. Configuration de la base de données

### Étape A — Créer la base et les tables

1. Ouvrir **phpMyAdmin** : http://localhost/phpmyadmin  
2. Onglet **Importer**  
3. Importer dans l’ordre :
   - `DataBase/schema/001_initial_schema.sql`

### Étape B — Mot de passe des comptes de test

Tous les comptes seed partagent le même mot de passe de test (ex. `Test@2026`).

Générer le hash :

```powershell
cd c:\xampp\htdocs\Ogefrem
php DataBase\tools\generate_password_hash.php "Test@2026"
```

Copier la sortie (chaîne commençant par `$2y$...`) et la coller dans `DataBase/seeds/002_seed_roles_users.sql` à la place de :

```sql
SET @test_hash = '$2y$10$replace_me_with_php_hash';
```

### Étape C — Importer les données de test

Dans phpMyAdmin, importer :

- `DataBase/seeds/002_seed_roles_users.sql`

### Comptes de test (après seed)

| Matricule | Rôle |
|-----------|------|
| `DIR-001` | Responsable DANTIC |
| `SDM-001` | Sous-directeur Maintenance & Réseau |
| `SDA-001` | Sous-directeur Analyse & Développement |
| `CSM-001` | Chef de service (Maintenance) |
| `CSA-001` | Chef de service (Analyse) |
| `TCM-001` | Technicien (Maintenance) |
| `TCA-001` | Technicien (Analyse) |
| `ADMIN-001` | Super administrateur |

Mot de passe (test) : celui utilisé pour générer le hash (ex. `Test@2026`).

### Connexion API (optionnel)

Par défaut, l’API utilise :

- Hôte : `127.0.0.1`
- Base : `ogefrem_ops_hub`
- Utilisateur : `root`
- Mot de passe : *(vide sous XAMPP)*

Pour changer, définir les variables d’environnement système ou Apache : `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (voir `api/config/database.php`).

## 3. Démarrer les serveurs

### A. Apache + MySQL (XAMPP)

1. Lancer le **XAMPP Control Panel**
2. Démarrer **Apache** et **MySQL**

### B. Vérifier l’API

Ouvrir dans le navigateur :

- http://localhost/Ogefrem/api/health  

Réponse attendue : `{"ok":true,"service":"OGEFREM Ops Hub API"}`

Si vous obtenez une 404, vérifier que `mod_rewrite` est activé dans Apache et que `api/.htaccess` est présent.

### C. Lancer le frontend (développement)

```powershell
cd c:\xampp\htdocs\Ogefrem\frontend
npm run dev
```

Ouvrir : **http://localhost:5173/**

> Le frontend en dev appelle l’API sur `http://localhost/Ogefrem/api` (cookies de session inclus).

### D. Build production (optionnel)

```powershell
cd c:\xampp\htdocs\Ogefrem\frontend
npm run build
```

Les fichiers statiques sont dans `frontend/dist/`.  
Vous pouvez les servir via Apache (virtual host ou sous-dossier) ou continuer à utiliser `npm run dev` en local.

## 4. Utiliser l’application

### Portail public

- URL (dev) : http://localhost:5173/  
- Soumettre un ticket : formulaire gauche (nom, matricule, direction, service, bureau, catégorie, description).  
- **Pas de suivi** après soumission en V1.

### Connexion DANTIC

- Formulaire droit sur la page d’accueil : matricule + mot de passe.  
- Redirection automatique selon le rôle :
  - `/app/directeur` — Responsable DANTIC
  - `/app/sous-direction` — Sous-directeur ou chef de service
  - `/app/technicien` — Technicien
  - `/app/admin` — Super admin

### Simulateur de rôles (développement)

Si `VITE_DEV_ROLE_SIMULATOR=true`, un menu en haut permet de prévisualiser les écrans sans changer de compte.

### Maquettes HTML (référence uniquement)

- http://localhost/Ogefrem/legacy/login.html  
- http://localhost/Ogefrem/legacy/directeur.html  
- http://localhost/Ogefrem/legacy/sous-direction.html  
- http://localhost/Ogefrem/legacy/agent.html  

Voir aussi : http://localhost/Ogefrem/index.html (liens rapides).

## 5. Migrations SQL ultérieures

Ne pas modifier `DataBase/schema/001_initial_schema.sql` après mise en production.

Ajouter chaque changement dans :

```text
DataBase/migrations/YYYYMMDD_description.sql
```

Convention détaillée : `DataBase/migrations/README.md`.

## Dépannage rapide

| Problème | Piste de solution |
|----------|-------------------|
| Erreur connexion base | MySQL démarré ? Base `ogefrem_ops_hub` importée ? |
| Login échoue | Hash `@test_hash` bien remplacé dans le seed ? |
| API 404 | Apache + `api/.htaccess` + test `/api/health` |
| Frontend n’appelle pas l’API | Vérifier `frontend/.env` → `VITE_API_URL` |
| CORS / session | Utiliser `npm run dev` ; l’API autorise les credentials depuis l’origine du navigateur |

## Documentation complémentaire

- API : [api/README.md](api/README.md)  
- Frontend : [frontend/README.md](frontend/README.md)  
- Base de données : [DataBase/README.md](DataBase/README.md)  
- Maquettes : [legacy/README.md](legacy/README.md)  
- Design : [stark_precision/DESIGN.md](stark_precision/DESIGN.md)
