# StadiumSense AI 🏟️⚽

> AI-powered stadium operations platform for FIFA World Cup 2026 — real-time crowd intelligence for fans and organizers, in one cohesive system.

**[Live Demo →](https://stadiumsense-frontend.onrender.com)** &nbsp;|&nbsp; **[Backend API Docs →](https://stadiumsense-backend.onrender.com/docs)**

---

## What is StadiumSense AI?

StadiumSense AI is a full-stack, AI-driven operations platform built for the FIFA World Cup 2026. It addresses one of the hardest problems in large-scale live events: getting the right information to the right person at the right time — whether that person is a fan trying to find the least-crowded food court in Arabic, or an operations volunteer deciding where to deploy three extra stewards in the next five minutes.

The platform uses **Google Gemini 1.5 Flash** as its reasoning core, **Firestore** as a real-time state store for crowd density and operational alerts, and a simulated IoT sensor layer that runs continuously in the background — because no real stadium hardware is available outside a live World Cup match.

---

## Chosen Vertical — Smart Stadiums & Tournament Operations

FIFA World Cup 2026 spans 16 cities and 3 countries, with matches attended by 60,000–94,000 fans per game. Stadium operations at that scale require:

- **Real-time crowd awareness** to prevent crushes and improve flow
- **Multilingual fan assistance** for a global audience arriving from every continent
- **Operational intelligence** that surfaces actionable recommendations, not just raw sensor data
- **Sustainability tracking** to meet FIFA's green event commitments
- **Accessibility routing** for fans with mobility, visual, or hearing needs

No single existing tool covers all of these. StadiumSense AI does.

---

## Dual-Persona Design

The system is intentionally split into two views served by a single backend — because the right answer to "how crowded is Zone C?" is completely different depending on who is asking.

### ⚽ Fan Companion (public)

A mobile-first, chat-based multilingual assistant. A fan can ask "¿Dónde está la salida más cercana?" or "أين أقرب مخرج؟" and receive a response grounded in live crowd data, their current zone, and any accessibility needs they've declared.

The AI knows the current density of every zone and adjusts its suggestions accordingly — if the main exit is critically overcrowded, it proactively recommends an alternate route before the fan even asks.

**Covers:** navigation · crowd avoidance · transport (metro, shuttle, taxi) · accessibility routing · sustainability tips

### 🎛️ Ops Command Center (organizer/volunteer)

A control-room dashboard with a live SVG stadium heatmap, an AI-generated alert feed with one-click resolve, cumulative sustainability metrics, and a free-text "Ask AI" panel. An organizer can type "Where should I deploy 3 extra volunteers right now?" and get a Gemini-reasoned answer grounded in the current crowd state.

**Covers:** live heatmap · AI alert generation & triage · crowd flow management · waste bin fill levels · carbon-saved-via-transit tracking

The two views share one backend, one AI reasoning pipeline, and one Firestore state store — making the architecture cohesive rather than bolted together.

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (SPA)                       │
│                                                         │
│  ┌─────────────────┐         ┌───────────────────────┐  │
│  │  Fan Companion  │         │  Ops Command Center   │  │
│  │  (chat, mobile) │         │  (dashboard, desktop) │  │
│  └────────┬────────┘         └──────────┬────────────┘  │
│           └──────────────┬──────────────┘               │
└──────────────────────────┼──────────────────────────────┘
                           │ HTTPS / REST
                           ▼
┌──────────────────────────────────────────────────────────┐
│              FastAPI Backend (Render / Docker)            │
│                                                          │
│  POST /api/v1/fan/chat         ← Fan AI chat             │
│  GET  /api/pulse               ← Live zone density       │
│  GET  /api/alerts              ← Active ops alerts       │
│  POST /api/alerts/resolve      ← Mark alert resolved     │
│  GET  /api/sustainability      ← Energy/waste/carbon     │
│  POST /api/v1/ops/alerts/generate  ← Ask AI (ops)        │
│                                                          │
│  ┌──────────────────┐   ┌──────────────────────────────┐ │
│  │  Google Gemini   │   │   Google Cloud Firestore     │ │
│  │  1.5 Flash       │   │                              │ │
│  │  (AI reasoning)  │   │  stadiums/{id}/zones/        │ │
│  └──────────────────┘   │  stadiums/{id}/alerts/       │ │
│                         │  stadiums/{id}/sustainability│ │
│  ┌──────────────────┐   └──────────────────────────────┘ │
│  │ Pulse Simulator  │                                    │
│  │ (background task)│                                    │
│  │ random-walk IoT  │                                    │
│  └──────────────────┘                                    │
└──────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite 8 + Tailwind CSS v4 |
| Backend | Python 3.11 + FastAPI 0.111 + Uvicorn |
| AI | Google Gemini 1.5 Flash via `google-genai` SDK |
| Database | Google Cloud Firestore (real-time state) |
| Deployment | Render (Docker backend + Static Site frontend) |

### How Gemini Is Used

Every AI call goes through a single `get_ai_response()` function in `backend/app/services/ai_service.py`. It:

1. **Sanitises input** — strips control characters, removes prompt-injection patterns, truncates to 1,000 chars.
2. **Builds a contextual prompt** — injects role (fan/organizer/volunteer), current zone, live crowd density, language preference, and accessibility needs so every response is personalised.
3. **Calls Gemini** — offloaded to a thread pool so the async event loop is never blocked.
4. **Parses structured JSON** — Gemini is instructed to return only a JSON object with `intent`, `response_text`, `suggested_action`, and `confidence`. Unknown intents fall back gracefully.
5. **Rate limits** — in-memory sliding-window limiter (20 requests/60 s per IP) prevents API abuse.

The fan chat prompt includes a live snapshot of all zone densities from Firestore as grounding context, so the AI's navigation suggestions reflect the actual stadium state at the moment of the request.

---

## Assumptions

| Assumption | Rationale |
|---|---|
| **Simulated IoT sensor data** | No real stadium hardware is available outside a live World Cup match. The pulse simulator runs a bounded random walk (σ ≈ 3% of zone capacity per tick) that mimics realistic crowd ebb and flow, triggers AI alerts when zones cross 85% density, and updates Firestore every 5 seconds. |
| **Six representative zones** | Main Gate, Fan Zone, Food Court, Parking, Metro/Transit Hub, VIP Entrance — these cover the major crowd chokepoints at any modern stadium. |
| **Five priority languages** | English, Spanish, Arabic, Hindi, and Portuguese were chosen because they cover the primary language groups of FIFA World Cup 2026 host countries and the largest global football fan bases. The AI responds in whichever language the user selects. |
| **Single stadium per deployment** | The architecture supports multiple stadium IDs via a `stadium_id` query param, but the demo runs against one configured stadium for simplicity. |
| **Render free tier** | The backend may spin down after 15 min of inactivity. The first cold-start request takes ~30 s. For a live event this would be replaced with a paid always-on instance. |

---

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.11+
- A Google Cloud project with Firestore enabled
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Backend

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and fill in the environment file
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY and GOOGLE_CLOUD_PROJECT

# Start the development server
uvicorn app.main:app --reload --port 8080
# API docs at http://localhost:8080/docs
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and configure the environment file
cp .env.example .env
# Leave VITE_API_BASE_URL empty — the Vite proxy handles /api → localhost:8080

# Start the development server
npm run dev
# App at http://localhost:5173
```

### Running Tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
# Tests mock all Gemini and Firestore calls — no live credentials needed
```

---

## Deployment

See [`docs/deployment.md`](docs/deployment.md) for full Render deployment steps including:
- Creating a Render account and connecting the GitHub repo
- Setting environment variables (`GEMINI_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `CORS_ORIGINS`, `VITE_API_BASE_URL`)
- Triggering the first deploy and verifying the live services

---

## Project Structure

```
StadiumSense_AI/
├── render.yaml              ← Render IaC (backend + frontend services)
├── backend/
│   ├── Dockerfile           ← Multi-stage, non-root, Render-compatible
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py          ← FastAPI app, CORS, structured logging
│       ├── core/            ← config, Gemini client, Firestore client, rate limiter
│       ├── models/          ← Pydantic schemas (fan, ops, ai, pulse)
│       ├── routes/          ← fan, ops, pulse, health
│       └── services/        ← ai_service, fan_service, ops_service,
│                               firestore_service, pulse_simulator
├── frontend/
│   ├── .env.example
│   └── src/
│       ├── pages/           ← FanCompanion, OpsCommandCenter
│       ├── components/      ← fan/, ops/, shared/
│       ├── hooks/           ← useFanChat, useLivePulse, useOpsData
│       ├── services/        ← api.ts (Axios clients)
│       ├── context/         ← AppContext (locale, a11y)
│       ├── i18n/            ← strings.ts (5 languages)
│       └── types/           ← index.ts
├── tests/
│   ├── conftest.py          ← Fixtures + SDK stubs (offline)
│   ├── test_ai_service.py   ← 20 unit tests (sanitise, prompt, parse, coerce, e2e)
│   ├── test_fan_endpoint.py ← 12 endpoint tests (validation, injection, 422s)
│   └── test_pulse_endpoints.py ← 16 endpoint tests (pulse, alerts, resolve, sustainability)
└── docs/
    ├── architecture.md
    └── deployment.md
```

---

## Screenshots

> *Screenshots will be added after the first production deploy.*

| Fan Companion | Ops Command Center |
|---|---|
| *(placeholder)* | *(placeholder)* |

---

## Security & Quality

- **No secrets committed** — `.env` is gitignored; `.env.example` contains only placeholder values
- **Input validation** — every endpoint enforces field-level constraints (min/max length, enum allowlists, regex patterns for IDs)
- **Prompt injection guard** — 7 regex patterns strip jailbreak attempts before they reach Gemini
- **CORS** — locked to configured frontend origin only; `allow_methods` restricted to GET/POST/OPTIONS
- **Rate limiting** — in-memory sliding-window limiter (20 req/60 s per IP) on all AI endpoints
- **Non-root Docker** — runtime container runs as `appuser`, not root
- **Structured logging** — stdout logs with level/timestamp/module; sensitive fields never logged

---

## Credits

Built by **Toka Nani** for the FIFA World Cup 2026 AI Challenge.

| | |
|---|---|
| GitHub | [github.com/NaniToka](https://github.com/NaniToka) |
| LinkedIn | [linkedin.com/in/toka-nani-33a124359](https://www.linkedin.com/in/toka-nani-33a124359/) |
| Portfolio | [toka-portfolio-2.onrender.com](https://toka-portfolio-2.onrender.com/) |
| Email | tokananiy@gmail.com |

---

*StadiumSense AI — because every fan deserves a great match-day experience, and every organizer deserves the intelligence to make it happen.*
