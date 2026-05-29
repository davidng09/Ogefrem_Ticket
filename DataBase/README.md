# DataBase - OGEFREM Ops Hub

Ce dossier contient le schéma, les données de base et les migrations SQL de l'application.

## Structure

- `schema/001_initial_schema.sql`: création initiale de la base.
- `seeds/002_seed_roles_users.sql`: rôles, catégories, sous-directions et comptes de test.
- `migrations/`: scripts incrémentaux de mise à jour.

## Import (XAMPP / phpMyAdmin)

1. Ouvrir phpMyAdmin.
2. Importer `schema/001_initial_schema.sql`.
3. Générer un hash PHP pour le mot de passe de test:
   - `php tools/generate_password_hash.php "Test@2026"`
   - (ou `php -r "echo password_hash('Test@2026', PASSWORD_DEFAULT), PHP_EOL;"`)
4. Remplacer `@test_hash` dans `seeds/002_seed_roles_users.sql`.
5. Importer `seeds/002_seed_roles_users.sql`.

## Convention de mise à jour

Ne pas modifier `001_initial_schema.sql` après déploiement.
Chaque évolution doit être ajoutée dans `migrations/` avec un nouveau fichier daté.
