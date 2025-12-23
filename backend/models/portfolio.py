"""Portfolio and trust profile models"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid


class Portfolio(BaseModel):
    portfolio_id: str = Field(default_factory=lambda: f"port_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    description: str = ""
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TrustProfile(BaseModel):
    profile_id: str = Field(default_factory=lambda: f"trust_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    trust_name: str
    trust_identifier: Optional[str] = ""
    creation_date: Optional[str] = ""
    # Parties
    grantor_name: str = ""
    grantor_address: str = ""
    trustee_name: str = ""
    trustee_address: str = ""
    co_trustee_name: str = ""
    co_trustee_address: str = ""
    beneficiary_name: str = ""
    beneficiary_address: str = ""
    # Trust terms
    governing_statements: str = ""
    trust_term: str = ""
    renewal_terms: str = ""
    revocation_conditions: str = ""
    modification_conditions: str = ""
    extinguishment_conditions: str = ""
    conveyance_conditions: str = ""
    additional_notes: str = ""
    # RM-ID System (Enhanced)
    rm_id_raw: str = ""
    rm_id_normalized: str = ""
    rm_id_is_placeholder: bool = False
    rm_record_id: str = ""
    rm_series_start: str = ""
    rm_series_end: str = ""
    rm_next_series: int = 1
    rm_evidence_files: List[str] = []
    # Tax IDs
    trust_ein: str = ""
    estate_ein: str = ""
    tax_classification: str = ""
    tax_notes: str = ""
    # Status
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MailEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: f"mail_{uuid.uuid4().hex[:12]}")
    profile_id: str
    user_id: str
    event_type: str  # sent, received, returned, delivered
    description: str
    date: str
    rm_number: str = ""
    attachments: List[str] = []
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Party(BaseModel):
    party_id: str = Field(default_factory=lambda: f"party_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    role: str  # grantor, trustee, co_trustee, beneficiary, agent, other
    name: str
    address: str = ""
    email: str = ""
    phone: str = ""
    notes: str = ""
    is_primary: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NoticeEvent(BaseModel):
    notice_id: str = Field(default_factory=lambda: f"notice_{uuid.uuid4().hex[:12]}")
    portfolio_id: str
    user_id: str
    event_type: str
    title: str
    date: str
    description: str = ""
    document_id: Optional[str] = None
    attachments: List[str] = []
    notes: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
