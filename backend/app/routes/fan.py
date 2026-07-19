"""Fan Companion routes — public-facing chat API."""
from fastapi import APIRouter, Request

from app.models.fan import FanChatRequest, FanChatResponse
from app.services.fan_service import handle_fan_chat

router = APIRouter(prefix="/fan", tags=["Fan Companion"])


@router.post("/chat", response_model=FanChatResponse, summary="Send a chat message")
async def chat(request: FanChatRequest, http_request: Request) -> FanChatResponse:
    """
    Multilingual AI assistant for fans.

    - Navigation (gates, restrooms, concessions)
    - Crowd avoidance suggestions
    - Transport & accessibility info

    The client IP is forwarded to the AI service as the rate-limit key.
    """
    client_ip: str = http_request.client.host if http_request.client else "unknown"
    return await handle_fan_chat(request, client_ip=client_ip)
