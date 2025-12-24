from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, List
import uuid


class TrustProfile(BaseModel):
    profile_id: str = Field(default_factory=lambda: f"trust_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    trust_name: str = ""
    trust_type: str = "pure_equity"  # pure_equity, foreign_grantor, revocable, irrevocable
    grantor_name: str = ""
    trustee_name: str = ""
    beneficiary_info: str = ""
    state: str = ""
    county: str = ""
    creation_date: Optional[str] = None
    # RM-ID Fields
    rm_record_id: str = ""  # Legacy field - the actual RM number (e.g., "RF 123 456 789 US")
    rm_id_raw: str = ""  # Exact user input (e.g., "RF 123 456 789 US")
    rm_id_normalized: str = ""  # Normalized: uppercase, no extra spaces (e.g., "RF123456789US")
    rm_id_is_placeholder: bool = False  # True if system-generated placeholder
    rm_id_details: Optional[dict] = None
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MailEvent(BaseModel):
    """Record of registered mail sent/received"""
    event_id: str = Field(default_factory=lambda: f"mail_{uuid.uuid4().hex[:12]}")
    profile_id: str
    user_id: str
    event_type: str  # sent, received, returned
    rm_id: str  # Copy of RM-ID for fast search
    description: str
    recipient: str = ""
    sender: str = ""
    event_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tracking_status: str = "pending"  # pending, in_transit, delivered, returned
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SubjectCategory(BaseModel):
    """Subject categories for RM-ID sub-records (01-99)"""
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    code: str  # 2-digit: "01", "02", etc.
    name: str  # e.g., "Real Property", "Vehicles", "Contracts"
    description: str = ""
    sequence_counter: int = 0  # Current sequence for this category (001, 002, etc.)
    is_default: bool = False  # True for system-created categories
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RmIdDetails(BaseModel):
    """Parsed RM-ID components"""
    full_rm_id: str
    prefix: str = ""  # e.g., "RF"
    number_block: str = ""  # e.g., "123456789"
    suffix: str = ""  # e.g., "US"
    subject_code: str = ""  # e.g., "01"
    sequence: str = ""  # e.g., "001"


class TrustProfileCreate(BaseModel):
    portfolio_id: str
    trust_name: str = ""
    rm_record_id: str = ""


class TrustProfileUpdate(BaseModel):
    trust_name: Optional[str] = None
    trust_type: Optional[str] = None
    grantor_name: Optional[str] = None
    trustee_name: Optional[str] = None
    beneficiary_info: Optional[str] = None
    state: Optional[str] = None
    county: Optional[str] = None
    creation_date: Optional[str] = None
    rm_record_id: Optional[str] = None
    rm_id_raw: Optional[str] = None
    rm_id_normalized: Optional[str] = None
    rm_id_is_placeholder: Optional[bool] = None
    rm_id_details: Optional[dict] = None
    notes: Optional[str] = None


class SubjectCategoryCreate(BaseModel):
    name: str
    description: str = ""
    code: Optional[str] = None


class SubjectCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
