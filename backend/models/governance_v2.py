"""
Governance V2 Models - Amendment Studio
Production-grade revisioning system with hash chain and audit trail.

Core Principles:
- Finalized = read-only (immutable)
- Amendments create NEW revisions linked to prior
- Every change is traceable (audit log)
- Delete = soft-delete/void with audit event
"""

from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from enum import Enum
import uuid
import hashlib
import json


# ============ ENUMS ============

class ModuleType(str, Enum):
    MINUTES = "minutes"
    DISTRIBUTION = "distribution"
    DISPUTE = "dispute"
    INSURANCE = "insurance"
    COMPENSATION = "compensation"


class RecordStatus(str, Enum):
    DRAFT = "draft"
    FINALIZED = "finalized"
    VOIDED = "voided"


class ChangeType(str, Enum):
    INITIAL = "initial"
    AMENDMENT = "amendment"
    CORRECTION = "correction"
    VOID = "void"


class EventType(str, Enum):
    CREATED = "created"
    UPDATED_DRAFT = "updated_draft"
    FINALIZED = "finalized"
    AMENDMENT_CREATED = "amendment_created"
    AMENDMENT_FINALIZED = "amendment_finalized"
    VOIDED = "voided"
    ATTACHMENT_ADDED = "attachment_added"
    ATTESTATION_ADDED = "attestation_added"


class AttestationRole(str, Enum):
    TRUSTEE = "trustee"
    CO_TRUSTEE = "co_trustee"
    GRANTOR = "grantor"
    BENEFICIARY = "beneficiary"
    COUNSEL = "counsel"
    PROTECTOR = "protector"
    WITNESS = "witness"


# ============ HELPER FUNCTIONS ============

def generate_id(prefix: str = "gov") -> str:
    """Generate a unique ID with prefix"""
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def compute_content_hash(
    payload_json: dict,
    created_at: str,
    created_by: str,
    version: int,
    parent_hash: Optional[str] = None
) -> str:
    """
    Compute SHA-256 hash for tamper-evident chain.
    Includes payload + metadata + parent hash for chain integrity.
    """
    hashable = {
        "payload": payload_json,
        "created_at": created_at,
        "created_by": created_by,
        "version": version,
        "parent_hash": parent_hash or ""
    }
    canonical = json.dumps(hashable, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


# ============ CORE MODELS ============

class GovernanceRecord(BaseModel):
    """
    Top-level governance record.
    Links to current revision and tracks overall status.
    """
    id: str = Field(default_factory=lambda: generate_id("rec"))
    trust_id: Optional[str] = None
    portfolio_id: str
    user_id: str
    
    module_type: ModuleType
    title: str
    rm_id: str = ""  # Registered Mail ID for recordkeeping (full: RF...-33.006)
    
    # RM Subject (Ledger Thread) linking - NEW
    rm_subject_id: Optional[str] = None  # FK to RMSubject
    rm_sub: int = 0  # Subnumber within subject (1-999)
    
    status: RecordStatus = RecordStatus.DRAFT
    current_revision_id: Optional[str] = None
    
    # Creation info
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = ""
    
    # Finalization info (set when first finalized)
    finalized_at: Optional[datetime] = None
    finalized_by: Optional[str] = None
    
    # Void info (soft delete)
    voided_at: Optional[datetime] = None
    voided_by: Optional[str] = None
    void_reason: Optional[str] = None
    
    # Legacy compatibility - ID of record that supersedes this one
    amended_by_id: Optional[str] = None
    
    class Config:
        use_enum_values = True


class GovernanceRevision(BaseModel):
    """
    Immutable revision of a governance record.
    Contains the actual content in payload_json.
    Forms a hash chain with parent revisions.
    """
    id: str = Field(default_factory=lambda: generate_id("rev"))
    record_id: str
    
    version: int = 1  # Monotonically increasing: 1, 2, 3...
    parent_revision_id: Optional[str] = None  # Links amendment to prior revision
    
    change_type: ChangeType = ChangeType.INITIAL
    change_reason: str = ""  # Required for amendment/correction/void
    effective_at: Optional[datetime] = None  # When amendment takes effect
    
    # Module-specific content lives here
    payload_json: Dict[str, Any] = Field(default_factory=dict)
    
    # Creation info
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = ""
    
    # Finalization info
    finalized_at: Optional[datetime] = None
    finalized_by: Optional[str] = None
    
    # Hash chain for tamper evidence
    content_hash: str = ""
    parent_hash: Optional[str] = None
    
    class Config:
        use_enum_values = True


class GovernanceEvent(BaseModel):
    """
    Audit log entry for all governance actions.
    Never deleted, always append-only.
    """
    id: str = Field(default_factory=lambda: generate_id("evt"))
    trust_id: Optional[str] = None
    portfolio_id: str
    user_id: str
    
    record_id: str
    revision_id: Optional[str] = None
    
    event_type: EventType
    actor_id: str
    actor_name: str = ""
    
    at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Additional context (fields changed, IP, device, etc.)
    meta_json: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        use_enum_values = True


class GovernanceAttachment(BaseModel):
    """
    File attachment linked to a revision.
    """
    id: str = Field(default_factory=lambda: generate_id("att"))
    trust_id: Optional[str] = None
    portfolio_id: str
    user_id: str
    
    record_id: str
    revision_id: str
    
    file_id: str = ""  # Storage key or file ID
    file_name: str = ""
    file_type: str = ""  # pdf, image, etc.
    file_url: str = ""
    label: str = ""
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = ""


class GovernanceAttestation(BaseModel):
    """
    Attestation/signature on a finalized revision.
    """
    id: str = Field(default_factory=lambda: generate_id("sig"))
    trust_id: Optional[str] = None
    portfolio_id: str
    
    record_id: str
    revision_id: str
    
    role: AttestationRole = AttestationRole.TRUSTEE
    signer_id: str = ""
    signer_name: str = ""
    
    signed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    signature_type: str = "typed"  # typed, drawn, e_signature
    signature_hash: str = ""
    attestation_text: str = ""
    ip_address: str = ""
    
    class Config:
        use_enum_values = True


# ============ MODULE-SPECIFIC PAYLOAD SCHEMAS ============

class MinutesAttendee(BaseModel):
    """Attendee in meeting minutes"""
    party_id: Optional[str] = None
    name: str
    role: str = "observer"
    present: bool = True
    notes: str = ""


class MinutesMotion(BaseModel):
    """Motion within meeting minutes"""
    motion_id: str = Field(default_factory=lambda: generate_id("mot"))
    text: str
    proposed_by: str = ""
    seconded_by: str = ""
    votes_for: int = 0
    votes_against: int = 0
    abstain: int = 0
    result: str = "pending"  # pending, passed, failed, tabled, withdrawn


class MinutesAgendaItem(BaseModel):
    """Agenda item in meeting minutes"""
    item_id: str = Field(default_factory=lambda: generate_id("agi"))
    order: int = 1
    title: str
    discussion_summary: str = ""
    motions: List[MinutesMotion] = []
    notes: str = ""


class MinutesPayload(BaseModel):
    """Payload schema for Meeting Minutes"""
    title: str = ""
    meeting_type: str = "regular"  # regular, special, emergency
    meeting_datetime: str = ""
    date_time: str = ""  # Alternative field name from frontend
    location: str = ""
    called_by: str = ""
    attendees: List[MinutesAttendee] = []
    agenda_items: List[MinutesAgendaItem] = []
    general_notes: str = ""
    
    class Config:
        extra = "allow"  # Allow extra fields from frontend


class DistributionAllocation(BaseModel):
    """Single allocation in a distribution"""
    allocation_id: str = Field(default_factory=lambda: generate_id("alc"))
    beneficiary_id: Optional[str] = None
    beneficiary_name: str = ""
    amount: float = 0.0
    percent: float = 0.0
    category: str = ""  # education, health, maintenance, discretionary


class DistributionPayload(BaseModel):
    """Payload schema for Distributions"""
    title: str = ""
    distribution_type: str = "regular"
    description: str = ""
    period: str = ""  # e.g., "Q1 2024", "Annual 2024"
    distribution_date: str = ""
    scheduled_date: str = ""  # Alternative field from frontend
    total_amount: float = 0.0
    currency: str = "USD"
    asset_type: str = "cash"
    allocations: List[DistributionAllocation] = []
    recipients: List[Dict[str, Any]] = []  # Alternative field from frontend
    notes: str = ""
    approval_notes: str = ""
    
    class Config:
        extra = "allow"


class DisputeClaim(BaseModel):
    """Claim within a dispute"""
    claim_id: str = Field(default_factory=lambda: generate_id("clm"))
    description: str = ""
    amount_claimed: Optional[float] = None
    date_filed: str = ""


class DisputePayload(BaseModel):
    """Payload schema for Disputes"""
    title: str = ""
    dispute_type: str = ""  # trustee/beneficiary, distribution, accounting, interpretation
    description: str = ""
    amount_claimed: float = 0.0
    currency: str = "USD"
    priority: str = "medium"
    case_number: str = ""
    jurisdiction: str = ""
    parties_involved: List[str] = []
    parties: List[Dict[str, Any]] = []  # Alternative from frontend
    events: List[Dict[str, Any]] = []  # Alternative from frontend
    status: str = "open"  # open, review, mediation, resolved, archived
    outcome: str = ""  # settled, litigation, dismissed, etc.
    claims: List[DisputeClaim] = []
    evidence_refs: List[str] = []
    resolution_summary: str = ""
    permissions_scope: str = "trustee_only"  # trustee_only, shared_with_beneficiaries
    notes: str = ""
    
    class Config:
        extra = "allow"


class InsuranceBeneficiary(BaseModel):
    """Beneficiary of insurance policy"""
    beneficiary_id: Optional[str] = None
    name: str = ""
    percent: float = 0.0
    relationship: str = ""


class InsurancePayload(BaseModel):
    """Payload schema for Life Insurance"""
    insurer: str = ""
    policy_number: str = ""
    policy_type: str = ""  # term, whole_life, universal, variable
    face_value: float = 0.0
    premium: float = 0.0
    premium_frequency: str = "monthly"  # monthly, quarterly, annually
    beneficiaries: List[InsuranceBeneficiary] = []
    premium_due_date: str = ""
    lapse_risk: bool = False
    notes: str = ""


class CompensationEntry(BaseModel):
    """Time entry in compensation"""
    entry_id: str = Field(default_factory=lambda: generate_id("cmp"))
    date: str = ""
    hours: float = 0.0
    rate: float = 0.0
    description: str = ""
    category: str = ""  # administration, accounting, investment, communications


class CompensationPayload(BaseModel):
    """Payload schema for Trustee Compensation"""
    trustee_id: Optional[str] = None
    trustee_name: str = ""
    period: str = ""  # e.g., "Q1 2024"
    compensation_type: str = "hourly"  # no_compensation, fixed_annual, hourly, percent_assets, custom
    entries: List[CompensationEntry] = []
    total_amount: float = 0.0
    approval_status: str = "pending"  # pending, approved, paid, cancelled
    notes: str = ""


# ============ API REQUEST MODELS ============

class RecordCreateRequest(BaseModel):
    """Request to create a new governance record"""
    trust_id: Optional[str] = None
    portfolio_id: str
    module_type: ModuleType
    title: str
    payload_json: Dict[str, Any] = Field(default_factory=dict)
    
    # RM Subject (Ledger Thread) linking
    rm_subject_id: Optional[str] = None  # Link to existing subject
    create_new_subject: bool = False  # If true, spawn a new thread
    new_subject_title: Optional[str] = None  # Title for new subject
    new_subject_party_id: Optional[str] = None  # Primary party for new subject
    new_subject_party_name: Optional[str] = None  # Party name for new subject
    new_subject_external_ref: Optional[str] = None  # External ref for new subject


class RecordAmendRequest(BaseModel):
    """Request to create an amendment"""
    change_type: ChangeType = ChangeType.AMENDMENT
    change_reason: str  # Required
    effective_at: Optional[str] = None


class RevisionUpdateRequest(BaseModel):
    """Request to update a draft revision"""
    title: Optional[str] = None
    payload_json: Optional[Dict[str, Any]] = None


class RecordVoidRequest(BaseModel):
    """Request to void (soft-delete) a record"""
    void_reason: str  # Required


class AttestationCreateRequest(BaseModel):
    """Request to add attestation"""
    role: AttestationRole = AttestationRole.TRUSTEE
    signer_name: str
    signature_type: str = "typed"
    attestation_text: str = ""


# ============ API RESPONSE MODELS ============

class RecordSummary(BaseModel):
    """Summary of a record for list views"""
    id: str
    module_type: str
    title: str
    rm_id: str
    status: str
    current_version: int = 1
    created_at: str
    finalized_at: Optional[str] = None
    created_by: str = ""


class RevisionSummary(BaseModel):
    """Summary of a revision for history views"""
    id: str
    version: int
    change_type: str
    change_reason: str
    created_at: str
    created_by: str
    finalized_at: Optional[str] = None
    finalized_by: Optional[str] = None
    content_hash: str


class RecordDetailResponse(BaseModel):
    """Full record with current revision"""
    record: GovernanceRecord
    current_revision: Optional[GovernanceRevision] = None
    revision_count: int = 1
    attestations: List[GovernanceAttestation] = []
    attachments: List[GovernanceAttachment] = []


class RevisionHistoryResponse(BaseModel):
    """List of revisions for a record"""
    record_id: str
    revisions: List[RevisionSummary]
    total: int
