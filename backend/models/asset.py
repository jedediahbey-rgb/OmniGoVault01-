"""Asset and ledger models"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid


class SubjectCategory(BaseModel):
    """Track subject categories for RM-ID numbering"""
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    code: str  # 2-digit string: "01", "02", etc.
    name: str  # e.g., "Real Estate", "Vehicle Loan", "Court Case"
    description: str = ""
    is_active: bool = True
    next_sequence: int = 1
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Default seed categories
DEFAULT_SUBJECT_CATEGORIES = [
    {"code": "00", "name": "General", "description": "General/miscellaneous records"},
    {"code": "01", "name": "Real Estate", "description": "Real property transactions"},
    {"code": "02", "name": "Vehicle", "description": "Vehicle titles and loans"},
    {"code": "03", "name": "Financial Account", "description": "Bank accounts, investments"},
    {"code": "04", "name": "Court Case", "description": "Legal proceedings"},
    {"code": "05", "name": "Contract", "description": "Contracts and agreements"},
    {"code": "06", "name": "Notice", "description": "Notices and correspondence"},
    {"code": "07", "name": "Trust Administration", "description": "Trust management records"},
]


class RmIdDetails(BaseModel):
    """RM-ID configuration for a trust profile"""
    rm_id_raw: str = ""
    rm_id_normalized: str = ""
    is_placeholder: bool = False


class AssetItem(BaseModel):
    asset_id: str = Field(default_factory=lambda: f"asset_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    rm_id: str = ""
    subject_code: str = "00"
    subject_name: str = ""
    sequence_number: int = 1
    asset_type: str
    description: str
    value: Optional[float] = None
    status: str = "active"
    transaction_type: str = "deposit"
    notes: str = ""
    attachments: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TrustLedgerEntry(BaseModel):
    """Track res (property) movements in and out of trust"""
    entry_id: str = Field(default_factory=lambda: f"ledger_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    rm_id: str = ""
    subject_code: str = "00"
    subject_name: str = ""
    sequence_number: int = 1
    entry_type: str  # deposit, withdrawal, transfer_in, transfer_out
    description: str
    asset_id: Optional[str] = None
    document_id: Optional[str] = None
    value: Optional[float] = None
    balance_effect: str = "credit"
    notes: str = ""
    recorded_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
