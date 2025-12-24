from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional
import uuid


class AssetItem(BaseModel):
    """Asset/property held by the trust"""
    asset_id: str = Field(default_factory=lambda: f"asset_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    rm_id: str = ""
    subject_code: str = "00"
    subject_name: str = "General"
    description: str
    asset_type: str  # real_property, personal_property, financial_account, vehicle, securities
    value: Optional[float] = None
    status: str = "active"  # active, transferred_out, sold
    acquisition_date: Optional[datetime] = None
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AssetCreate(BaseModel):
    description: str
    asset_type: str
    subject_code: str = "00"
    value: Optional[float] = None
    notes: str = ""
    transaction_type: str = "deposit"


class AssetUpdate(BaseModel):
    description: Optional[str] = None
    asset_type: Optional[str] = None
    subject_code: Optional[str] = None
    value: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
