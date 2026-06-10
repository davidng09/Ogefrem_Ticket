# API PHP - OGEFREM Ops Hub

## Base URL (XAMPP)

- `http://localhost/Ogefrem/api`

## Endpoints principaux

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /tickets/public`
- `GET /tickets`
- `POST /tickets/{id}/assign-sub-directorate` — priorité + échéance + affectation SD (directrice)
- `POST /tickets/{id}/escalate`
- `POST /tickets/{id}/forward-to-chef`
- `POST /tickets/{id}/assign`
- `PATCH /tickets/{id}/priority`
- `POST /tickets/{id}/take-charge`
- `POST /tickets/{id}/resolve`
- `POST /reports`
- `GET /reports?scope=director` — rapports en attente validation directrice
- `GET /reports?scope=sub_directorate` — rapports en attente validation sous-directeur
- `GET /reports?scope=chef_service` — rapports en attente validation chef de service
- `GET /tickets/{id}/sub-directorate-report`
- `GET /tickets/{id}/chef-report`
- `GET /meta/users?role_code=&sub_directorate_id=&service_id=` — pour un chef connecté, filtre automatique par `service_id` session
- `GET /reports/validated` — archive `rapports_valides`
- `POST /reports/{id}/validate`
- `GET /tickets/{id}/reports`
- `GET /tickets/{id}/director-report`
- `GET /meta/users`
- `GET /meta/sub-directorates`
- `GET /meta/services`
- `GET /notifications`
- `PATCH /notifications/{id}/read`
- `GET /admin/users`
- `POST /admin/users`
- `PATCH /admin/users/{id}/password`
- `PATCH /admin/users/{id}/active`
- `POST /admin/archive-resolved`

## Rapports périodiques (hebdo / mensuel)

- `GET /tickets?view=current|history` — agent : tickets courants ou historique archivé
- `GET /periodic/weekly?year=&month=`
- `GET /periodic/weekly/pending-reminder`
- `POST /periodic/weekly`
- `GET /periodic/weekly/{id}/export` — HTML imprimable (PDF via navigateur)
- `GET /meta/agents-sub-directorate`
- `GET /periodic/monthly-bundle/preview`
- `POST /periodic/monthly-bundle`
- `GET /periodic/monthly-bundle/inbox`
- `POST /periodic/monthly-reports` — upload multipart PDF/Word
- `GET /periodic/monthly-reports?visibility=active|archived`
- `POST /periodic/monthly-reports/{id}/comment`
- `PATCH /periodic/monthly-reports/{id}` — `{ "visibility": "archived"|"deleted" }`
- `GET /periodic/monthly-reports/{id}/download`
- `POST /periodic/archive-resolved` — archivage lazy (1er du mois)

## Constantes applicatives

- `DIRECTOR_VISIBILITY_HOURS` = 48 (délai avant masquage ticket côté directrice après validation rapport)
- Les tickets résolus agent ne sont plus limités à 48 h ; archivage mensuel via `agent_resolved_archives`

## Variables d'environnement (optionnelles)

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
