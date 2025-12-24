from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional
import uuid


class TrustLedgerEntry(BaseModel):
    """Ledger entry for trust accounting"""
    entry_id: str = Field(default_factory=lambda: f"ledger_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    rm_id: str = ""
    subject_code: str = "00"
    subject_name: str = "General"
    entry_type: str  # deposit, withdrawal, transfer_in, transfer_out, adjustment
    description: str
    value: Optional[float] = None
    balance_effect: str = "credit"  # credit or debit
    recorded_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    related_asset_id: Optional[str] = None
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LedgerEntryCreate(BaseModel):
    entry_type: str
    subject_code: str = "00"
    description: str
    value: Optional[float] = None
    balance_effect: str = "credit"
    notes: str = ""


class LedgerEntryUpdate(BaseModel):
    description: Optional[str] = None
    value: Optional[float] = None
    notes: Optional[str] = None
