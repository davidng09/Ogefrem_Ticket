# Maquettes HTML (référence visuelle)

Ce dossier contient les **maquettes statiques** utilisées comme baseline UI pour OGEFREM Ops Hub.  
L’application fonctionnelle est dans [`../frontend/`](../frontend/) (React).

## Fichiers

| Fichier | Description | Équivalent React |
|---------|-------------|------------------|
| [login.html](login.html) | Portail public (soumission ticket) + connexion DANTIC | `frontend/src/app/public/PublicPortal.jsx` |
| [directeur.html](directeur.html) | Dashboard Responsable DANTIC (KPI, escalade) | `frontend/src/app/workspaces/DirectorDashboard.jsx` |
| [sous-direction.html](sous-direction.html) | Hub sous-direction / chef de service | `frontend/src/app/workspaces/SubDirectionHub.jsx` |
| [agent.html](agent.html) | Interface technicien terrain | `frontend/src/app/workspaces/TechnicianField.jsx` |

> Ancien nom : `portail&Login.html` (renommé en `login.html` car le caractère `&` pose problème dans les URLs).

## Consultation via XAMPP

Ouvrir par exemple :

- http://localhost/Ogefrem/legacy/login.html
- http://localhost/Ogefrem/legacy/directeur.html
- http://localhost/Ogefrem/legacy/sous-direction.html
- http://localhost/Ogefrem/legacy/agent.html

Ces pages sont **non connectées** à l’API : elles servent uniquement de référence design.
