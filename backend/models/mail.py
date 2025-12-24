from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional
import uuid


class MailEvent(BaseModel):
    """Record of registered mail sent/received"""
    event_id: str = Field(default_factory=lambda: f"mail_{uuid.uuid4().hex[:12]}")
    profile_id: str
    user_id: str
    event_type: str  # sent, received, returned
    rm_id: str
    description: str
    recipient: str = ""
    sender: str = ""
    event_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tracking_status: str = "pending"
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MailEventCreate(BaseModel):
    profile_id: str
    event_type: str
    rm_id: str
    description: str
    recipient: str = ""
    sender: str = ""
    event_date: Optional[str] = None
    notes: str = ""


class NoticeEvent(BaseModel):
    """Notice or communication record"""
    notice_id: str = Field(default_factory=lambda: f"notice_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    notice_type: str  # notice_of_interest, notice_of_delivery, special_notice
    title: str
    description: str = ""
    recipient: str = ""
    sent_date: Optional[datetime] = None
    rm_id_reference: str = ""
    status: str = "draft"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NoticeCreate(BaseModel):
    portfolio_id: str
    notice_type: str
    title: str
    description: str = ""
    recipient: str = ""
    rm_id_reference: str = ""
