# Deployment — Render (Free Tier)

StadiumSense AI is deployed on [Render](https://render.com) using two services:
a Docker-containerised **FastAPI backend** and a **Vite/React static site**.
Everything is declared in `render.yaml` at the repo root for reproducible deploys.

---

## Architecture on Render

```
GitHub repo (main branch)
        │
        ├─ push → Render builds & deploys automatically
        │
        ├── stadiumsense-backend  (Web Service — Docker)
        │       URL: https://stadiumsense-backend.onrender.com
        │       Reads:  GEMINI_API_KEY, GOOGLE_CLOUD_PROJECT, CORS_ORIGINS
        │
        └── stadiumsense-frontend  (Static Site — Vite build)
                URL: https://stadiumsense-frontend.onrender.com
                Reads:  VITE_API_BASE_URL  (set to backend URL above)
```

---

## Step-by-Step Manual Setup

### 1 — Create a Render account

1. Go to [render.com](https://render.com) and click **Get Started for Free**.
2. Sign up with GitHub (recommended — Render will ask for repo access).

### 2 — Connect your GitHub repository

1. In the Render dashboard, click **New +** → **Blueprint** (to use `render.yaml`).
2. Select your GitHub account and choose the `StadiumSense_AI` repo.
3. Render reads `render.yaml` and shows the two services it will create.
4. Click **Apply** — Render creates both services but does **not** start the
   first deploy yet (secrets are missing).

### 3 — Set environment variables (secrets)

Navigate to each service and add the variables below.
**Never paste secrets into `render.yaml`** — always use the Render UI.

#### Backend service (`stadiumsense-backend`)

| Variable | Required | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `GOOGLE_CLOUD_PROJECT` | ✅ | Your GCP project ID (needed for Firestore) |
| `CORS_ORIGINS` | ✅ | Set **after** the frontend first deploys; paste the frontend URL, e.g. `https://stadiumsense-frontend.onrender.com` |
| `GEMINI_MODEL` | optional | Defaults to `gemini-1.5-flash` |
| `FIRESTORE_DATABASE` | optional | Defaults to `(default)` |
| `DEFAULT_STADIUM_ID` | optional | Defaults to `wc2026-stadium-1` |
| `APP_ENV` | optional | Set to `production` |
| `SIMULATOR_TICK_INTERVAL` | optional | Defaults to `5.0` (seconds) |
| `SIMULATOR_ALERT_THRESHOLD` | optional | Defaults to `85.0` (%) |
| `SIMULATOR_RECOVERY_THRESHOLD` | optional | Defaults to `75.0` (%) |
| `RATE_LIMIT_MAX_CALLS` | optional | Defaults to `20` |
| `RATE_LIMIT_WINDOW_SECONDS` | optional | Defaults to `60` |

> **Firestore credentials on Render:**  
> Render does not run inside GCP, so Application Default Credentials won't work.
> You need a GCP service account JSON key. Two options:
>
> **Option A (recommended for free tier):** Base64-encode your key file and set it as
> `GOOGLE_APPLICATION_CREDENTIALS_JSON`. Then add a startup script or an env var
> pointing `GOOGLE_APPLICATION_CREDENTIALS` to a file path where the key is written.
>
> **Option B (simpler for demo):** Use the
> [Firestore REST API](https://firebase.google.com/docs/firestore/use-rest-api) with
> a service account key passed as `GOOGLE_CLOUD_KEY_JSON` — adapt `firebase.py`
> to use `google.oauth2.service_account.Credentials.from_service_account_info`.
>
> For the hackathon demo you can also skip Firestore entirely and use the in-memory
> fallback data that the service layer already returns when Firestore is unavailable.

#### Frontend service (`stadiumsense-frontend`)

| Variable | Required | Value |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | `https://stadiumsense-backend.onrender.com` |

> Vite bakes this into the bundle at build time, so the deployed SPA calls the
> right backend URL without a proxy.

### 4 — Trigger the first deploy

1. After setting all secrets, go to each service and click **Manual Deploy →
   Deploy latest commit**.
2. Render builds the Docker image for the backend (~3–5 min on first build) and
   runs `npm ci && npm run build` for the frontend (~1–2 min).
3. Once both show **Live**, open the frontend URL in a browser.

### 5 — Verify the deployment

```bash
# Health check
curl https://stadiumsense-backend.onrender.com/health
# → {"status":"ok","service":"stadiumsense-backend"}

# Live crowd pulse
curl https://stadiumsense-backend.onrender.com/api/pulse
# → {"stadium_id":"wc2026-stadium-1","zones":[...]}
```

---

## Updating after changes

Render auto-deploys on every push to `main`. To manually redeploy:

- Dashboard → service → **Manual Deploy → Deploy latest commit**

---

## CORS after deployment

Once both services are live, ensure `CORS_ORIGINS` on the backend is set to the
**exact** frontend URL Render assigns (no trailing slash):

```
CORS_ORIGINS=https://stadiumsense-frontend.onrender.com
```

If you add a custom domain, add it to the comma-separated list:

```
CORS_ORIGINS=https://stadiumsense-frontend.onrender.com,https://yourdomain.com
```

---

## Environment variable quick-reference

### Backend

```
GEMINI_API_KEY=<from Google AI Studio>
GOOGLE_CLOUD_PROJECT=<your GCP project id>
CORS_ORIGINS=https://stadiumsense-frontend.onrender.com
APP_ENV=production
```

### Frontend

```
VITE_API_BASE_URL=https://stadiumsense-backend.onrender.com
```

---

## Free tier caveats

- **Spin-down:** Render free web services sleep after 15 min of inactivity.
  The first request after sleep takes ~30 s. Upgrade to the Starter plan to
  avoid spin-down for a live demo.
- **Firestore:** Google Cloud Firestore requires a GCP project. The free
  Spark plan includes 1 GiB storage and 50K reads/day — more than enough
  for a demo.
- **Gemini API:** Google AI Studio free tier includes generous quota for
  `gemini-1.5-flash`. Monitor usage at [aistudio.google.com](https://aistudio.google.com).

---

## Local development

See the main [README](../README.md#local-development) for local setup instructions.
