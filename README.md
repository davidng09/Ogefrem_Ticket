# OGEFREM Tickets

Application web de gestion des tickets IT pour l’OGEFREM. La **DANTIC** traite les signalements : chefs de service, agents, validation hiérarchique des rapports, rapports périodiques.

**Stack :** React (Vite) + API PHP (sessions) + MySQL `ogefrem_ops_hub`.

---

## Structure du projet

```text
Ogefrem/
├── api/                          # Backend REST PHP (sessions, PDO)
│   ├── .htaccess                 # Routage vers index.php
│   ├── index.php                 # Point d'entrée unique
│   ├── config/
│   │   ├── bootstrap.php         # Sessions, CORS, en-têtes sécurité
│   │   └── database.php          # Connexion MySQL (variables d'environnement)
│   ├── middleware/
│   │   ├── AuthMiddleware.php    # requireAuth, requireRoles
│   │   ├── SecurityMiddleware.php# Expiration session, politique MDP, honeypot
│   │   └── RateLimitMiddleware.php
│   ├── routes/                   # auth, tickets, reports, periodic_reports, admin…
│   ├── services/                 # Logique métier (Ticket, Report, Auth, Admin…)
│   ├── helpers/                  # Response JSON, calendrier
│   └── storage/                  # Fichiers uploadés (accès HTTP bloqué)
│       ├── .htaccess             # Require all denied
│       └── monthly_reports/      # PDF mensuels sous-direction
│
├── frontend/                     # Interface React (Vite)
│   ├── src/
│   │   ├── App.jsx               # Routes publiques + espaces DANTIC
│   │   ├── main.jsx
│   │   ├── index.css
│   │   └── app/
│   │       ├── AuthContext.jsx   # Session utilisateur
│   │       ├── ProtectedRoute.jsx# Garde + ChangePasswordGate
│   │       ├── ChangePasswordGate.jsx  # Modale 1ère connexion
│   │       ├── api.js            # Client HTTP vers l'API
│   │       ├── components/       # UI réutilisable (modales, tableaux, KPI…)
│   │       ├── hooks/            # useTickets, usePresence, filtres…
│   │       ├── public/           # Portail public + connexion DANTIC
│   │       ├── utils/            # passwordPolicy, calendrier…
│   │       └── workspaces/       # Agent, SD, directrice, admin
│   ├── .env.example
│   └── package.json
│
├── DataBase/                     # Scripts SQL
│   ├── schema.sql                # Schéma complet (installation neuve)
│   ├── seed.sql                  # Rôles, organigramme DANTIC, comptes test
│   ├── seed_demo.sql             # Tickets, rapports, périodiques de démo
│   ├── migrations_up.sql         # Migration cumulative (base existante)
│   └── tools/
│       └── generate_password_hash.php
│
├── README.md
└── ogefrem_LOGO.png
```

> **Note :** les dossiers `DataBase/migrations/`, `DataBase/seeds/` et `DataBase/schema/` sont des reliquats historiques. Pour toute installation ou mise à jour, utiliser uniquement les quatre fichiers SQL à la racine de `DataBase/`.

---

## Installation

### Prérequis

- XAMPP (Apache + MySQL)
- Node.js 20+
- Projet dans `c:\xampp\htdocs\Ogefrem`

### Base de données (nouvelle installation)

```powershell
mysql -u root < DataBase\schema.sql
mysql -u root ogefrem_ops_hub < DataBase\seed.sql
mysql -u root ogefrem_ops_hub < DataBase\seed_demo.sql
```

### Base de données (mise à jour d'une base existante)

```powershell
mysql -u root ogefrem_ops_hub < DataBase\migrations_up.sql
```

Mot de passe comptes test : **`Test@2026`**

### Frontend

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

| URL | Rôle |
|-----|------|
| http://localhost:5173/ | Portail public |
| http://localhost:5173/app/agent | Agents / chefs de bureau |
| http://localhost:5173/app/sous-direction | Chefs de service / sous-directeurs |
| http://localhost:5173/app/directeur | Directrice |
| http://localhost:5173/app/admin | Super admin |
| http://localhost/Ogefrem/api/health | Health check API |

`.env` : `VITE_API_URL=http://localhost/Ogefrem/api`

---

## Workflow tickets (règles métier)

### Entrée

1. Tout agent OGEFREM dépose un ticket via le **portail public** (catégorie **obligatoire**).
2. Routage automatique → **TOUS LES TICKETS** (visible par **tous** les chefs de service DANTIC).
3. Un chef **prend** le ticket : **priorité obligatoire**, SLA optionnel → ticket en **file du service**.
4. Agent ou chef de bureau **prend la main** (priorité déjà fixée par le chef).

### Prise en charge et clôture

- **Prendre en charge** → statut `en_cours`, zone rapport visible.
- Boutons **Résolu** / **Non résolu** → clôture + soumission du rapport (un seul rapport de validation par ticket, contenu libre).
- **Non résolu** : le rapport décrit contraintes, dépendances, éléments bloquants (visible en validation et futur onglet SD/Directrice).

### Priorité / SLA (scénarios)

| Situation | Règle |
|-----------|--------|
| Claim chef (TOUS LES TICKETS) | Priorité obligatoire, SLA optionnel |
| Assignation agent | Priorité/SLA modifiables |
| Ticket assigné, pas encore `en_cours` | Chef peut modifier priorité/SLA et réaffecter |
| Ticket `en_cours` | Chef ne modifie plus priorité/SLA |
| File du service | Priorité déjà fixée au claim chef |
| Réouverture `non_resolu` | Priorité conservée, SLA remis à zéro ; croix → retour file avec même priorité |

### Tickets clôturés ↔ Historique (agent)

| Étape | Vue agent |
|-------|-----------|
| Clôture (résolu ou non résolu) | **Tickets clôturés** |
| Chef valide le rapport | **Historique** (co-intervenants inclus) |
| Rejet SD sur ticket **résolu** | Reste en **historique** jusqu’au rejet chef vers l’agent |
| Rejet SD sur ticket **non_resolu** | **Tickets clôturés** → réouverture directe |
| Rejet chef (résolu) | **Tickets clôturés** → correction rapport |
| Rejet directrice | Passe d’abord par la **sous-direction** |

Pas de date limite de correction. Pas d’archivage auto au 1er du mois côté tickets.

Date de référence dans l’**historique agent** : **date de clôture**.

### Validation des rapports

Chaîne : **Chef de service** → **Sous-directeur** → **Directrice** → archive `rapports_valides`.

Réouverture d’un ticket : **nouveau rapport**, nouvelle chaîne complète.

### Co-intervention

- Lecture + notifications pour le co-intervenant.
- Invitation **expirée après 2 minutes** si non acceptée (suppression auto).
- Transfert ou remise en file : co-interventions **supprimées**.
- Un agent ne peut pas être assigné principal **et** co-intervenant sur le même ticket (sauf transfert chef de bureau vers un co-intervenant → il devient assigné).
- Seul l’agent **en charge** (ou chef de bureau en charge) peut inviter.

### Chef de bureau

Comme un technicien + **transfert** d’un ticket pris en charge vers un autre agent.

### Rôles pilotage

| Rôle | Tickets | Rapports ticket | Rapports mensuels |
|------|---------|-----------------|-------------------|
| Directrice | Consultation | Validation / rejet | Validation, commentaire, archivage |
| Sous-directeur | SD uniquement, consultation | Validation / rejet | Commentaire (pas de rejet PDF) |
| Chef de service | Opérationnel | Validation / rejet | Consultation bundles + commentaire |

---

## Rapports périodiques

### Hebdomadaires

- Rédaction par semaine ; pas de rappel vendredi obligatoire si aucun ticket traité.
- Notifications / animations si aucune résolution sur la période (à enrichir).

### Mensuels individuels (agents)

- Chaque agent envoie la concaténation de ses hebdos à un **collègue choisi librement** (pas de désignation système).
- Recommandé que le destinataire reçoive tous les envois ; le système peut signaler les manquants (à implémenter).

### Rapport mensuel PDF (sous-direction)

- Un **seul PDF officiel** par sous-direction et par mois.
- Upload par **agents et chefs de bureau** uniquement.
- Destinataire principal : **directrice** ; envoi optionnel au SD/chef pour commentaires.
- SD : commentaire seulement. Directrice : valide (archive) ou rejette → **agent rapporteur**.

### Bundles mensuels (chef de service)

- Consultation + **commentaire** (pas de validation bloquante).

---

## Sécurité et accès

### Changement de mot de passe à la première connexion (espace DANTIC)

Flux pour **tous les rôles** staff (directrice, sous-directeurs, chefs de service, agents, chefs de bureau) :

1. L'**admin** crée le compte via `/app/admin` avec un **mot de passe initial**.
2. Le compte est enregistré avec `must_change_password = 1` en base.
3. À la **première connexion** dans l'espace DANTIC (`/app/...`), une **fenêtre modale bloquante** s'affiche (impossible de fermer ou d'accéder aux tickets).
4. L'utilisateur saisit le mot de passe temporaire, puis un **nouveau mot de passe** conforme à la politique.
5. Après validation (`POST /auth/change-password`), le flag passe à `0` et l'accès est débloqué.

Le même mécanisme s'applique après une **réinitialisation de mot de passe** par l'admin.

**Politique mot de passe :** 8 caractères minimum, au moins une **majuscule**, une **minuscule**, un **chiffre** et un **caractère spécial**.

Les comptes de démo (`seed.sql`) ont `must_change_password = 0` pour faciliter les tests avec `Test@2026`.

### Mesures de sécurité implémentées

| Mesure | Détail |
|--------|--------|
| **Sessions** | Cookie `HttpOnly`, `SameSite=Lax`, `Secure` si HTTPS (`APP_HTTPS=1`) |
| **Expiration session** | Inactivité 60 min par défaut (`SESSION_IDLE_SECONDS`) |
| **1er login / reset MDP** | `must_change_password` bloque l'API + modale frontend obligatoire |
| **Politique mot de passe** | 8 car. min., majuscule, minuscule, chiffre, caractère spécial |
| **Rate limiting** | Login, changement MDP, soumission publique, suivi public |
| **Suivi public** | Token secret 64 car. — accès refusé sans token valide |
| **Honeypot portail** | Champ invisible `_hp_website` — rejette les soumissions bots |
| **Validation champs publics** | Longueurs max. côté serveur sur tous les champs ticket |
| **Upload PDF** | Taille max 10 Mo, extension + MIME, nom stocké aléatoire |
| **Stockage fichiers** | `api/storage/` protégé par `.htaccess` (`Require all denied`) ; téléchargement via API authentifiée uniquement |
| **Autorisation rapports** | `assertUserCanViewTicketReports` par rôle et périmètre |
| **RBAC** | `requireRoles` sur chaque endpoint sensible |
| **SQL** | Requêtes préparées PDO |
| **En-têtes HTTP** | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, CSP basique |
| **CORS** | Whitelist via `CORS_ORIGINS` |

### Configuration production recommandée

```env
APP_HTTPS=1
SESSION_IDLE_SECONDS=3600
CORS_ORIGINS=https://votre-domaine
DB_USER=ogefrem_app
DB_PASSWORD=<mot_de_passe_fort>
```

### Qui lit `GET /tickets/{id}/reports` ? (décision 44)

| Acteur | Condition |
|--------|-----------|
| Agent assigné ou co-intervenant accepté | Ticket concerné |
| Chef de service | Ticket de son périmètre (`assigned_chef_id`) |
| Sous-directeur | Ticket de sa sous-direction |
| Directrice / super admin | Rapport en circuit de validation ou archivé |
| Autres | **Refus** |

Contrôle appliqué sur `/tickets/{id}/reports` et les endpoints `chef-report`, `sub-directorate-report`, `director-report`.

### Trois « archives » distinctes (décision 45)

| Concept | Technique | Visible pour |
|---------|-----------|--------------|
| **Historique agent** | `agent_resolved_archives` | Agent / co-intervenant après validation chef |
| **Archive rapport validé** | `rapports_valides` | Directrice (+ historique SD des tickets validés par la directrice) |
| **Archive système ticket** | `tickets.status = archive` | Admin (tickets résolus > 30 j) |

Ne pas fusionner en une seule notion UI : libellés différents selon le rôle.

---

## Statuts ticket (cible)

`chez_chef_service` → `assigne_technicien` → `en_cours` → `resolu` | `non_resolu` → `archive`

Statuts **retirés** du flux : `nouveau`, `chez_sous_direction`.

Priorités : `urgent`, `elevee`, `normale`.

---

## Données de démonstration (`seed_demo.sql`)

Second seed **idempotent** (à lancer après `seed.sql`). Tous les tickets démo sont préfixés `TKT-2026-9xxx`.

```powershell
mysql -u root ogefrem_ops_hub < DataBase\seed_demo.sql
```

| Contenu | Détail |
|---------|--------|
| **20 tickets** | Tous les statuts : pool chef, assigné, en cours, résolu, non résolu, archive |
| **11 rapports** | soumis, rejeté (chef/SD/directrice), validé chef/SD/directrice, brouillon |
| **Co-interventions** | pending (9005) et accepted (9006, 9019) |
| **Contraintes** | Ticket `9014` avec consignes SD + directrice |
| **Historique agent** | Tickets `9018` / `9019` dans `agent_resolved_archives` |
| **Archives directrice** | `rapports_valides` pour `9011` et `9016` |
| **Périodiques** | 6 rapports hebdo, 3 bundles mensuels + commentaires chef, 3 PDF SD |
| **Notifications** | 9 notifications `[DEMO]` cliquables |

### Parcours rapides par rôle

| Matricule | À tester |
|-----------|----------|
| `CS-AD-ACM-001` | Valider rapport `9007` (soumis) |
| `CS-IRT-TEL-001` | Rapport `9009` en attente SD |
| `SDM-001` | Valider chaîne IRT ; bundles / PDF mensuels IRT |
| `SDA-001` | Valider `9010` ; onglet Contraintes (`9014`) |
| `DIR-001` | Valider `9010` ; archives rapports ; rejet `9013` |
| `AG-AD-DEV-FIN` | En cours `9005` + invitation co-intervention |
| `AG-AD-ACM-ANA` | Co-intervention acceptée `9006` ; historique `9018` |
| `AG-IRT-RES-HD` | Historique + co-intervention `9019` |
| `CB-IRT-TEL-001` | Ticket assigné `9003` |
| Portail public | Suivi avec token du ticket `9001` |

PDF démo : `api/storage/monthly_reports/demo_*_2026_*.pdf`

---

## Comptes de test

| Matricule | Profil |
|-----------|--------|
| `DIR-001` | Directrice |
| `SDM-001` / `SDA-001` | Sous-directeurs IRT / A&D |
| `CS-*` | Chefs de service |
| `AG-*` / `CB-*` | Agents / chefs de bureau |
| `ADMIN-001` | Super admin |

---

## Fonctionnalités récentes

- Onglet **Contraintes** (SD + Directrice) : tickets `non_resolu`, rapport de clôture, consignes par ticket.
- Notifications staff **cliquables** → onglet/ticket concerné.
- **Alertes mensuelles** (chef : bundles agents manquants ; directrice : PDF SD manquants).
- Commentaires **chef de service** sur les bundles mensuels reçus.
- Historique agent paginé côté serveur (25/page).
- Réouverture `non_resolu` : SLA remis à zéro, anciens rapports invalidés, nouvelle chaîne à la reclôture.
- Soumission publique : ticket créé directement en `chez_chef_service` (plus de statut `nouveau` intermédiaire).
- Doublons publics : exemptés pour la catégorie **Autres** (similarité « Autre » : à venir).

## Fonctionnalités à venir

- Détection doublons catégorie **Autre** (similarité description).
- Filtres historique avancés côté serveur (recherche, groupement année/mois).

---

## Hors périmètre

- Module **parc informatique** (retiré de ce projet).
- Endpoints legacy supprimés : `assign-sub-directorate`, `escalate`, `forward-to-chef`.
- Fenêtre 48 h directrice (`director_visible_until`) : **supprimée**.

---

## Dépannage

| Problème | Action |
|----------|--------|
| API 404 | Apache actif, `api/.htaccess` présent |
| Login échoue | `seed.sql` importé, mot de passe `Test@2026` |
| Colonnes manquantes | `mysql -u root ogefrem_ops_hub < DataBase\migrations_up.sql` |
| Pas de tickets démo | `mysql -u root ogefrem_ops_hub < DataBase\seed_demo.sql` |
| Session expirée | Reconnexion ; ajuster `SESSION_IDLE_SECONDS` en prod |
| Cookie session en HTTPS | `APP_HTTPS=1` dans l'environnement Apache/PHP |
| Modale MDP non affichée | Compte test avec `must_change_password = 0` ; créer un compte via admin ou `UPDATE users SET must_change_password = 1` |
| Fichier PDF inaccessible | Normal si accès direct à `api/storage/` ; utiliser l'endpoint API de téléchargement |
