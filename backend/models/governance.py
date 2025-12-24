from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, List, Dict
import uuid


# ============ MEETING MINUTES MODELS ============

class Vote(BaseModel):
    """Individual vote record"""
    party_id: str
    party_name: str
    party_role: str
    vote: str  # for, against, abstain


class Motion(BaseModel):
    """Motion within an agenda item"""
    motion_id: str = Field(default_factory=lambda: f"mot_{uuid.uuid4().hex[:8]}")
    text: str
    proposed_by_party_id: Optional[str] = None
    proposed_by_name: str = ""
    seconded_by_party_id: Optional[str] = None
    seconded_by_name: str = ""
    status: str = "proposed"  # proposed, seconded, passed, failed, tabled, withdrawn
    votes: List[Vote] = []
    result_notes: str = ""


class ActionItem(BaseModel):
    """Action item from meeting"""
    action_id: str = Field(default_factory=lambda: f"act_{uuid.uuid4().hex[:8]}")
    description: str
    assignee_party_id: Optional[str] = None
    assignee_name: str = ""
    due_date: Optional[str] = None
    status: str = "pending"  # pending, in_progress, completed, cancelled
    completed_at: Optional[str] = None
    notes: str = ""


class AgendaItem(BaseModel):
    """Agenda item within a meeting"""
    item_id: str = Field(default_factory=lambda: f"agenda_{uuid.uuid4().hex[:8]}")
    order: int = 1
    title: str
    discussion_summary: str = ""
    motions: List[Motion] = []
    action_items: List[ActionItem] = []
    notes: str = ""
    is_expanded: bool = True  # UI state


class Attendee(BaseModel):
    """Meeting attendee record"""
    party_id: Optional[str] = None
    name: str
    role: str  # trustee, co_trustee, beneficiary, protector, counsel, observer
    present: bool = True
    notes: str = ""


class Attestation(BaseModel):
    """Attestation signature for finalized minutes"""
    attestation_id: str = Field(default_factory=lambda: f"att_{uuid.uuid4().hex[:8]}")
    party_id: Optional[str] = None
    party_name: str
    party_role: str
    attested_at: str  # ISO datetime
    signature_type: str = "typed"  # typed, drawn, e_signature
    signature_data: str = ""  # Typed name or signature data
    ip_address: str = ""


class MeetingAttachment(BaseModel):
    """Attachment/evidence for meeting"""
    attachment_id: str = Field(default_factory=lambda: f"attach_{uuid.uuid4().hex[:8]}")
    agenda_item_id: Optional[str] = None  # Link to specific agenda item or None for general
    file_name: str
    file_type: str  # pdf, image, email, other
    file_url: str = ""
    description: str = ""
    uploaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Meeting(BaseModel):
    """Trust Meeting Minutes record"""
    meeting_id: str = Field(default_factory=lambda: f"meeting_{uuid.uuid4().hex[:12]}")
    trust_id: Optional[str] = None  # Link to TrustProfile
    portfolio_id: str
    user_id: str
    
    # Meeting details
    title: str
    meeting_type: str = "regular"  # regular, special, emergency
    date_time: str  # ISO datetime
    location: str = ""  # Physical address or "Virtual" or Zoom link
    called_by: str = ""  # Name of person who called the meeting
    
    # RM-ID for internal recordkeeping
    rm_id: str = ""
    
    # Status and workflow
    status: str = "draft"  # draft, finalized, attested, amended
    locked: bool = False  # True when finalized (immutable)
    locked_at: Optional[str] = None  # When the meeting was locked
    
    # Revision tracking for amendments
    revision: int = 1  # 1 = original, 2+ = amendments
    parent_meeting_id: Optional[str] = None  # ID of parent meeting (for amendments)
    
    # Attendees
    attendees: List[Attendee] = []
    
    # Agenda items (the core content)
    agenda_items: List[AgendaItem] = []
    
    # Attachments/Evidence
    attachments: List[MeetingAttachment] = []
    
    # Finalization (tamper-evident)
    finalized_at: Optional[str] = None
    finalized_by: Optional[str] = None
    finalized_hash: str = ""  # SHA-256 hash of meeting JSON at finalization
    
    # Attestations
    attestations: List[Attestation] = []
    
    # Amendment chain (like git history) - legacy fields kept for compatibility
    is_amendment: bool = False
    amends_meeting_id: Optional[str] = None  # ID of meeting this amends (same as parent_meeting_id)
    amendment_number: int = 0  # 0 = original, 1 = first amendment, etc.
    amended_by_id: Optional[str] = None  # ID of meeting that supersedes this one
    prior_hash: str = ""  # Hash of the meeting being amended (chain-of-custody)
    
    # Permissions
    visibility: str = "trustee_only"  # trustee_only, shared, custom
    allowed_party_ids: List[str] = []
    
    # Governance Ledger links
    linked_document_ids: List[str] = []  # Documents referenced/created
    linked_resolution_ids: List[str] = []  # Resolutions passed
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ REQUEST/RESPONSE MODELS ============

class MeetingCreate(BaseModel):
    portfolio_id: str
    trust_id: Optional[str] = None
    title: str
    meeting_type: str = "regular"
    date_time: str
    location: str = ""
    called_by: str = ""
    attendees: List[dict] = []


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    meeting_type: Optional[str] = None
    date_time: Optional[str] = None
    location: Optional[str] = None
    called_by: Optional[str] = None
    attendees: Optional[List[dict]] = None
    agenda_items: Optional[List[dict]] = None
    visibility: Optional[str] = None
    allowed_party_ids: Optional[List[str]] = None


class AgendaItemCreate(BaseModel):
    title: str
    discussion_summary: str = ""
    order: Optional[int] = None


class AgendaItemUpdate(BaseModel):
    title: Optional[str] = None
    discussion_summary: Optional[str] = None
    order: Optional[int] = None
    motions: Optional[List[dict]] = None
    action_items: Optional[List[dict]] = None
    notes: Optional[str] = None


class MotionCreate(BaseModel):
    text: str
    proposed_by_party_id: Optional[str] = None
    proposed_by_name: str = ""


class AttestationCreate(BaseModel):
    party_id: Optional[str] = None
    party_name: str
    party_role: str
    signature_type: str = "typed"
    signature_data: str


class FinalizeRequest(BaseModel):
    finalized_by_name: str


class AmendmentRequest(BaseModel):
    reason: str = ""
