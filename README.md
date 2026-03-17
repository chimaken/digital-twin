# Digital Twin

A digital twin that answers questions about you using:

- **RAG**: Your CV (PDF) → chunks → embeddings → retrieval → answer.
- **Research agent**: When the answer isn’t in your CV, it uses web search (and optionally LinkedIn) and answers from that.
- **OpenRouter**: Different models per agent (RAG vs research vs router).
- **Frontend**: Vanilla HTML, CSS, and JavaScript (no Gradio).

Deployment target: **Netlify or Vercel**, 24/7 on the free tier.

---

## Build stages (flow and logic)

See **[BUILD_STAGES.md](./BUILD_STAGES.md)** for the full stage-by-stage flow.

| Stage | What it does |
|-------|----------------|
| **1** | CV ingestion: PDF → text → chunks → `data/cv-chunks.json` |
| **2** | RAG: Embed chunks, retrieve by question, RAG agent answers from CV |
| **3** | Agentic: Router (RAG vs research), Research agent does web/LinkedIn search |
| **4** | Frontend: Vanilla chat UI calling the API |
| **5** | Deployment: Netlify or Vercel, serverless, free tier |

---

## Quick start

1. **Add your CV**
   - Put your CV PDF at: **`data/cv/cv.pdf`**

2. **Install and run ingestion (Stage 1)**
   ```bash
   npm install
   npm run ingest-cv
   ```
   This creates `data/cv-text.json` and `data/cv-chunks.json`.

3. **Set OpenRouter API key and embed chunks (Stage 2)**
   ```bash
   # Copy .env.example to .env and set OPENROUTER_API_KEY
   npm run embed-chunks
   ```
   This creates `data/cv-embeddings.json` (used by the RAG API).

4. **Run locally**
   - `npm run dev` — starts the API server and serves the test page at http://localhost:3005. Ask a question; the router chooses CV (RAG) or web research.

5. **Deploy**
   - **Backend**: Render (or similar) — see `DEPLOYMENT_PLAN.md`. Start: `npm start`.
   - **Frontend**: Vercel or Netlify — deploy the `public/` folder; set `window.API_BASE_URL` in `public/config.js` to your backend URL.

---

## Deployment

See **[DEPLOYMENT_PLAN.md](./DEPLOYMENT_PLAN.md)** for the 24/7 free deployment plan (Netlify or Vercel).

---

## Env vars

- **`OPENROUTER_API_KEY`** — required (embeddings, RAG, router, research agents).
- **`BRAVE_API_KEY`** — optional; better web search for the research agent (otherwise DuckDuckGo is used).
- **`FRONTEND_ORIGIN`** — optional; set to your Vercel/Netlify URL when frontend and API are on different domains (CORS).
