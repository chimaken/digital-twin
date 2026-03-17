# Deploy backend to Render

Follow these steps to get your Digital Twin API live on Render.

---

## 1. Prerequisites

- Code pushed to **GitHub** (or GitLab/Bitbucket).  
- **`data/cv-chunks.json`** and **`data/cv-embeddings.json`** committed so the server can load RAG data without running the embed step on Render.  
- **OpenRouter API key** ready.

---

## 2. Create the Web Service on Render

1. Go to [render.com](https://render.com) and sign in (or sign up with GitHub).
2. Click **New +** → **Web Service**.
3. **Connect repository**: select your `digital-twin` repo (or connect the org/repo if not listed).
4. Configure the service:

   | Field | Value |
   |-------|--------|
   | **Name** | `digital-twin-api` (or any name) |
   | **Region** | Choose closest to you or your users |
   | **Branch** | `main` (or your default branch) |
   | **Runtime** | **Node** |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Instance Type** | **Free** |

5. Click **Advanced** and add **Environment Variables**:

   | Key | Value | Required |
   |-----|--------|----------|
   | `OPENROUTER_API_KEY` | Your OpenRouter API key | Yes |
   | `NODE_ENV` | `production` | Optional (Render may set it) |
   | `BRAVE_API_KEY` | Brave Search API key (better web search) | No |
   | `FRONTEND_ORIGIN` | Your Netlify URL, e.g. `https://your-app.netlify.app` | No (recommended after frontend is live) |

6. Click **Create Web Service**.

Render will run `npm install`, then `npm start`. The first deploy may take a few minutes.

---

## 3. Check that it’s running

- **Service URL**: Render shows something like `https://digital-twin-api.onrender.com`.
- **Health check**: open  
  `https://<your-service-name>.onrender.com/health`  
  in a browser or with curl. You should see:
  ```json
  {"ok":true,"service":"digital-twin-api"}
  ```
- **Ask endpoint**:  
  ```bash
  curl -X POST https://<your-service-name>.onrender.com/api/ask \
    -H "Content-Type: application/json" \
    -d "{\"question\": \"What is my email?\"}"
  ```

---

## 4. Free tier notes

- The service **spins down** after about 15 minutes of no traffic.
- The **first request** after spin-down can take **~30–60 seconds** (cold start).
- **750 free instance hours** per month; enough for a demo or light use.

---

## 5. After frontend is on Netlify

In the Render dashboard, add (or update) the environment variable:

- **Key**: `FRONTEND_ORIGIN`  
- **Value**: `https://<your-site>.netlify.app`  

Then in your frontend repo, set in `public/config.js`:

```js
window.API_BASE_URL = 'https://<your-service-name>.onrender.com';
```

Redeploy the frontend so it uses this backend URL.
