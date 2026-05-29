# API PHP - OGEFREM Ops Hub

## Base URL (XAMPP)

- `http://localhost/Ogefrem/api`

## Endpoints principaux

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /tickets/public`
- `GET /tickets`
- `POST /tickets/{id}/escalate`
- `POST /tickets/{id}/forward-to-chef`
- `POST /tickets/{id}/assign`
- `PATCH /tickets/{id}/priority`
- `POST /tickets/{id}/take-charge`
- `POST /tickets/{id}/resolve`
- `POST /reports`
- `POST /reports/{id}/validate`
- `GET /tickets/{id}/reports`
- `GET /notifications`
- `PATCH /notifications/{id}/read`
- `GET /admin/users`
- `POST /admin/users`
- `PATCH /admin/users/{id}/password`
- `PATCH /admin/users/{id}/active`
- `POST /admin/archive-resolved`

## Variables d'environnement (optionnelles)

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
