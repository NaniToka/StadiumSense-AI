"""
Core AI reasoning service for StadiumSense AI.

This module is the single point of contact for all Gemini calls.  Both the
Fan Companion and the Ops Command Center funnel through
:func:`get_ai_response` so prompt engineering, intent detection, JSON
parsing, and error handling live in one place.

Architecture
------------
1. :func:`sanitize_query`      — strips/truncates unsafe input before it
                                 touches the model.
2. :func:`build_prompt`        — assembles a richly-contextualised system +
                                 user prompt from a :class:`UserContext`.
3. :func:`_parse_ai_json`      — robustly extracts the JSON block Gemini
                                 returns, even when wrapped in markdown fences.
4. :func:`get_ai_response`     — orchestrates the above, runs rate-limit
                                 checks, calls the model, and returns a typed
                                 :class:`AIResponse`.  Falls back gracefully
                                 on any error.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import unicodedata
from typing import Any

from app.core.gemini import generate_content
from app.core.rate_limiter import ai_rate_limiter
from app.models.ai import AIResponse, CrowdDensityLevel, Intent, UserContext, UserRole

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

#: Hard cap on sanitised query length sent to the model.
MAX_QUERY_LENGTH: int = 1_000

#: Valid intent strings — kept in sync with the :class:`Intent` enum.
_VALID_INTENTS: frozenset[str] = frozenset(i.value for i in Intent)

#: Crowd density → human-readable advisory injected into the prompt.
_DENSITY_ADVISORY: dict[CrowdDensityLevel, str] = {
    CrowdDensityLevel.LOW:      "The area is currently quiet — normal movement is easy.",
    CrowdDensityLevel.MODERATE: "Moderate crowds are present — some queuing expected.",
    CrowdDensityLevel.HIGH:     "The area is busy — recommend alternate routes where possible.",
    CrowdDensityLevel.CRITICAL: (
        "WARNING: The zone is critically overcrowded. "
        "Prioritise safety; suggest the fastest, least-congested exit or alternative."
    ),
}

#: Role → behavioural instruction injected into the system prompt.
_ROLE_INSTRUCTION: dict[UserRole, str] = {
    UserRole.FAN: (
        "You are a friendly, helpful stadium assistant for a FIFA World Cup 2026 fan. "
        "Keep answers concise, warm, and practical. "
        "Use simple language appropriate for a general audience."
    ),
    UserRole.ORGANIZER: (
        "You are an expert operations advisor for a FIFA World Cup 2026 stadium organizer. "
        "Provide precise, actionable operational guidance. "
        "Include crowd management best practices and safety protocols where relevant."
    ),
    UserRole.VOLUNTEER: (
        "You are a knowledgeable support assistant for a FIFA World Cup 2026 volunteer. "
        "Provide clear step-by-step instructions. "
        "Emphasise safety procedures and escalation paths when needed."
    ),
}

#: Fallback response returned when the Gemini call fails entirely.
_FALLBACK_RESPONSE = AIResponse(
    intent=Intent.GENERAL,
    response_text=(
        "I'm sorry, I'm unable to process your request right now. "
        "Please try again in a moment or ask a nearby staff member for assistance."
    ),
    suggested_action="Contact stadium staff",
    confidence=0.0,
)

# ---------------------------------------------------------------------------
# Input sanitisation
# ---------------------------------------------------------------------------


def sanitize_query(raw: str) -> str:
    """
    Sanitise free-text user input before it is embedded in an AI prompt.

    Steps applied in order:

    1. Normalise Unicode to NFC form to collapse combining characters.
    2. Strip ASCII control characters (except newlines and tabs, which are
       preserved so multi-line messages remain readable).
    3. Remove common prompt-injection patterns (e.g. ``ignore previous
       instructions``, role-override phrases, and delimiter tokens such as
       ``</system>`` that could escape the prompt boundary).
    4. Collapse runs of whitespace to a single space and strip leading/
       trailing whitespace.
    5. Truncate to :data:`MAX_QUERY_LENGTH` characters.

    Args:
        raw: The raw user-supplied query string.

    Returns:
        A cleaned, length-bounded string safe to embed in a prompt.

    Raises:
        ValueError: If the sanitised result is empty.
    """
    # 1. Unicode normalisation
    text = unicodedata.normalize("NFC", raw)

    # 2. Strip ASCII control chars (keep \n \t)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # 3. Prompt-injection guard — remove known jailbreak / override patterns
    injection_patterns: list[str] = [
        r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?",
        r"disregard\s+(all\s+)?(previous|prior|above)\s+instructions?",
        r"you\s+are\s+now\s+(?:a\s+)?(?:an?\s+)?\w+",   # "you are now a ..."
        r"act\s+as\s+(?:a\s+)?(?:an?\s+)?\w+",           # "act as a ..."
        r"</?(?:system|user|assistant|prompt|context)>",  # XML-style delimiters
        r"\[/?(?:INST|SYS|SYSTEM|END)\]",                 # LLaMA-style tokens
        r"###\s*(?:System|Instruction|Prompt)",            # markdown header abuse
    ]
    for pattern in injection_patterns:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE)

    # 4. Collapse whitespace
    text = re.sub(r"[ \t]+", " ", text).strip()

    # 5. Truncate
    text = text[:MAX_QUERY_LENGTH]

    if not text:
        raise ValueError("Query is empty after sanitisation.")

    return text


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------


def build_prompt(context: UserContext, query: str) -> str:
    """
    Construct the full prompt sent to Gemini.

    The prompt has three sections:

    * **System block** — role persona, stadium facts, output contract.
    * **Context block** — user's zone, accessibility needs, crowd level.
    * **Query block** — the sanitised user question.

    Gemini is instructed to reply *only* with a JSON object matching the
    :class:`~app.models.ai.AIResponse` schema so downstream parsing is
    deterministic.

    Args:
        context: Populated :class:`UserContext` for this request.
        query:   Sanitised user query string.

    Returns:
        A single string prompt ready to pass to ``model.generate_content()``.
    """
    accessibility_note = (
        f"The user has the following accessibility needs: {context.accessibility_needs}. "
        "Prioritise routes and suggestions that accommodate these needs — for example, "
        "avoid stairs, recommend lifts/ramps, and flag accessible facilities."
        if context.accessibility_needs.strip()
        else "The user has no stated accessibility requirements."
    )

    density_advisory = _DENSITY_ADVISORY[context.crowd_density]
    role_instruction = _ROLE_INSTRUCTION[context.role]
    reply_language = context.language

    valid_intents = ", ".join(sorted(_VALID_INTENTS))

    prompt = f"""
{role_instruction}

You are operating inside StadiumSense AI, an operations platform for the FIFA World Cup 2026.
Your responses must be grounded in practical stadium operations knowledge.

=== USER CONTEXT ===
- Current zone / location : {context.location_zone}
- Crowd density           : {context.crowd_density.value} — {density_advisory}
- {accessibility_note}
- Reply language          : {reply_language} (use this language for response_text)

=== OUTPUT CONTRACT ===
You MUST respond with ONLY a single valid JSON object — no prose, no markdown fences.
The JSON object must have exactly these four keys:

{{
  "intent"          : one of [{valid_intents}],
  "response_text"   : "<answer in {reply_language}, 1–4 sentences, plain text>",
  "suggested_action": "<short actionable follow-up or empty string>",
  "confidence"      : <float 0.0–1.0 for your intent classification certainty>
}}

Intent selection guide:
- navigation          → directions, gates, seating, toilets, concessions
- crowd_status        → crowd density queries, wait times, congestion
- transport           → parking, shuttles, metro, taxis, drop-off/pick-up
- accessibility       → wheelchair access, lifts, hearing loops, assistance
- sustainability_tip  → recycling, water stations, carbon, eco initiatives
- operational_alert   → safety incidents, capacity breaches, staff escalations
- general             → anything that does not fit the above

=== USER QUERY ===
{query}
""".strip()

    return prompt


# ---------------------------------------------------------------------------
# JSON parsing
# ---------------------------------------------------------------------------


def _parse_ai_json(raw_text: str) -> dict[str, Any]:
    """
    Extract and parse the JSON object from the model's raw output.

    Gemini occasionally wraps its JSON in markdown code fences (```json … ```)
    or emits leading/trailing whitespace.  This function strips those wrappers
    before calling ``json.loads``.

    Args:
        raw_text: The raw string returned by ``response.text``.

    Returns:
        Parsed dictionary.

    Raises:
        ValueError: If no valid JSON object can be extracted.
    """
    text = raw_text.strip()

    # Strip markdown code fences if present
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    else:
        # Fall back: find the first '{' … last '}' block
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise ValueError(f"No JSON object found in model output: {text[:200]!r}")
        text = text[start : end + 1]

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"JSON parse error: {exc}  |  raw: {text[:200]!r}") from exc


# ---------------------------------------------------------------------------
# Intent + confidence validation
# ---------------------------------------------------------------------------


def _validate_and_coerce(data: dict[str, Any]) -> AIResponse:
    """
    Validate the parsed JSON dict and coerce it into an :class:`AIResponse`.

    Unknown intent values are replaced with ``general``.
    Confidence values outside [0, 1] are clamped.

    Args:
        data: Dictionary parsed from the model's JSON output.

    Returns:
        A fully-validated :class:`AIResponse` instance.
    """
    # Coerce intent
    raw_intent = str(data.get("intent", "general")).strip().lower()
    if raw_intent not in _VALID_INTENTS:
        logger.warning("Unknown intent %r from model — falling back to 'general'", raw_intent)
        raw_intent = Intent.GENERAL.value

    # Coerce confidence
    try:
        confidence = float(data.get("confidence", 0.5))
        confidence = max(0.0, min(1.0, confidence))
    except (TypeError, ValueError):
        confidence = 0.5

    return AIResponse(
        intent=Intent(raw_intent),
        response_text=str(data.get("response_text", "")).strip(),
        suggested_action=str(data.get("suggested_action", "")).strip(),
        confidence=confidence,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def get_ai_response(
    user_context: UserContext,
    query: str,
    *,
    rate_limit_key: str = "global",
) -> AIResponse:
    """
    Central AI reasoning function for StadiumSense AI.

    Orchestrates input sanitisation → rate-limit check → prompt construction
    → Gemini call → JSON parsing → typed response.  Returns a safe fallback
    :class:`AIResponse` on any unrecoverable error so callers never receive
    an unhandled exception from this function.

    Args:
        user_context:    Contextual metadata about the requester (role, zone,
                         language, accessibility needs, crowd density).
        query:           Raw user query string (will be sanitised internally).
        rate_limit_key:  Identifier used for rate limiting — pass the client
                         IP address or session ID.  Defaults to ``"global"``
                         which applies a single shared bucket (acceptable for
                         low-traffic dev; always pass a real key in production).

    Returns:
        An :class:`AIResponse` with ``intent``, ``response_text``,
        ``suggested_action``, and ``confidence`` fields.

    Notes:
        * The function is ``async`` but the underlying ``google-generativeai``
          ``generate_content`` call is synchronous.  It is offloaded to a
          thread-pool executor via :func:`asyncio.to_thread` so the event loop
          is never blocked.
        * Rate limiting is enforced *before* the model call to avoid burning
          API quota on requests that would be rejected anyway.
    """
    # ------------------------------------------------------------------
    # 1. Sanitise input
    # ------------------------------------------------------------------
    try:
        clean_query = sanitize_query(query)
    except ValueError as exc:
        logger.warning("Query sanitisation failed: %s", exc)
        return AIResponse(
            intent=Intent.GENERAL,
            response_text="Your message could not be processed. Please try rephrasing.",
            suggested_action="",
            confidence=0.0,
        )

    # ------------------------------------------------------------------
    # 2. Rate-limit check
    # ------------------------------------------------------------------
    rate_result = ai_rate_limiter.check(rate_limit_key)
    if not rate_result.allowed:
        logger.warning(
            "Rate limit hit for key=%r retry_after=%.1fs",
            rate_limit_key,
            rate_result.retry_after,
        )
        return AIResponse(
            intent=Intent.GENERAL,
            response_text=(
                f"You've sent too many requests. "
                f"Please wait {int(rate_result.retry_after) + 1} seconds and try again."
            ),
            suggested_action="",
            confidence=1.0,
        )

    # ------------------------------------------------------------------
    # 3. Build prompt
    # ------------------------------------------------------------------
    prompt = build_prompt(user_context, clean_query)
    logger.debug(
        "Sending prompt to Gemini | role=%s zone=%r lang=%s density=%s",
        user_context.role.value,
        user_context.location_zone,
        user_context.language,
        user_context.crowd_density.value,
    )

    # ------------------------------------------------------------------
    # 4. Call Gemini (offloaded to thread pool — non-blocking)
    # ------------------------------------------------------------------
    try:
        raw_text: str = await asyncio.to_thread(generate_content, prompt)

    except Exception as exc:  # noqa: BLE001
        logger.error("Gemini API call failed: %s", exc, exc_info=True)
        return _FALLBACK_RESPONSE

    # ------------------------------------------------------------------
    # 5. Parse and validate the JSON response
    # ------------------------------------------------------------------
    try:
        data = _parse_ai_json(raw_text)
        result = _validate_and_coerce(data)
    except ValueError as exc:
        logger.error("Failed to parse Gemini response: %s | raw=%r", exc, raw_text[:300])
        return _FALLBACK_RESPONSE

    logger.info(
        "AI response | intent=%s confidence=%.2f zone=%r",
        result.intent.value,
        result.confidence,
        user_context.location_zone,
    )
    return result
