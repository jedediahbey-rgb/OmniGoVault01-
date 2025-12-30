from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, List
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



# ============ DISTRIBUTIONS MODELS ============

class DistributionRecipient(BaseModel):
    """Individual recipient in a distribution"""
    recipient_id: str = Field(default_factory=lambda: f"rcpt_{uuid.uuid4().hex[:8]}")
    party_id: Optional[str] = None  # Link to Party if exists
    name: str
    role: str = "beneficiary"  # beneficiary, trustee, charity, other
    share_percentage: float = 0.0  # Percentage of total distribution
    amount: float = 0.0  # Fixed amount if not percentage-based
    status: str = "pending"  # pending, approved, paid, cancelled
    payment_method: str = ""  # check, wire, ach, crypto, in_kind
    payment_reference: str = ""  # Check number, wire reference, etc.
    paid_at: Optional[str] = None
    notes: str = ""


class DistributionApproval(BaseModel):
    """Approval record for a distribution"""
    approval_id: str = Field(default_factory=lambda: f"appr_{uuid.uuid4().hex[:8]}")
    approver_party_id: Optional[str] = None
    approver_name: str
    approver_role: str = "trustee"
    status: str = "pending"  # pending, approved, rejected
    approved_at: Optional[str] = None
    signature_data: str = ""
    notes: str = ""


class Distribution(BaseModel):
    """Trust Distribution record"""
    distribution_id: str = Field(default_factory=lambda: f"dist_{uuid.uuid4().hex[:12]}")
    trust_id: Optional[str] = None
    portfolio_id: str
    user_id: str
    
    # Distribution details
    title: str
    distribution_type: str = "regular"  # regular, special, final, emergency
    description: str = ""
    
    # RM-ID for internal recordkeeping
    rm_id: str = ""
    
    # Financial details
    total_amount: float = 0.0
    currency: str = "USD"
    asset_type: str = "cash"  # cash, securities, property, mixed
    source_account: str = ""  # Which trust account the funds come from
    
    # Recipients
    recipients: List[DistributionRecipient] = []
    
    # Approval workflow
    requires_approval: bool = True
    approval_threshold: int = 1  # Number of approvals needed
    approvals: List[DistributionApproval] = []
    
    # Status and workflow
    status: str = "draft"  # draft, pending_approval, approved, in_progress, completed, cancelled
    locked: bool = False
    locked_at: Optional[str] = None
    
    # Related meeting (if distribution was authorized in a meeting)
    authorized_meeting_id: Optional[str] = None
    authorization_notes: str = ""
    
    # Dates
    scheduled_date: Optional[str] = None  # When distribution is planned
    execution_date: Optional[str] = None  # When distribution was executed
    
    # Attachments/Evidence
    supporting_documents: List[str] = []  # Document IDs
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[str] = None


class DistributionCreate(BaseModel):
    """Create distribution request"""
    title: str
    distribution_type: str = "regular"
    description: str = ""
    total_amount: float = 0.0
    currency: str = "USD"
    asset_type: str = "cash"
    source_account: str = ""
    scheduled_date: Optional[str] = None
    requires_approval: bool = True
    approval_threshold: int = 1
    recipients: List[dict] = []



# ============ DISPUTES MODELS ============

class DisputeParty(BaseModel):
    """Party involved in a dispute"""
    party_id: str = Field(default_factory=lambda: f"dpty_{uuid.uuid4().hex[:8]}")
    name: str
    role: str = "claimant"  # claimant, respondent, witness, mediator, arbitrator
    contact_info: str = ""
    represented_by: str = ""  # Attorney/representative name
    notes: str = ""


class DisputeEvent(BaseModel):
    """Timeline event in a dispute"""
    event_id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:8]}")
    event_type: str = "filing"  # filing, response, hearing, mediation, ruling, appeal, settlement
    title: str
    description: str = ""
    event_date: str
    documents: List[str] = []  # Document IDs
    created_by: str = ""
    created_at: str = ""


class DisputeResolution(BaseModel):
    """Resolution details for a dispute"""
    resolution_type: str = ""  # settlement, ruling, dismissal, withdrawal, mediation_agreement
    resolution_date: Optional[str] = None
    summary: str = ""
    terms: str = ""
    monetary_award: float = 0.0
    currency: str = "USD"
    in_favor_of: str = ""  # party_id or name
    documents: List[str] = []


class Dispute(BaseModel):
    """Trust Dispute/Litigation record"""
    dispute_id: str = Field(default_factory=lambda: f"disp_{uuid.uuid4().hex[:12]}")
    trust_id: Optional[str] = None
    portfolio_id: str
    user_id: str
    
    # Dispute details
    title: str
    dispute_type: str = "beneficiary"  # beneficiary, trustee, third_party, tax, regulatory
    description: str = ""
    
    # RM-ID for internal recordkeeping
    rm_id: str = ""
    
    # Case information
    case_number: str = ""  # Court/arbitration case number
    jurisdiction: str = ""  # Court or arbitration forum
    filing_date: Optional[str] = None
    
    # Financial exposure
    amount_claimed: float = 0.0
    currency: str = "USD"
    estimated_exposure: float = 0.0  # Total potential liability
    
    # Parties
    parties: List[DisputeParty] = []
    
    # Timeline
    events: List[DisputeEvent] = []
    
    # Status and workflow
    status: str = "open"  # open, in_progress, mediation, litigation, settled, closed, appealed
    priority: str = "medium"  # low, medium, high, critical
    locked: bool = False
    locked_at: Optional[str] = None
    
    # Resolution
    resolution: Optional[DisputeResolution] = None
    
    # Related documents and meetings
    related_document_ids: List[str] = []
    related_meeting_ids: List[str] = []
    
    # Legal representation
    primary_counsel: str = ""
    counsel_firm: str = ""
    counsel_contact: str = ""
    
    # Key dates
    next_deadline: Optional[str] = None
    next_hearing_date: Optional[str] = None
    statute_of_limitations: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[str] = None


class DisputeCreate(BaseModel):
    """Create dispute request"""
    title: str
    dispute_type: str = "beneficiary"
    description: str = ""
    case_number: str = ""
    jurisdiction: str = ""
    filing_date: Optional[str] = None
    amount_claimed: float = 0.0
    currency: str = "USD"
    priority: str = "medium"



# ============ LIFE INSURANCE MODELS ============

class InsuranceBeneficiary(BaseModel):
    """Beneficiary of an insurance policy"""
    beneficiary_id: str = Field(default_factory=lambda: f"ins_ben_{uuid.uuid4().hex[:8]}")
    party_id: Optional[str] = None  # Link to trust party
    name: str
    relationship: str = ""  # spouse, child, trust, charity, etc.
    percentage: float = 0.0  # Percentage of benefit
    beneficiary_type: str = "primary"  # primary, contingent
    notes: str = ""


class InsurancePremiumPayment(BaseModel):
    """Premium payment record"""
    payment_id: str = Field(default_factory=lambda: f"prem_{uuid.uuid4().hex[:8]}")
    payment_date: str
    amount: float
    currency: str = "USD"
    payment_method: str = ""  # check, ach, wire
    confirmation_number: str = ""
    notes: str = ""


class InsurancePolicy(BaseModel):
    """Life Insurance Policy record"""
    policy_id: str = Field(default_factory=lambda: f"ins_{uuid.uuid4().hex[:12]}")
    trust_id: Optional[str] = None
    portfolio_id: str
    user_id: str
    
    # Policy details
    title: str  # Display name for the policy
    policy_number: str = ""
    policy_type: str = "whole_life"  # whole_life, term, universal, variable, group
    
    # RM-ID for internal recordkeeping
    rm_id: str = ""
    
    # Carrier information
    carrier_name: str = ""
    carrier_contact: str = ""
    carrier_phone: str = ""
    carrier_address: str = ""
    agent_name: str = ""
    agent_contact: str = ""
    
    # Insured person
    insured_name: str = ""
    insured_dob: Optional[str] = None
    insured_ssn_last4: str = ""  # Last 4 digits only
    
    # Coverage details
    death_benefit: float = 0.0
    cash_value: float = 0.0
    currency: str = "USD"
    
    # Premium information
    premium_amount: float = 0.0
    premium_frequency: str = "monthly"  # monthly, quarterly, semi_annual, annual
    premium_due_date: Optional[str] = None  # Day of month/year
    premium_payments: List[InsurancePremiumPayment] = []
    
    # Beneficiaries
    beneficiaries: List[InsuranceBeneficiary] = []
    
    # Key dates
    effective_date: Optional[str] = None
    maturity_date: Optional[str] = None
    expiration_date: Optional[str] = None  # For term policies
    
    # Status
    status: str = "active"  # active, lapsed, paid_up, surrendered, claimed, expired
    locked: bool = False
    locked_at: Optional[str] = None
    
    # Loans against policy
    loan_balance: float = 0.0
    loan_interest_rate: float = 0.0
    
    # Related documents
    related_document_ids: List[str] = []
    
    # Notes
    notes: str = ""
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[str] = None


class InsurancePolicyCreate(BaseModel):
    """Create insurance policy request"""
    title: str
    policy_number: str = ""
    policy_type: str = "whole_life"
    carrier_name: str = ""
    insured_name: str = ""
    death_benefit: float = 0.0
    cash_value: float = 0.0
    currency: str = "USD"
    premium_amount: float = 0.0
    premium_frequency: str = "monthly"
    effective_date: Optional[str] = None
    notes: str = ""



# ============ TRUSTEE COMPENSATION MODELS ============

class CompensationApproval(BaseModel):
    """Approval for compensation entry"""
    approval_id: str = Field(default_factory=lambda: f"cappr_{uuid.uuid4().hex[:8]}")
    approver_party_id: Optional[str] = None
    approver_name: str
    approver_role: str = "trustee"
    status: str = "pending"  # pending, approved, rejected
    approved_at: Optional[str] = None
    notes: str = ""


class CompensationEntry(BaseModel):
    """Trustee Compensation record"""
    compensation_id: str = Field(default_factory=lambda: f"comp_{uuid.uuid4().hex[:12]}")
    trust_id: Optional[str] = None
    portfolio_id: str
    user_id: str
    
    # RM-ID for internal recordkeeping
    rm_id: str = ""
    
    # Recipient (typically trustee)
    recipient_party_id: Optional[str] = None
    recipient_name: str
    recipient_role: str = "trustee"  # trustee, co_trustee, advisor, counsel
    
    # Compensation details
    title: str
    compensation_type: str = "annual_fee"  # annual_fee, transaction_fee, hourly, special, reimbursement
    description: str = ""
    
    # Financial
    amount: float = 0.0
    currency: str = "USD"
    payment_method: str = ""  # check, wire, ach
    payment_reference: str = ""
    
    # Period (for regular compensation)
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    fiscal_year: Optional[str] = None
    
    # Reasonableness documentation
    basis_of_calculation: str = ""  # How compensation was calculated
    comparable_fees: str = ""  # Market comparison notes
    trust_assets_value: float = 0.0  # Trust AUM at time of compensation
    fee_percentage: float = 0.0  # If based on % of assets
    hours_worked: float = 0.0  # For hourly compensation
    hourly_rate: float = 0.0
    
    # Approval workflow
    requires_approval: bool = True
    approval_threshold: int = 1
    approvals: List[CompensationApproval] = []
    
    # Related meeting (if authorized in a meeting)
    authorized_meeting_id: Optional[str] = None
    authorization_notes: str = ""
    
    # Status
    status: str = "draft"  # draft, pending_approval, approved, paid, cancelled
    locked: bool = False
    locked_at: Optional[str] = None
    paid_at: Optional[str] = None
    
    # Supporting documents
    related_document_ids: List[str] = []
    
    # Notes
    notes: str = ""
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    deleted_at: Optional[str] = None


class CompensationCreate(BaseModel):
    """Create compensation entry request"""
    portfolio_id: str
    trust_id: Optional[str] = None
    recipient_name: str
    recipient_role: str = "trustee"
    title: str
    compensation_type: str = "annual_fee"
    description: str = ""
    amount: float = 0.0
    currency: str = "USD"
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    fiscal_year: Optional[str] = None
    basis_of_calculation: str = ""
    notes: str = ""
