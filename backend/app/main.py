"""
StadiumSense AI — FastAPI application entry point.

Lifecycle
---------
startup:  Pulse simulator background task starts, writing crowd density,
          sustainability metrics, and AI-generated alerts to Firestore every 5 s.
shutdown: Simulator cancelled gracefully.
"""
from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.routes import fan, health, ops
from app.routes import pulse as pulse_routes

# ---------------------------------------------------------------------------
# Logging — structured, no secrets in output
# ---------------------------------------------------------------------------

def _configure_logging() -> None:
    """
    Set up a clean log format for stdout (consumed by Render / Cloud Run).
    Avoids logging full request bodies or auth headers.
    """
    fmt = "%(asctime)s %(levelname)-8s %(name)s | %(message)s"
    logging.basicConfig(
        level=logging.INFO,
        format=fmt,
        stream=sys.stdout,
    )
    # Suppress overly chatty third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("google.auth").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


_configure_logging()
logger = logging.getLogger(__name__)
settings = get_settings()


# ---------------------------------------------------------------------------
# Lifespan: start / stop the pulse simulator
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """FastAPI lifespan context manager — manages the simulator task."""
    from app.services.pulse_simulator import get_simulator

    logger.info("Startup | env=%s cors=%s", settings.app_env, settings.cors_origins)
    simulator = get_simulator()
    await simulator.start()

    yield

    logger.info("Shutdown — stopping pulse simulator")
    await simulator.stop()


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="StadiumSense AI",
    description="AI-powered stadium operations platform for FIFA World Cup 2026.",
    version="0.2.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — locked to configured origins only
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

# ---------------------------------------------------------------------------
# Global 422 handler — return clean validation errors without leaking internals
# ---------------------------------------------------------------------------

from fastapi.exceptions import RequestValidationError  # noqa: E402


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    # Log at debug level only — validation errors are not server errors
    logger.debug("Request validation error: %s", exc.errors())
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Request validation failed.",
            "errors": exc.errors(),
        },
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

API_V1 = "/api/v1"

app.include_router(health.router)
app.include_router(fan.router, prefix=API_V1)
app.include_router(ops.router, prefix=API_V1)
app.include_router(pulse_routes.router)

logger.info("StadiumSense AI backend ready | v%s", app.version)
