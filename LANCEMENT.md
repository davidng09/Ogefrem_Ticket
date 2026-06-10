# Lancer OGEFREM Tickets

Guide rapide des commandes pour démarrer l’application en local (Windows + XAMPP).

## Prérequis

- **XAMPP** : Apache + MySQL démarrés (panneau de contrôle XAMPP)
- **Node.js** 20+ installé
- Projet placé dans : `c:\xampp\htdocs\Ogefrem`

---

## 1. Backend (API) — XAMPP

Pas de commande terminal : démarrer **Apache** et **MySQL** dans XAMPP.

Vérifier que l’API répond :

```powershell
Invoke-WebRequest -Uri "http://localhost/Ogefrem/api/health" -UseBasicParsing
```

Réponse attendue : `{"ok":true,"service":"OGEFREM Ops Hub API"}`

URL directe : http://localhost/Ogefrem/api/health

---

## 2. Frontend (React + Vite)

### Première installation (une seule fois)

```powershell
cd c:\xampp\htdocs\Ogefrem\frontend
Copy-Item .env.example .env
npm install
```

### Lancer l’interface (à chaque session de dev)

```powershell
cd c:\xampp\htdocs\Ogefrem\frontend
npm run dev
```

Quand Vite affiche `Local: http://localhost:5173/`, ouvrir cette URL dans le navigateur.

**Important** : laisser ce terminal ouvert. `Ctrl+C` arrête le frontend.

---

## 3. Tout en une fois (PowerShell)

Après la première installation :

```powershell
# Terminal 1 — XAMPP : Apache + MySQL via le panneau de contrôle

# Terminal 2 — Frontend
cd c:\xampp\htdocs\Ogefrem\frontend
npm run dev
```

---

## URLs utiles

| Service | URL |
|---------|-----|
| Application (dev) | http://localhost:5173/ |
| API health | http://localhost/Ogefrem/api/health |
| Liens locaux | http://localhost/Ogefrem/index.html |
| phpMyAdmin | http://localhost/phpmyadmin |

---

## Comptes de test (après import SQL)

Importer la base (si pas déjà fait) :
- `DataBase/001_schema_complet.sql` puis `DataBase/002_donnees_dantic.sql`
- Ou migration seule sur base existante : `DataBase/migrations/20260606_periodic_reports.sql`

Mot de passe : `Test@2026`

### Comptes principaux (mot de passe `Test@2026`)

| Matricule | Profil |
|-----------|--------|
| `DIR-001` | Directrice DANTIC |
| `SDM-001` / `SDA-001` | Sous-directeurs IRT / A&D |
| `CSM-001` / `CSA-001` | Chefs Réseaux & Sécurité / Dev Applications |
| `TCM-001` / `TCA-001` | Agents Help-Desk / Dev Applications |
| `ADMIN-001` | Super admin |

Voir [README.md](README.md) pour la liste complète des profils par service.

---

## Arrêter l’application

- **Frontend** : `Ctrl+C` dans le terminal `npm run dev`
- **Backend** : arrêter Apache et MySQL dans XAMPP

---

## Dépannage rapide

| Problème | Commande / action |
|----------|-------------------|
| Port 5173 inaccessible | Relancer `npm run dev` dans `frontend/` |
| API ne répond pas | Démarrer Apache dans XAMPP |
| Erreur base de données | Démarrer MySQL + importer le schéma SQL |
| `&&` invalide en PowerShell | Utiliser `;` ou une commande par ligne |

Documentation complète : [README.md](README.md) — guide collègues : [docs/GUIDE_OGEFREM.md](docs/GUIDE_OGEFREM.md)
