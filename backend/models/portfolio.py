from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid


class Portfolio(BaseModel):
    portfolio_id: str = Field(default_factory=lambda: f"port_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    description: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PortfolioCreate(BaseModel):
    name: str
    description: str = ""
