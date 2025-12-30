"""
RM Subject (Ledger Thread) Model
Canonical grouping entity that owns RM-ID whole numbers.

Core Purpose:
- Every RM-ID whole number (e.g., RF...-33) belongs to exactly one RMSubject
- Records link to RMSubject and get sequential subnumbers (.001, .002, etc.)
- Prevents accidental creation of new RM-ID groups
- Enables "subject matter" based linking across all governance types
"""

from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional
from enum import Enum
import uuid


# ============ ENUMS ============

class SubjectCategory(str, Enum):
    """
    Category of the subject matter.
    Extensible - new categories can be added without breaking migrations.
    """
    MINUTES = "minutes"
    DISTRIBUTION = "distribution"
    DISPUTE = "dispute"
    INSURANCE = "insurance"
    TRUSTEE_COMPENSATION = "trustee_compensation"
    POLICY = "policy"
    MISC = "misc"


# ============ HELPER FUNCTIONS ============

def generate_subject_id() -> str:
    """Generate a unique subject ID"""
    return f"subj_{uuid.uuid4().hex[:12]}"


# ============ CORE MODELS ============

class RMSubject(BaseModel):
    """
    RM Subject (Ledger Thread) - The canonical RM-ID group owner.
    
    Each RMSubject owns a unique (trust_id, rm_base, rm_group) combination.
    All governance records linked to this subject share the same rm_group
    and get sequential subnumbers (.001, .002, .003, etc.)
    
    Example:
    - Subject: "Trustee Compensation — Maureen Jones"
    - rm_base: "RF743916765US"
    - rm_group: 33
    - Records under this subject: RF743916765US-33.001, -33.002, -33.003
    """
    id: str = Field(default_factory=generate_subject_id)
    
    # Trust/Portfolio context
    trust_id: Optional[str] = None
    portfolio_id: str
    user_id: str
    
    # RM-ID Components
    rm_base: str  # e.g., "RF743916765US"
    rm_group: int = Field(ge=1, le=99)  # Whole number 1-99
    
    # Subject Matter Details
    title: str  # e.g., "Trustee Compensation — Maureen Jones"
    category: SubjectCategory = SubjectCategory.MISC
    
    # Primary party associated with this subject (optional but recommended)
    primary_party_id: Optional[str] = None
    primary_party_name: Optional[str] = None  # Denormalized for display
    
    # External reference (court case, policy number, bank ref, invoice ID)
    external_ref: Optional[str] = None
    
    # Sequencing counter - tracks next available subnumber
    # Atomic increment ensures no duplicates
    next_sub: int = Field(default=1, ge=1, le=999)
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = ""
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Soft delete
    deleted_at: Optional[datetime] = None
    
    class Config:
        use_enum_values = True


class RMSubjectCreateRequest(BaseModel):
    """Request to create a new RM Subject (spawn new ledger thread)"""
    title: str = Field(min_length=1, max_length=200)
    category: SubjectCategory
    portfolio_id: str
    trust_id: Optional[str] = None
    primary_party_id: Optional[str] = None
    primary_party_name: Optional[str] = None
    external_ref: Optional[str] = None
    
    class Config:
        use_enum_values = True


class RMSubjectSuggestRequest(BaseModel):
    """Request to auto-suggest subjects based on party/category"""
    portfolio_id: str
    category: Optional[SubjectCategory] = None
    party_id: Optional[str] = None
    search_text: Optional[str] = None
    
    class Config:
        use_enum_values = True


class RMSubjectSummary(BaseModel):
    """Summary view of RM Subject for dropdowns/lists"""
    id: str
    rm_group: int
    title: str
    category: str
    primary_party_name: Optional[str] = None
    external_ref: Optional[str] = None
    record_count: int = 0  # Number of records under this subject
    rm_id_preview: str = ""  # e.g., "RF...-33" 
    next_sub_preview: str = ""  # e.g., ".006"
    
    class Config:
        use_enum_values = True


class RMSubjectDetail(BaseModel):
    """Detailed view of RM Subject"""
    id: str
    trust_id: Optional[str] = None
    portfolio_id: str
    rm_base: str
    rm_group: int
    title: str
    category: str
    primary_party_id: Optional[str] = None
    primary_party_name: Optional[str] = None
    external_ref: Optional[str] = None
    next_sub: int
    created_at: str
    created_by: str
    record_count: int = 0
    
    class Config:
        use_enum_values = True


class SubnumberAllocation(BaseModel):
    """Result of allocating a subnumber for a record"""
    rm_subject_id: str
    rm_sub: int
    rm_id_display: str  # Full RM-ID string: RF...-33.006
    rm_base: str
    rm_group: int
    subject_title: str
    is_first_entry: bool = False  # True if this is .001


# ============ CATEGORY HELPERS ============

CATEGORY_LABELS = {
    SubjectCategory.MINUTES: "Meeting Minutes",
    SubjectCategory.DISTRIBUTION: "Distribution",
    SubjectCategory.DISPUTE: "Dispute",
    SubjectCategory.INSURANCE: "Insurance",
    SubjectCategory.TRUSTEE_COMPENSATION: "Trustee Compensation",
    SubjectCategory.POLICY: "Policy",
    SubjectCategory.MISC: "Miscellaneous",
}

CATEGORY_ICONS = {
    SubjectCategory.MINUTES: "calendar",
    SubjectCategory.DISTRIBUTION: "hand-coins",
    SubjectCategory.DISPUTE: "scales",
    SubjectCategory.INSURANCE: "shield-check",
    SubjectCategory.TRUSTEE_COMPENSATION: "currency-dollar",
    SubjectCategory.POLICY: "file-text",
    SubjectCategory.MISC: "folder",
}

# Map module types to subject categories
MODULE_TO_CATEGORY = {
    "minutes": SubjectCategory.MINUTES,
    "distribution": SubjectCategory.DISTRIBUTION,
    "dispute": SubjectCategory.DISPUTE,
    "insurance": SubjectCategory.INSURANCE,
    "compensation": SubjectCategory.TRUSTEE_COMPENSATION,
}
