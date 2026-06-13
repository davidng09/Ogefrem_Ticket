# OGEFREM — Parc informatique

Module de gestion du parc informatique (équipements, affectations, référentiels).

## Prérequis

- XAMPP (Apache + MySQL)
- Schéma tickets + utilisateurs DANTIC (`ogefrem_ops_hub`)
- Migration : `DataBase/migrations/20260612_parc_informatique.sql`
- Seed démo : `DataBase/seeds/005_seed_parc_demo.sql`

## Démarrage

```powershell
# API : http://localhost/Ogefrem/parc/api/health

cd c:\xampp\htdocs\Ogefrem\parc\frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Application : **http://localhost:5174/** (hub : http://localhost/Ogefrem/index.html)

## Connexion

Comptes DANTIC existants (ex. `AG-IRT-INF-MNT` / `Test@2026`). La directrice (`DIR-001`) a un accès **lecture seule**.

## Droits

| Rôle | Inventaire |
|------|------------|
| Agent | Création, affectation |
| Chef / Sous-directeur | Modification, réforme, paramètres |
| Directrice | Lecture seule |

## Lien tickets (futur)

`GET /parc/api/lookup?matricule=&direction=&service=&bureau=` — recherche équipements par détenteur (sans auth, pour intégration portail tickets).
