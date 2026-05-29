# Frontend React - OGEFREM Ops Hub

## Démarrage

1. Copier `.env.example` vers `.env`.
2. Installer les dépendances:
   - `npm install`
3. Lancer en mode développement:
   - `npm run dev`

## Build production

- `npm run build`

## Rôles pris en charge

- `DIRECTEUR`
- `SOUS_DIRECTEUR`
- `CHEF_SERVICE`
- `TECHNICIEN`
- `SUPER_ADMIN`

Le simulateur de rôles est activable via `VITE_DEV_ROLE_SIMULATOR=true`.
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
