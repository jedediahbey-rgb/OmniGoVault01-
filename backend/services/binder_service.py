"""
Portfolio Binder Service

Court/Audit-ready consolidated PDF packet generator.
Produces single printable PDFs with deterministic ordering.
"""

import os
import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4
from enum import Enum
from dataclasses import dataclass, field, asdict


class BinderProfile(str, Enum):
    AUDIT = "audit"
    COURT = "court"
    OMNI = "omni"


class BinderStatus(str, Enum):
    QUEUED = "queued"
    GENERATING = "generating"
    COMPLETE = "complete"
    FAILED = "failed"


class RedactionMode(str, Enum):
    """Redaction output modes."""
    STANDARD = "standard"      # No redactions applied
    REDACTED = "redacted"      # Redactions applied, content replaced with [REDACTED]
    PRIVILEGED = "privileged"  # Include privileged content (attorney-client)
    BOTH = "both"              # Generate both redacted and unredacted versions


class BatesPosition(str, Enum):
    """Bates number position on page."""
    BOTTOM_RIGHT = "bottom-right"
    BOTTOM_LEFT = "bottom-left"
    BOTTOM_CENTER = "bottom-center"


@dataclass
class BatesConfig:
    """Configuration for Bates numbering."""
    enabled: bool = False
    prefix: str = ""  # Will default to portfolio abbreviation
    start_number: int = 1
    digits: int = 6  # Number of digits with leading zeros
    position: str = BatesPosition.BOTTOM_RIGHT.value
    include_cover: bool = False
    font_size: int = 9
    margin_x: int = 18  # pixels from edge
    margin_y: int = 18  # pixels from edge


@dataclass
class RedactionEntry:
    """Single redaction marker."""
    record_id: str
    field_path: str
    reason: str = ""
    reason_type: str = "pii"  # "pii", "privileged", "confidential", "custom"
    timestamp: Optional[str] = None
    user_id: Optional[str] = None
    is_persistent: bool = True  # True = saved on record, False = per-run


@dataclass
class BatesPageEntry:
    """Single page in the Bates map."""
    page_index: int
    bates_number: str
    source_section: str
    source_record_id: Optional[str] = None
    source_title: Optional[str] = None


@dataclass
class BinderRules:
    """Configuration rules for a binder profile."""
    include_drafts: bool = False
    include_pending_approved_executed: bool = False
    include_voided_trashed: bool = False
    include_attachments: bool = True
    include_ledger_excerpts: bool = True
    include_integrity_summary: bool = True
    date_range: str = "all"  # "all", "12months", "24months", "custom"
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    attested_only_minutes: bool = False  # For Audit profile
    case_thread_ids: List[str] = field(default_factory=list)  # For Court profile
    dispute_id: Optional[str] = None  # For Court profile
    # Court Mode options
    bates_enabled: bool = False
    bates_prefix: Optional[str] = None  # None = use portfolio abbreviation
    bates_start_number: int = 1
    bates_digits: int = 6
    bates_position: str = BatesPosition.BOTTOM_RIGHT.value
    bates_include_cover: bool = False
    bates_font_size: int = 9
    bates_margin_x: int = 18
    bates_margin_y: int = 18
    redaction_mode: str = RedactionMode.STANDARD.value
    adhoc_redactions: List[Dict] = field(default_factory=list)  # Per-run redactions


@dataclass
class ManifestItem:
    """Single item in the binder manifest."""
    section: str
    item_type: str
    title: str
    db_id: str
    rm_id_display: Optional[str]
    status: str
    finalized_at: Optional[str]
    version: Optional[str]
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    bates_start: Optional[str] = None  # First Bates number for this item
    bates_end: Optional[str] = None    # Last Bates number for this item


@dataclass
class RedactionLog:
    """Log of all redactions applied to a binder."""
    entries: List[Dict] = field(default_factory=list)
    total_persistent: int = 0
    total_adhoc: int = 0
    generated_at: Optional[str] = None


# ============ GAPS ANALYSIS: CHECKLIST TEMPLATE ============

class GapStatus(str, Enum):
    """Gap analysis status for checklist items."""
    COMPLETE = "complete"       # ✅ All requirements met
    PARTIAL = "partial"         # ⚠️ Document exists but incomplete
    MISSING = "missing"         # ❌ Required but not found
    NOT_APPLICABLE = "n/a"      # Not applicable to this portfolio


class RiskLevel(str, Enum):
    """Risk level for missing/incomplete items."""
    HIGH = "high"       # Required + missing + time-sensitive
    MEDIUM = "medium"   # Required + partial or missing (not time-triggered)
    LOW = "low"         # Optional/supporting


@dataclass
class ChecklistItem:
    """Single item in the compliance checklist."""
    id: str
    category: str
    name: str
    description: str
    tier: int  # 1=highest priority, 2=medium, 3=lower
    required: bool = True
    time_sensitive: bool = False
    trigger_condition: Optional[str] = None  # e.g., "after_death", "tax_year_end"
    validation_rules: List[str] = field(default_factory=list)  # e.g., "has_signature", "has_date"
    document_types: List[str] = field(default_factory=list)  # Matching document types


@dataclass
class GapAnalysisResult:
    """Result of gap analysis for a single checklist item."""
    item_id: str
    item_name: str
    category: str
    status: str  # GapStatus value
    risk_level: str  # RiskLevel value
    reason: str
    remediation: Optional[str] = None
    matched_documents: List[str] = field(default_factory=list)
    missing_requirements: List[str] = field(default_factory=list)


@dataclass  
class IntegrityStamp:
    """Integrity stamp for binder verification."""
    binder_pdf_sha256: str
    manifest_sha256: str
    run_id: str
    portfolio_id: str
    generated_at: str
    generated_by: str
    generator_version: str
    total_items: int
    total_pages: int
    seal_coverage_percent: float
    verification_url: str


# Default Trust Administration Checklist v1
CHECKLIST_TEMPLATE_V1 = [
    # Tier 1 - Highest Priority
    ChecklistItem(
        id="trust_agreement",
        category="Core Trust Documents",
        name="Trust Agreement",
        description="Original signed trust agreement with all amendments and restatements",
        tier=1,
        required=True,
        time_sensitive=False,
        validation_rules=["has_signature", "has_date", "has_notarization"],
        document_types=["trust_agreement", "trust_instrument", "declaration_of_trust"]
    ),
    ChecklistItem(
        id="trust_amendments",
        category="Core Trust Documents", 
        name="Trust Amendments",
        description="All amendments and restatements to the trust agreement",
        tier=1,
        required=True,
        time_sensitive=False,
        validation_rules=["has_signature", "has_date"],
        document_types=["amendment", "restatement", "trust_amendment"]
    ),
    ChecklistItem(
        id="trustee_acceptance",
        category="Core Trust Documents",
        name="Trustee Acceptance / Certification",
        description="Formal acceptance of trusteeship or certification of trust",
        tier=1,
        required=True,
        time_sensitive=True,
        trigger_condition="upon_appointment",
        validation_rules=["has_signature", "has_date", "has_trustee_name"],
        document_types=["trustee_acceptance", "certification_of_trust", "trustee_certificate"]
    ),
    ChecklistItem(
        id="death_certificate",
        category="Death & Notices",
        name="Death Certificate",
        description="Certified copy of grantor's death certificate (if applicable)",
        tier=1,
        required=False,  # Only if death-triggered
        time_sensitive=True,
        trigger_condition="after_death",
        validation_rules=["certified_copy", "has_date"],
        document_types=["death_certificate", "certificate_of_death"]
    ),
    ChecklistItem(
        id="beneficiary_notices",
        category="Death & Notices",
        name="Beneficiary Notices",
        description="Notices to beneficiaries with proof of mailing/service (e.g., Probate Code §16061.7)",
        tier=1,
        required=True,
        time_sensitive=True,
        trigger_condition="within_60_days_of_death",
        validation_rules=["has_recipients", "has_proof_of_delivery", "has_date"],
        document_types=["beneficiary_notice", "notice_to_beneficiaries", "16061_notice"]
    ),
    ChecklistItem(
        id="asset_inventory",
        category="Asset Inventory",
        name="Asset Inventory",
        description="Complete inventory of trust assets with date-of-death or as-of valuations",
        tier=1,
        required=True,
        time_sensitive=False,
        validation_rules=["has_values", "has_date", "is_complete"],
        document_types=["asset_inventory", "inventory", "asset_schedule"]
    ),
    ChecklistItem(
        id="asset_valuations",
        category="Asset Inventory",
        name="Asset Valuations",
        description="Date-of-death or current valuations for all assets",
        tier=1,
        required=True,
        time_sensitive=False,
        validation_rules=["has_values", "has_valuation_date", "has_source"],
        document_types=["valuation", "appraisal", "date_of_death_value"]
    ),
    ChecklistItem(
        id="ein_number",
        category="Tax & Reporting",
        name="EIN for Trust/Estate",
        description="Employer Identification Number for the trust or estate",
        tier=1,
        required=True,
        time_sensitive=True,
        trigger_condition="upon_trust_becoming_irrevocable",
        validation_rules=["has_ein"],
        document_types=["ein", "ein_letter", "ss4_confirmation"]
    ),
    ChecklistItem(
        id="fiduciary_tax_returns",
        category="Tax & Reporting",
        name="Fiduciary Tax Returns",
        description="Form 1041 or equivalent fiduciary income tax returns",
        tier=1,
        required=True,
        time_sensitive=True,
        trigger_condition="tax_year_end",
        validation_rules=["has_signature", "has_date", "is_filed"],
        document_types=["form_1041", "fiduciary_return", "tax_return"]
    ),
    
    # Tier 2 - Medium Priority
    ChecklistItem(
        id="pour_over_will",
        category="Core Trust Documents",
        name="Pour-Over Will",
        description="Pour-over will directing probate assets to trust (if applicable)",
        tier=2,
        required=False,
        time_sensitive=False,
        validation_rules=["has_signature", "has_witnesses", "has_date"],
        document_types=["pour_over_will", "will", "last_will"]
    ),
    ChecklistItem(
        id="letters_testamentary",
        category="Core Trust Documents",
        name="Letters Testamentary/Administration",
        description="Court-issued letters if estate administration involved",
        tier=2,
        required=False,
        time_sensitive=True,
        trigger_condition="if_probate_required",
        validation_rules=["court_issued", "has_date"],
        document_types=["letters_testamentary", "letters_of_administration"]
    ),
    ChecklistItem(
        id="deeds_titles",
        category="Asset Inventory",
        name="Deeds & Title Documents",
        description="Deeds, titles, and proof of retitling for real property and titled assets",
        tier=2,
        required=True,
        time_sensitive=False,
        validation_rules=["has_recording_info", "has_date"],
        document_types=["deed", "title", "grant_deed", "quitclaim_deed", "transfer_deed"]
    ),
    ChecklistItem(
        id="appraisals",
        category="Asset Inventory",
        name="Professional Appraisals",
        description="Appraisals for real property, unique assets, and closely-held business interests",
        tier=2,
        required=False,
        time_sensitive=False,
        validation_rules=["has_appraiser", "has_date", "has_methodology"],
        document_types=["appraisal", "professional_appraisal", "valuation_report"]
    ),
    
    # Tier 3 - Lower Priority
    ChecklistItem(
        id="power_of_attorney",
        category="Supporting Documents",
        name="Power of Attorney",
        description="Durable power of attorney (if applicable)",
        tier=3,
        required=False,
        time_sensitive=False,
        validation_rules=["has_signature", "has_date", "has_notarization"],
        document_types=["power_of_attorney", "poa", "durable_poa"]
    ),
    ChecklistItem(
        id="healthcare_directive",
        category="Supporting Documents",
        name="Healthcare Directive",
        description="Advance healthcare directive or healthcare proxy",
        tier=3,
        required=False,
        time_sensitive=False,
        validation_rules=["has_signature", "has_date"],
        document_types=["healthcare_directive", "advance_directive", "living_will"]
    ),
    ChecklistItem(
        id="creditor_notices",
        category="Death & Notices",
        name="Creditor Notices",
        description="Notices to known creditors with proof of service",
        tier=3,
        required=False,
        time_sensitive=True,
        trigger_condition="after_death",
        validation_rules=["has_recipients", "has_proof_of_delivery"],
        document_types=["creditor_notice", "notice_to_creditors"]
    ),
]


# Default profile configurations
PROFILE_DEFAULTS = {
    BinderProfile.AUDIT: BinderRules(
        include_drafts=False,
        include_pending_approved_executed=False,
        include_voided_trashed=False,
        include_attachments=True,
        include_ledger_excerpts=True,
        include_integrity_summary=True,
        date_range="all",
        attested_only_minutes=True,
        bates_enabled=False,
        redaction_mode=RedactionMode.STANDARD.value
    ),
    BinderProfile.COURT: BinderRules(
        include_drafts=False,
        include_pending_approved_executed=True,
        include_voided_trashed=False,
        include_attachments=True,
        include_ledger_excerpts=True,
        include_integrity_summary=True,
        date_range="24months",
        bates_enabled=True,  # Court profile has Bates enabled by default
        bates_digits=6,
        bates_position=BatesPosition.BOTTOM_RIGHT.value,
        bates_include_cover=False,
        redaction_mode=RedactionMode.REDACTED.value  # Court profile uses redacted mode
    ),
    BinderProfile.OMNI: BinderRules(
        include_drafts=False,
        include_pending_approved_executed=True,
        include_voided_trashed=False,
        include_attachments=True,
        include_ledger_excerpts=True,
        include_integrity_summary=True,
        date_range="all",
        bates_enabled=False,
        redaction_mode=RedactionMode.STANDARD.value
    )
}

# Section ordering (deterministic)
SECTION_ORDER = [
    "cover",
    "toc",
    "manifest",
    "trust_profile",
    "trust_authority",
    "governance_minutes",
    "governance_distributions",
    "governance_compensation",
    "governance_disputes",
    "governance_insurance",
    "ledger",
    "assets",
    "documents",
    "attachments",
    "integrity_summary"
]


# ============ SAFE TITLE HELPER ============

def safe_title(obj, default="Untitled"):
    """
    Safely extract a title from any object type.
    Supports: dicts, ORM objects, None, and missing fields.
    """
    if obj is None:
        return default
    
    # Try dict-style access
    if isinstance(obj, dict):
        return obj.get("title") or obj.get("name") or obj.get("trust_name") or obj.get("description") or default
    
    # Try attribute access for ORM objects
    for attr in ["title", "name", "trust_name", "description"]:
        try:
            val = getattr(obj, attr, None)
            if val:
                return str(val)
        except Exception:
            continue
    
    return default


def safe_get(obj, key, default=None):
    """Safely get a value from dict or object."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


class BinderService:
    """
    Service for generating Portfolio Binders.
    Produces consolidated, court/audit-ready PDFs.
    """
    
    def __init__(self, db):
        self.db = db
    
    # ============ PROFILE MANAGEMENT ============
    
    async def get_profile(self, profile_id: str) -> Optional[Dict]:
        """Get a saved binder profile."""
        profile = await self.db.binder_profiles.find_one(
            {"id": profile_id},
            {"_id": 0}
        )
        return profile
    
    async def get_profiles_for_portfolio(self, portfolio_id: str, user_id: str) -> List[Dict]:
        """Get all binder profiles for a portfolio."""
        profiles = await self.db.binder_profiles.find(
            {"portfolio_id": portfolio_id, "user_id": user_id},
            {"_id": 0}
        ).to_list(100)
        return profiles
    
    async def create_profile(
        self,
        portfolio_id: str,
        user_id: str,
        name: str,
        profile_type: BinderProfile,
        rules: BinderRules
    ) -> Dict:
        """Create a new binder profile."""
        profile_id = f"bprof_{uuid4().hex[:12]}"
        
        profile = {
            "id": profile_id,
            "portfolio_id": portfolio_id,
            "user_id": user_id,
            "name": name,
            "profile_type": profile_type.value,
            "rules_json": asdict(rules),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.binder_profiles.insert_one(profile)
        profile.pop("_id", None)
        
        return profile
    
    async def ensure_default_profiles(self, portfolio_id: str, user_id: str) -> List[Dict]:
        """Ensure default profiles exist for a portfolio."""
        existing = await self.get_profiles_for_portfolio(portfolio_id, user_id)
        existing_types = {p["profile_type"] for p in existing}
        
        created = []
        
        for profile_type, rules in PROFILE_DEFAULTS.items():
            if profile_type.value not in existing_types:
                name = {
                    BinderProfile.AUDIT: "Audit Binder",
                    BinderProfile.COURT: "Court / Litigation Binder",
                    BinderProfile.OMNI: "Omni Binder"
                }[profile_type]
                
                profile = await self.create_profile(
                    portfolio_id, user_id, name, profile_type, rules
                )
                created.append(profile)
        
        return existing + created
    
    # ============ BINDER RUN MANAGEMENT ============
    
    async def get_runs_for_portfolio(
        self,
        portfolio_id: str,
        user_id: str,
        limit: int = 20
    ) -> List[Dict]:
        """Get binder run history for a portfolio."""
        runs = await self.db.binder_runs.find(
            {"portfolio_id": portfolio_id, "user_id": user_id},
            {"_id": 0}
        ).sort("started_at", -1).limit(limit).to_list(limit)
        return runs
    
    async def get_run(self, run_id: str) -> Optional[Dict]:
        """Get a specific binder run."""
        run = await self.db.binder_runs.find_one(
            {"id": run_id},
            {"_id": 0}
        )
        return run
    
    async def get_latest_run(
        self,
        portfolio_id: str,
        user_id: str,
        profile_type: Optional[str] = None
    ) -> Optional[Dict]:
        """Get the most recent completed binder run."""
        query = {
            "portfolio_id": portfolio_id,
            "user_id": user_id,
            "status": BinderStatus.COMPLETE.value
        }
        if profile_type:
            query["profile_type"] = profile_type
        
        run = await self.db.binder_runs.find_one(
            query,
            {"_id": 0},
            sort=[("finished_at", -1)]
        )
        return run
    
    async def create_run(
        self,
        portfolio_id: str,
        user_id: str,
        profile_id: str,
        profile_type: str,
        profile_name: str,
        rules: Dict
    ) -> Dict:
        """Create a new binder run record."""
        run_id = f"brun_{uuid4().hex[:12]}"
        
        run = {
            "id": run_id,
            "portfolio_id": portfolio_id,
            "user_id": user_id,
            "profile_id": profile_id,
            "profile_type": profile_type,
            "profile_name": profile_name,
            "rules_snapshot": rules,
            "status": BinderStatus.QUEUED.value,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "finished_at": None,
            "pdf_data": None,  # Will store base64 PDF
            "manifest_json": None,
            "error_json": None,
            "total_pages": 0,
            "total_items": 0
        }
        
        await self.db.binder_runs.insert_one(run)
        run.pop("_id", None)
        
        return run
    
    async def update_run_status(
        self,
        run_id: str,
        status: BinderStatus,
        pdf_data: Optional[str] = None,
        manifest: Optional[List[Dict]] = None,
        error: Optional[Dict] = None,
        total_pages: int = 0,
        total_items: int = 0
    ):
        """Update a binder run status."""
        update = {
            "status": status.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if status in (BinderStatus.COMPLETE, BinderStatus.FAILED):
            update["finished_at"] = datetime.now(timezone.utc).isoformat()
        
        if pdf_data:
            update["pdf_data"] = pdf_data
        if manifest:
            update["manifest_json"] = manifest
            update["total_items"] = len(manifest)
        if error:
            update["error_json"] = error
        if total_pages:
            update["total_pages"] = total_pages
        
        await self.db.binder_runs.update_one(
            {"id": run_id},
            {"$set": update}
        )
    
    # ============ CONTENT COLLECTION ============
    
    async def collect_binder_content(
        self,
        portfolio_id: str,
        user_id: str,
        rules: Dict
    ) -> Dict[str, List[Dict]]:
        """
        Collect all content for a binder based on rules.
        Returns dict of section -> items.
        """
        content = {section: [] for section in SECTION_ORDER}
        
        # Build status filter based on rules
        status_filter = ["finalized", "attested", "amended"]
        if rules.get("include_pending_approved_executed"):
            status_filter.extend(["pending", "approved", "executed"])
        if rules.get("include_drafts"):
            status_filter.append("draft")
        
        # Date filter
        date_query = {}
        if rules.get("date_range") == "12months":
            from datetime import timedelta
            cutoff = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
            date_query = {"created_at": {"$gte": cutoff}}
        elif rules.get("date_range") == "24months":
            from datetime import timedelta
            cutoff = (datetime.now(timezone.utc) - timedelta(days=730)).isoformat()
            date_query = {"created_at": {"$gte": cutoff}}
        elif rules.get("date_start") and rules.get("date_end"):
            date_query = {
                "created_at": {
                    "$gte": rules["date_start"],
                    "$lte": rules["date_end"]
                }
            }
        
        # 1. Trust Profile
        trust_profile = await self.db.trust_profiles.find_one(
            {"portfolio_id": portfolio_id, "user_id": user_id},
            {"_id": 0}
        )
        if trust_profile:
            content["trust_profile"].append({
                "type": "trust_profile",
                "title": safe_title(trust_profile, "Trust Profile"),
                "id": safe_get(trust_profile, "id", portfolio_id),
                "data": trust_profile
            })
        
        # 2. Governance Records by type
        gov_query = {
            "portfolio_id": portfolio_id,
            "user_id": user_id,
            "status": {"$in": status_filter}
        }
        if not rules.get("include_voided_trashed"):
            gov_query["status"] = {"$nin": ["voided", "trashed"], "$in": status_filter}
        
        if date_query:
            gov_query.update(date_query)
        
        # Case/thread scope for Court profile
        if rules.get("case_thread_ids"):
            gov_query["rm_subject_id"] = {"$in": rules["case_thread_ids"]}
        if rules.get("dispute_id"):
            gov_query["$or"] = [
                {"id": rules["dispute_id"]},
                {"linked_dispute_id": rules["dispute_id"]}
            ]
        
        governance_records = await self.db.governance_records.find(
            gov_query,
            {"_id": 0}
        ).sort([("rm_group", 1), ("rm_sub", 1), ("created_at", 1)]).to_list(1000)
        
        # Sort into sections by module_type
        module_section_map = {
            "minutes": "governance_minutes",
            "distribution": "governance_distributions",
            "compensation": "governance_compensation",
            "dispute": "governance_disputes",
            "insurance": "governance_insurance"
        }
        
        for record in governance_records:
            module = safe_get(record, "module_type", "minutes")
            section = module_section_map.get(module, "governance_minutes")
            
            # Get revision payload safely
            payload = {}
            current_rev_id = safe_get(record, "current_revision_id")
            if current_rev_id:
                revision = await self.db.governance_revisions.find_one(
                    {"id": current_rev_id},
                    {"_id": 0}
                )
                if revision:
                    payload_raw = safe_get(revision, "payload_json", {})
                    # Ensure payload is always a dict (handle string JSON)
                    if isinstance(payload_raw, str):
                        try:
                            import json
                            payload = json.loads(payload_raw)
                        except:
                            payload = {}
                    elif isinstance(payload_raw, dict):
                        payload = payload_raw
                    else:
                        payload = {}
            
            # Use safe_title for record title
            record_title = safe_title(record, f"{module.title() if module else 'Unknown'} Record")
            
            content[section].append({
                "type": f"governance_{module}",
                "title": record_title,
                "id": safe_get(record, "id"),
                "rm_id": safe_get(record, "rm_id"),
                "rm_subject_id": safe_get(record, "rm_subject_id"),
                "status": safe_get(record, "status"),
                "finalized_at": safe_get(record, "finalized_at"),
                "created_at": safe_get(record, "created_at"),
                "data": record,
                "payload": payload
            })
        
        # 3. Documents
        doc_query = {
            "portfolio_id": portfolio_id,
            "user_id": user_id
        }
        if not rules.get("include_voided_trashed"):
            doc_query["status"] = {"$ne": "trashed"}
        
        documents = await self.db.documents.find(
            doc_query,
            {"_id": 0}
        ).sort("created_at", 1).to_list(500)
        
        for doc in documents:
            content["documents"].append({
                "type": "document",
                "title": safe_title(doc, "Document"),
                "id": safe_get(doc, "id"),
                "status": safe_get(doc, "status", "active"),
                "created_at": safe_get(doc, "created_at"),
                "data": doc
            })
        
        # 4. Assets
        assets = await self.db.assets.find(
            {"portfolio_id": portfolio_id, "user_id": user_id},
            {"_id": 0}
        ).sort("created_at", 1).to_list(500)
        
        for asset in assets:
            content["assets"].append({
                "type": "asset",
                "title": safe_title(asset, "Asset"),
                "id": safe_get(asset, "id"),
                "status": safe_get(asset, "status", "active"),
                "created_at": safe_get(asset, "created_at"),
                "data": asset
            })
        
        # 5. Ledger entries (if enabled)
        if rules.get("include_ledger_excerpts", True):
            ledger_query = {
                "portfolio_id": portfolio_id,
                "user_id": user_id
            }
            if date_query:
                ledger_query.update(date_query)
            
            ledger_entries = await self.db.ledger_entries.find(
                ledger_query,
                {"_id": 0}
            ).sort("entry_date", 1).to_list(1000)
            
            for entry in ledger_entries:
                content["ledger"].append({
                    "type": "ledger_entry",
                    "title": safe_title(entry, "Ledger Entry"),
                    "id": safe_get(entry, "id"),
                    "status": "recorded",
                    "entry_date": safe_get(entry, "entry_date"),
                    "data": entry
                })
        
        return content
    
    # ============ MANIFEST GENERATION ============
    
    def generate_manifest(self, content: Dict[str, List[Dict]]) -> List[Dict]:
        """Generate the binder manifest from collected content."""
        manifest = []
        
        for section in SECTION_ORDER:
            items = content.get(section, [])
            for item in items:
                manifest.append({
                    "section": section,
                    "item_type": safe_get(item, "type"),
                    "title": safe_title(item, "Untitled"),
                    "db_id": safe_get(item, "id"),
                    "rm_id_display": safe_get(item, "rm_id"),
                    "status": safe_get(item, "status"),
                    "finalized_at": safe_get(item, "finalized_at"),
                    "version": safe_get(safe_get(item, "data", {}), "version")
                })
        
        return manifest
    
    # ============ PDF GENERATION ============
    
    async def generate_pdf(
        self,
        portfolio_id: str,
        user_id: str,
        profile: Dict,
        content: Dict[str, List[Dict]],
        manifest: List[Dict]
    ) -> bytes:
        """
        Generate the consolidated PDF binder.
        Returns PDF bytes.
        
        Phase 2 Features:
        - Clickable Table of Contents with anchor links
        - PDF Bookmarks for navigation
        - Enhanced section dividers with icons
        """
        from weasyprint import HTML
        from weasyprint.text.fonts import FontConfiguration
        
        font_config = FontConfiguration()
        
        # Get portfolio and trust info
        portfolio = await self.db.portfolios.find_one(
            {"portfolio_id": portfolio_id},
            {"_id": 0}
        )
        trust_profile = content.get("trust_profile", [{}])[0].get("data", {}) if content.get("trust_profile") else {}
        
        portfolio_name = portfolio.get("name", "Portfolio") if portfolio else "Portfolio"
        trust_name = trust_profile.get("trust_name", "")
        
        # Build HTML document
        html_parts = []
        
        # CSS Styling with PDF Bookmark support
        css = """
        @page {
            size: letter;
            margin: 0.75in;
            @top-center {
                content: string(portfolio-name);
                font-size: 9pt;
                color: #666;
            }
            @bottom-center {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 9pt;
                color: #666;
            }
        }
        
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #1a1a1a;
        }
        
        /* PDF Bookmark styles - Level 1 for major sections */
        h1.bookmark-l1 {
            bookmark-level: 1;
            bookmark-label: attr(data-bookmark);
        }
        
        /* PDF Bookmark styles - Level 2 for individual records */
        h2.bookmark-l2 {
            bookmark-level: 2;
            bookmark-label: attr(data-bookmark);
        }
        
        .cover-page {
            page-break-after: always;
        }
        
        .cover-container {
            text-align: center;
            padding-top: 2in;
        }
        
        .cover-logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 0.5in auto;
            border: 3px solid #d4af37;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0B1221 0%, #1a2744 100%);
        }
        
        .cover-logo-text {
            font-size: 32pt;
            color: #d4af37;
            font-weight: bold;
        }
        
        .cover-title {
            font-size: 28pt;
            font-weight: bold;
            color: #0a0a0a;
            margin-bottom: 0.3in;
        }
        
        .cover-subtitle {
            font-size: 18pt;
            color: #333;
            margin-bottom: 0.25in;
        }
        
        .cover-meta {
            font-size: 11pt;
            color: #666;
            margin-top: 1.5in;
        }
        
        .cover-badge {
            display: inline-block;
            background: linear-gradient(135deg, #d4af37 0%, #f4e4bc 50%, #d4af37 100%);
            color: #1a1a1a;
            padding: 10px 32px;
            font-weight: bold;
            font-size: 14pt;
            border-radius: 4px;
            margin-top: 0.75in;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .cover-footer {
            position: absolute;
            bottom: 1in;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 9pt;
            color: #999;
        }
        
        /* Table of Contents Styles */
        .toc-page {
            page-break-after: always;
        }
        
        .toc-header {
            font-size: 24pt;
            font-weight: bold;
            color: #0B1221;
            text-align: center;
            margin-bottom: 0.5in;
            padding-bottom: 0.25in;
            border-bottom: 3px solid #d4af37;
        }
        
        .toc-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .toc-section {
            margin-bottom: 0.25in;
        }
        
        .toc-section-link {
            display: flex;
            align-items: baseline;
            text-decoration: none;
            color: #1a1a1a;
            padding: 8px 0;
            border-bottom: 1px dotted #ccc;
        }
        
        .toc-section-link:hover {
            color: #d4af37;
        }
        
        .toc-icon {
            width: 24px;
            margin-right: 12px;
            text-align: center;
            color: #d4af37;
            font-size: 14pt;
        }
        
        .toc-title {
            flex: 1;
            font-size: 12pt;
            font-weight: 600;
        }
        
        .toc-count {
            font-size: 10pt;
            color: #666;
            margin-left: 8px;
        }
        
        .toc-page-ref {
            font-size: 10pt;
            color: #666;
            text-align: right;
        }
        
        .toc-subsection {
            margin-left: 36px;
        }
        
        .toc-subsection-link {
            display: flex;
            align-items: baseline;
            text-decoration: none;
            color: #555;
            padding: 4px 0;
            font-size: 10pt;
        }
        
        .toc-subsection-link:hover {
            color: #d4af37;
        }
        
        /* Section Divider - Enhanced */
        .section-divider {
            page-break-before: always;
            page-break-after: always;
            text-align: center;
            padding-top: 2.5in;
            background: linear-gradient(135deg, #0B1221 0%, #1a2744 100%);
            color: white;
            margin: -0.75in;
            padding-left: 0.75in;
            padding-right: 0.75in;
            min-height: 100vh;
            position: relative;
        }
        
        .section-divider::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: linear-gradient(90deg, #d4af37 0%, #f4e4bc 50%, #d4af37 100%);
        }
        
        .section-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 0.5in auto;
            border: 2px solid #d4af37;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(212, 175, 55, 0.1);
        }
        
        .section-icon-text {
            font-size: 36pt;
            color: #d4af37;
        }
        
        .section-number {
            font-size: 14pt;
            color: #d4af37;
            letter-spacing: 4px;
            text-transform: uppercase;
            margin-bottom: 0.25in;
        }
        
        .section-title {
            font-size: 28pt;
            font-weight: bold;
            color: #d4af37;
            margin-bottom: 0.25in;
        }
        
        .section-subtitle {
            font-size: 14pt;
            color: #999;
            margin-bottom: 0.5in;
        }
        
        .section-meta {
            font-size: 11pt;
            color: #666;
            border-top: 1px solid #333;
            padding-top: 0.25in;
            margin-top: 1in;
        }
        
        .manifest-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
            margin-top: 0.25in;
        }
        
        .manifest-table th {
            background: #0B1221;
            color: #d4af37;
            padding: 8px;
            text-align: left;
            border-bottom: 2px solid #d4af37;
        }
        
        .manifest-table td {
            padding: 6px 8px;
            border-bottom: 1px solid #ddd;
        }
        
        .manifest-table tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        .record-page {
            page-break-after: always;
        }
        
        .record-header {
            background: #0B1221;
            color: white;
            padding: 16px;
            margin: -0.75in -0.75in 0.5in -0.75in;
        }
        
        .record-title {
            font-size: 16pt;
            font-weight: bold;
            color: #d4af37;
        }
        
        .record-meta {
            font-size: 9pt;
            color: #999;
            margin-top: 8px;
        }
        
        .record-badge {
            display: inline-block;
            background: #d4af37;
            color: #0B1221;
            padding: 2px 8px;
            font-size: 8pt;
            font-weight: bold;
            border-radius: 3px;
            text-transform: uppercase;
        }
        
        .record-content {
            padding: 0.25in 0;
        }
        
        .field-label {
            font-weight: bold;
            color: #333;
            margin-top: 12px;
        }
        
        .field-value {
            margin-left: 0;
            color: #1a1a1a;
        }
        
        .integrity-stamp {
            margin-top: 0.5in;
            padding: 12px;
            background: #f0f8f0;
            border-left: 3px solid #28a745;
            font-size: 9pt;
        }
        
        .trust-profile-summary {
            border: 1px solid #d4af37;
            padding: 16px;
            margin: 16px 0;
        }
        
        .profile-field {
            display: flex;
            border-bottom: 1px solid #eee;
            padding: 8px 0;
        }
        
        .profile-label {
            flex: 0 0 200px;
            font-weight: bold;
            color: #666;
        }
        
        .profile-value {
            flex: 1;
            color: #1a1a1a;
        }
        
        /* Link styles for TOC */
        a {
            color: inherit;
            text-decoration: none;
        }
        """
        
        # 1. Cover Page
        generated_at = datetime.now(timezone.utc).strftime("%B %d, %Y at %I:%M %p UTC")
        profile_name = profile.get("name", "Binder")
        
        # Get first letter for logo
        logo_letter = portfolio_name[0].upper() if portfolio_name else "B"
        
        html_parts.append(f"""
        <div class="cover-page">
            <h1 class="bookmark-l1" data-bookmark="{portfolio_name} - {profile_name}" style="position: absolute; top: -100px; visibility: hidden;">Cover</h1>
            <div class="cover-container">
                <div class="cover-logo">
                    <span class="cover-logo-text">{logo_letter}</span>
                </div>
                <div class="cover-title">{portfolio_name}</div>
                <div class="cover-subtitle">{trust_name or 'Trust Administration Binder'}</div>
                <div class="cover-badge">{profile_name}</div>
                <div class="cover-meta">
                    <p><strong>Generated:</strong> {generated_at}</p>
                    <p><strong>Total Items:</strong> {len(manifest)}</p>
                    <p><strong>Document Type:</strong> Court/Audit Ready PDF Packet</p>
                </div>
            </div>
        </div>
        """)
        
        # 2. Table of Contents with clickable links
        # Build section info for TOC
        section_icons = {
            "trust_profile": "📋",
            "governance_minutes": "📝",
            "governance_distributions": "💰",
            "governance_compensation": "👥",
            "governance_disputes": "⚖️",
            "governance_insurance": "🛡️",
            "ledger": "📊",
            "assets": "🏢",
            "documents": "📁",
            "integrity_summary": "✓"
        }
        
        section_display_names = {
            "trust_profile": "Trust Profile & Authority",
            "governance_minutes": "Meeting Minutes",
            "governance_distributions": "Distributions",
            "governance_compensation": "Compensation",
            "governance_disputes": "Disputes",
            "governance_insurance": "Insurance Policies",
            "ledger": "Ledger & Financial",
            "assets": "Assets",
            "documents": "Documents",
            "integrity_summary": "Integrity Summary"
        }
        
        html_parts.append("""
        <div class="toc-page" id="toc">
            <h1 class="bookmark-l1" data-bookmark="Table of Contents" style="visibility: hidden; height: 0; margin: 0;">TOC</h1>
            <div class="toc-header">Table of Contents</div>
            <ul class="toc-list">
        """)
        
        section_num = 1
        for section_key in SECTION_ORDER:
            if section_key in ["cover", "toc", "manifest", "attachments", "trust_authority"]:
                continue
            
            items = content.get(section_key, [])
            if not items and section_key != "integrity_summary":
                continue
            
            # Skip integrity summary if disabled
            if section_key == "integrity_summary" and not profile.get("rules_json", {}).get("include_integrity_summary", True):
                continue
            
            icon = section_icons.get(section_key, "📄")
            display_name = section_display_names.get(section_key, section_key.replace("_", " ").title())
            item_count = len(items) if items else ""
            count_text = f"({item_count} items)" if item_count else ""
            
            html_parts.append(f"""
                <li class="toc-section">
                    <a href="#section-{section_key}" class="toc-section-link">
                        <span class="toc-icon">{icon}</span>
                        <span class="toc-title">Section {section_num}: {display_name}</span>
                        <span class="toc-count">{count_text}</span>
                    </a>
            """)
            
            # Add subsection links for individual items (max 10 to avoid TOC bloat)
            if items and len(items) <= 10:
                html_parts.append('<ul class="toc-subsection">')
                for idx, item in enumerate(items):
                    item_id = item.get("id", f"{section_key}-{idx}")
                    item_title = item.get("title", "Untitled")[:50]
                    rm_id = item.get("rm_id", "")
                    rm_display = f" ({rm_id})" if rm_id else ""
                    html_parts.append(f"""
                        <li>
                            <a href="#item-{item_id}" class="toc-subsection-link">
                                • {item_title}{rm_display}
                            </a>
                        </li>
                    """)
                html_parts.append('</ul>')
            elif items and len(items) > 10:
                html_parts.append(f'<div style="margin-left: 36px; font-size: 9pt; color: #888;">... and {len(items)} more items</div>')
            
            html_parts.append('</li>')
            section_num += 1
        
        html_parts.append("""
            </ul>
        </div>
        """)
        
        # 3. Manifest / Index Page (now numbered Section 0 equivalent)
        html_parts.append("""
        <div class="record-page" id="manifest">
            <h1 class="bookmark-l1" data-bookmark="Document Manifest" style="visibility: hidden; height: 0; margin: 0;">Manifest</h1>
            <h2 style="color: #d4af37; border-bottom: 2px solid #d4af37; padding-bottom: 8px;">
                Document Manifest
            </h2>
            <p style="font-size: 10pt; color: #666; margin-bottom: 16px;">
                Complete index of all items included in this binder
            </p>
            <table class="manifest-table">
                <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>Section</th>
                        <th>Title</th>
                        <th>RM-ID</th>
                        <th>Status</th>
                        <th>Finalized</th>
                    </tr>
                </thead>
                <tbody>
        """)
        
        for idx, item in enumerate(manifest, 1):
            section_val = item.get("section", "unknown") or "unknown"
            section_display = section_val.replace("_", " ").title()
            rm_id = item.get("rm_id_display") or "—"
            finalized = item.get("finalized_at", "")[:10] if item.get("finalized_at") else "—"
            item_id = item.get("db_id") or f"item-{idx}"
            item_title = item.get("title") or "Untitled"
            item_status = (item.get("status") or "unknown").title()
            
            html_parts.append(f"""
                <tr>
                    <td style="text-align: center;">{idx}</td>
                    <td>{section_display}</td>
                    <td><a href="#item-{item_id}" style="color: #1a1a1a;">{item_title}</a></td>
                    <td><code>{rm_id}</code></td>
                    <td>{item_status}</td>
                    <td>{finalized}</td>
                </tr>
            """)
        
        html_parts.append("""
                </tbody>
            </table>
        </div>
        """)
        
        # 3a. Missing Items Page (if any)
        missing_items = content.get("_missing_items", [])
        validation_warnings = content.get("_validation_warnings", [])
        
        if missing_items or validation_warnings:
            html_parts.append("""
            <div class="record-page" id="missing-items">
                <h1 class="bookmark-l1" data-bookmark="Missing Items Notice" style="visibility: hidden; height: 0; margin: 0;">Missing Items</h1>
                <h2 style="color: #dc3545; border-bottom: 2px solid #dc3545; padding-bottom: 8px;">
                    ⚠️ Missing Items Notice
                </h2>
                <p style="font-size: 10pt; color: #666; margin-bottom: 16px;">
                    The following items were referenced but could not be found during binder generation.
                    This may indicate deleted records or data inconsistencies.
                </p>
            """)
            
            if missing_items:
                html_parts.append("""
                <table class="manifest-table" style="margin-bottom: 20px;">
                    <thead>
                        <tr>
                            <th>Record ID</th>
                            <th>Type</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                """)
                
                for item in missing_items:
                    record_id = item.get("record_id", "Unknown")
                    item_type = item.get("type", "Unknown")
                    reason = item.get("reason", "Not specified")
                    
                    html_parts.append(f"""
                        <tr>
                            <td><code>{record_id}</code></td>
                            <td>{item_type}</td>
                            <td>{reason}</td>
                        </tr>
                    """)
                
                html_parts.append("""
                    </tbody>
                </table>
                """)
            
            if validation_warnings:
                html_parts.append("""
                <h3 style="color: #856404; margin-top: 20px;">Validation Warnings</h3>
                <ul style="font-size: 10pt; color: #666;">
                """)
                
                for warning in validation_warnings:
                    msg = warning.get("message", str(warning))
                    html_parts.append(f"<li>{msg}</li>")
                
                html_parts.append("</ul>")
            
            html_parts.append("</div>")
        
        # Section counter for numbering
        section_counter = 1
        
        # 4. Trust Profile Section
        if content.get("trust_profile"):
            tp = content["trust_profile"][0].get("data", {})
            tp_id = content["trust_profile"][0].get("id", "trust-profile")
            
            html_parts.append(f"""
            <div class="section-divider" id="section-trust_profile">
                <h1 class="bookmark-l1" data-bookmark="Section {section_counter}: Trust Profile &amp; Authority" style="visibility: hidden; height: 0; margin: 0;">Trust Profile</h1>
                <div class="section-icon">
                    <span class="section-icon-text">📋</span>
                </div>
                <div class="section-number">Section {section_counter}</div>
                <div class="section-title">Trust Profile & Authority</div>
                <div class="section-subtitle">Formation and Governance Structure</div>
                <div class="section-meta">
                    1 Document in this section
                </div>
            </div>
            """)
            
            html_parts.append(f"""
            <div class="record-page" id="item-{tp_id}">
                <h2 class="bookmark-l2" data-bookmark="Trust Profile Summary" style="visibility: hidden; height: 0; margin: 0;">Trust Profile</h2>
                <h2 style="color: #d4af37;">Trust Profile Summary</h2>
                <div class="trust-profile-summary">
            """)
            
            profile_fields = [
                ("Trust Name", tp.get("trust_name", "—")),
                ("Trust Type", tp.get("trust_type", "—")),
                ("Jurisdiction", tp.get("jurisdiction", "—")),
                ("Formation Date", tp.get("formation_date", "—")),
                ("RM-ID Base", tp.get("rm_id_normalized", "—")),
                ("Tax ID", tp.get("tax_id", "—")),
            ]
            
            for label, value in profile_fields:
                html_parts.append(f"""
                <div class="profile-field">
                    <div class="profile-label">{label}</div>
                    <div class="profile-value">{value or '—'}</div>
                </div>
                """)
            
            html_parts.append("</div></div>")
            section_counter += 1
        
        # 5. Governance Sections with enhanced dividers and bookmarks
        governance_sections = [
            ("governance_minutes", "Meeting Minutes", "📝"),
            ("governance_distributions", "Distributions", "💰"),
            ("governance_compensation", "Compensation", "👥"),
            ("governance_disputes", "Disputes", "⚖️"),
            ("governance_insurance", "Insurance Policies", "🛡️")
        ]
        
        for section_key, section_title, section_icon in governance_sections:
            items = content.get(section_key, [])
            if not items:
                continue
            
            html_parts.append(f"""
            <div class="section-divider" id="section-{section_key}">
                <h1 class="bookmark-l1" data-bookmark="Section {section_counter}: {section_title}" style="visibility: hidden; height: 0; margin: 0;">{section_title}</h1>
                <div class="section-icon">
                    <span class="section-icon-text">{section_icon}</span>
                </div>
                <div class="section-number">Section {section_counter}</div>
                <div class="section-title">{section_title}</div>
                <div class="section-subtitle">{len(items)} Record{'s' if len(items) != 1 else ''}</div>
                <div class="section-meta">
                    Governance records for portfolio administration
                </div>
            </div>
            """)
            
            for item in items:
                data = item.get("data", {})
                payload = item.get("payload", {})
                item_id = item.get("id", "unknown")
                item_title = item.get("title", "Record")
                
                html_parts.append(f"""
                <div class="record-page" id="item-{item_id}">
                    <h2 class="bookmark-l2" data-bookmark="{item_title[:40]}" style="visibility: hidden; height: 0; margin: 0;">{item_title}</h2>
                    <div class="record-header">
                        <div class="record-title">{item_title}</div>
                        <div class="record-meta">
                            <span class="record-badge">{item.get('status', 'unknown').upper()}</span>
                            &nbsp;&nbsp;
                            RM-ID: <code>{item.get('rm_id', '—')}</code>
                            &nbsp;&nbsp;
                            {f"Finalized: {item.get('finalized_at', '')[:10]}" if item.get('finalized_at') else ''}
                        </div>
                    </div>
                    <div class="record-content">
                """)
                
                # Render payload fields
                for key, value in payload.items():
                    if key.startswith("_") or key in ["id", "user_id", "portfolio_id"]:
                        continue
                    
                    label = key.replace("_", " ").title()
                    
                    if isinstance(value, list):
                        if value and isinstance(value[0], dict):
                            # Complex list (attendees, agenda items, etc.)
                            html_parts.append(f'<div class="field-label">{label}</div>')
                            for i, v in enumerate(value, 1):
                                html_parts.append('<div class="field-value" style="margin-left: 16px; margin-bottom: 8px;">')
                                html_parts.append(f'<strong>{i}.</strong> ')
                                for vk, vv in v.items():
                                    if not vk.startswith("_"):
                                        html_parts.append(f'{vk.replace("_", " ").title()}: {vv}; ')
                                html_parts.append('</div>')
                        else:
                            html_parts.append(f'<div class="field-label">{label}</div>')
                            html_parts.append(f'<div class="field-value">{", ".join(str(v) for v in value)}</div>')
                    elif isinstance(value, dict):
                        html_parts.append(f'<div class="field-label">{label}</div>')
                        for vk, vv in value.items():
                            html_parts.append(f'<div class="field-value" style="margin-left: 16px;">{vk}: {vv}</div>')
                    elif value:
                        html_parts.append(f'<div class="field-label">{label}</div>')
                        html_parts.append(f'<div class="field-value">{value}</div>')
                
                # Integrity stamp
                if data.get("integrity_seal_id"):
                    html_parts.append(f"""
                    <div class="integrity-stamp">
                        <strong>✓ Integrity Verified</strong><br>
                        Seal ID: {data.get('integrity_seal_id')}<br>
                        Verified: {data.get('integrity_verified_at', 'N/A')}
                    </div>
                    """)
                
                html_parts.append("</div></div>")
            
            section_counter += 1
        
        # 6. Documents Section
        if content.get("documents"):
            doc_items = content["documents"]
            html_parts.append(f"""
            <div class="section-divider" id="section-documents">
                <h1 class="bookmark-l1" data-bookmark="Section {section_counter}: Documents" style="visibility: hidden; height: 0; margin: 0;">Documents</h1>
                <div class="section-icon">
                    <span class="section-icon-text">📁</span>
                </div>
                <div class="section-number">Section {section_counter}</div>
                <div class="section-title">Documents</div>
                <div class="section-subtitle">Trust Instruments & Records ({len(doc_items)} items)</div>
                <div class="section-meta">
                    Supporting documentation for trust administration
                </div>
            </div>
            """)
            
            for item in doc_items:
                data = item.get("data", {})
                item_id = item.get("id", "doc-unknown")
                item_title = item.get("title", "Document")
                
                html_parts.append(f"""
                <div class="record-page" id="item-{item_id}">
                    <h2 class="bookmark-l2" data-bookmark="{item_title[:40]}" style="visibility: hidden; height: 0; margin: 0;">{item_title}</h2>
                    <div class="record-header">
                        <div class="record-title">{item_title}</div>
                        <div class="record-meta">
                            Type: {data.get('document_type', 'General')} &nbsp;&nbsp;
                            Created: {item.get('created_at', '')[:10] if item.get('created_at') else '—'}
                        </div>
                    </div>
                    <div class="record-content">
                        <p>{data.get('description', 'No description available.')}</p>
                    </div>
                </div>
                """)
            
            section_counter += 1
        
        # 7. Ledger Section
        if content.get("ledger"):
            ledger_items = content["ledger"]
            html_parts.append(f"""
            <div class="section-divider" id="section-ledger">
                <h1 class="bookmark-l1" data-bookmark="Section {section_counter}: Ledger &amp; Financial" style="visibility: hidden; height: 0; margin: 0;">Ledger</h1>
                <div class="section-icon">
                    <span class="section-icon-text">📊</span>
                </div>
                <div class="section-number">Section {section_counter}</div>
                <div class="section-title">Ledger & Financial</div>
                <div class="section-subtitle">Transaction Records ({len(ledger_items)} entries)</div>
                <div class="section-meta">
                    Financial transaction history and audit trail
                </div>
            </div>
            """)
            
            html_parts.append("""
            <div class="record-page" id="ledger-entries">
                <h2 class="bookmark-l2" data-bookmark="Ledger Entries" style="visibility: hidden; height: 0; margin: 0;">Ledger</h2>
                <h2 style="color: #d4af37;">Ledger Entries</h2>
                <table class="manifest-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Debit</th>
                            <th>Credit</th>
                            <th>Category</th>
                        </tr>
                    </thead>
                    <tbody>
            """)
            
            for item in content["ledger"]:
                data = item.get("data", {})
                entry_date = data.get("entry_date", "")[:10] if data.get("entry_date") else "—"
                debit = f"${data.get('debit', 0):,.2f}" if data.get("debit") else "—"
                credit = f"${data.get('credit', 0):,.2f}" if data.get("credit") else "—"
                
                html_parts.append(f"""
                    <tr>
                        <td>{entry_date}</td>
                        <td>{data.get('description', '—')}</td>
                        <td>{debit}</td>
                        <td>{credit}</td>
                        <td>{data.get('category', '—')}</td>
                    </tr>
                """)
            
            html_parts.append("</tbody></table></div>")
            section_counter += 1
        
        # 8. Integrity Summary
        if profile.get("rules_json", {}).get("include_integrity_summary", True):
            sealed_count = sum(
                1 for section_key, section in content.items()
                if not section_key.startswith("_") and isinstance(section, list)
                for item in section
                if isinstance(item, dict) and item.get("data", {}).get("integrity_seal_id")
            )
            
            html_parts.append(f"""
            <div class="section-divider" id="section-integrity_summary">
                <h1 class="bookmark-l1" data-bookmark="Section {section_counter}: Integrity Summary" style="visibility: hidden; height: 0; margin: 0;">Integrity</h1>
                <div class="section-icon">
                    <span class="section-icon-text">✓</span>
                </div>
                <div class="section-number">Section {section_counter}</div>
                <div class="section-title">Integrity Summary</div>
                <div class="section-subtitle">Verification & Authenticity Report</div>
                <div class="section-meta">
                    Cryptographic verification status of binder contents
                </div>
            </div>
            <div class="record-page" id="integrity-report">
                <h2 class="bookmark-l2" data-bookmark="Integrity Report" style="visibility: hidden; height: 0; margin: 0;">Report</h2>
                <h2 style="color: #d4af37;">Binder Integrity Report</h2>
                <div class="trust-profile-summary">
                    <div class="profile-field">
                        <div class="profile-label">Total Items</div>
                        <div class="profile-value">{len(manifest)}</div>
                    </div>
                    <div class="profile-field">
                        <div class="profile-label">Items with Integrity Seals</div>
                        <div class="profile-value">{sealed_count}</div>
                    </div>
                    <div class="profile-field">
                        <div class="profile-label">Seal Coverage</div>
                        <div class="profile-value">{round(sealed_count / len(manifest) * 100, 1) if manifest else 0}%</div>
                    </div>
                    <div class="profile-field">
                        <div class="profile-label">Generated At</div>
                        <div class="profile-value">{generated_at}</div>
                    </div>
                    <div class="profile-field">
                        <div class="profile-label">Profile Used</div>
                        <div class="profile-value">{profile_name}</div>
                    </div>
                    <div class="profile-field">
                        <div class="profile-label">Verification Hash</div>
                        <div class="profile-value" style="font-family: monospace; font-size: 9pt;">{hashlib.sha256(str(manifest).encode()).hexdigest()[:32]}...</div>
                    </div>
                </div>
                <div style="margin-top: 24px; padding: 16px; background: #f0f8f0; border-left: 4px solid #28a745;">
                    <p style="font-size: 10pt; color: #1a1a1a; margin: 0;">
                        <strong>Certification Statement:</strong> This binder was generated automatically by the Trust Management System.
                        All included documents have been compiled in their original form. Items marked with integrity seals 
                        have been cryptographically verified against their original content hashes.
                    </p>
                </div>
            </div>
            """)
        
        # 9. Redaction Log (Court Mode)
        redaction_log = content.get("_redaction_log")
        if redaction_log and redaction_log.get("entries"):
            section_counter += 1
            total_redactions = redaction_log.get("total_persistent", 0) + redaction_log.get("total_adhoc", 0)
            
            html_parts.append(f"""
            <div class="section-divider" id="section-redaction_log">
                <h1 class="bookmark-l1" data-bookmark="Section {section_counter}: Redaction Log" style="visibility: hidden; height: 0; margin: 0;">Redaction Log</h1>
                <div class="section-icon">
                    <span class="section-icon-text">🔒</span>
                </div>
                <div class="section-number">Section {section_counter}</div>
                <div class="section-title">Redaction Log</div>
                <div class="section-subtitle">{total_redactions} Redaction{'s' if total_redactions != 1 else ''} Applied</div>
                <div class="section-meta">
                    Court Mode: Sensitive information has been redacted
                </div>
            </div>
            <div class="record-page" id="redaction-report">
                <h2 class="bookmark-l2" data-bookmark="Redaction Log" style="visibility: hidden; height: 0; margin: 0;">Redactions</h2>
                <h2 style="color: #d4af37;">Redaction Log</h2>
                <div style="margin-bottom: 20px; padding: 12px; background: #fff3cd; border-left: 4px solid #ffc107;">
                    <p style="font-size: 10pt; color: #856404; margin: 0;">
                        <strong>Notice:</strong> This document contains redacted information. Content marked as [REDACTED] 
                        has been removed pursuant to privacy regulations, attorney-client privilege, or other applicable protections.
                    </p>
                </div>
                <div class="trust-profile-summary">
                    <div class="profile-field">
                        <div class="profile-label">Total Redactions</div>
                        <div class="profile-value">{total_redactions}</div>
                    </div>
                    <div class="profile-field">
                        <div class="profile-label">Persistent Redactions</div>
                        <div class="profile-value">{redaction_log.get('total_persistent', 0)}</div>
                    </div>
                    <div class="profile-field">
                        <div class="profile-label">Per-Run Redactions</div>
                        <div class="profile-value">{redaction_log.get('total_adhoc', 0)}</div>
                    </div>
                    <div class="profile-field">
                        <div class="profile-label">Generated At</div>
                        <div class="profile-value">{redaction_log.get('generated_at', '—')}</div>
                    </div>
                </div>
                <h3 style="color: #333; margin-top: 24px;">Redaction Details</h3>
                <table class="manifest-table">
                    <thead>
                        <tr>
                            <th>Record ID</th>
                            <th>Field</th>
                            <th>Reason</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
            """)
            
            for entry in redaction_log.get("entries", []):
                record_id = entry.get("record_id", "—")[:20]
                field_path = entry.get("field_path", "—").split(".")[-1]
                reason = entry.get("reason", "—")
                redact_type = "Per-Run" if entry.get("is_adhoc") else "Persistent"
                
                html_parts.append(f"""
                    <tr>
                        <td><code style="font-size: 8pt;">{record_id}</code></td>
                        <td>{field_path}</td>
                        <td>{reason}</td>
                        <td>{redact_type}</td>
                    </tr>
                """)
            
            html_parts.append("""
                    </tbody>
                </table>
            </div>
            """)
        
        # 10. Gap Analysis Report (if included)
        gap_analysis = content.get("_gap_analysis")
        if gap_analysis:
            section_counter += 1
            summary = gap_analysis.get("summary", {})
            
            # Determine overall status
            if summary.get("high_risk", 0) > 0:
                overall_status = "HIGH RISK"
                status_color = "#dc2626"
            elif summary.get("missing", 0) > 0 or summary.get("medium_risk", 0) > 0:
                overall_status = "NEEDS ATTENTION"
                status_color = "#d97706"
            else:
                overall_status = "COMPLIANT"
                status_color = "#16a34a"
            
            html_parts.append(f"""
            <div class="section-divider" id="section-gaps">
                <h1 class="bookmark-l1" data-bookmark="Section {section_counter}: Compliance Gaps Analysis" style="visibility: hidden; height: 0; margin: 0;">Gaps Analysis</h1>
                <div class="section-icon">
                    <span class="section-icon-text">📋</span>
                </div>
                <div class="section-number">Section {section_counter}</div>
                <div class="section-title">Compliance Gaps Analysis</div>
                <div class="section-subtitle" style="color: {status_color};">{overall_status}</div>
                <div class="section-meta">
                    {gap_analysis.get('checklist_version', 'Trust Administration Checklist')}
                </div>
            </div>
            <div class="record-page" id="gaps-report">
                <h2 class="bookmark-l2" data-bookmark="Compliance Summary" style="visibility: hidden; height: 0; margin: 0;">Gaps Report</h2>
                <h2 style="color: #d4af37;">Compliance Summary</h2>
                
                <div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 150px; padding: 16px; background: #16a34a20; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #16a34a;">{summary.get('complete', 0)}</div>
                        <div style="font-size: 10pt; color: #666;">Complete ✅</div>
                    </div>
                    <div style="flex: 1; min-width: 150px; padding: 16px; background: #d9770620; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #d97706;">{summary.get('partial', 0)}</div>
                        <div style="font-size: 10pt; color: #666;">Partial ⚠️</div>
                    </div>
                    <div style="flex: 1; min-width: 150px; padding: 16px; background: #dc262620; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #dc2626;">{summary.get('missing', 0)}</div>
                        <div style="font-size: 10pt; color: #666;">Missing ❌</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 24px; padding: 12px; background: #f8fafc; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 10pt;">
                        <span><strong>High Risk Items:</strong> {summary.get('high_risk', 0)}</span>
                        <span><strong>Medium Risk:</strong> {summary.get('medium_risk', 0)}</span>
                        <span><strong>Low Risk:</strong> {summary.get('low_risk', 0)}</span>
                        <span><strong>N/A:</strong> {summary.get('not_applicable', 0)}</span>
                    </div>
                </div>
            """)
            
            # Add detailed results by category
            by_category = gap_analysis.get("by_category", {})
            for category, items in by_category.items():
                html_parts.append(f"""
                <h3 style="color: #333; margin-top: 20px; margin-bottom: 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">
                    {category}
                </h3>
                <table class="manifest-table">
                    <thead>
                        <tr>
                            <th style="width: 25%;">Item</th>
                            <th style="width: 15%;">Status</th>
                            <th style="width: 12%;">Risk</th>
                            <th style="width: 48%;">Notes / Remediation</th>
                        </tr>
                    </thead>
                    <tbody>
                """)
                
                for item in items:
                    status = item.get("status", "")
                    if status == "complete":
                        status_icon = "✅"
                        status_color = "#16a34a"
                    elif status == "partial":
                        status_icon = "⚠️"
                        status_color = "#d97706"
                    elif status == "missing":
                        status_icon = "❌"
                        status_color = "#dc2626"
                    else:
                        status_icon = "—"
                        status_color = "#9ca3af"
                    
                    risk = item.get("risk_level", "low")
                    if risk == "high":
                        risk_badge = '<span style="background: #dc262620; color: #dc2626; padding: 2px 8px; border-radius: 4px; font-size: 9pt;">HIGH</span>'
                    elif risk == "medium":
                        risk_badge = '<span style="background: #d9770620; color: #d97706; padding: 2px 8px; border-radius: 4px; font-size: 9pt;">MEDIUM</span>'
                    else:
                        risk_badge = '<span style="background: #16a34a20; color: #16a34a; padding: 2px 8px; border-radius: 4px; font-size: 9pt;">LOW</span>'
                    
                    notes = item.get("reason", "")
                    if item.get("remediation"):
                        notes += f"<br><em style='color: #6b7280; font-size: 9pt;'>→ {item['remediation']}</em>"
                    
                    html_parts.append(f"""
                        <tr>
                            <td>{item.get('item_name', '—')}</td>
                            <td style="color: {status_color};">{status_icon} {status.title()}</td>
                            <td>{risk_badge}</td>
                            <td style="font-size: 9pt;">{notes}</td>
                        </tr>
                    """)
                
                html_parts.append("""
                    </tbody>
                </table>
                """)
            
            html_parts.append(f"""
                <div style="margin-top: 24px; padding: 12px; background: #fffbeb; border-left: 4px solid #d97706; font-size: 9pt;">
                    <strong>Analysis Date:</strong> {gap_analysis.get('analyzed_at', '—')[:19]}<br>
                    <strong>Checklist Version:</strong> {gap_analysis.get('checklist_version', 'v1')}
                </div>
            </div>
            """)
        
        # 11. Integrity Certificate (final page)
        integrity_stamp = content.get("_integrity_stamp")
        if integrity_stamp:
            section_counter += 1
            
            html_parts.append(f"""
            <div class="section-divider" id="section-integrity" style="page-break-before: always;">
                <h1 class="bookmark-l1" data-bookmark="Section {section_counter}: Integrity Certificate" style="visibility: hidden; height: 0; margin: 0;">Integrity Certificate</h1>
                <div class="section-icon">
                    <span class="section-icon-text">🔒</span>
                </div>
                <div class="section-number">Section {section_counter}</div>
                <div class="section-title">Integrity Certificate</div>
                <div class="section-subtitle">Cryptographic Verification</div>
            </div>
            <div class="record-page" id="integrity-certificate">
                <h2 class="bookmark-l2" data-bookmark="Certificate Details" style="visibility: hidden; height: 0; margin: 0;">Certificate</h2>
                
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 18pt; color: #d4af37; margin-bottom: 8px;">✓ VERIFIED DOCUMENT PACKAGE</div>
                    <div style="font-size: 10pt; color: #666;">This binder has been cryptographically sealed</div>
                </div>
                
                <div style="background: #f8fafc; border: 2px solid #d4af37; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; width: 35%;"><strong>Binder Hash (SHA-256):</strong></td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 8pt; word-break: break-all;">{integrity_stamp.get('binder_pdf_sha256', '—')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Manifest Hash:</strong></td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 8pt; word-break: break-all;">{integrity_stamp.get('manifest_sha256', '—')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Run ID:</strong></td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-family: monospace;">{integrity_stamp.get('run_id', '—')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Portfolio ID:</strong></td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-family: monospace;">{integrity_stamp.get('portfolio_id', '—')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Generated At:</strong></td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">{integrity_stamp.get('generated_at', '—')[:19] if integrity_stamp.get('generated_at') else '—'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Generated By:</strong></td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">{integrity_stamp.get('generated_by', '—')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Generator Version:</strong></td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">{integrity_stamp.get('generator_version', '—')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Total Items:</strong></td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">{integrity_stamp.get('total_items', 0)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0;"><strong>Seal Coverage:</strong></td>
                            <td style="padding: 8px 0;">{integrity_stamp.get('seal_coverage_percent', 0)}%</td>
                        </tr>
                    </table>
                </div>
                
                <div style="text-align: center; margin-top: 24px;">
                    <div style="font-size: 10pt; color: #666; margin-bottom: 12px;">
                        <strong>Verification URL:</strong><br>
                        <span style="font-family: monospace; font-size: 9pt; word-break: break-all;">{integrity_stamp.get('verification_url', '')}</span>
                    </div>
                    <div style="margin-top: 16px; padding: 16px; background: #f0f9ff; border-radius: 8px;">
                        <p style="font-size: 9pt; color: #0369a1; margin: 0;">
                            <strong>To verify this binder:</strong> Scan the QR code or visit the verification URL above. 
                            You can also compute the SHA-256 hash of this PDF file and compare it with the Binder Hash shown above.
                        </p>
                    </div>
                </div>
                
                <div style="margin-top: 32px; text-align: center; color: #9ca3af; font-size: 8pt;">
                    <p>This certificate is generated automatically by the Trust Management System.<br>
                    Tampering with this document will invalidate the cryptographic seal.</p>
                </div>
            </div>
            """)
        
        # Combine HTML
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>{css}</style>
        </head>
        <body>
            {''.join(html_parts)}
        </body>
        </html>
        """
        
        # Generate PDF
        html_doc = HTML(string=full_html)
        pdf_bytes = html_doc.write_pdf(font_config=font_config)
        
        return pdf_bytes
    
    # ============ MAIN GENERATION ENTRY POINT ============
    
    async def preflight_validate(
        self,
        portfolio_id: str,
        user_id: str,
        rules: Dict
    ) -> Dict:
        """
        Validate binder content before generation.
        Returns validation result with any missing/problematic items.
        """
        validation = {
            "valid": True,
            "warnings": [],
            "errors": [],
            "missing_items": []
        }
        
        try:
            # Check portfolio exists
            portfolio = await self.db.portfolios.find_one(
                {"portfolio_id": portfolio_id},
                {"_id": 0}
            )
            if not portfolio:
                validation["valid"] = False
                validation["errors"].append({
                    "code": "PORTFOLIO_NOT_FOUND",
                    "message": f"Portfolio {portfolio_id} not found"
                })
                return validation
            
            # Check if specific record IDs are referenced in rules
            case_thread_ids = rules.get("case_thread_ids", [])
            dispute_id = rules.get("dispute_id")
            
            if case_thread_ids:
                for thread_id in case_thread_ids:
                    record = await self.db.governance_records.find_one(
                        {"rm_subject_id": thread_id, "portfolio_id": portfolio_id},
                        {"_id": 0, "id": 1}
                    )
                    if not record:
                        validation["warnings"].append({
                            "code": "THREAD_NOT_FOUND",
                            "record_id": thread_id,
                            "type": "case_thread",
                            "reason": f"Case thread {thread_id} not found in portfolio"
                        })
                        validation["missing_items"].append({
                            "record_id": thread_id,
                            "type": "case_thread",
                            "reason": "Not found in portfolio"
                        })
            
            if dispute_id:
                dispute = await self.db.governance_records.find_one(
                    {"id": dispute_id, "portfolio_id": portfolio_id, "module_type": "dispute"},
                    {"_id": 0, "id": 1}
                )
                if not dispute:
                    validation["warnings"].append({
                        "code": "DISPUTE_NOT_FOUND",
                        "record_id": dispute_id,
                        "type": "dispute",
                        "reason": f"Dispute {dispute_id} not found in portfolio"
                    })
                    validation["missing_items"].append({
                        "record_id": dispute_id,
                        "type": "dispute",
                        "reason": "Not found in portfolio"
                    })
            
        except Exception as e:
            validation["warnings"].append({
                "code": "VALIDATION_ERROR",
                "message": str(e)
            })
        
        return validation
    
    async def generate_binder(
        self,
        portfolio_id: str,
        user_id: str,
        profile_id: str
    ) -> Dict:
        """
        Main entry point for binder generation.
        Creates a run, collects content, generates PDF, and stores result.
        Now includes preflight validation and graceful handling of missing items.
        """
        import traceback
        
        # Get profile
        profile = await self.get_profile(profile_id)
        if not profile:
            return {"success": False, "error": "Profile not found"}
        
        rules = profile.get("rules_json", {})
        
        # Preflight validation
        validation = await self.preflight_validate(portfolio_id, user_id, rules)
        
        # Create run record
        run = await self.create_run(
            portfolio_id=portfolio_id,
            user_id=user_id,
            profile_id=profile_id,
            profile_type=profile.get("profile_type"),
            profile_name=profile.get("name"),
            rules=rules
        )
        
        try:
            # Update status to generating
            await self.update_run_status(run["id"], BinderStatus.GENERATING)
            
            # Collect content
            content = await self.collect_binder_content(portfolio_id, user_id, rules)
            
            # Add missing items info to content for inclusion in PDF
            if isinstance(validation, dict):
                content["_missing_items"] = validation.get("missing_items", [])
                content["_validation_warnings"] = validation.get("warnings", [])
            else:
                content["_missing_items"] = []
                content["_validation_warnings"] = []
            
            # ============ COURT MODE: Process Redactions ============
            redaction_mode = rules.get("redaction_mode", RedactionMode.STANDARD.value)
            redaction_log = None
            
            if redaction_mode != RedactionMode.STANDARD.value:
                try:
                    # Get persistent redactions
                    persistent_redactions = await self.get_persistent_redactions(portfolio_id, user_id)
                    adhoc_redactions = rules.get("adhoc_redactions", [])
                    
                    # Ensure redactions are lists
                    if not isinstance(persistent_redactions, list):
                        persistent_redactions = []
                    if not isinstance(adhoc_redactions, list):
                        adhoc_redactions = []
                    
                    # Apply redactions to content
                    content, redaction_log = self.process_content_redactions(
                        content, persistent_redactions, adhoc_redactions, redaction_mode
                    )
                    content["_redaction_log"] = redaction_log
                except Exception as e:
                    # If redaction processing fails, continue without redactions
                    redaction_log = {
                        "entries": [],
                        "total_persistent": 0,
                        "total_adhoc": 0,
                        "error": f"Redaction processing failed: {str(e)}"
                    }
                    content["_redaction_log"] = redaction_log
            
            # ============ PHASE 5: Gap Analysis ============
            gap_analysis = None
            include_gaps_analysis = rules.get("include_gaps_analysis", True)
            
            if include_gaps_analysis:
                try:
                    gap_analysis = await self.analyze_gaps(portfolio_id, user_id, content)
                    content["_gap_analysis"] = gap_analysis
                except Exception as e:
                    # If gap analysis fails, continue without it
                    gap_analysis = {
                        "summary": {"error": str(e)},
                        "results": [],
                        "error": f"Gap analysis failed: {str(e)}"
                    }
            
            # Generate manifest
            manifest = self.generate_manifest(content)
            
            # ============ PHASE 5: Prepare Integrity Stamp (pre-PDF) ============
            # We generate a preliminary stamp here, but the final hash is computed after PDF
            include_integrity_stamp = rules.get("include_integrity_stamp", True)
            preliminary_stamp = None
            
            if include_integrity_stamp:
                # Create preliminary stamp with placeholder hash (will be updated after PDF)
                preliminary_stamp = self.generate_integrity_stamp(
                    pdf_bytes=b"placeholder",  # Placeholder, real hash computed later
                    manifest=manifest,
                    run_id=run["id"],
                    portfolio_id=portfolio_id,
                    user_id=user_id,
                    base_url=os.environ.get("REACT_APP_BACKEND_URL", "")
                )
                content["_integrity_stamp"] = preliminary_stamp
            
            # Generate PDF (will include missing items page if needed)
            pdf_bytes = await self.generate_pdf(
                portfolio_id, user_id, profile, content, manifest
            )
            
            # ============ COURT MODE: Apply Bates Numbering ============
            bates_page_map = []
            if rules.get("bates_enabled", False):
                portfolio_abbrev = await self._get_portfolio_abbreviation(portfolio_id)
                pdf_bytes, bates_page_map = self.apply_bates_numbering(
                    pdf_bytes, rules, portfolio_abbrev
                )
            
            # ============ PHASE 5: Final Integrity Stamp (post-PDF) ============
            integrity_stamp = None
            if include_integrity_stamp:
                # Now compute the real hash on final PDF bytes
                integrity_stamp = self.generate_integrity_stamp(
                    pdf_bytes=pdf_bytes,
                    manifest=manifest,
                    run_id=run["id"],
                    portfolio_id=portfolio_id,
                    user_id=user_id,
                    base_url=os.environ.get("REACT_APP_BACKEND_URL", "")
                )
                # Update page count
                try:
                    from PyPDF2 import PdfReader
                    from io import BytesIO
                    reader = PdfReader(BytesIO(pdf_bytes))
                    integrity_stamp["total_pages"] = len(reader.pages)
                except:
                    pass
            
            # Encode PDF as base64 for storage
            import base64
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
            
            # Prepare run metadata including validation info and Court Mode data
            run_metadata = {
                "validation": validation,
                "generated_with_warnings": len(validation.get("warnings", [])) > 0,
                "court_mode": {
                    "bates_enabled": rules.get("bates_enabled", False),
                    "bates_page_map": bates_page_map if bates_page_map else None,
                    "redaction_mode": redaction_mode,
                    "redaction_log": redaction_log
                },
                "gaps_analysis": gap_analysis.get("summary") if gap_analysis else None,
                "integrity_stamp": integrity_stamp
            }
            
            # Update run with success
            await self.update_run_status(
                run["id"],
                BinderStatus.COMPLETE,
                pdf_data=pdf_base64,
                manifest=manifest,
                total_items=len(manifest)
            )
            
            # Store additional metadata
            await self.db.binder_runs.update_one(
                {"id": run["id"]},
                {"$set": {
                    "metadata_json": run_metadata,
                    "missing_items": validation.get("missing_items", []),
                    "bates_page_map": bates_page_map,
                    "redaction_log": redaction_log,
                    "gap_analysis": gap_analysis,
                    "integrity_stamp": integrity_stamp
                }}
            )
            
            # Log to audit trail
            try:
                from services.audit_log_service import create_audit_log_service
                audit_service = create_audit_log_service(self.db)
                await audit_service.log_binder_event(
                    event_type="generation_complete",
                    run_id=run["id"],
                    actor_id=user_id,
                    portfolio_id=portfolio_id,
                    profile_name=profile.get("name", "Unknown"),
                    details={
                        "total_items": len(manifest),
                        "bates_enabled": rules.get("bates_enabled", False),
                        "high_risk_gaps": gap_analysis.get("summary", {}).get("high_risk", 0) if gap_analysis else 0,
                        "integrity_hash": integrity_stamp.get("binder_pdf_sha256") if integrity_stamp else None
                    }
                )
            except Exception as audit_err:
                # Don't fail generation if audit logging fails
                print(f"Audit logging failed: {audit_err}")
            
            return {
                "success": True,
                "run_id": run["id"],
                "status": BinderStatus.COMPLETE.value,
                "total_items": len(manifest),
                "message": "Binder generated successfully",
                "warnings": validation.get("warnings", []),
                "court_mode": {
                    "bates_enabled": rules.get("bates_enabled", False),
                    "bates_pages": len([p for p in bates_page_map if p.get("bates_number")]) if bates_page_map else 0,
                    "redactions_applied": redaction_log.get("total_persistent", 0) + redaction_log.get("total_adhoc", 0) if redaction_log else 0
                },
                "gaps_analysis": {
                    "summary": gap_analysis.get("summary") if gap_analysis else None,
                    "high_risk_count": gap_analysis.get("summary", {}).get("high_risk", 0) if gap_analysis else 0
                },
                "integrity": {
                    "hash": integrity_stamp.get("binder_pdf_sha256") if integrity_stamp else None,
                    "total_pages": integrity_stamp.get("total_pages", 0) if integrity_stamp else 0,
                    "seal_coverage": integrity_stamp.get("seal_coverage_percent", 0) if integrity_stamp else 0
                }
            }
            
        except Exception as e:
            # Capture full stack trace for debugging
            stack_trace = traceback.format_exc()
            
            # Create detailed error info
            error_info = {
                "message": str(e),
                "type": type(e).__name__,
                "stack_trace": stack_trace,
                "user_message": self._get_user_friendly_error(e)
            }
            
            # Update run with failure
            await self.update_run_status(
                run["id"],
                BinderStatus.FAILED,
                error=error_info
            )
            
            return {
                "success": False,
                "run_id": run["id"],
                "status": BinderStatus.FAILED.value,
                "error": error_info["user_message"]
            }
    
    # ============ COURT MODE: BATES NUMBERING ============
    
    def _format_bates_number(self, prefix: str, number: int, digits: int) -> str:
        """Format a Bates number with prefix and leading zeros."""
        return f"{prefix}{str(number).zfill(digits)}"
    
    async def _get_portfolio_abbreviation(self, portfolio_id: str) -> str:
        """Get or generate portfolio abbreviation for Bates prefix."""
        portfolio = await self.db.portfolios.find_one(
            {"portfolio_id": portfolio_id},
            {"_id": 0, "name": 1, "abbreviation": 1}
        )
        
        if not portfolio:
            return "DOC-"
        
        # Use stored abbreviation if available
        if portfolio.get("abbreviation"):
            return f"{portfolio['abbreviation']}-"
        
        # Generate from portfolio name (first 4 uppercase letters)
        name = portfolio.get("name", "DOC")
        abbrev = ''.join(c for c in name.upper() if c.isalpha())[:4]
        return f"{abbrev or 'DOC'}-"
    
    def apply_bates_numbering(
        self,
        pdf_bytes: bytes,
        rules: Dict,
        portfolio_abbrev: str
    ) -> tuple:
        """
        Apply Bates numbering to final merged PDF.
        Returns: (stamped_pdf_bytes, bates_page_map)
        
        Uses PyPDF2 with reportlab for stamping.
        """
        from io import BytesIO
        try:
            from PyPDF2 import PdfReader, PdfWriter
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.units import inch
        except ImportError:
            # Return original if libraries not available
            return pdf_bytes, []
        
        # Get Bates config from rules
        bates_prefix = rules.get("bates_prefix") or portfolio_abbrev
        start_number = rules.get("bates_start_number", 1)
        digits = rules.get("bates_digits", 6)
        position = rules.get("bates_position", BatesPosition.BOTTOM_RIGHT.value)
        include_cover = rules.get("bates_include_cover", False)
        font_size = rules.get("bates_font_size", 9)
        margin_x = rules.get("bates_margin_x", 18)
        margin_y = rules.get("bates_margin_y", 18)
        
        # Read the PDF
        reader = PdfReader(BytesIO(pdf_bytes))
        writer = PdfWriter()
        
        bates_map = []
        current_number = start_number
        
        for page_idx, page in enumerate(reader.pages):
            # Skip cover page if configured
            if page_idx == 0 and not include_cover:
                writer.add_page(page)
                bates_map.append({
                    "page_index": page_idx,
                    "bates_number": None,
                    "is_cover": True
                })
                continue
            
            # Get page dimensions
            page_width = float(page.mediabox.width)
            page_height = float(page.mediabox.height)
            
            # Create stamp PDF
            stamp_buffer = BytesIO()
            c = canvas.Canvas(stamp_buffer, pagesize=(page_width, page_height))
            
            # Format Bates number
            bates_num = self._format_bates_number(bates_prefix, current_number, digits)
            
            # Calculate position
            if position == BatesPosition.BOTTOM_RIGHT.value:
                x = page_width - margin_x - (len(bates_num) * font_size * 0.5)
                y = margin_y
            elif position == BatesPosition.BOTTOM_LEFT.value:
                x = margin_x
                y = margin_y
            else:  # bottom-center
                x = page_width / 2 - (len(bates_num) * font_size * 0.25)
                y = margin_y
            
            # Draw Bates number
            c.setFont("Helvetica", font_size)
            c.setFillColorRGB(0.3, 0.3, 0.3)  # Dark gray
            c.drawString(x, y, bates_num)
            c.save()
            
            # Merge stamp onto page
            stamp_buffer.seek(0)
            stamp_reader = PdfReader(stamp_buffer)
            page.merge_page(stamp_reader.pages[0])
            writer.add_page(page)
            
            # Record in map
            bates_map.append({
                "page_index": page_idx,
                "bates_number": bates_num,
                "is_cover": False
            })
            
            current_number += 1
        
        # Write output
        output_buffer = BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)
        
        return output_buffer.read(), bates_map
    
    # ============ COURT MODE: REDACTION PROCESSING ============
    
    async def get_persistent_redactions(self, portfolio_id: str, user_id: str) -> List[Dict]:
        """Get all persistent redaction markers for a portfolio."""
        redactions = await self.db.redaction_markers.find(
            {"portfolio_id": portfolio_id, "user_id": user_id},
            {"_id": 0}
        ).to_list(1000)
        return redactions
    
    async def save_redaction_marker(
        self,
        portfolio_id: str,
        user_id: str,
        record_id: str,
        field_path: str,
        reason: str,
        reason_type: str = "pii"
    ) -> Dict:
        """Save a persistent redaction marker."""
        from uuid import uuid4
        
        marker_id = f"redact_{uuid4().hex[:12]}"
        marker = {
            "id": marker_id,
            "portfolio_id": portfolio_id,
            "user_id": user_id,
            "record_id": record_id,
            "field_path": field_path,
            "reason": reason,
            "reason_type": reason_type,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_persistent": True
        }
        
        await self.db.redaction_markers.insert_one(marker)
        marker.pop("_id", None)
        return marker
    
    async def delete_redaction_marker(self, marker_id: str, user_id: str) -> bool:
        """Delete a persistent redaction marker."""
        result = await self.db.redaction_markers.delete_one(
            {"id": marker_id, "user_id": user_id}
        )
        return result.deleted_count > 0
    
    def apply_redactions_to_text(
        self,
        text: str,
        field_path: str,
        redactions: List[Dict],
        adhoc_redactions: List[Dict]
    ) -> tuple:
        """
        Apply redactions to text content.
        Returns: (redacted_text, was_redacted)
        """
        # Check if this field should be redacted
        should_redact = False
        redaction_reason = None
        is_adhoc = False
        
        # Check adhoc redactions first (they can override persistent)
        for adhoc in adhoc_redactions:
            if adhoc.get("field_path") == field_path:
                should_redact = True
                redaction_reason = adhoc.get("reason", "Per-run redaction")
                is_adhoc = True
                break
        
        # Check persistent redactions
        if not should_redact:
            for redact in redactions:
                if redact.get("field_path") == field_path:
                    should_redact = True
                    redaction_reason = redact.get("reason", "Redacted")
                    break
        
        if should_redact:
            return "[REDACTED]", True, redaction_reason, is_adhoc
        
        return text, False, None, False
    
    def process_content_redactions(
        self,
        content: Dict[str, List[Dict]],
        redactions: List[Dict],
        adhoc_redactions: List[Dict],
        redaction_mode: str
    ) -> tuple:
        """
        Process all content applying redactions.
        Returns: (processed_content, redaction_log)
        """
        if redaction_mode == RedactionMode.STANDARD.value:
            return content, {"entries": [], "total_persistent": 0, "total_adhoc": 0}
        
        redaction_log = {
            "entries": [],
            "total_persistent": 0,
            "total_adhoc": 0,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Build lookup map by record_id
        redaction_map = {}
        for r in redactions:
            # Ensure r is a dict (safety check)
            if not isinstance(r, dict):
                continue
            rid = r.get("record_id")
            if rid not in redaction_map:
                redaction_map[rid] = []
            redaction_map[rid].append(r)
        
        adhoc_map = {}
        for a in adhoc_redactions:
            # Ensure a is a dict (safety check)
            if not isinstance(a, dict):
                continue
            rid = a.get("record_id")
            if rid not in adhoc_map:
                adhoc_map[rid] = []
            adhoc_map[rid].append(a)
        
        # Process each section
        for section_key, items in content.items():
            if section_key.startswith("_"):
                continue
            
            for item in items:
                # Ensure item is a dict (safety check)
                if not isinstance(item, dict):
                    continue
                record_id = item.get("id")
                if not record_id:
                    continue
                
                record_redactions = redaction_map.get(record_id, [])
                record_adhoc = adhoc_map.get(record_id, [])
                
                # Process payload fields
                payload = item.get("payload", {})
                if payload:
                    for field_key, field_value in list(payload.items()):
                        if isinstance(field_value, str):
                            field_path = f"{record_id}.payload.{field_key}"
                            redacted, was_redacted, reason, is_adhoc = self.apply_redactions_to_text(
                                field_value, field_path, record_redactions, record_adhoc
                            )
                            if was_redacted:
                                payload[field_key] = redacted
                                redaction_log["entries"].append({
                                    "record_id": record_id,
                                    "field_path": field_path,
                                    "reason": reason,
                                    "is_adhoc": is_adhoc,
                                    "timestamp": datetime.now(timezone.utc).isoformat()
                                })
                                if is_adhoc:
                                    redaction_log["total_adhoc"] += 1
                                else:
                                    redaction_log["total_persistent"] += 1
        
        return content, redaction_log
    
    # ============ PHASE 5: GAPS ANALYSIS ============
    
    async def get_checklist_template(self, portfolio_id: str, user_id: str) -> List[Dict]:
        """
        Get the compliance checklist for a portfolio.
        Returns default template with any portfolio-specific overrides applied.
        """
        # Get portfolio overrides if any
        overrides = await self.db.checklist_overrides.find_one(
            {"portfolio_id": portfolio_id, "user_id": user_id},
            {"_id": 0}
        )
        
        # Start with default template
        checklist = []
        override_map = {}
        
        if overrides:
            override_map = {o.get("item_id"): o for o in overrides.get("items", [])}
        
        for item in CHECKLIST_TEMPLATE_V1:
            item_dict = asdict(item)
            
            # Apply overrides
            if item.id in override_map:
                override = override_map[item.id]
                if override.get("is_disabled"):
                    continue  # Skip disabled items
                if override.get("required") is not None:
                    item_dict["required"] = override["required"]
                if override.get("not_applicable"):
                    item_dict["not_applicable"] = True
                if override.get("due_date"):
                    item_dict["due_date"] = override["due_date"]
            
            checklist.append(item_dict)
        
        return checklist
    
    async def save_checklist_override(
        self,
        portfolio_id: str,
        user_id: str,
        item_id: str,
        override_data: Dict
    ) -> Dict:
        """Save a checklist item override for a portfolio."""
        now = datetime.now(timezone.utc).isoformat()
        
        # Upsert the override
        result = await self.db.checklist_overrides.update_one(
            {"portfolio_id": portfolio_id, "user_id": user_id},
            {
                "$set": {"updated_at": now},
                "$setOnInsert": {"created_at": now, "portfolio_id": portfolio_id, "user_id": user_id},
                "$push": {"items": {"item_id": item_id, **override_data}}
            },
            upsert=True
        )
        
        # Remove any existing override for this item first, then add new one
        await self.db.checklist_overrides.update_one(
            {"portfolio_id": portfolio_id, "user_id": user_id},
            {"$pull": {"items": {"item_id": item_id}}}
        )
        
        await self.db.checklist_overrides.update_one(
            {"portfolio_id": portfolio_id, "user_id": user_id},
            {"$push": {"items": {"item_id": item_id, **override_data, "updated_at": now}}}
        )
        
        return {"item_id": item_id, **override_data}
    
    async def analyze_gaps(
        self,
        portfolio_id: str,
        user_id: str,
        content: Dict[str, List[Dict]]
    ) -> Dict:
        """
        Analyze portfolio content against compliance checklist.
        Returns gap analysis results with status, risk levels, and remediation hints.
        """
        checklist = await self.get_checklist_template(portfolio_id, user_id)
        
        # Build a map of available documents by type
        available_docs = {}
        all_docs = []
        
        for section_key, items in content.items():
            if section_key.startswith("_"):
                continue
            for item in items:
                if not isinstance(item, dict):
                    continue
                doc_type = item.get("type", "").lower()
                doc_data = item.get("data", {})
                
                all_docs.append({
                    "id": item.get("id"),
                    "type": doc_type,
                    "title": item.get("title", ""),
                    "status": item.get("status", ""),
                    "section": section_key,
                    "data": doc_data
                })
                
                # Index by type
                if doc_type not in available_docs:
                    available_docs[doc_type] = []
                available_docs[doc_type].append(item)
        
        # Analyze each checklist item
        results = []
        summary = {
            "total_items": len(checklist),
            "complete": 0,
            "partial": 0,
            "missing": 0,
            "not_applicable": 0,
            "high_risk": 0,
            "medium_risk": 0,
            "low_risk": 0
        }
        
        for check_item in checklist:
            # Skip if marked not applicable
            if check_item.get("not_applicable"):
                result = GapAnalysisResult(
                    item_id=check_item["id"],
                    item_name=check_item["name"],
                    category=check_item["category"],
                    status=GapStatus.NOT_APPLICABLE.value,
                    risk_level=RiskLevel.LOW.value,
                    reason="Marked as not applicable for this portfolio",
                    remediation=None,
                    matched_documents=[],
                    missing_requirements=[]
                )
                results.append(asdict(result))
                summary["not_applicable"] += 1
                continue
            
            # Find matching documents
            matched_docs = []
            for doc_type in check_item.get("document_types", []):
                if doc_type in available_docs:
                    matched_docs.extend(available_docs[doc_type])
            
            # Also search by title keywords
            keywords = check_item["name"].lower().split()
            for doc in all_docs:
                title_lower = doc.get("title", "").lower()
                if any(kw in title_lower for kw in keywords if len(kw) > 3):
                    if doc not in matched_docs:
                        matched_docs.append(doc)
            
            # Determine status and validate
            status = GapStatus.MISSING.value
            missing_requirements = []
            reason = ""
            remediation = None
            
            if matched_docs:
                # Check validation rules
                validation_rules = check_item.get("validation_rules", [])
                rules_passed = 0
                rules_failed = []
                
                for doc in matched_docs:
                    doc_data = doc.get("data", {}) if isinstance(doc.get("data"), dict) else {}
                    
                    for rule in validation_rules:
                        rule_passed = self._check_validation_rule(rule, doc_data)
                        if rule_passed:
                            rules_passed += 1
                        else:
                            rules_failed.append(rule)
                
                if not validation_rules or rules_passed >= len(validation_rules):
                    status = GapStatus.COMPLETE.value
                    reason = f"Document found and validated ({len(matched_docs)} matching)"
                elif rules_passed > 0:
                    status = GapStatus.PARTIAL.value
                    missing_requirements = list(set(rules_failed))
                    reason = f"Document found but incomplete: missing {', '.join(self._format_rule_name(r) for r in missing_requirements[:3])}"
                    remediation = f"Update document to include: {', '.join(self._format_rule_name(r) for r in missing_requirements)}"
                else:
                    status = GapStatus.PARTIAL.value
                    missing_requirements = rules_failed
                    reason = "Document found but does not meet requirements"
                    remediation = f"Ensure document has: {', '.join(self._format_rule_name(r) for r in validation_rules)}"
            else:
                status = GapStatus.MISSING.value
                reason = "Required document not found in portfolio"
                remediation = f"Upload {check_item['name']} to the portfolio"
            
            # Determine risk level
            risk_level = self._calculate_risk_level(
                status=status,
                required=check_item.get("required", True),
                time_sensitive=check_item.get("time_sensitive", False),
                tier=check_item.get("tier", 2)
            )
            
            result = GapAnalysisResult(
                item_id=check_item["id"],
                item_name=check_item["name"],
                category=check_item["category"],
                status=status,
                risk_level=risk_level,
                reason=reason,
                remediation=remediation,
                matched_documents=[d.get("id", "") for d in matched_docs if isinstance(d, dict)],
                missing_requirements=missing_requirements
            )
            
            results.append(asdict(result))
            
            # Update summary
            if status == GapStatus.COMPLETE.value:
                summary["complete"] += 1
            elif status == GapStatus.PARTIAL.value:
                summary["partial"] += 1
            elif status == GapStatus.MISSING.value:
                summary["missing"] += 1
            
            if risk_level == RiskLevel.HIGH.value:
                summary["high_risk"] += 1
            elif risk_level == RiskLevel.MEDIUM.value:
                summary["medium_risk"] += 1
            else:
                summary["low_risk"] += 1
        
        # Group by category
        by_category = {}
        for r in results:
            cat = r["category"]
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(r)
        
        return {
            "summary": summary,
            "results": results,
            "by_category": by_category,
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
            "checklist_version": "Trust Administration Checklist v1"
        }
    
    def _check_validation_rule(self, rule: str, doc_data: Dict) -> bool:
        """Check if a document meets a validation rule."""
        if rule == "has_signature":
            return bool(doc_data.get("has_signature") or doc_data.get("signed") or doc_data.get("signature_date"))
        elif rule == "has_date":
            return bool(doc_data.get("date") or doc_data.get("created_at") or doc_data.get("effective_date") or doc_data.get("document_date"))
        elif rule == "has_notarization":
            return bool(doc_data.get("notarized") or doc_data.get("notary_date"))
        elif rule == "certified_copy":
            return bool(doc_data.get("certified") or doc_data.get("is_certified"))
        elif rule == "has_witnesses":
            return bool(doc_data.get("witnesses") or doc_data.get("witness_count", 0) > 0)
        elif rule == "has_recipients":
            return bool(doc_data.get("recipients") or doc_data.get("sent_to"))
        elif rule == "has_proof_of_delivery":
            return bool(doc_data.get("delivery_proof") or doc_data.get("mailing_receipt") or doc_data.get("proof_of_service"))
        elif rule == "has_values":
            return bool(doc_data.get("values") or doc_data.get("total_value") or doc_data.get("valuation"))
        elif rule == "has_ein":
            return bool(doc_data.get("ein") or doc_data.get("tax_id"))
        elif rule == "is_filed":
            return bool(doc_data.get("filed") or doc_data.get("filing_date"))
        elif rule == "court_issued":
            return bool(doc_data.get("court_issued") or doc_data.get("court_name"))
        elif rule == "has_recording_info":
            return bool(doc_data.get("recording_number") or doc_data.get("recorded_date"))
        elif rule == "has_trustee_name":
            return bool(doc_data.get("trustee_name") or doc_data.get("trustee"))
        elif rule == "has_appraiser":
            return bool(doc_data.get("appraiser") or doc_data.get("appraiser_name"))
        elif rule == "has_methodology":
            return bool(doc_data.get("methodology") or doc_data.get("valuation_method"))
        elif rule == "has_valuation_date":
            return bool(doc_data.get("valuation_date") or doc_data.get("as_of_date"))
        elif rule == "has_source":
            return bool(doc_data.get("source") or doc_data.get("data_source"))
        elif rule == "is_complete":
            return bool(doc_data.get("is_complete") or doc_data.get("complete"))
        
        # Default: assume passed if rule not recognized
        return True
    
    def _format_rule_name(self, rule: str) -> str:
        """Format a rule name for display."""
        return rule.replace("has_", "").replace("is_", "").replace("_", " ").title()
    
    def _calculate_risk_level(
        self,
        status: str,
        required: bool,
        time_sensitive: bool,
        tier: int
    ) -> str:
        """Calculate risk level based on status and item properties."""
        if status == GapStatus.COMPLETE.value:
            return RiskLevel.LOW.value
        
        if status == GapStatus.NOT_APPLICABLE.value:
            return RiskLevel.LOW.value
        
        # Missing or partial
        if required and (time_sensitive or tier == 1):
            return RiskLevel.HIGH.value
        elif required:
            return RiskLevel.MEDIUM.value
        else:
            return RiskLevel.LOW.value
    
    # ============ PHASE 5: INTEGRITY STAMPING ============
    
    def generate_integrity_stamp(
        self,
        pdf_bytes: bytes,
        manifest: List[Dict],
        run_id: str,
        portfolio_id: str,
        user_id: str,
        base_url: str = ""
    ) -> Dict:
        """
        Generate integrity stamp for a binder.
        Hash is computed on final PDF bytes (after all processing).
        """
        # Compute SHA-256 of final PDF
        pdf_hash = hashlib.sha256(pdf_bytes).hexdigest()
        
        # Compute manifest hash
        manifest_str = json.dumps(manifest, sort_keys=True, default=str)
        manifest_hash = hashlib.sha256(manifest_str.encode()).hexdigest()
        
        # Count sealed items
        sealed_count = sum(
            1 for item in manifest 
            if isinstance(item, dict) and item.get("finalized_at")
        )
        seal_coverage = (sealed_count / len(manifest) * 100) if manifest else 0
        
        # Build verification URL
        verification_url = f"{base_url}/api/binder/verify?hash={pdf_hash}&run={run_id}"
        
        stamp = IntegrityStamp(
            binder_pdf_sha256=pdf_hash,
            manifest_sha256=manifest_hash,
            run_id=run_id,
            portfolio_id=portfolio_id,
            generated_at=datetime.now(timezone.utc).isoformat(),
            generated_by=user_id,
            generator_version="Binder Service v5.0",
            total_items=len(manifest),
            total_pages=0,  # Will be set after PDF processing
            seal_coverage_percent=round(seal_coverage, 1),
            verification_url=verification_url
        )
        
        return asdict(stamp)
    
    async def verify_binder_by_hash(self, pdf_hash: str) -> Optional[Dict]:
        """Verify a binder by its PDF hash."""
        run = await self.db.binder_runs.find_one(
            {"integrity_stamp.binder_pdf_sha256": pdf_hash},
            {"_id": 0}
        )
        
        if not run:
            return None
        
        return {
            "verified": True,
            "run_id": run.get("id"),
            "portfolio_id": run.get("portfolio_id"),
            "profile_name": run.get("profile_name"),
            "generated_at": run.get("finished_at"),
            "total_items": run.get("total_items"),
            "integrity_stamp": run.get("integrity_stamp")
        }
    
    def verify_binder_by_upload(self, pdf_bytes: bytes, expected_hash: str = None) -> Dict:
        """
        Verify a binder by computing hash of uploaded PDF.
        If expected_hash provided, compares against it.
        """
        computed_hash = hashlib.sha256(pdf_bytes).hexdigest()
        
        if expected_hash:
            matches = computed_hash == expected_hash
            return {
                "computed_hash": computed_hash,
                "expected_hash": expected_hash,
                "matches": matches,
                "verified": matches
            }
        
        return {
            "computed_hash": computed_hash,
            "verified": None,  # Need to check against database
            "message": "Hash computed. Use /api/binder/verify?hash=... to check provenance."
        }
    
    def generate_qr_code(self, verification_url: str) -> bytes:
        """Generate QR code containing verification URL."""
        try:
            import qrcode
            from io import BytesIO
            
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=4,
                border=2
            )
            qr.add_data(verification_url)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            return buffer.getvalue()
        except ImportError:
            return None
    
    def _get_user_friendly_error(self, e: Exception) -> str:
        """Convert technical errors to user-friendly messages."""
        error_str = str(e).lower()
        
        if "libpango" in error_str or "pango" in error_str:
            return "PDF generation library error. Please contact support."
        if "libcairo" in error_str or "cairo" in error_str:
            return "PDF rendering library error. Please contact support."
        if "none" in error_str and "title" in error_str:
            return "A record is missing required data. The binder will be generated with available items."
        if "attribute" in error_str and "'nonetype'" in error_str:
            return "Some data could not be loaded. The binder will be generated with available items."
        if "timeout" in error_str:
            return "Generation took too long. Try reducing the date range or sections."
        if "memory" in error_str:
            return "Not enough memory to generate binder. Try reducing the date range."
        
        return f"Binder generation failed: {str(e)[:100]}"


# Factory function
def create_binder_service(db):
    return BinderService(db)
