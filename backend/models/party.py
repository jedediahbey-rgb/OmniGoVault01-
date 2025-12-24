from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional
import uuid


class Party(BaseModel):
    """People/entities associated with a trust"""
    party_id: str = Field(default_factory=lambda: f"party_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    name: str
    role: str  # grantor, trustee, co_trustee, beneficiary, successor_trustee, agent
    address: str = ""
    email: str = ""
    phone: str = ""
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PartyCreate(BaseModel):
    name: str
    role: str
    address: str = ""
    email: str = ""
    phone: str = ""
    notes: str = ""
    portfolio_id: Optional[str] = None


class PartyUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
