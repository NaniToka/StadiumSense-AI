# Architecture — StadiumSense AI

## System Overview

```
┌──────────────────────────────────────────────┐
│                  Browser                     │
│  ┌───────────────┐   ┌──────────────────┐    │
│  │ Fan Companion │   │ Ops Command Ctr  │    │
│  │  (React SPA)  │   │   (React SPA)    │    │
│  └──────┬────────┘   └────────┬─────────┘    │
│         └──────────┬──────────┘              │
└──────────────────────────────────────────────┘
                     │ HTTPS / REST
                     ▼
┌──────────────────────────────────────────────┐
│         FastAPI Backend (Cloud Run)           │
│                                              │
│  POST /api/v1/fan/chat                       │
│  GET  /api/v1/ops/stadium/:id/pulse          │
│  GET  /api/v1/ops/stadium/:id/alerts         │
│  POST /api/v1/ops/alerts/generate            │
│  GET  /api/v1/ops/stadium/:id/sustainability │
│  GET  /health                                │
│                                              │
│  ┌────────────┐  ┌────────────────────────┐  │
│  │ Firestore  │  │  Vertex AI / Gemini     │  │
│  │  (state)   │  │  1.5 Flash (reasoning) │  │
│  └────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────┘
```

## Data Flow

### Fan Chat
1. User sends message (+ language + history) → `POST /fan/chat`
2. Backend fetches live stadium pulse from Firestore for grounding
3. Constructs a Gemini prompt with stadium context and conversation history
4. Returns AI reply + quick-reply suggestions

### Ops Heatmap
1. Frontend polls `GET /ops/stadium/:id/pulse` every 10 s
2. Backend reads zone occupancy documents from Firestore
3. Frontend renders ZoneCards; future: replace with SVG heatmap overlay

### AI Alerts
1. Triggered manually or on threshold breach
2. `POST /ops/alerts/generate` sends stadium state context to Gemini
3. Gemini reasons over the context and suggests an action
4. Alert persisted to Firestore and returned to dashboard

## Key Design Decisions

| Decision | Rationale |
|---|---|
| FastAPI over Flask | Native async support, auto-generated OpenAPI docs, Pydantic validation |
| Vertex AI ADC in prod | No API key in container; Cloud Run service account provides auth |
| Polling over WebSocket (initial) | Simpler scaffolding; replace with Firestore real-time listener when ready |
| Vite proxy in dev | Avoids CORS issues without a separate nginx; `VITE_API_BASE_URL` overrides in prod |
| Multi-stage Dockerfile | Smaller final image; no build tools in runtime layer |
