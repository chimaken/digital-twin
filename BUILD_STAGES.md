# Digital Twin — Build Stages (Flow & Logic)

This document explains the project in stages so you can follow the flow and logic step by step.

---

## High-level architecture

```
[User question] → [Frontend (Vanilla JS)] → [API / Serverless]
                                                    ↓
                    ┌───────────────────────────────┴───────────────────────────────┐
                    ↓                                                               ↓
            [Orchestrator / Router]                                         (OpenRouter)
                    ↓                                                               ↑
        "Answer from CV or research?"                                                │
                    ↓                                                               │
    ┌───────────────┴───────────────┐                                               │
    ↓                               ↓                                               │
[RAG Agent]                  [Research Agent]                                        │
(use CV chunks)              (web / LinkedIn search)                                 │
    ↓                               ↓                                               │
[OpenRouter Model A]         [OpenRouter Model B] ──────────────────────────────────┘
    ↓                               ↓
[Answer from CV]             [Answer from web]
                    ↓
            [Combined response] → Frontend → User
```

- **RAG pipeline**: Your CV (PDF) → extracted text → chunks → embeddings (OpenRouter) → stored. For each question we embed the query, find the closest chunks, and the RAG agent answers using that context.
- **Research path**: When the answer is not in the RAG (or confidence is low), the Research agent does web search (and optionally LinkedIn-style lookups) and uses another OpenRouter model to synthesize an answer.
- **Frontend**: Vanilla HTML, CSS, and JavaScript. No Gradio.

---

## Stage 1: CV ingestion (PDF → text → chunks)

**Goal:** Turn your CV PDF into structured text chunks that the RAG pipeline can use later.

**Flow:**

1. You **manually add** your CV PDF into the project (e.g. `data/cv/cv.pdf`).
2. A **Node script** runs at build time (or locally when you update the CV):
   - Reads the PDF.
   - Extracts raw text (no vectors yet).
   - Splits the text into **chunks** (e.g. by section or by token size) so we don’t send the whole CV to the model every time.
3. Output: a **JSON file** (e.g. `data/cv-chunks.json`) with an array of `{ text, source? }` chunks.

**Why this stage first:** RAG needs chunks before we can embed or retrieve. Doing this separately keeps “PDF handling” and “embeddings” clear.

**Deliverables:**

- Folder for the CV PDF (e.g. `data/cv/`).
- Script: `scripts/ingest-cv.js` (or similar) that:
  - Reads `data/cv/cv.pdf`
  - Outputs `data/cv-chunks.json`
- Optional: a simple `data/cv-text.json` (full text) for debugging.

---

## Stage 2: RAG pipeline (chunks → embeddings → retrieval)

**Goal:** From the chunks, build a small “knowledge base” and retrieve relevant chunks for each question.

**Flow:**

1. **Embed chunks** (build time or one-off script):
   - For each chunk in `cv-chunks.json`, call OpenRouter’s **embeddings API**.
   - Save vectors (and chunk text) to a file, e.g. `data/cv-embeddings.json`.
2. **At request time** (when the user asks a question):
   - Embed the **user question** with the same OpenRouter embedding model.
   - **Similarity search**: find the top-k chunks whose embeddings are closest to the question (e.g. cosine similarity).
   - Pass those chunks as **context** to the RAG agent.

**Logic:** “Answer from my CV” = retrieve relevant CV chunks + send them + the question to an LLM (via OpenRouter). Different OpenRouter model can be used for the RAG agent.

**Deliverables:**

- Script to embed all chunks and write `data/cv-embeddings.json`.
- API endpoint (or serverless function) that:
  - Accepts a question.
  - Embeds it, retrieves top chunks, calls the RAG agent with OpenRouter.
  - Returns the answer.

**Implemented in this repo:**

- `scripts/embed-chunks.js` — reads `data/cv-chunks.json`, calls OpenRouter embeddings (batch), writes `data/cv-embeddings.json`. Run: `npm run embed-chunks` (requires `OPENROUTER_API_KEY`).
- `lib/openrouter.js` — `embed()` and `chat()` helpers.
- `lib/rag.js` — `loadEmbeddings()`, `retrieve(query, topK)`, `chunksToContext()`; uses cosine similarity for top-k retrieval.
- `api/ask.js` — Vercel serverless: POST `{ "question": "..." }` → retrieves top-5 chunks, calls RAG agent (OpenRouter), returns `{ answer, sources }`.

---

## Stage 3: Agentic orchestration (Router + RAG + Research)

**Goal:** Decide when to use the CV (RAG) vs when to do online research, and use different models per agent.

**Flow:**

1. **Orchestrator / Router agent** (one OpenRouter model):
   - Input: user question + optional “retrieved CV chunks” or “RAG confidence”.
   - Output: decision — “answer_from_cv” or “research_online”.
2. **If “answer_from_cv”:**
   - RAG agent (another OpenRouter model) gets the question + retrieved chunks and generates an answer. No web search.
3. **If “research_online”:**
   - Research agent (another OpenRouter model):
     - Triggers **web search** (e.g. SerpAPI, Brave Search, or similar) and optionally LinkedIn-style lookups if we add them.
     - Gets search results and synthesizes an answer.
4. Response is sent back to the frontend.

**Logic:** If the answer is available in the RAG pipeline (good match in CV chunks), we use the RAG agent. Otherwise we use the Research agent to search the web (and later LinkedIn) and then answer.

**Deliverables:**

- Router logic (can be a simple function or a small “router” LLM call).
- RAG agent: question + context → OpenRouter (model A).
- Research agent: question + search results → OpenRouter (model B).
- Integration with a search API (e.g. Brave Search free tier or SerpAPI).

---

## Stage 4: Frontend (Vanilla HTML, CSS, JS)

**Goal:** A simple chat UI where the user can ask questions and see the digital twin’s answers.

**Flow:**

1. User types a question and submits.
2. Frontend sends the question to your API (e.g. `POST /api/chat` or `/api/ask`).
3. API runs the full pipeline (router → RAG or research → response).
4. Frontend receives the response and displays it in the chat (no Gradio; plain HTML/CSS/JS).

**Deliverables:**

- `index.html` with a chat layout.
- CSS for a clean, readable chat UI.
- Vanilla JS: form submit, fetch to API, render messages (user + assistant).

---

## Stage 5: Deployment (24/7, free tier)

**Goal:** Run the app 24/7 on Netlify or Vercel at no cost (within free tier limits).

**Flow:**

1. **Build:**  
   - Frontend: static HTML/CSS/JS (and any assets).  
   - Run Stage 1 + Stage 2 scripts so `cv-chunks.json` and `cv-embeddings.json` are generated and committed or included in the build output.
2. **Serverless:**  
   - Expose one or more serverless functions (e.g. `/api/ask`, `/api/chat`) that implement: retrieval → router → RAG or research → response.
3. **Deploy:**  
   - Connect the repo to Netlify or Vercel; set env vars (e.g. `OPENROUTER_API_KEY`, search API key).  
   - Free tier keeps the site live 24/7; functions run on-demand.

**Deliverables:**

- `DEPLOYMENT_PLAN.md` (see below) with exact steps.
- `netlify.toml` or `vercel.json` and any function config so the app and API work in production.

---

## Summary table

| Stage | What happens | Output |
|-------|----------------|--------|
| 1 | You add CV PDF → script extracts text and chunks it | `data/cv-chunks.json` |
| 2 | Chunks are embedded; API retrieves by question and calls RAG agent | RAG answers from CV |
| 3 | Router decides RAG vs research; Research agent does web (and later LinkedIn) search | Full agentic behaviour |
| 4 | Vanilla frontend calls API and shows Q&A | Working chat UI |
| 5 | Deploy static + serverless to Netlify or Vercel | Live 24/7 app |

We’ll implement **Stage 1** first so you have a clear flow: **CV (PDF) → text → chunks → JSON**. After that we’ll move to Stage 2 (embeddings + retrieval) and then the rest.
