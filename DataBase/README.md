# DataBase - OGEFREM Ops Hub

Ce dossier contient le schéma, les données de base et les migrations SQL de l'application.

## Structure

- `001_schema_complet.sql` : schéma complet (install neuve).
- `002_donnees_dantic.sql` : organigramme DANTIC (28 comptes).
- `schema/001_initial_schema.sql` : schéma initial legacy.
- `seeds/002_seed_roles_users.sql` : seed legacy.
- `migrations/` : scripts incrémentaux (`20260606_periodic_reports.sql` = rapports hebdo/mensuels).

## Import (XAMPP / phpMyAdmin)

**Installation neuve (recommandée) :**
1. Ouvrir phpMyAdmin.
2. Importer `001_schema_complet.sql`.
3. Importer `002_donnees_dantic.sql`.

**Base existante :** appliquer les fichiers dans `migrations/` dans l'ordre chronologique (ex. `20260606_periodic_reports.sql`).

Mot de passe des comptes de test : `Test@2026`

**Legacy (schéma initial + seed séparés) :**
1. Importer `schema/001_initial_schema.sql`.
2. Générer un hash PHP : `php -r "echo password_hash('Test@2026', PASSWORD_DEFAULT), PHP_EOL;"`
3. Remplacer `@test_hash` dans `seeds/002_seed_roles_users.sql`.
4. Importer `seeds/002_seed_roles_users.sql`.

## Convention de mise à jour

Ne pas modifier `001_initial_schema.sql` après déploiement.
Chaque évolution doit être ajoutée dans `migrations/` avec un nouveau fichier daté.
