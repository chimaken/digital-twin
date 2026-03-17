# Digital Twin — Deployment Plan

**Architecture:** Backend API on **Render** (or similar); frontend on **Vercel** or **Netlify**. All on free tiers where possible.

---

## Overview

| Part        | Host     | Role |
|------------|----------|------|
| **Backend**  | Render   | Node server: `POST /api/ask`, `GET /health`. Router → RAG or Research agent. |
| **Frontend** | Vercel or Netlify | Static site: `public/` (HTML, CSS, JS, `config.js`). Calls backend URL. |

The frontend is a static site that talks to your backend API URL. No serverless functions needed for the frontend.

---

## 1. Backend on Render

### Why Render

- **Free tier**: 750 instance hours/month. Web service runs Node; spins down after ~15 min idle, wakes on request (~1 min cold start).
- **Start command**: `npm start` (runs `node server.js`). Render sets `PORT`.
- **Build**: Run `npm run build` so `data/cv-embeddings.json` exists (ingest + embed). Commit `data/cv-chunks.json` and `data/cv-embeddings.json` so the server can read them, or run the build on Render (needs `OPENROUTER_API_KEY` in build env).

### Steps

1. **Push** the repo to GitHub (include `data/cv-chunks.json` and `data/cv-embeddings.json`, or generate in build).
2. **Render**: [render.com](https://render.com) → New → **Web Service** → Connect repo.
3. **Settings**:
   - **Build command**: `npm install && npm run build`
   - **Start command**: `npm start`
   - **Instance type**: Free
4. **Environment variables** (Render dashboard):
   - `OPENROUTER_API_KEY` (required)
   - `BRAVE_API_KEY` (optional; for better web search; else DuckDuckGo is used)
   - `FRONTEND_ORIGIN` (optional): your Vercel/Netlify origin, e.g. `https://your-app.vercel.app` (or leave unset to allow `*` for CORS)
5. Deploy. Note the URL: `https://<your-service>.onrender.com`.
6. **Health**: `GET https://<your-service>.onrender.com/health` should return `{"ok":true}`.

### Backend env summary

| Variable              | Required | Description |
|-----------------------|----------|-------------|
| `OPENROUTER_API_KEY`  | Yes      | OpenRouter API key |
| `BRAVE_API_KEY`       | No       | Brave Search API key (better search); if missing, DuckDuckGo is used |
| `FRONTEND_ORIGIN`     | No       | CORS origin (e.g. `https://your-app.vercel.app`) |
| `PORT`                | Set by Render | Do not set manually |

---

## 2. Frontend on Vercel or Netlify

The frontend is **static**: `public/index.html`, `public/config.js`, and any assets. It calls the backend at the URL you set in `config.js`.

### Option A: Vercel

1. **Same repo**: If the repo has both backend and frontend, create a **second** Vercel project that only deploys the **frontend** (e.g. root directory `public` or a subfolder with only static files).  
   **Or** use a **monorepo** layout: e.g. `frontend/` with only `index.html`, `config.js`; set Vercel root to `frontend`, publish directory `.`.
2. **Set backend URL**: Edit `public/config.js` (or the copy in your frontend folder) so that:
   ```js
   window.API_BASE_URL = 'https://<your-service>.onrender.com';
   ```
   Commit and push so Vercel deploys with this value.  
   Alternatively use a build step that injects the URL from an env var (e.g. replace `__API_URL__` in the HTML).
3. **Vercel**: New Project → Import repo → set **Root Directory** to the folder that contains only the static frontend (e.g. `public` if you deploy only that). **Build**: none or a no-op. **Output**: current directory.
4. Deploy. Your app is at `https://<project>.vercel.app`.

### Option B: Netlify

1. **Same idea**: Deploy only the static files (e.g. `public/` or a `frontend/` folder).
2. **Set backend URL**: Same as above — `window.API_BASE_URL = 'https://<your-service>.onrender.com'` in `config.js` (or inject at build).
3. **Netlify**: New site → Connect repo → **Base directory**: e.g. `public` (or the folder with `index.html`). **Build command**: leave empty or a no-op. **Publish directory**: `.` (or `/`).
4. Deploy. Your app is at `https://<your-site>.netlify.app`.

### Frontend config

- **Local dev** (frontend and API on same host): `window.API_BASE_URL = ''` in `public/config.js` so requests go to `/api/ask`.
- **Production** (frontend on Vercel/Netlify, API on Render): set `window.API_BASE_URL = 'https://<your-backend>.onrender.com'` in the deployed `config.js`.

---

## 3. One-repo layout (backend + frontend together)

If you keep one repo and deploy backend and frontend separately:

- **Render** runs from **repo root**: `npm start` → `server.js` (serves `/api/ask`, `/health`, and optionally `/` for a test page). Data in `data/`.
- **Vercel/Netlify** can deploy **only** the `public/` folder:
  - **Vercel**: Root Directory = `public`, Publish = `.`
  - **Netlify**: Base directory = `public`, Publish directory = `.`

Before deploying the frontend, set `API_BASE_URL` in `public/config.js` to your Render URL.

---

## 4. Free tier notes

- **Render free**: Service sleeps after inactivity; first request may take ~1 min (cold start). Fine for demos and low traffic.
- **Vercel / Netlify**: Static hosting is free; no serverless needed for this frontend.
- **OpenRouter**: Pay-as-you-go; use small models (e.g. gpt-4o-mini) to keep cost low.
- **Web search**: Without `BRAVE_API_KEY`, the app uses DuckDuckGo (free, no key). With Brave API key, search quality is better (Brave may have a free credit tier).

---

## 5. What to submit

- **Frontend URL**: e.g. `https://digital-twin.vercel.app` or `https://digital-twin.netlify.app`.
- **Backend URL**: e.g. `https://digital-twin-api.onrender.com`.
- **Repo**: Link to GitHub.
- **Short note**: “Backend on Render (Node server, Router + RAG + Research agents); frontend on Vercel/Netlify; OpenRouter for LLMs; web search via Brave or DuckDuckGo.”
