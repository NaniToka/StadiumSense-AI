"""
Shared AI input/output models used by both Fan Companion and Ops services.
"""
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class UserRole(str, Enum):
    """Who is making the request."""

    FAN = "fan"
    ORGANIZER = "organizer"
    VOLUNTEER = "volunteer"


class CrowdDensityLevel(str, Enum):
    """Coarse crowd density signal passed in from the frontend."""

    LOW = "low"        # < 50 %
    MODERATE = "moderate"  # 50–74 %
    HIGH = "high"      # 75–89 %
    CRITICAL = "critical"  # ≥ 90 %


class Intent(str, Enum):
    """Intents the AI can classify a query into."""

    NAVIGATION = "navigation"
    CROWD_STATUS = "crowd_status"
    TRANSPORT = "transport"
    ACCESSIBILITY = "accessibility"
    SUSTAINABILITY_TIP = "sustainability_tip"
    OPERATIONAL_ALERT = "operational_alert"
    GENERAL = "general"


class UserContext(BaseModel):
    """
    Contextual metadata injected into every Gemini prompt so that
    responses are personalised to the individual's situation.

    Attributes:
        role:               Whether the requester is a fan, organizer, or volunteer.
        location_zone:      Current zone / stand name (e.g. "North Stand – Gate 7").
        language:           BCP-47 language code for the desired reply language.
        accessibility_needs: Free-text accessibility requirements (e.g. "wheelchair user",
                            "visual impairment", "hearing aid"). Empty string means none.
        crowd_density:      Coarse crowd density at the user's current zone.
    """

    role: UserRole = Field(..., description="Requester role")
    location_zone: str = Field(
        default="unknown",
        max_length=100,
        description="Current zone or stand label",
    )
    language: str = Field(
        default="en",
        max_length=10,
        description="BCP-47 language code for the AI reply",
    )
    accessibility_needs: str = Field(
        default="",
        max_length=200,
        description="Free-text accessibility requirements; empty means none",
    )
    crowd_density: CrowdDensityLevel = Field(
        default=CrowdDensityLevel.LOW,
        description="Current crowd density at the user's zone",
    )

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        """Accept only simple BCP-47 codes (e.g. 'en', 'pt-BR', 'ar')."""
        import re
        if not re.match(r"^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$", v):
            raise ValueError(f"Invalid BCP-47 language code: {v!r}")
        return v.lower()


class AIResponse(BaseModel):
    """
    Structured response returned by ``get_ai_response()``.

    Attributes:
        intent:           Classified intent of the user's query.
        response_text:    Natural-language answer in the requested language.
        suggested_action: Short, actionable follow-up the UI can render as a button
                          (e.g. "Show route to Gate 7"). Empty string if none.
        confidence:       Model's self-reported confidence in the intent classification,
                          in the range [0.0, 1.0].
    """

    intent: Intent
    response_text: str
    suggested_action: str = ""
    confidence: float = Field(..., ge=0.0, le=1.0)
