"""
Firestore client — initialized once and reused via dependency injection.
Uses Application Default Credentials (ADC) in Cloud Run; no key file needed.
"""
import logging
from functools import lru_cache

from google.cloud import firestore

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache
def get_firestore_client() -> firestore.Client:
    settings = get_settings()
    logger.info(
        "Initialising Firestore client for project=%s database=%s",
        settings.google_cloud_project,
        settings.firestore_database,
    )
    return firestore.Client(
        project=settings.google_cloud_project or None,
        database=settings.firestore_database,
    )
