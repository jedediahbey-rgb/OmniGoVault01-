"""Vault and Workspace Models - Core data structures for shared trust workspaces"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any
from enum import Enum
import uuid
import hashlib


# ============ ENUMS ============

class VaultType(str, Enum):
    """Types of vaults/workspaces"""
    TRUST = "TRUST"
    ESTATE = "ESTATE"
    LOAN = "LOAN"
    ASSET_SALE = "ASSET_SALE"
    LITIGATION = "LITIGATION"
    CORPORATE = "CORPORATE"
    OTHER = "OTHER"


class VaultStatus(str, Enum):
    """Vault lifecycle status"""
    DRAFT = "DRAFT"          # Initial setup, not yet active
    ACTIVE = "ACTIVE"        # Operational workspace
    SUSPENDED = "SUSPENDED"  # Temporarily paused
    CLOSED = "CLOSED"        # Finalized/archived


class ParticipantRole(str, Enum):
    """Roles a user can have in a vault"""
    TRUSTEE = "TRUSTEE"
    BENEFICIARY = "BENEFICIARY"
    PROTECTOR = "PROTECTOR"
    ADVISOR = "ADVISOR"
    ATTORNEY = "ATTORNEY"
    ACCOUNTANT = "ACCOUNTANT"
    VIEWER = "VIEWER"
    OWNER = "OWNER"  # Account owner who created the vault


class DocumentStatus(str, Enum):
    """Document lifecycle status"""
    DRAFT = "DRAFT"                      # Being created/edited
    UNDER_REVIEW = "UNDER_REVIEW"        # Shared for review/approval
    READY_FOR_EXECUTION = "READY_FOR_EXECUTION"  # Approved, awaiting signatures
    EXECUTED = "EXECUTED"                # Signed and locked
    ARCHIVED = "ARCHIVED"                # Old version, superseded
    REJECTED = "REJECTED"                # Objected/rejected


class DocumentCategory(str, Enum):
    """Categories of trust documents"""
    TRUST_INSTRUMENT = "TRUST_INSTRUMENT"
    AMENDMENT = "AMENDMENT"
    SCHEDULE = "SCHEDULE"
    LETTER_OF_WISHES = "LETTER_OF_WISHES"
    RESOLUTION = "RESOLUTION"
    NOTICE = "NOTICE"
    CONSENT = "CONSENT"
    WAIVER = "WAIVER"
    RECEIPT = "RECEIPT"
    STATEMENT = "STATEMENT"
    KYC = "KYC"
    CORRESPONDENCE = "CORRESPONDENCE"
    OTHER = "OTHER"


class DocumentEventType(str, Enum):
    """Types of document events for audit trail"""
    CREATED = "CREATED"
    EDITED = "EDITED"
    STATUS_CHANGED = "STATUS_CHANGED"
    SHARED = "SHARED"
    COMMENTED = "COMMENTED"
    AFFIRMED = "AFFIRMED"
    OBJECTED = "OBJECTED"
    SIGNED = "SIGNED"
    LOCKED = "LOCKED"
    VERSION_CREATED = "VERSION_CREATED"
    PARTICIPANT_ADDED = "PARTICIPANT_ADDED"
    PARTICIPANT_REMOVED = "PARTICIPANT_REMOVED"


class SignatureType(str, Enum):
    """Types of electronic signatures"""
    CLICK = "CLICK"              # Click to sign
    TYPED_NAME = "TYPED_NAME"    # Type full legal name
    DRAWN = "DRAWN"              # Draw signature with mouse/touch


class VaultPermission(str, Enum):
    """Granular permissions within a vault"""
    VIEW_DOC = "VIEW_DOC"
    UPLOAD_DOC = "UPLOAD_DOC"
    EDIT_DOC = "EDIT_DOC"
    DELETE_DOC = "DELETE_DOC"
    COMMENT = "COMMENT"
    AFFIRM = "AFFIRM"
    OBJECT = "OBJECT"
    SIGN = "SIGN"
    MANAGE_PARTICIPANTS = "MANAGE_PARTICIPANTS"
    MANAGE_VAULT = "MANAGE_VAULT"
    EXPORT_AUDIT = "EXPORT_AUDIT"


# ============ PERMISSION MATRIX ============

# Default permissions for each role
DEFAULT_ROLE_PERMISSIONS: Dict[ParticipantRole, List[VaultPermission]] = {
    ParticipantRole.OWNER: [
        VaultPermission.VIEW_DOC,
        VaultPermission.UPLOAD_DOC,
        VaultPermission.EDIT_DOC,
        VaultPermission.DELETE_DOC,
        VaultPermission.COMMENT,
        VaultPermission.AFFIRM,
        VaultPermission.OBJECT,
        VaultPermission.SIGN,
        VaultPermission.MANAGE_PARTICIPANTS,
        VaultPermission.MANAGE_VAULT,
        VaultPermission.EXPORT_AUDIT,
    ],
    ParticipantRole.TRUSTEE: [
        VaultPermission.VIEW_DOC,
        VaultPermission.UPLOAD_DOC,
        VaultPermission.EDIT_DOC,
        VaultPermission.DELETE_DOC,
        VaultPermission.COMMENT,
        VaultPermission.AFFIRM,
        VaultPermission.OBJECT,
        VaultPermission.SIGN,
        VaultPermission.MANAGE_PARTICIPANTS,
        VaultPermission.MANAGE_VAULT,
        VaultPermission.EXPORT_AUDIT,
    ],
    ParticipantRole.PROTECTOR: [
        VaultPermission.VIEW_DOC,
        VaultPermission.UPLOAD_DOC,
        VaultPermission.EDIT_DOC,
        VaultPermission.COMMENT,
        VaultPermission.AFFIRM,
        VaultPermission.OBJECT,
        VaultPermission.SIGN,
        VaultPermission.EXPORT_AUDIT,
    ],
    ParticipantRole.BENEFICIARY: [
        VaultPermission.VIEW_DOC,
        VaultPermission.COMMENT,
        VaultPermission.AFFIRM,
        VaultPermission.OBJECT,
        # SIGN only on specific document types (consents, waivers)
    ],
    ParticipantRole.ADVISOR: [
        VaultPermission.VIEW_DOC,
        VaultPermission.UPLOAD_DOC,
        VaultPermission.EDIT_DOC,
        VaultPermission.COMMENT,
    ],
    ParticipantRole.ATTORNEY: [
        VaultPermission.VIEW_DOC,
        VaultPermission.UPLOAD_DOC,
        VaultPermission.EDIT_DOC,
        VaultPermission.COMMENT,
        VaultPermission.AFFIRM,
        VaultPermission.EXPORT_AUDIT,
    ],
    ParticipantRole.ACCOUNTANT: [
        VaultPermission.VIEW_DOC,
        VaultPermission.UPLOAD_DOC,
        VaultPermission.COMMENT,
    ],
    ParticipantRole.VIEWER: [
        VaultPermission.VIEW_DOC,
    ],
}

# Document categories that beneficiaries can sign
BENEFICIARY_SIGNABLE_CATEGORIES = [
    DocumentCategory.CONSENT,
    DocumentCategory.WAIVER,
    DocumentCategory.RECEIPT,
]


# ============ VAULT MODELS ============

class Vault(BaseModel):
    """A shared workspace for trust/transaction governance"""
    vault_id: str = Field(default_factory=lambda: f"vault_{uuid.uuid4().hex[:12]}")
    account_id: str  # Owner account
    name: str
    description: str = ""
    vault_type: VaultType = VaultType.TRUST
    status: VaultStatus = VaultStatus.DRAFT
    settings: Dict[str, Any] = {}  # Custom governance settings
    created_by: str  # User ID who created
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    closed_at: Optional[datetime] = None


class VaultParticipant(BaseModel):
    """Links a user to a vault with a specific role"""
    id: str = Field(default_factory=lambda: f"vp_{uuid.uuid4().hex[:12]}")
    vault_id: str
    user_id: str
    email: str  # For invitations before user joins
    role: ParticipantRole
    display_name: str = ""  # Name shown in vault context
    permissions_override: List[str] = []  # Custom permissions beyond role default
    permissions_revoked: List[str] = []   # Permissions removed from role default
    invited_by: str  # User ID who invited
    invited_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    accepted_at: Optional[datetime] = None
    status: str = "pending"  # pending, active, removed


# ============ DOCUMENT MODELS ============

class Document(BaseModel):
    """A document within a vault"""
    document_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:12]}")
    vault_id: str
    title: str
    description: str = ""
    category: DocumentCategory = DocumentCategory.OTHER
    status: DocumentStatus = DocumentStatus.DRAFT
    current_version: int = 1
    created_by: str  # User ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Execution tracking
    requires_signatures_from: List[str] = []  # Role names required to sign
    execution_deadline: Optional[datetime] = None


class DocumentVersion(BaseModel):
    """A specific version of a document"""
    id: str = Field(default_factory=lambda: f"docv_{uuid.uuid4().hex[:12]}")
    document_id: str
    version_number: int
    content: str = ""  # HTML/Markdown content
    content_hash: str = ""  # SHA-256 hash for integrity
    file_path: Optional[str] = None  # For uploaded files
    file_type: Optional[str] = None  # mime type
    status: DocumentStatus = DocumentStatus.DRAFT
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    locked_at: Optional[datetime] = None
    superseded_by: Optional[str] = None  # ID of newer version

    def compute_hash(self) -> str:
        """Compute SHA-256 hash of content"""
        return hashlib.sha256(self.content.encode('utf-8')).hexdigest()


class DocumentEvent(BaseModel):
    """Audit trail event for a document"""
    id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    document_id: str
    version_id: Optional[str] = None
    user_id: str
    user_role: str  # Role at time of event
    event_type: DocumentEventType
    data: Dict[str, Any] = {}  # Event-specific data (comment text, status change, etc.)
    ip_address: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DocumentSignature(BaseModel):
    """Electronic signature on a document"""
    id: str = Field(default_factory=lambda: f"sig_{uuid.uuid4().hex[:12]}")
    document_id: str
    version_id: str
    user_id: str
    role: str  # Role at time of signing
    legal_name: str  # Full legal name
    signature_type: SignatureType
    signature_data: Optional[str] = None  # Base64 drawn signature if applicable
    document_hash: str  # Hash of document at signing time
    consent_text: str = "By signing, I agree to the terms of this document."
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    signed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DocumentComment(BaseModel):
    """Comment/discussion on a document"""
    id: str = Field(default_factory=lambda: f"cmt_{uuid.uuid4().hex[:12]}")
    document_id: str
    version_id: Optional[str] = None
    user_id: str
    user_role: str
    content: str
    parent_id: Optional[str] = None  # For threaded replies
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    edited_at: Optional[datetime] = None
    is_resolved: bool = False


class DocumentAffirmation(BaseModel):
    """Affirmation (approval) of a document"""
    id: str = Field(default_factory=lambda: f"aff_{uuid.uuid4().hex[:12]}")
    document_id: str
    version_id: str
    user_id: str
    user_role: str
    affirmed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    note: str = ""  # Optional note


class DocumentObjection(BaseModel):
    """Objection to a document"""
    id: str = Field(default_factory=lambda: f"obj_{uuid.uuid4().hex[:12]}")
    document_id: str
    version_id: str
    user_id: str
    user_role: str
    reason: str  # Required explanation
    status: str = "active"  # active, resolved, withdrawn
    objected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_note: Optional[str] = None


# ============ REQUEST/RESPONSE MODELS ============

class CreateVaultRequest(BaseModel):
    name: str
    description: str = ""
    vault_type: VaultType = VaultType.TRUST


class UpdateVaultRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[VaultStatus] = None
    settings: Optional[Dict[str, Any]] = None


class InviteParticipantRequest(BaseModel):
    email: str
    role: ParticipantRole
    display_name: str = ""
    message: str = ""  # Optional invitation message


class CreateDocumentRequest(BaseModel):
    title: str
    description: str = ""
    category: DocumentCategory = DocumentCategory.OTHER
    content: str = ""
    requires_signatures_from: List[str] = []  # Roles required to sign


class UpdateDocumentRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    status: Optional[DocumentStatus] = None


class SignDocumentRequest(BaseModel):
    legal_name: str
    signature_type: SignatureType = SignatureType.CLICK
    signature_data: Optional[str] = None  # Base64 for drawn signatures
    consent_acknowledged: bool = True


class CommentRequest(BaseModel):
    content: str
    parent_id: Optional[str] = None


class ObjectionRequest(BaseModel):
    reason: str


class AffirmationRequest(BaseModel):
    note: str = ""


class ResolveObjectionRequest(BaseModel):
    resolution_note: str
