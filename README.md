# Home Controls PWA

A minimalist, production-ready Progressive Web App to control home systems via a Node-RED backend exposed behind Cloudflare Zero Trust (Access). Built with Vite + React + TypeScript and Tailwind CSS. Optimized for one-hand, thumb-friendly usage with a 2×2 grid of large tiles.

## Features

- 4 primary controls: Alarm, Lock, Garage, Driveway
- Touch-friendly 2×2 grid, high-contrast, accessible labels
- Auth-aware: detects unauthenticated responses from Cloudflare Access and prompts to sign in with Google
- Fast installable PWA (standalone mode), minimal service worker
- Cloudflare Pages ready

## Environment Variables

Create a `.env` (or `.env.local`) at the project root:

```
VITE_API_BASE_URL=https://api.<MY_DOMAIN>
# If your API does not use the /v1 convention, override these:
# For example, if both GET status and POST action are at /pwa:
# VITE_STATUS_PATH=/pwa
# VITE_ACTION_PATH=/pwa
```

This is your Cloudflare Tunnel hostname that fronts Node-RED (protected by Cloudflare Access).

## Local Development

1. Install dependencies:
   ```
   npm install
   ```
2. Start the dev server:
   ```
   npm run dev
   ```
3. Open `http://localhost:5173`.

Notes:
- The app will call `GET /v1/status` and `POST /v1/action` against `VITE_API_BASE_URL`. If you’re not authenticated with Cloudflare Access, you’ll get an unauthenticated prompt in the UI.
- Dev server uses a minimal service worker only in production build; installability is mainly verified via `npm run build && npm run preview`.

## Build and Preview

```
npm run build
npm run preview
```

## Deploying to Cloudflare Pages

1. Push this repository to your Git provider (GitHub/GitLab/Bitbucket).
2. In Cloudflare Pages:
   - Create a new project from your repo
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Add Environment Variable: `VITE_API_BASE_URL=https://api.<MY_DOMAIN>`
3. Deploy. The app is static and requires no server-side rendering.

Optional: If you want to enable branch previews, ensure the environment variable is set for Preview deployments as well.

## Debugging

- Enable verbose console logs by any of:
  - Add `?debug=1` to the URL (e.g., `https://panel.sagarra-novo.net/?debug=1`)
  - In DevTools console: `localStorage.setItem('debug','1')` then reload
  - In local dev, logs are enabled automatically
- The app logs:
  - Effective API config and paths
  - Load/refresh attempts and outcomes
  - Action requests and responses
  - Auth gate decisions (e.g., unauthenticated vs network/CORS)

## PWA Notes (iOS-friendly)

- The app includes:
  - `public/manifest.webmanifest`
  - A minimal service worker at `public/sw.js` (online-first, no caching)
  - Icons (SVG) included at `public/icons/app.svg`
  - iOS meta tags in `index.html`. iOS will generate a Home Screen icon even without PNG assets; you can replace the touch icon with a PNG if preferred.
- To Add to Home Screen on iOS:
  1. Open the site in Safari
  2. Share → Add to Home Screen
  3. Launch from the Home Screen for standalone experience

## Backend Contract (Node-RED)

Base URL: `VITE_API_BASE_URL`

### GET `/v1/status`

Response (JSON):
```json
{
  "alarm": { "armed": true },
  "garage": { "open": false },
  "driveway": { "open": true },
  "lock": { "locked": true }
}
```

Notes:
- `lock` may be missing. The UI will treat Lock as action-only when no state is present.

### POST `/v1/action`

Request (JSON):
```json
{
  "target": "alarm" | "lock" | "garage" | "driveway",
  "command": "toggle" | "arm" | "disarm" | "open" | "close" | "lock" | "unlock"
}
```

Response (JSON):
```json
{
  "ok": true,
  "status": {
    "...": "optional updated status, same shape as /v1/status"
  }
}
```

### Business Rules Implemented

- Alarm: if `armed === true` → `disarm`; else `arm`
- Garage/Driveway: toggle `open`/`close` based on status
- Lock:
  - If state exists: toggle `lock`/`unlock`
  - If no state: send `toggle` and rely on feedback toast

### Networking

- All requests include `credentials: "include"` to support Cloudflare Access sessions
- Abort after ~9 seconds via `AbortController`
- On network failure, the app retries `GET /v1/status` once
- Unauthenticated detection:
  - HTTP 401/403, or
  - Non-JSON (e.g., HTML login page from Cloudflare Access)
  → The app displays a clear sign-in prompt

## Accessibility

- Proper `aria-label`s on controls
- High-contrast visual states
- Inline loader states use `aria-busy`
- Minimal motion and clear feedback

## Folder Structure

```
home-pwa/
├─ public/
│  ├─ icons/
│  │  └─ app.svg
│  ├─ manifest.webmanifest
│  └─ sw.js
├─ src/
│  ├─ api/
│  │  └─ api.ts
│  ├─ components/
│  │  ├─ ControlTile.tsx
│  │  └─ TopBar.tsx
│  ├─ App.tsx
│  ├─ index.css
│  ├─ main.tsx
│  └─ types.ts
├─ index.html
├─ package.json
├─ postcss.config.js
├─ tailwind.config.js
├─ tsconfig.json
└─ vite.config.ts
```

## Replacing Icons (Optional)

- For best iOS Home Screen icon quality, add PNG icons (e.g., 180×180, 192×192, 512×512) under `public/icons/` and reference them in `manifest.webmanifest` and as `apple-touch-icon` in `index.html`.


