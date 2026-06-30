# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Environment Setup

`.env.example` is only a template and contains placeholder values. Do not commit real Supabase keys or production URLs.

Required variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

For local development, create `.env.local` from the template and start the dev server:

```sh
cp .env.example .env.local
npm run dev
```

For local staging, create `.env.staging` from the template and run Vite in staging mode:

```sh
cp .env.example .env.staging
npm run dev -- --mode staging
```

`.env.local` is used for normal local development. `.env.staging` is used locally for staging. Both files contain environment-specific values and must not be committed.

For production deployments on Vercel, set these values under Environment Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

After changing Vercel Environment Variables, trigger a redeploy so the build receives the updated values.

`npm run build` runs `scripts/check-env.js` before `vite build`. The script verifies that the required variables are set. If one is missing or empty, the build intentionally fails with a clear error message.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
