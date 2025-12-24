from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, List
import uuid


class ChatMessage(BaseModel):
    message_id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:12]}")
    session_id: str
    user_id: str
    role: str  # user, assistant
    content: str
    sources: List[dict] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    portfolio_id: Optional[str] = None


class SearchRequest(BaseModel):
    query: str
    filters: dict = {}
    limit: int = 10
