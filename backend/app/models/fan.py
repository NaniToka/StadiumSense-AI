"""Request / response schemas for the Fan Companion API."""
from pydantic import BaseModel, Field

from app.models.ai import CrowdDensityLevel


class ChatMessage(BaseModel):
    """A single turn in the conversation history."""

    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class FanChatRequest(BaseModel):
    """
    Incoming chat request from a fan.

    The context fields (``location_zone``, ``accessibility_needs``,
    ``crowd_density``) are populated by the frontend using live data
    so the AI can personalise its response.
    """

    message: str = Field(..., min_length=1, max_length=2000)
    language: str = Field(default="en", max_length=10, description="BCP-47 language code")
    session_id: str | None = Field(default=None, max_length=128)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)

    # Context fields for AI personalisation
    location_zone: str = Field(default="unknown", max_length=100)
    accessibility_needs: str = Field(default="", max_length=200)
    crowd_density: CrowdDensityLevel = Field(default=CrowdDensityLevel.LOW)


class FanChatResponse(BaseModel):
    """Response returned to the fan."""

    reply: str
    session_id: str
    language: str
    intent: str = Field(default="general")
    suggested_action: str = Field(default="")
    suggestions: list[str] = Field(default_factory=list)
