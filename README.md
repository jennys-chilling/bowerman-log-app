# Bowerman Training Log

This repository is the standalone codebase for the Bowerman training log app. It no longer depends on the original generated plugin scaffolding, so you can develop and deploy it from your own private repository like a normal Vite application.

## Local development

1. Install dependencies with `npm install`.
2. Create an `.env.local` file.
3. Start the app with `npm run dev`.

```bash
VITE_APP_ID=your_app_id
VITE_APP_BASE_URL=https://your-app-host.example.com

# Optional. Override the hosted API origin if needed.
VITE_API_BASE_URL=https://your-api-host.example.com

# Optional compatibility setting if you rely on versioned functions.
VITE_FUNCTIONS_VERSION=
```

Legacy environment variable names from the exported app are still accepted so existing local setups do not break during the transition.

## Scripts

- `npm run dev` starts the Vite dev server.
- `npm run build` creates a production build.
- `npm run preview` serves the production build locally.
- `npm run lint` runs ESLint.

## Notes

The app still expects a valid hosted backend and app ID. The codebase has been renamed and de-coupled from the original export scaffolding, but it will continue calling the configured backend APIs until you migrate those services elsewhere.
