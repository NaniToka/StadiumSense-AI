"""
Gemini AI client factory.

Uses the Google AI Studio API key (GEMINI_API_KEY) via the ``google-genai``
package (the current, actively-maintained SDK).
No Vertex AI / GCP credentials required — suitable for Render deployment.
"""
import logging
from functools import lru_cache

from google import genai
from google.genai import types as genai_types

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@lru_cache
def get_gemini_client() -> genai.Client:
    """
    Return a configured :class:`google.genai.Client` instance.

    The client is initialised once and cached for the lifetime of the process.

    Returns:
        An authenticated :class:`~google.genai.Client`.

    Raises:
        ValueError: If ``GEMINI_API_KEY`` is not set in the environment.
    """
    settings = get_settings()

    if not settings.gemini_api_key:
        raise ValueError(
            "GEMINI_API_KEY is not set. "
            "Add it to your environment variables or .env file."
        )

    logger.info("Configuring Gemini via Google AI Studio API key")
    return genai.Client(api_key=settings.gemini_api_key)


def generate_content(prompt: str) -> str:
    """
    Call Gemini and return the raw response text.

    Thin wrapper around the client so callers don't import ``google.genai``
    directly, keeping the rest of the codebase decoupled from the SDK.

    Args:
        prompt: The fully-assembled prompt string.

    Returns:
        The model's raw text output.

    Raises:
        Exception: Propagates any SDK / network exception to the caller.
    """
    settings = get_settings()
    client = get_gemini_client()
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
    )
    return response.text
