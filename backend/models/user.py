from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid


class User(BaseModel):
    user_id: str = Field(default_factory=lambda: f"user_{uuid.uuid4().hex[:12]}")
    email: str
    name: str = ""
    picture: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SessionData(BaseModel):
    session_id: str
    user_id: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
