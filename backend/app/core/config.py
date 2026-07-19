"""
Application configuration — all values sourced from environment variables.
Never hardcode secrets here.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Google Cloud
    google_cloud_project: str = ""
    google_cloud_region: str = "us-central1"

    # Gemini / Vertex AI
    gemini_model: str = "gemini-1.5-flash"
    gemini_api_key: str = ""  # Optional; prefer Vertex AI ADC in production

    # Firestore
    firestore_database: str = "(default)"

    # Stadium
    default_stadium_id: str = "wc2026-stadium-1"

    # Pulse simulator
    simulator_tick_interval: float = 5.0   # seconds between Firestore writes
    simulator_alert_threshold: float = 85.0  # density % that triggers an AI alert
    simulator_recovery_threshold: float = 75.0  # density % that clears alert lock

    # Rate limiting (AI endpoints)
    rate_limit_max_calls: int = 20   # requests per window per IP
    rate_limit_window_seconds: float = 60.0

    # App
    app_env: str = "development"
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
