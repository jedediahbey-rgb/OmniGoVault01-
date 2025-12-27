"""
Portfolio Binder Service

Court/Audit-ready consolidated PDF packet generator.
Produces single printable PDFs with deterministic ordering.
"""

import io
import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
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
        attested_only_minutes=True
    ),
    BinderProfile.COURT: BinderRules(
        include_drafts=False,
        include_pending_approved_executed=True,
        include_voided_trashed=False,
        include_attachments=True,
        include_ledger_excerpts=True,
        include_integrity_summary=True,
        date_range="24months"
    ),
    BinderProfile.OMNI: BinderRules(
        include_drafts=False,
        include_pending_approved_executed=True,
        include_voided_trashed=False,
        include_attachments=True,
        include_ledger_excerpts=True,
        include_integrity_summary=True,
        date_range="all"
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
                    payload = safe_get(revision, "payload_json", {})
            
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
        from weasyprint import HTML, CSS
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
                1 for section in content.values()
                for item in section
                if item.get("data", {}).get("integrity_seal_id")
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
            content["_missing_items"] = validation.get("missing_items", [])
            content["_validation_warnings"] = validation.get("warnings", [])
            
            # Generate manifest
            manifest = self.generate_manifest(content)
            
            # Generate PDF (will include missing items page if needed)
            pdf_bytes = await self.generate_pdf(
                portfolio_id, user_id, profile, content, manifest
            )
            
            # Encode PDF as base64 for storage
            import base64
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
            
            # Prepare run metadata including validation info
            run_metadata = {
                "validation": validation,
                "generated_with_warnings": len(validation.get("warnings", [])) > 0
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
                    "missing_items": validation.get("missing_items", [])
                }}
            )
            
            return {
                "success": True,
                "run_id": run["id"],
                "status": BinderStatus.COMPLETE.value,
                "total_items": len(manifest),
                "message": "Binder generated successfully",
                "warnings": validation.get("warnings", [])
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
