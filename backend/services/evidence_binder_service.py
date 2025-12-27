"""
Evidence Binder Service

Specialized binder for dispute evidence compilation.
Generates court-ready exhibit packets with chronological timelines.
"""

import io
import os
import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from uuid import uuid4
from enum import Enum
from dataclasses import dataclass, field, asdict


class ExhibitFormat(str, Enum):
    """Exhibit numbering format."""
    LETTERS = "letters"    # Exhibit A, B, C...
    NUMBERS = "numbers"    # Exhibit 1, 2, 3...


class EvidenceCategory(str, Enum):
    """Evidence category types."""
    DOCUMENTS = "documents"
    COMMUNICATIONS = "communications"
    FINANCIAL = "financial"
    PHOTOS = "photos"
    GOVERNANCE = "governance"
    OTHER = "other"


@dataclass
class EvidenceRules:
    """Configuration rules for evidence binder."""
    evidence_enabled: bool = True
    dispute_id: str = ""
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    categories_enabled: List[str] = field(default_factory=lambda: [
        "documents", "communications", "financial", "governance"
    ])
    exhibit_format: str = ExhibitFormat.LETTERS.value
    exhibit_prefix: str = ""  # Optional prefix like "PX-" or "RX-"
    include_bates: bool = False
    include_timeline: bool = True
    include_linked_only: bool = True  # Only items linked to dispute
    include_date_range_items: bool = True  # Items within dispute date range


@dataclass
class ExhibitEntry:
    """Single exhibit in the evidence binder."""
    exhibit_id: str           # A, B, C or 1, 2, 3
    exhibit_label: str        # "Exhibit A" or "PX-1"
    record_id: str
    record_type: str          # governance, document, ledger
    category: str             # EvidenceCategory
    title: str
    description: Optional[str] = None
    date: Optional[str] = None
    source_type: str = ""     # Vault/Governance/Ledger
    hash: Optional[str] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    bates_start: Optional[str] = None
    bates_end: Optional[str] = None


@dataclass
class TimelineEntry:
    """Single entry in the chronological timeline."""
    date: str
    event_type: str
    title: str
    description: str
    exhibit_ref: Optional[str] = None  # "Exhibit A"
    record_id: Optional[str] = None
    category: str = ""


@dataclass
class EvidenceManifest:
    """Complete manifest for an evidence binder run."""
    run_id: str
    dispute_id: str
    dispute_title: str
    generated_at: str
    exhibit_format: str
    total_exhibits: int
    exhibits: List[Dict] = field(default_factory=list)
    timeline: List[Dict] = field(default_factory=list)
    categories_summary: Dict[str, int] = field(default_factory=dict)


# Default evidence profile configuration
EVIDENCE_PROFILE_DEFAULTS = EvidenceRules(
    evidence_enabled=True,
    categories_enabled=["documents", "communications", "financial", "governance"],
    exhibit_format=ExhibitFormat.LETTERS.value,
    include_bates=False,
    include_timeline=True,
    include_linked_only=True,
    include_date_range_items=True
)


def number_to_exhibit_letter(n: int) -> str:
    """Convert number to exhibit letter (1=A, 2=B, ..., 27=AA, etc.)."""
    result = ""
    while n > 0:
        n -= 1
        result = chr(65 + (n % 26)) + result
        n //= 26
    return result


def get_exhibit_label(index: int, format_type: str, prefix: str = "") -> tuple:
    """
    Generate exhibit ID and label.
    Returns (exhibit_id, exhibit_label)
    """
    if format_type == ExhibitFormat.LETTERS.value:
        exhibit_id = number_to_exhibit_letter(index)
    else:
        exhibit_id = str(index)
    
    if prefix:
        exhibit_label = f"{prefix}{exhibit_id}"
    else:
        exhibit_label = f"Exhibit {exhibit_id}"
    
    return exhibit_id, exhibit_label


class EvidenceBinderService:
    """
    Service for generating Evidence Binders.
    Produces dispute-focused, exhibit-organized PDFs.
    """
    
    def __init__(self, db):
        self.db = db
    
    # ============ DISPUTE LINK MANAGEMENT ============
    
    async def get_dispute_links(self, dispute_id: str, user_id: str) -> List[Dict]:
        """Get all items linked to a dispute."""
        links = await self.db.dispute_links.find(
            {"dispute_id": dispute_id, "user_id": user_id},
            {"_id": 0}
        ).to_list(500)
        return links
    
    async def add_dispute_link(
        self,
        dispute_id: str,
        user_id: str,
        record_id: str,
        record_type: str,
        category: str = "other",
        relevance_note: str = ""
    ) -> Dict:
        """Link an item to a dispute for evidence gathering."""
        link_id = f"dlink_{uuid4().hex[:12]}"
        
        link = {
            "id": link_id,
            "dispute_id": dispute_id,
            "user_id": user_id,
            "record_id": record_id,
            "record_type": record_type,
            "category": category,
            "relevance_note": relevance_note,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Check if link already exists
        existing = await self.db.dispute_links.find_one({
            "dispute_id": dispute_id,
            "record_id": record_id,
            "user_id": user_id
        })
        
        if existing:
            return existing
        
        await self.db.dispute_links.insert_one(link)
        link.pop("_id", None)
        return link
    
    async def remove_dispute_link(self, link_id: str, user_id: str) -> bool:
        """Remove a dispute link."""
        result = await self.db.dispute_links.delete_one({
            "id": link_id,
            "user_id": user_id
        })
        return result.deleted_count > 0
    
    async def auto_link_dispute_items(
        self,
        dispute_id: str,
        portfolio_id: str,
        user_id: str
    ) -> int:
        """Auto-link items that reference this dispute."""
        linked_count = 0
        
        # Get dispute details for date range
        dispute = await self.db.governance_records.find_one(
            {"id": dispute_id, "module_type": "dispute"},
            {"_id": 0}
        )
        
        if not dispute:
            return 0
        
        # Find governance records that reference this dispute
        referencing = await self.db.governance_records.find({
            "portfolio_id": portfolio_id,
            "user_id": user_id,
            "$or": [
                {"linked_dispute_id": dispute_id},
                {"related_dispute_ids": dispute_id}
            ]
        }, {"_id": 0, "id": 1, "module_type": 1}).to_list(100)
        
        for record in referencing:
            await self.add_dispute_link(
                dispute_id=dispute_id,
                user_id=user_id,
                record_id=record["id"],
                record_type=f"governance_{record.get('module_type', 'record')}",
                category="governance"
            )
            linked_count += 1
        
        return linked_count
    
    # ============ EVIDENCE COLLECTION ============
    
    async def collect_evidence(
        self,
        portfolio_id: str,
        user_id: str,
        dispute_id: str,
        rules: Dict
    ) -> Dict[str, List[Dict]]:
        """
        Collect all evidence items for a dispute based on rules.
        Returns categorized items ready for exhibit assignment.
        """
        evidence = {
            "governance": [],
            "documents": [],
            "communications": [],
            "financial": [],
            "photos": [],
            "other": []
        }
        
        categories_enabled = rules.get("categories_enabled", [
            "documents", "communications", "financial", "governance"
        ])
        
        # Get dispute details
        dispute = await self.db.governance_records.find_one(
            {"id": dispute_id, "module_type": "dispute"},
            {"_id": 0}
        )
        
        if not dispute:
            return evidence
        
        # Get dispute date range
        date_start = rules.get("date_start") or dispute.get("created_at", "")[:10]
        date_end = rules.get("date_end") or datetime.now(timezone.utc).isoformat()[:10]
        
        # Get linked items
        linked_items = await self.get_dispute_links(dispute_id, user_id)
        linked_record_ids = {link["record_id"] for link in linked_items}
        
        # Build query base
        base_query = {
            "portfolio_id": portfolio_id,
            "user_id": user_id,
            "status": {"$nin": ["voided", "trashed", "draft"]}
        }
        
        # 1. Governance Records
        if "governance" in categories_enabled:
            gov_query = {**base_query}
            
            if rules.get("include_linked_only"):
                # Only linked items
                if linked_record_ids:
                    gov_query["id"] = {"$in": list(linked_record_ids)}
                else:
                    gov_query["id"] = {"$in": []}  # Empty if no links
            elif rules.get("include_date_range_items"):
                # Items within date range
                gov_query["$or"] = [
                    {"id": {"$in": list(linked_record_ids)}},
                    {
                        "created_at": {"$gte": date_start, "$lte": date_end},
                        "$or": [
                            {"linked_dispute_id": dispute_id},
                            {"rm_subject_id": dispute.get("rm_subject_id")}
                        ]
                    }
                ]
            
            gov_records = await self.db.governance_records.find(
                gov_query,
                {"_id": 0}
            ).sort("created_at", 1).to_list(500)
            
            for record in gov_records:
                # Get revision payload
                payload = {}
                current_rev_id = record.get("current_revision_id")
                if current_rev_id:
                    revision = await self.db.governance_revisions.find_one(
                        {"id": current_rev_id},
                        {"_id": 0, "payload_json": 1}
                    )
                    if revision:
                        payload_raw = revision.get("payload_json", {})
                        if isinstance(payload_raw, str):
                            try:
                                payload = json.loads(payload_raw)
                            except (json.JSONDecodeError, TypeError):
                                payload = {}
                        elif isinstance(payload_raw, dict):
                            payload = payload_raw
                
                module_type = record.get("module_type", "record")
                category = "communications" if module_type in ["notice", "correspondence"] else "governance"
                
                evidence[category].append({
                    "type": f"governance_{module_type}",
                    "record_id": record.get("id"),
                    "title": record.get("title") or f"{module_type.title()} Record",
                    "description": payload.get("summary") or payload.get("description", ""),
                    "date": record.get("created_at", "")[:10],
                    "status": record.get("status"),
                    "rm_id": record.get("rm_id"),
                    "source_type": "Governance",
                    "data": record,
                    "payload": payload
                })
        
        # 2. Vault Documents
        if "documents" in categories_enabled:
            doc_query = {
                "portfolio_id": portfolio_id,
                "user_id": user_id,
                "status": {"$ne": "trashed"}
            }
            
            # Filter by linked or date range
            if rules.get("include_linked_only"):
                doc_linked = [lid for lid in linked_record_ids if lid.startswith("doc_")]
                if doc_linked:
                    doc_query["id"] = {"$in": doc_linked}
                else:
                    doc_query["id"] = {"$in": []}
            elif rules.get("include_date_range_items"):
                doc_linked = [lid for lid in linked_record_ids if lid.startswith("doc_")]
                doc_query["$or"] = [
                    {"id": {"$in": doc_linked}},
                    {"created_at": {"$gte": date_start, "$lte": date_end}}
                ]
            
            documents = await self.db.documents.find(
                doc_query,
                {"_id": 0}
            ).sort("created_at", 1).to_list(200)
            
            for doc in documents:
                doc_type = doc.get("document_type", "general")
                category = "photos" if doc_type in ["photo", "image"] else "documents"
                
                evidence[category].append({
                    "type": "document",
                    "record_id": doc.get("id"),
                    "title": doc.get("title") or doc.get("name") or "Document",
                    "description": doc.get("description", ""),
                    "date": doc.get("created_at", "")[:10],
                    "source_type": "Vault",
                    "data": doc
                })
        
        # 3. Ledger Entries (Financial)
        if "financial" in categories_enabled:
            ledger_query = {
                "portfolio_id": portfolio_id,
                "user_id": user_id
            }
            
            if rules.get("include_linked_only"):
                ledger_linked = [lid for lid in linked_record_ids if lid.startswith("led_")]
                if ledger_linked:
                    ledger_query["id"] = {"$in": ledger_linked}
                else:
                    ledger_query["id"] = {"$in": []}
            elif rules.get("include_date_range_items"):
                ledger_linked = [lid for lid in linked_record_ids if lid.startswith("led_")]
                ledger_query["$or"] = [
                    {"id": {"$in": ledger_linked}},
                    {
                        "entry_date": {"$gte": date_start, "$lte": date_end},
                        "$or": [
                            {"dispute_id": dispute_id},
                            {"tags": "dispute"}
                        ]
                    }
                ]
            
            ledger_entries = await self.db.ledger_entries.find(
                ledger_query,
                {"_id": 0}
            ).sort("entry_date", 1).to_list(200)
            
            for entry in ledger_entries:
                evidence["financial"].append({
                    "type": "ledger_entry",
                    "record_id": entry.get("id"),
                    "title": entry.get("description") or "Ledger Entry",
                    "description": f"Amount: ${entry.get('amount', 0):,.2f}",
                    "date": entry.get("entry_date", "")[:10],
                    "source_type": "Ledger",
                    "data": entry
                })
        
        return evidence
    
    # ============ EXHIBIT ASSIGNMENT ============
    
    def assign_exhibits(
        self,
        evidence: Dict[str, List[Dict]],
        rules: Dict
    ) -> List[ExhibitEntry]:
        """
        Assign exhibit numbers to collected evidence.
        Returns ordered list of exhibits.
        """
        exhibits = []
        exhibit_format = rules.get("exhibit_format", ExhibitFormat.LETTERS.value)
        exhibit_prefix = rules.get("exhibit_prefix", "")
        
        # Flatten and sort all evidence by date
        all_items = []
        for category, items in evidence.items():
            for item in items:
                all_items.append({**item, "category": category})
        
        # Sort by date
        all_items.sort(key=lambda x: x.get("date", "") or "9999-99-99")
        
        # Assign exhibit numbers
        for idx, item in enumerate(all_items, 1):
            exhibit_id, exhibit_label = get_exhibit_label(idx, exhibit_format, exhibit_prefix)
            
            # Compute hash for integrity
            item_hash = hashlib.sha256(
                json.dumps(item.get("data", {}), sort_keys=True, default=str).encode()
            ).hexdigest()[:16]
            
            exhibit = ExhibitEntry(
                exhibit_id=exhibit_id,
                exhibit_label=exhibit_label,
                record_id=item.get("record_id", ""),
                record_type=item.get("type", "unknown"),
                category=item.get("category", "other"),
                title=item.get("title", "Untitled"),
                description=item.get("description"),
                date=item.get("date"),
                source_type=item.get("source_type", ""),
                hash=item_hash
            )
            exhibits.append(exhibit)
        
        return exhibits
    
    # ============ TIMELINE GENERATION ============
    
    def generate_timeline(
        self,
        exhibits: List[ExhibitEntry],
        dispute: Dict
    ) -> List[TimelineEntry]:
        """
        Generate chronological timeline from exhibits.
        Each entry references its exhibit.
        """
        timeline = []
        
        # Add dispute creation as first event
        timeline.append(TimelineEntry(
            date=dispute.get("created_at", "")[:10],
            event_type="dispute_filed",
            title="Dispute Filed",
            description=dispute.get("title") or "Dispute initiated",
            category="governance"
        ))
        
        # Add exhibits as timeline entries
        for exhibit in exhibits:
            if exhibit.date:
                event_type = {
                    "governance": "governance_action",
                    "documents": "document_created",
                    "communications": "communication",
                    "financial": "financial_transaction",
                    "photos": "evidence_captured"
                }.get(exhibit.category, "event")
                
                timeline.append(TimelineEntry(
                    date=exhibit.date,
                    event_type=event_type,
                    title=exhibit.title,
                    description=exhibit.description or "",
                    exhibit_ref=exhibit.exhibit_label,
                    record_id=exhibit.record_id,
                    category=exhibit.category
                ))
        
        # Sort by date
        timeline.sort(key=lambda x: x.date or "9999-99-99")
        
        return timeline
    
    # ============ PDF GENERATION ============
    
    async def generate_evidence_pdf(
        self,
        portfolio_id: str,
        user_id: str,
        dispute_id: str,
        exhibits: List[ExhibitEntry],
        timeline: List[TimelineEntry],
        rules: Dict
    ) -> bytes:
        """
        Generate the Evidence Binder PDF.
        Returns PDF bytes.
        """
        from weasyprint import HTML, CSS
        from weasyprint.text.fonts import FontConfiguration
        
        font_config = FontConfiguration()
        
        # Get dispute and portfolio info
        dispute = await self.db.governance_records.find_one(
            {"id": dispute_id},
            {"_id": 0}
        )
        portfolio = await self.db.portfolios.find_one(
            {"portfolio_id": portfolio_id},
            {"_id": 0}
        )
        
        dispute_title = dispute.get("title", "Dispute") if dispute else "Dispute"
        portfolio_name = portfolio.get("name", "Portfolio") if portfolio else "Portfolio"
        
        html_parts = []
        
        # CSS Styling
        css = """
        @page {
            size: letter;
            margin: 0.75in;
            @top-center {
                content: "Evidence Binder - """ + dispute_title[:30] + """";
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
        
        h1.bookmark-l1 {
            bookmark-level: 1;
            bookmark-label: attr(data-bookmark);
        }
        
        h2.bookmark-l2 {
            bookmark-level: 2;
            bookmark-label: attr(data-bookmark);
        }
        
        .cover-page {
            page-break-after: always;
            text-align: center;
            padding-top: 2in;
        }
        
        .cover-badge {
            display: inline-block;
            background: #dc3545;
            color: white;
            padding: 8px 24px;
            font-weight: bold;
            font-size: 12pt;
            border-radius: 4px;
            margin-bottom: 0.5in;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .cover-title {
            font-size: 28pt;
            font-weight: bold;
            color: #0a0a0a;
            margin-bottom: 0.3in;
        }
        
        .cover-subtitle {
            font-size: 16pt;
            color: #333;
            margin-bottom: 0.25in;
        }
        
        .cover-dispute {
            font-size: 14pt;
            color: #dc3545;
            font-style: italic;
            margin-bottom: 1in;
        }
        
        .cover-meta {
            font-size: 11pt;
            color: #666;
            margin-top: 1in;
        }
        
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
            border-bottom: 3px solid #dc3545;
        }
        
        .index-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt;
            margin-top: 0.25in;
        }
        
        .index-table th {
            background: #0B1221;
            color: #d4af37;
            padding: 8px;
            text-align: left;
            border-bottom: 2px solid #dc3545;
        }
        
        .index-table td {
            padding: 6px 8px;
            border-bottom: 1px solid #ddd;
        }
        
        .index-table tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        .timeline-page {
            page-break-after: always;
        }
        
        .timeline-header {
            font-size: 20pt;
            font-weight: bold;
            color: #0B1221;
            margin-bottom: 0.5in;
            padding-bottom: 0.25in;
            border-bottom: 2px solid #dc3545;
        }
        
        .timeline-entry {
            display: flex;
            margin-bottom: 16px;
            border-left: 3px solid #dc3545;
            padding-left: 16px;
        }
        
        .timeline-date {
            flex: 0 0 100px;
            font-weight: bold;
            color: #333;
        }
        
        .timeline-content {
            flex: 1;
        }
        
        .timeline-title {
            font-weight: bold;
            color: #0B1221;
        }
        
        .timeline-ref {
            color: #dc3545;
            font-size: 9pt;
            font-style: italic;
        }
        
        .exhibit-divider {
            page-break-before: always;
            text-align: center;
            padding-top: 3in;
            background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
            color: white;
            margin: -0.75in;
            padding-left: 0.75in;
            padding-right: 0.75in;
            min-height: 100vh;
        }
        
        .exhibit-divider::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: #dc3545;
        }
        
        .exhibit-label {
            font-size: 48pt;
            font-weight: bold;
            color: #dc3545;
            margin-bottom: 0.5in;
        }
        
        .exhibit-title {
            font-size: 18pt;
            color: white;
            margin-bottom: 0.25in;
        }
        
        .exhibit-meta {
            font-size: 11pt;
            color: #999;
        }
        
        .exhibit-content {
            page-break-after: always;
            padding: 0.25in 0;
        }
        
        .exhibit-header {
            background: #f8f9fa;
            border-left: 4px solid #dc3545;
            padding: 12px 16px;
            margin-bottom: 16px;
        }
        
        .exhibit-header-label {
            font-size: 14pt;
            font-weight: bold;
            color: #dc3545;
        }
        
        .exhibit-header-title {
            font-size: 12pt;
            color: #333;
            margin-top: 4px;
        }
        
        .field-label {
            font-weight: bold;
            color: #333;
            margin-top: 12px;
        }
        
        .field-value {
            color: #1a1a1a;
        }
        
        .category-badge {
            display: inline-block;
            padding: 2px 8px;
            font-size: 9pt;
            border-radius: 3px;
            text-transform: uppercase;
        }
        
        .category-governance { background: #e3f2fd; color: #1565c0; }
        .category-documents { background: #fff3e0; color: #e65100; }
        .category-communications { background: #f3e5f5; color: #7b1fa2; }
        .category-financial { background: #e8f5e9; color: #2e7d32; }
        .category-photos { background: #fce4ec; color: #c2185b; }
        """
        
        generated_at = datetime.now(timezone.utc).strftime("%B %d, %Y at %I:%M %p UTC")
        
        # 1. Cover Page
        html_parts.append(f"""
        <div class="cover-page">
            <h1 class="bookmark-l1" data-bookmark="Evidence Binder - {dispute_title[:30]}" style="visibility: hidden; height: 0; margin: 0;">Cover</h1>
            <div class="cover-badge">Evidence Binder</div>
            <div class="cover-title">{portfolio_name}</div>
            <div class="cover-subtitle">Dispute Evidence Compilation</div>
            <div class="cover-dispute">RE: {dispute_title}</div>
            <div class="cover-meta">
                <p><strong>Generated:</strong> {generated_at}</p>
                <p><strong>Total Exhibits:</strong> {len(exhibits)}</p>
                <p><strong>Exhibit Format:</strong> {rules.get('exhibit_format', 'letters').title()}</p>
            </div>
        </div>
        """)
        
        # 2. Evidence Index
        html_parts.append("""
        <div class="toc-page">
            <h1 class="bookmark-l1" data-bookmark="Evidence Index" style="visibility: hidden; height: 0; margin: 0;">Index</h1>
            <div class="toc-header">Evidence Index</div>
            <table class="index-table">
                <thead>
                    <tr>
                        <th style="width: 80px;">Exhibit</th>
                        <th style="width: 80px;">Date</th>
                        <th style="width: 100px;">Category</th>
                        <th style="width: 80px;">Source</th>
                        <th>Description/Title</th>
                    </tr>
                </thead>
                <tbody>
        """)
        
        for exhibit in exhibits:
            category_class = f"category-{exhibit.category}"
            html_parts.append(f"""
                <tr>
                    <td><strong>{exhibit.exhibit_label}</strong></td>
                    <td>{exhibit.date or '—'}</td>
                    <td><span class="category-badge {category_class}">{exhibit.category}</span></td>
                    <td>{exhibit.source_type}</td>
                    <td>{exhibit.title[:60]}</td>
                </tr>
            """)
        
        html_parts.append("""
                </tbody>
            </table>
        </div>
        """)
        
        # 3. Timeline Page (if enabled)
        if rules.get("include_timeline", True) and timeline:
            html_parts.append("""
            <div class="timeline-page">
                <h1 class="bookmark-l1" data-bookmark="Chronological Timeline" style="visibility: hidden; height: 0; margin: 0;">Timeline</h1>
                <div class="timeline-header">Chronological Timeline</div>
            """)
            
            for entry in timeline:
                exhibit_ref = f'<div class="timeline-ref">→ {entry.exhibit_ref}</div>' if entry.exhibit_ref else ""
                html_parts.append(f"""
                <div class="timeline-entry">
                    <div class="timeline-date">{entry.date}</div>
                    <div class="timeline-content">
                        <div class="timeline-title">{entry.title}</div>
                        <div>{entry.description[:100] if entry.description else ''}</div>
                        {exhibit_ref}
                    </div>
                </div>
                """)
            
            html_parts.append("</div>")
        
        # 4. Exhibit Pages
        for exhibit in exhibits:
            # Exhibit Divider
            html_parts.append(f"""
            <div class="exhibit-divider">
                <h1 class="bookmark-l1" data-bookmark="{exhibit.exhibit_label}" style="visibility: hidden; height: 0; margin: 0;">{exhibit.exhibit_label}</h1>
                <div class="exhibit-label">{exhibit.exhibit_label}</div>
                <div class="exhibit-title">{exhibit.title}</div>
                <div class="exhibit-meta">
                    Category: {exhibit.category.title()} | 
                    Source: {exhibit.source_type} | 
                    Date: {exhibit.date or 'N/A'}
                </div>
            </div>
            """)
            
            # Exhibit Content
            html_parts.append(f"""
            <div class="exhibit-content">
                <div class="exhibit-header">
                    <div class="exhibit-header-label">{exhibit.exhibit_label}</div>
                    <div class="exhibit-header-title">{exhibit.title}</div>
                </div>
                <div class="field-label">Description</div>
                <div class="field-value">{exhibit.description or 'No description provided.'}</div>
                <div class="field-label">Date</div>
                <div class="field-value">{exhibit.date or 'Not specified'}</div>
                <div class="field-label">Source</div>
                <div class="field-value">{exhibit.source_type} - {exhibit.record_type}</div>
                <div class="field-label">Record ID</div>
                <div class="field-value"><code>{exhibit.record_id}</code></div>
                <div class="field-label">Integrity Hash</div>
                <div class="field-value"><code>{exhibit.hash}</code></div>
            </div>
            """)
        
        # Combine HTML
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Evidence Binder - {dispute_title}</title>
            <style>{css}</style>
        </head>
        <body>
            {''.join(html_parts)}
        </body>
        </html>
        """
        
        # Generate PDF
        html = HTML(string=full_html)
        pdf_bytes = html.write_pdf(font_config=font_config)
        
        return pdf_bytes
    
    # ============ MAIN GENERATION FLOW ============
    
    async def generate_evidence_binder(
        self,
        portfolio_id: str,
        user_id: str,
        dispute_id: str,
        rules: Dict
    ) -> Dict:
        """
        Main entry point for generating an evidence binder.
        Returns result with run_id and status.
        """
        import base64
        from services.binder_service import BinderStatus
        
        # Create run record
        run_id = f"ebrun_{uuid4().hex[:12]}"
        
        # Get dispute info
        dispute = await self.db.governance_records.find_one(
            {"id": dispute_id, "module_type": "dispute"},
            {"_id": 0}
        )
        
        if not dispute:
            return {
                "success": False,
                "error": "Dispute not found",
                "run_id": run_id
            }
        
        run = {
            "id": run_id,
            "portfolio_id": portfolio_id,
            "user_id": user_id,
            "binder_type": "evidence",
            "dispute_id": dispute_id,
            "profile_name": f"Evidence Binder - {dispute.get('title', 'Dispute')[:30]}",
            "profile_type": "evidence",
            "rules_snapshot": rules,
            "status": BinderStatus.GENERATING.value,
            "started_at": datetime.now(timezone.utc).isoformat(),
            "finished_at": None,
            "pdf_data": None,
            "manifest_json": None,
            "error_json": None,
            "total_pages": 0,
            "total_items": 0
        }
        
        await self.db.binder_runs.insert_one(run)
        
        try:
            # Collect evidence
            evidence = await self.collect_evidence(
                portfolio_id, user_id, dispute_id, rules
            )
            
            # Assign exhibits
            exhibits = self.assign_exhibits(evidence, rules)
            
            # Generate timeline
            timeline = self.generate_timeline(exhibits, dispute)
            
            # Generate PDF
            pdf_bytes = await self.generate_evidence_pdf(
                portfolio_id, user_id, dispute_id, exhibits, timeline, rules
            )
            
            # Encode PDF
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
            
            # Build manifest
            manifest = EvidenceManifest(
                run_id=run_id,
                dispute_id=dispute_id,
                dispute_title=dispute.get("title", "Dispute"),
                generated_at=datetime.now(timezone.utc).isoformat(),
                exhibit_format=rules.get("exhibit_format", "letters"),
                total_exhibits=len(exhibits),
                exhibits=[asdict(e) for e in exhibits],
                timeline=[asdict(t) for t in timeline],
                categories_summary={
                    cat: len([e for e in exhibits if e.category == cat])
                    for cat in ["governance", "documents", "communications", "financial", "photos"]
                }
            )
            
            # Update run
            await self.db.binder_runs.update_one(
                {"id": run_id},
                {"$set": {
                    "status": BinderStatus.COMPLETE.value,
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "pdf_data": pdf_base64,
                    "manifest_json": asdict(manifest),
                    "total_items": len(exhibits),
                    "total_pages": len(exhibits) * 2 + 3  # Approximate
                }}
            )
            
            return {
                "success": True,
                "run_id": run_id,
                "total_exhibits": len(exhibits),
                "categories_summary": manifest.categories_summary,
                "timeline_entries": len(timeline)
            }
            
        except Exception as e:
            # Update run with error
            await self.db.binder_runs.update_one(
                {"id": run_id},
                {"$set": {
                    "status": BinderStatus.FAILED.value,
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                    "error_json": {
                        "message": str(e),
                        "user_message": "Failed to generate evidence binder"
                    }
                }}
            )
            
            return {
                "success": False,
                "error": str(e),
                "run_id": run_id
            }


def create_evidence_binder_service(db):
    """Factory function to create evidence binder service."""
    return EvidenceBinderService(db)
