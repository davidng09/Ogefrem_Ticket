# OGEFREM_Tickets

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

## Stack technique et outils de conception

Outils et technologies utilisés pour **concevoir**, **développer** et **exploiter** l’application en local.

### Conception et design

| Outil / livrable | Rôle |
|------------------|------|
| **Maquettes HTML** (`legacy/`) | Prototypes statiques (portail, directrice, sous-direction, agent) servant de référence visuelle avant migration React. |
| **Design system Stark Precision** (`stark_precision/DESIGN.md`) | Palette, typo Geist, espacements, composants (badges, cartes, boutons) — tokens repris dans Tailwind (`frontend/src/index.css`). |
| **Logo OGEFREM** (`frontend/public/ogefrem_LOGO.png`) | Identité visuelle sur le portail public et les espaces connectés. |

### Backend (API)

| Technologie | Usage |
|-------------|--------|
| **PHP** (natif, sans framework) | API REST, routage dans `api/index.php`, services métier (`TicketService`, `ReportService`, `AuthService`…). |
| **PDO MySQL** | Accès base de données, requêtes paramétrées. |
| **Sessions PHP** | Authentification DANTIC (cookies de session). |
| **Apache** (XAMPP) | Hébergement de l’API sous `http://localhost/Ogefrem/api`. |

### Frontend (interface active)

| Technologie | Version (indicative) | Usage |
|-------------|---------------------|--------|
| **React** | 19 | Composants, état local, contexte auth. |
| **Vite** | 8 | Serveur de dev, build production, HMR. |
| **React Router** | 7 | Routes publiques / protégées par rôle. |
| **Tailwind CSS** | 4 | Styles utilitaires + thème `@theme` (couleurs Stark Precision). |
| **Lucide React** | — | Icônes (cloche, utilisateurs, statuts…). |
| **ESLint** | 10 | Qualité du code JavaScript/JSX. |

### Base de données

| Outil | Usage |
|-------|--------|
| **MySQL / MariaDB** (XAMPP) | Base `ogefrem_ops_hub`, tables tickets, rapports, utilisateurs, notifications. |
| **phpMyAdmin** | Import du schéma, seeds et migrations SQL. |
| **Scripts SQL** (`DataBase/`) | Schéma initial, données de test, migrations datées (`YYYYMMDD_*.sql`). |
| **PHP CLI** (`DataBase/tools/generate_password_hash.php`) | Génération des hash `password_hash()` pour les comptes de test. |

### Environnement et outils de développement

| Outil | Usage |
|-------|--------|
| **XAMPP** | Apache + PHP + MySQL en un seul environnement Windows. |
| **Node.js** (20+) + **npm** | Dépendances et scripts du frontend (`npm run dev`, `npm run build`). |
| **PowerShell** | Commandes locales sous Windows (voir `LANCEMENT.md`). |
| **Git** | Versionnement du dépôt. |
| **Navigateur moderne** | Test du portail (`:5173`) et de l’API (`/api/health`), cookies de session. |

### Démarche de réalisation

1. **Maquettes** HTML statiques pour valider les écrans par rôle.
2. **Design system** documenté puis appliqué en React + Tailwind.
3. **API PHP** branchée sur MySQL, avec workflow tickets / rapports / notifications.
4. **Frontend React** (Vite) consommant l’API via `fetch` et variables d’environnement (`VITE_API_URL`).
5. **Évolutions** incrémentales via migrations SQL (sans modifier le schéma initial déployé).

## Fonctionnement (résumé)

1. **Tout agent OGEFREM** dépose un ticket via le **portail public** (sans mot de passe).
2. Le ticket arrive chez la **Directrice DANTIC**, qui fixe la priorité et l’**escalade** vers une sous-direction :
   - **Infrastructures, Réseaux et Télécoms** (IRT — hardware, réseau, impression…)
   - **Analyse et Développement des Applications** (A&D — logiciels, applications…)
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

Sous **PowerShell** (recommandé sous Windows) :

```powershell
cd c:\xampp\htdocs\Ogefrem\frontend
Copy-Item .env.example .env
npm install
```

> Sous PowerShell, enchaîner les commandes avec `;` (et non `&&`, qui n’est pas supporté par défaut).

Le fichier `frontend/.env` est créé à partir de `.env.example`. Contenu attendu :

```env
VITE_API_URL=http://localhost/Ogefrem/api
VITE_DEV_ROLE_SIMULATOR=true
```

Si vous modifiez `.env`, **arrêtez puis relancez** `npm run dev` pour que Vite prenne en compte les changements.

## 2. Configuration de la base de données

### Étape A — Créer la base et les tables

1. Ouvrir **phpMyAdmin** : http://localhost/phpmyadmin  
2. Onglet **Importer**  
3. Importer dans l’ordre (installation neuve recommandée) :
   - `DataBase/001_schema_complet.sql`
   - `DataBase/002_donnees_dantic.sql`

Ou l’ancienne procédure : `DataBase/schema/001_initial_schema.sql` + migrations.

Si la base existe déjà, importer aussi :
   - `DataBase/migrations/20260606_periodic_reports.sql` (rapports hebdo/mensuels)

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

### Comptes de test (après seed) — organigramme DANTIC

Mot de passe (test) : `Test@2026` (si hash configuré dans le seed).

| Matricule | Profil |
|-----------|--------|
| `DIR-001` | Directrice DANTIC |
| `SDM-001` | Sous-directeur IRT (Infrastructures, Réseaux et Télécoms) |
| `SDA-001` | Sous-directeur A&D (Analyse et Développement des Applications) |
| `CS-IRT-INF-001` | Chef — Service Infrastructure |
| `CSM-001` | Chef — Service Réseaux et Sécurité Informatique |
| `CS-IRT-TEL-001` | Chef — Service Télécoms et Bureautique |
| `CSA-001` | Chef — Service Développement et Suivi des Applications |
| `CS-AD-ACM-001` | Chef — Service Analyse, Conception et Maintenance |
| `CS-AD-LIA-001` | Chef — Service Liaison Partenaires |
| `AG-IRT-INF-001` | Agent — B. Maintenance Informatique |
| `TCM-001` | Agent — B. Réseaux et Help-Desk |
| `AG-IRT-TEL-001` | Agent — B. Télécom et Internet |
| `TCA-001` | Agent — B. Dev des Applications Techniques |
| `AG-AD-ACM-001` | Agent — B. Analyse |
| `AG-AD-LIA-001` | Agent — B. Liaisons Données Partenaires |
| `ADMIN-001` | Super administrateur |

Importer aussi les migrations :
- `DataBase/migrations/20260602_director_reports_refactor.sql`
- `DataBase/migrations/20260604_align_dantic_organigram.sql` (bases déjà existantes)

### Connexion API (optionnel)

Par défaut, l’API utilise :

- Hôte : `127.0.0.1`
- Base : `ogefrem_ops_hub`
- Utilisateur : `root`
- Mot de passe : *(vide sous XAMPP)*

Pour changer, définir les variables d’environnement système ou Apache : `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (voir `api/config/database.php`).

## 3. Démarrer l’application

L’app repose sur **deux services** en développement local :

| Service | Rôle | URL |
|---------|------|-----|
| **XAMPP** (Apache + MySQL) | API PHP + base de données | http://localhost/Ogefrem/api |
| **Vite** (`npm run dev`) | Interface React | http://localhost:5173/ |

### Démarrage rapide (checklist)

1. **XAMPP** — Démarrer **Apache** et **MySQL** dans le panneau de contrôle.
2. **Base** — Schéma + seed importés dans phpMyAdmin (section 2), si ce n’est pas déjà fait.
3. **API** — Vérifier que l’endpoint health répond (étape B ci-dessous).
4. **Frontend** — `Copy-Item .env.example .env`, puis `npm install` (section 1), puis `npm run dev` (étape C).
5. **Navigateur** — Ouvrir http://localhost:5173/

### A. Apache + MySQL (XAMPP)

1. Lancer le **XAMPP Control Panel**
2. Démarrer **Apache** et **MySQL**

Sans Apache, l’API et le login DANTIC ne fonctionnent pas. Sans MySQL, les tickets et comptes ne sont pas accessibles.

### B. Vérifier l’API

**Navigateur** : http://localhost/Ogefrem/api/health  

Réponse attendue : `{"ok":true,"service":"OGEFREM Ops Hub API"}`

**PowerShell** (contrôle en ligne de commande) :

```powershell
Invoke-WebRequest -Uri "http://localhost/Ogefrem/api/health" -UseBasicParsing
```

Si vous obtenez une 404, vérifier que `mod_rewrite` est activé dans Apache et que `api/.htaccess` est présent.

### C. Lancer le frontend (développement)

Dans un **terminal PowerShell dédié** (laisser la fenêtre ouverte tant que vous développez) :

```powershell
cd c:\xampp\htdocs\Ogefrem\frontend
npm run dev
```

Quand Vite est prêt, la console affiche par exemple :

```text
  ➜  Local:   http://localhost:5173/
```

Ouvrir : **http://localhost:5173/**

> Le frontend en dev appelle l’API sur `http://localhost/Ogefrem/api` (cookies de session inclus).  
> **Important** : ne fermez pas le terminal où tourne `npm run dev` — l’arrêt du processus coupe l’interface React (le message « ready » disparaît et le port 5173 n’est plus servi).

Pour arrêter le frontend : `Ctrl+C` dans ce terminal.

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
  - `/app/agent` — Agent (technicien terrain)
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

### Migrations récentes

- `DataBase/migrations/20260602_director_reports_refactor.sql` — rapports ticket, `rapports_valides`, visibilité directrice 48h.
- `DataBase/migrations/20260606_periodic_reports.sql` — rapports hebdomadaires, bundles mensuels agents, rapports mensuels SD, archives agent.

Install neuve : tout est inclus dans `001_schema_complet.sql`.

## 6. Workflow directrice (résumé)

Interface par **onglets** :

1. **Tickets reçus** — priorité, échéance et sous-direction validées en une action.
2. **Tickets en cours** — suivi des affectations ; bouton **Voir rapport** si le sous-directeur a remonté un rapport ticket.
3. **Rapports ticket** — validation ou rejet par la directrice.
4. **Rapports mensuels** — lecture, téléchargement, commentaire ; **Conserver** (archive) ou **Supprimer** (suppression logique). Filtres sous-direction et mois.
5. **Archives** — rapports mensuels archivés + rapports ticket validés (`rapports_valides`).

Les tickets disparaissent de la vue directrice après **48 h** (`DIRECTOR_VISIBILITY_HOURS`) ; les rapports ticket validés restent archivés.

Tri par défaut des tickets : **Bloquant → Haute → Normale**, puis date d'émission.

## 7. Workflow des rapports (toute la hiérarchie)

| Niveau | Valider → | Rejeter → (commentaire obligatoire) |
|--------|-----------|-------------------------------------|
| Chef de service | Sous-directeur | Agent |
| Sous-directeur | Directrice | Chef de service |
| Directrice | Archive `rapports_valides` | Sous-directeur |

- Le ticket reste **résolu** ; l’agent soumet une **nouvelle version** du rapport après correction.
- Interface **chef** : 3 volets (tickets reçus / affectés / validation rapports), agents filtrés par **même service** DANTIC.

### Tests manuels rapides (`Test@2026`)

1. `DIR-001` → affecte à `SDM-001` → `SDM-001` transmet à `CS-IRT-INF-001` → chef assigne `AG-IRT-INF-001`.
2. Agent résout + rapport → chef valide → SD valide → directrice valide (archive).
3. Rejet chef → agent corrige (nouvelle version) → remontée.
4. Rejet SD → chef → agent → remontée.
5. Rejet directrice → SD → chef → agent si besoin.
6. Chef `CS-IRT-INF-001` : la liste d’agents ne doit **pas** contenir `TCM-001` (autre service).

## 8. Branding, verrous, agent et cycle mensuel

- **En-tête** : logo `ogefrem_LOGO.png` + libellé **OGEFREM Tickets** (portail public et espaces connectés).
- **Portail public** : cloche (tickets soumis en `sessionStorage`), icône connexion → modal DANTIC (logo + champs Identifiant / Mot de passe).
- **Verrous « Modifier »** : chef uniquement si `assigne_technicien` ; sous-directeur / directrice uniquement si `chez_sous_direction`. API : `assign`, `forward-to-chef`, `assign-sub-directorate` renvoient 422 si verrou actif.
- **Agent** : 3 volets (affectés / résolus par semaine lun–ven / historique) ; rapports hebdomadaires (rappel vendredi) ; envoi fin de mois au collègue rédacteur ; archivage auto le 1er du mois si bundle envoyé.
- **Rédacteur mensuel** : inbox des bundles agents, upload PDF/Word vers la directrice (2 rapports max par mois : IRT + A&D).
- **Filtres v1** : priorité/date (tickets) ; semaine + priorité (agent résolus) ; service + statut (SD) ; statut (chef) ; sous-direction + mois (rapports mensuels directrice).

## Dépannage rapide

| Problème | Piste de solution |
|----------|-------------------|
| Erreur connexion base | MySQL démarré ? Base `ogefrem_ops_hub` importée ? |
| Login échoue | Hash `@test_hash` bien remplacé dans le seed ? Seed réimporté après modification ? |
| API 404 ou inaccessible | Apache démarré dans XAMPP ? Tester http://localhost/Ogefrem/api/health |
| Page http://localhost:5173/ inaccessible | Relancer `npm run dev` dans `frontend/` (terminal ouvert) |
| Frontend n’appelle pas l’API | Fichier `frontend/.env` présent ? `VITE_API_URL=http://localhost/Ogefrem/api` puis redémarrer Vite |
| CORS / session | Utiliser `npm run dev` ; l’API autorise les credentials depuis l’origine du navigateur |
| `&&` invalide en PowerShell | Utiliser `;` entre les commandes, ou une commande par ligne |

## Documentation complémentaire

- Guide collègues (PDF via impression) : [docs/GUIDE_OGEFREM.md](docs/GUIDE_OGEFREM.md)

- API : [api/README.md](api/README.md)  
- Frontend : [frontend/README.md](frontend/README.md)  
- Base de données : [DataBase/README.md](DataBase/README.md)  
- Maquettes : [legacy/README.md](legacy/README.md)  
- Design : [stark_precision/DESIGN.md](stark_precision/DESIGN.md)
