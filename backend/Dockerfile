# =============================================================================
# StadiumSense AI — Backend Dockerfile
# Multi-stage build for a minimal production image.
# Compatible with Render (Docker runtime) and Google Cloud Run.
# Render injects $PORT at runtime; we default to 8080.
# =============================================================================

# ---- Stage 1: dependency builder ----
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build tools needed by some wheels (e.g. grpcio)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ---- Stage 2: lean runtime image ----
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy installed site-packages from builder (no build tools in final image)
COPY --from=builder /usr/local/lib/python3.11/site-packages \
                    /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy only the application source — no tests, no .env files
COPY app/ ./app/

# Render injects PORT; fall back to 8080 locally
ENV PORT=8080
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Run as a non-root user for least-privilege execution
RUN adduser --disabled-password --gecos "" appuser
USER appuser

EXPOSE 8080

# Bind to 0.0.0.0 so Render can route external traffic in
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 1"]
