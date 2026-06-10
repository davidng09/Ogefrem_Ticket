# Guide OGEFREM Tickets

Document de référence pour les collègues de la DANTIC (utilisation, installation, compréhension du code).

> Export PDF : ouvrir ce fichier dans VS Code / Cursor → Aperçu Markdown → Imprimer → Enregistrer en PDF.

---

## 1. Vue d'ensemble

OGEFREM Tickets est une application web de gestion des incidents IT :

```
Portail public (React)  →  dépose un ticket sans mot de passe
        ↓
API PHP (XAMPP)         →  règles métier, sessions, fichiers
        ↓
Base MySQL                →  tickets, utilisateurs, rapports
        ↓
Interfaces par rôle     →  directrice, sous-directeur, chef, agent
```

**Cycle ticket classique** : Public → Directrice → Sous-direction → Chef → Agent → Rapport ticket → validations hiérarchiques.

**Cycle mensuel agent** : Tickets résolus du mois → rapports hebdomadaires (lun–ven) → envoi fin de mois au collègue rédacteur → rapport mensuel SD (PDF/Word) → directrice.

---

## 2. Installation

### Prérequis
- XAMPP (Apache + MySQL)
- Node.js 20+
- Projet dans `c:\xampp\htdocs\Ogefrem`

### Base de données
1. Importer `DataBase/001_schema_complet.sql`
2. Importer `DataBase/002_donnees_dantic.sql`
3. Si base déjà existante : importer `DataBase/migrations/20260606_periodic_reports.sql`

Mot de passe test : `Test@2026`

### Frontend
```powershell
cd c:\xampp\htdocs\Ogefrem\frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Ouvrir http://localhost:5173/

### Vérification API
http://localhost/Ogefrem/api/health

---

## 3. Utilisation par rôle

### Agent
- **Tickets affectés** : prise en charge, rapport ticket, résolution
- **Tickets résolus** : classés par semaine (S1…Sn, lun–ven), visibles tout le mois
- **Rapports hebdomadaires** : rappel le vendredi, export PDF, modification
- **Fin de mois** : envoi concaténé au collègue de la même sous-direction
- **Historique** : tickets archivés automatiquement le 1er du mois si envoi effectué

### Rédacteur mensuel (agent désigné)
- Reçoit les paquets hebdomadaires des collègues
- Rédige le rapport final dans Word (hors app)
- Upload PDF ou Word vers la directrice

### Directrice
- Onglets : tickets reçus, en cours, rapports ticket, **rapports mensuels**, archives
- Rapports mensuels : téléchargement, commentaire, conserver ou supprimer
- Pas d'accès aux rapports hebdomadaires individuels

### Chef / Sous-directeur
- Affectation, validation des rapports ticket (workflow existant)

---

## 4. Glossaire

| Terme | Signification |
|-------|----------------|
| **API** | Interface entre le navigateur et le serveur PHP (`/Ogefrem/api/...`) |
| **Composant React** | Morceau d'écran réutilisable (bouton, tableau, panneau) |
| **Route** | URL → écran (`/app/agent`, `/app/directeur`) |
| **Session** | Connexion mémorisée via cookie après login DANTIC |
| **Migration SQL** | Script de mise à jour de la base sans tout recréer |
| **Hook** | Logique réutilisable React (`useTickets`, `useAuth`) |
| **Bundle mensuel** | Concaténation des rapports hebdo d'un agent, envoyée au rédacteur |
| **Archive agent** | Tickets résolus déplacés en historique après cycle mensuel |

---

## 5. Carte du code

### `api/` — Backend PHP
| Fichier | Rôle |
|---------|------|
| `index.php` | Point d'entrée, routage |
| `services/TicketService.php` | Tickets, visibilité par rôle |
| `services/ReportService.php` | Rapports ticket et validations |
| `services/PeriodicReportService.php` | Hebdos, bundles, rapports mensuels |
| `routes/*.php` | Endpoints REST |
| `storage/monthly_reports/` | Fichiers uploadés (hors git) |

### `frontend/src/app/` — Interface React
| Fichier | Rôle |
|---------|------|
| `public/PublicPortal.jsx` | Portail dépôt ticket |
| `workspaces/TechnicianField.jsx` | Interface agent |
| `workspaces/DirectorDashboard.jsx` | Interface directrice (onglets) |
| `workspaces/SubDirectionHub.jsx` | Sous-directeur / chef |
| `components/WeeklyReportPanel.jsx` | Rapports hebdomadaires |
| `components/MonthlyBundlePanel.jsx` | Envoi fin de mois |
| `utils/calendarWeeks.js` | Semaines lun–ven du mois |

### `DataBase/` — SQL
| Fichier | Rôle |
|---------|------|
| `001_schema_complet.sql` | Structure complète |
| `002_donnees_dantic.sql` | Organigramme DANTIC (28 comptes) |
| `migrations/` | Évolutions incrémentales |

---

## 6. Paradigmes utilisés

- **Frontend** : React (composants + état), Tailwind CSS (styles), fetch vers l'API
- **Backend** : PHP procédural organisé en services + routes REST
- **Base** : MySQL relationnel (tables liées par clés étrangères)
- **Pas de framework lourd** : simplicité XAMPP, fichiers explicites

Chaque couche a un rôle : le frontend affiche et collecte ; l'API décide et enregistre ; la base conserve.

---

## 7. Endpoints rapports périodiques

| Méthode | URL | Rôle |
|---------|-----|------|
| GET | `/periodic/weekly?year=&month=` | Liste hebdos agent |
| POST | `/periodic/weekly` | Enregistrer hebdo |
| POST | `/periodic/monthly-bundle` | Envoi fin de mois |
| GET | `/periodic/monthly-bundle/inbox` | Paquets reçus |
| POST | `/periodic/monthly-reports` | Upload rapport mensuel |
| GET | `/periodic/monthly-reports?scope=director` | Liste directrice |

Voir `api/README.md` pour la liste complète.
