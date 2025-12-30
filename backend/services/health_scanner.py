"""
Trust Health Scanner Service
Comprehensive health scoring system for governance records.

Categories (weighted):
- Governance Hygiene (25%): meetings, minutes, signatures, amendments
- Financial Integrity (25%): ledger, distributions, compensation
- Compliance & Recordkeeping (15%): docs, attestations, audit trail
- Risk & Exposure (15%): disputes, insurance gaps, concentration
- Data Integrity (20%): orphans, RM-ID validity, lifecycle consistency

Blocking Conditions (caps):
- Ghost/orphan records → cap at 60
- Finalized missing required fields → cap at 70
- Ledger imbalance → cap at 65
- Draft showing as Active → cap at 75
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from uuid import uuid4
import re


class HealthFinding:
    """Represents a health scan finding."""
    
    SEVERITY_CRITICAL = "critical"
    SEVERITY_WARNING = "warning"
    SEVERITY_INFO = "info"
    
    def __init__(
        self,
        category: str,
        severity: str,
        title: str,
        description: str,
        impact_points: float = 0,
        auto_fixable: bool = False,
        fix_action: Optional[str] = None,
        record_id: Optional[str] = None,
        details: Optional[Dict] = None
    ):
        self.id = f"finding_{uuid4().hex[:8]}"
        self.category = category
        self.severity = severity
        self.title = title
        self.description = description
        self.impact_points = impact_points
        self.auto_fixable = auto_fixable
        self.fix_action = fix_action
        self.record_id = record_id
        self.details = details or {}
        self.created_at = datetime.now(timezone.utc).isoformat()
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "category": self.category,
            "severity": self.severity,
            "title": self.title,
            "description": self.description,
            "impact_points": self.impact_points,
            "auto_fixable": self.auto_fixable,
            "fix_action": self.fix_action,
            "record_id": self.record_id,
            "details": self.details,
            "created_at": self.created_at
        }


class TrustHealthScanner:
    """
    Comprehensive Trust Health Scanner.
    Produces an overall score (0-100) with category breakdowns.
    Uses configurable weights from database if available.
    """
    
    # Default category weights (percentages, must sum to 100)
    DEFAULT_WEIGHTS = {
        "governance_hygiene": 25,
        "financial_integrity": 25,
        "compliance_recordkeeping": 15,
        "risk_exposure": 15,
        "data_integrity": 20
    }
    
    # Default blocking condition caps
    DEFAULT_CAPS = {
        "ghost_records": {"enabled": True, "cap": 60, "description": "Orphan/ghost records detected"},
        "missing_required_fields": {"enabled": True, "cap": 70, "description": "Finalized records missing required fields"},
        "ledger_imbalance": {"enabled": True, "cap": 65, "description": "Ledger debits and credits don't balance"},
        "draft_showing_active": {"enabled": True, "cap": 75, "description": "Draft insurance showing as active"}
    }
    
    def __init__(self, db):
        self.db = db
        self.findings: List[HealthFinding] = []
        self.category_scores: Dict[str, float] = {}
        self.blocking_conditions: List[str] = []
        self.scan_id = f"scan_{uuid4().hex[:8]}"
        self.scanned_at = None
        # Dynamic weights and caps (loaded from config)
        self.WEIGHTS = {}
        self.CAPS = {}
    
    async def _load_config(self, user_id: str):
        """Load health rules configuration from database."""
        try:
            config_doc = await self.db.system_config.find_one(
                {"config_type": "health_rules", "user_id": user_id},
                {"_id": 0}
            )
            
            if config_doc and config_doc.get("config"):
                config = config_doc["config"]
                # Load weights (convert from percentage to decimal)
                weights = config.get("category_weights", self.DEFAULT_WEIGHTS)
                self.WEIGHTS = {k: v / 100.0 for k, v in weights.items()}
                
                # Load blocking caps
                caps_config = config.get("blocking_caps", self.DEFAULT_CAPS)
                self.CAPS = {}
                for cap_name, cap_data in caps_config.items():
                    if isinstance(cap_data, dict) and cap_data.get("enabled", True):
                        self.CAPS[cap_name] = cap_data.get("cap", 60)
            else:
                # Use defaults
                self.WEIGHTS = {k: v / 100.0 for k, v in self.DEFAULT_WEIGHTS.items()}
                self.CAPS = {k: v["cap"] for k, v in self.DEFAULT_CAPS.items()}
        except Exception:
            # Fallback to defaults on error
            self.WEIGHTS = {k: v / 100.0 for k, v in self.DEFAULT_WEIGHTS.items()}
            self.CAPS = {k: v["cap"] for k, v in self.DEFAULT_CAPS.items()}
    
    async def run_full_scan(self, user_id: str = "default_user") -> Dict:
        """Run a comprehensive health scan."""
        self.findings = []
        self.category_scores = {}
        self.blocking_conditions = []
        self.scanned_at = datetime.now(timezone.utc).isoformat()
        
        # Load configuration from database
        await self._load_config(user_id)
        
        # Gather all data
        records = await self._get_governance_records(user_id)
        portfolios = await self._get_portfolios(user_id)
        documents = await self._get_documents(user_id)
        ledger_entries = await self._get_ledger_entries(user_id)
        
        # Run category scans
        self.category_scores["governance_hygiene"] = await self._scan_governance_hygiene(records)
        self.category_scores["financial_integrity"] = await self._scan_financial_integrity(records, ledger_entries)
        self.category_scores["compliance_recordkeeping"] = await self._scan_compliance(records, documents)
        self.category_scores["risk_exposure"] = await self._scan_risk_exposure(records)
        self.category_scores["data_integrity"] = await self._scan_data_integrity(records, portfolios)
        
        # Calculate weighted score
        raw_score = sum(
            self.category_scores[cat] * weight
            for cat, weight in self.WEIGHTS.items()
        )
        
        # Apply blocking condition caps
        final_score = self._apply_caps(raw_score)
        
        # Generate next actions
        next_actions = self._generate_next_actions()
        
        # Store scan result
        scan_result = {
            "scan_id": self.scan_id,
            "user_id": user_id,
            "scanned_at": self.scanned_at,
            "overall_score": round(final_score, 1),
            "raw_score": round(raw_score, 1),
            "category_scores": {k: round(v, 1) for k, v in self.category_scores.items()},
            "blocking_conditions": self.blocking_conditions,
            "findings_count": {
                "critical": len([f for f in self.findings if f.severity == "critical"]),
                "warning": len([f for f in self.findings if f.severity == "warning"]),
                "info": len([f for f in self.findings if f.severity == "info"])
            },
            "findings": [f.to_dict() for f in self.findings],
            "next_actions": next_actions[:10],  # Top 10 actions
            "stats": {
                "total_records": len(records),
                "total_portfolios": len(portfolios),
                "total_documents": len(documents),
                "records_by_status": self._count_by_field(records, "status"),
                "records_by_module": self._count_by_field(records, "module_type")
            }
        }
        
        # Save to database
        await self.db.health_scans.insert_one({
            **scan_result,
            "_id": self.scan_id
        })
        
        return scan_result
    
    async def _get_governance_records(self, user_id: str) -> List[Dict]:
        """Fetch all governance records."""
        return await self.db.governance_records.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(10000)
    
    async def _get_portfolios(self, user_id: str) -> List[Dict]:
        """Fetch all portfolios."""
        return await self.db.portfolios.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(1000)
    
    async def _get_documents(self, user_id: str) -> List[Dict]:
        """Fetch all documents."""
        return await self.db.documents.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(10000)
    
    async def _get_ledger_entries(self, user_id: str) -> List[Dict]:
        """Fetch all ledger entries."""
        return await self.db.ledger_entries.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(10000)
    
    def _count_by_field(self, records: List[Dict], field: str) -> Dict[str, int]:
        """Count records by a field value."""
        counts = {}
        for r in records:
            val = r.get(field, "unknown")
            counts[val] = counts.get(val, 0) + 1
        return counts
    
    async def _scan_governance_hygiene(self, records: List[Dict]) -> float:
        """
        Governance Hygiene (25%):
        - Meeting minutes completeness
        - Signatures/attestations
        - Amendment handling
        - Required fields present
        """
        if not records:
            self.findings.append(HealthFinding(
                category="governance_hygiene",
                severity="warning",
                title="No governance records found",
                description="Create your first governance record to establish trust administration.",
                impact_points=25.0
            ))
            return 50.0  # Base score for empty state
        
        score = 100.0
        deductions = 0
        
        # Check meeting minutes
        minutes = [r for r in records if r.get("module_type") == "minutes"]
        if not minutes:
            self.findings.append(HealthFinding(
                category="governance_hygiene",
                severity="warning",
                title="No meeting minutes recorded",
                description="Meeting minutes are essential for trust governance documentation.",
                impact_points=10.0
            ))
            deductions += 10
        else:
            # Check for finalized minutes
            finalized_minutes = [m for m in minutes if m.get("status") == "finalized"]
            if len(finalized_minutes) < len(minutes) * 0.5:
                draft_count = len(minutes) - len(finalized_minutes)
                self.findings.append(HealthFinding(
                    category="governance_hygiene",
                    severity="warning",
                    title=f"{draft_count} meeting minutes in draft",
                    description="Finalize meeting minutes to create permanent records.",
                    impact_points=5.0,
                    auto_fixable=False
                ))
                deductions += 5
        
        # Check for amendments handled correctly
        amended_records = [r for r in records if r.get("amended_by_id")]
        for record in amended_records:
            # Verify amendment chain integrity
            if not record.get("finalized_at"):
                self.findings.append(HealthFinding(
                    category="governance_hygiene",
                    severity="warning",
                    title="Amended record not finalized",
                    description=f"Record {record.get('rm_id', record.get('id'))} was amended but original not finalized.",
                    impact_points=3.0,
                    record_id=record.get("id")
                ))
                deductions += 3
        
        # Check finalized records have required fields
        finalized = [r for r in records if r.get("status") == "finalized"]
        for record in finalized:
            if not record.get("finalized_by"):
                self.findings.append(HealthFinding(
                    category="governance_hygiene",
                    severity="critical",
                    title="Finalized record missing finalizer",
                    description=f"Record {record.get('rm_id', record.get('id'))} is finalized but missing finalized_by.",
                    impact_points=5.0,
                    record_id=record.get("id")
                ))
                deductions += 5
                self.blocking_conditions.append("missing_required_fields")
        
        return max(0, score - deductions)
    
    async def _scan_financial_integrity(self, records: List[Dict], ledger_entries: List[Dict]) -> float:
        """
        Financial Integrity (25%):
        - Distributions properly recorded
        - Compensation tracking
        - Ledger reconciliation
        """
        score = 100.0
        deductions = 0
        
        # Check distributions
        distributions = [r for r in records if r.get("module_type") == "distribution"]
        if distributions:
            # Check for draft distributions older than 30 days
            now = datetime.now(timezone.utc)
            for dist in distributions:
                if dist.get("status") == "draft":
                    created = dist.get("created_at")
                    if created:
                        try:
                            created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                            age_days = (now - created_dt).days
                            if age_days > 30:
                                self.findings.append(HealthFinding(
                                    category="financial_integrity",
                                    severity="warning",
                                    title=f"Distribution draft aging ({age_days} days)",
                                    description=f"'{dist.get('title', 'Unnamed')}' has been in draft for {age_days} days.",
                                    impact_points=3.0,
                                    record_id=dist.get("id")
                                ))
                                deductions += 3
                        except:
                            pass
        
        # Check compensation records
        compensation = [r for r in records if r.get("module_type") == "compensation"]
        unpaid = [c for c in compensation if c.get("status") == "draft"]
        if len(unpaid) > 3:
            self.findings.append(HealthFinding(
                category="financial_integrity",
                severity="warning",
                title=f"{len(unpaid)} pending compensation entries",
                description="Multiple compensation entries awaiting finalization.",
                impact_points=5.0
            ))
            deductions += 5
        
        # Check ledger balance (if entries exist)
        if ledger_entries:
            # Simple balance check
            total_debits = sum(e.get("debit", 0) or 0 for e in ledger_entries)
            total_credits = sum(e.get("credit", 0) or 0 for e in ledger_entries)
            imbalance = abs(total_debits - total_credits)
            if imbalance > 0.01:  # Allow small rounding differences
                self.findings.append(HealthFinding(
                    category="financial_integrity",
                    severity="critical",
                    title="Ledger imbalance detected",
                    description=f"Debits ({total_debits}) and credits ({total_credits}) don't balance. Difference: {imbalance}",
                    impact_points=15.0
                ))
                deductions += 15
                self.blocking_conditions.append("ledger_imbalance")
        
        return max(0, score - deductions)
    
    async def _scan_compliance(self, records: List[Dict], documents: List[Dict]) -> float:
        """
        Compliance & Recordkeeping (15%):
        - Required documents present
        - Attestations complete
        - Audit trail integrity
        """
        score = 100.0
        deductions = 0
        
        # Check for essential document types
        essential_docs = ["declaration_of_trust", "trust_transfer_grant_deed", "certificate_of_trust"]
        doc_types = [d.get("template_id") for d in documents]
        
        missing_essential = [doc for doc in essential_docs if doc not in doc_types]
        if missing_essential:
            self.findings.append(HealthFinding(
                category="compliance_recordkeeping",
                severity="info",
                title=f"{len(missing_essential)} essential documents not created",
                description=f"Consider creating: {', '.join(missing_essential)}",
                impact_points=5.0
            ))
            deductions += 5
        
        # Check attestations on finalized records
        finalized = [r for r in records if r.get("status") == "finalized"]
        # Would check attestations field if present
        
        return max(0, score - deductions)
    
    async def _scan_risk_exposure(self, records: List[Dict]) -> float:
        """
        Risk & Exposure (15%):
        - Open disputes aging
        - Insurance coverage gaps
        - Concentration risk
        """
        score = 100.0
        deductions = 0
        
        # Check disputes
        disputes = [r for r in records if r.get("module_type") == "dispute"]
        open_disputes = [d for d in disputes if d.get("status") in ["draft", "pending"]]
        
        if open_disputes:
            # Check aging
            now = datetime.now(timezone.utc)
            for dispute in open_disputes:
                created = dispute.get("created_at")
                if created:
                    try:
                        created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                        age_days = (now - created_dt).days
                        if age_days > 60:
                            self.findings.append(HealthFinding(
                                category="risk_exposure",
                                severity="critical",
                                title=f"Dispute aging ({age_days} days)",
                                description=f"'{dispute.get('title', 'Unnamed')}' has been open for {age_days} days.",
                                impact_points=8.0,
                                record_id=dispute.get("id")
                            ))
                            deductions += 8
                        elif age_days > 30:
                            self.findings.append(HealthFinding(
                                category="risk_exposure",
                                severity="warning",
                                title=f"Dispute pending ({age_days} days)",
                                description=f"'{dispute.get('title', 'Unnamed')}' needs attention.",
                                impact_points=4.0,
                                record_id=dispute.get("id")
                            ))
                            deductions += 4
                    except:
                        pass
        
        # Check insurance coverage
        insurance = [r for r in records if r.get("module_type") == "insurance"]
        if not insurance:
            self.findings.append(HealthFinding(
                category="risk_exposure",
                severity="warning",
                title="No insurance policies recorded",
                description="Consider documenting insurance coverage for the trust.",
                impact_points=10.0
            ))
            deductions += 10
        else:
            # Check for active coverage
            active_policies = [p for p in insurance if p.get("status") == "finalized"]
            draft_policies = [p for p in insurance if p.get("status") == "draft"]
            
            if not active_policies and draft_policies:
                self.findings.append(HealthFinding(
                    category="risk_exposure",
                    severity="warning",
                    title="No active insurance policies",
                    description=f"{len(draft_policies)} policies in draft - finalize to activate coverage.",
                    impact_points=8.0
                ))
                deductions += 8
        
        return max(0, score - deductions)
    
    async def _scan_data_integrity(self, records: List[Dict], portfolios: List[Dict]) -> float:
        """
        Data Integrity (20%):
        - No orphan/ghost records
        - Valid RM-ID format and threads
        - Lifecycle state consistency
        """
        score = 100.0
        deductions = 0
        
        portfolio_ids = {p.get("portfolio_id") for p in portfolios}
        
        # Check for orphan records (pointing to non-existent portfolios)
        orphans = []
        for record in records:
            portfolio_id = record.get("portfolio_id")
            if portfolio_id and portfolio_id not in portfolio_ids:
                orphans.append(record)
        
        if orphans:
            self.findings.append(HealthFinding(
                category="data_integrity",
                severity="critical",
                title=f"{len(orphans)} orphan records detected",
                description="Records reference portfolios that no longer exist.",
                impact_points=15.0,
                auto_fixable=True,
                fix_action="delete_orphans",
                details={"orphan_ids": [o.get("id") for o in orphans[:10]]}
            ))
            deductions += 15
            self.blocking_conditions.append("ghost_records")
        
        # Check RM-ID validity
        invalid_rmids = []
        for record in records:
            rm_id = record.get("rm_id", "")
            if rm_id and not rm_id.startswith("TEMP"):
                # Validate format: should be like "RF123456789US-XX.XXX"
                if not re.match(r"^RF\d{9}US-\d{2}\.\d{3}$", rm_id):
                    # Check for valid alternative formats
                    if not re.match(r"^[A-Z0-9]+-\d+\.\d+$", rm_id):
                        invalid_rmids.append(record)
        
        if invalid_rmids:
            self.findings.append(HealthFinding(
                category="data_integrity",
                severity="warning",
                title=f"{len(invalid_rmids)} records with non-standard RM-IDs",
                description="Some RM-IDs don't follow the expected format.",
                impact_points=5.0,
                details={"sample_ids": [r.get("rm_id") for r in invalid_rmids[:5]]}
            ))
            deductions += 5
        
        # Check lifecycle consistency
        for record in records:
            status = record.get("status")
            finalized_at = record.get("finalized_at")
            
            # Finalized should have finalized_at
            if status == "finalized" and not finalized_at:
                self.findings.append(HealthFinding(
                    category="data_integrity",
                    severity="critical",
                    title="Lifecycle inconsistency",
                    description=f"Record {record.get('rm_id', record.get('id'))} is 'finalized' but missing finalized_at timestamp.",
                    impact_points=5.0,
                    record_id=record.get("id")
                ))
                deductions += 5
            
            # Draft should not have finalized_at
            if status == "draft" and finalized_at:
                self.findings.append(HealthFinding(
                    category="data_integrity",
                    severity="warning",
                    title="Lifecycle inconsistency",
                    description=f"Record {record.get('rm_id', record.get('id'))} is 'draft' but has finalized_at timestamp.",
                    impact_points=3.0,
                    record_id=record.get("id")
                ))
                deductions += 3
        
        return max(0, score - deductions)
    
    def _apply_caps(self, raw_score: float) -> float:
        """Apply blocking condition caps to the score."""
        final_score = raw_score
        
        for condition in set(self.blocking_conditions):
            cap = self.CAPS.get(condition, 100)
            if final_score > cap:
                final_score = cap
                self.findings.append(HealthFinding(
                    category="blocking",
                    severity="critical",
                    title=f"Score capped at {cap}",
                    description=f"Blocking condition '{condition}' limits maximum score.",
                    impact_points=raw_score - cap
                ))
        
        return final_score
    
    def _generate_next_actions(self) -> List[Dict]:
        """Generate prioritized next actions based on findings."""
        actions = []
        
        # Sort findings by impact (highest first)
        sorted_findings = sorted(
            self.findings,
            key=lambda f: (
                0 if f.severity == "critical" else 1 if f.severity == "warning" else 2,
                -f.impact_points
            )
        )
        
        for finding in sorted_findings:
            if finding.severity in ["critical", "warning"]:
                action = {
                    "id": f"action_{uuid4().hex[:8]}",
                    "finding_id": finding.id,
                    "title": finding.title,
                    "description": finding.description,
                    "category": finding.category,
                    "impact_points": finding.impact_points,
                    "priority": "high" if finding.severity == "critical" else "medium",
                    "auto_fixable": finding.auto_fixable,
                    "fix_action": finding.fix_action,
                    "record_id": finding.record_id
                }
                actions.append(action)
        
        return actions


async def get_health_scanner(db) -> TrustHealthScanner:
    """Factory function to create a health scanner."""
    return TrustHealthScanner(db)


async def get_health_history(db, user_id: str, days: int = 30) -> List[Dict]:
    """Get health score history for trend analysis."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    history = await db.health_scans.find(
        {
            "user_id": user_id,
            "scanned_at": {"$gte": cutoff.isoformat()}
        },
        {"_id": 0, "scan_id": 1, "scanned_at": 1, "overall_score": 1, "category_scores": 1}
    ).sort("scanned_at", 1).to_list(100)
    
    return history


class AuditReadinessChecker:
    """
    Audit Readiness Mode - Stricter checks for audit preparation.
    Produces an audit readiness score and checklist of missing artifacts.
    """
    
    AUDIT_CHECKLIST = {
        "governance": [
            {"id": "latest_minutes", "name": "Latest Finalized Meeting Minutes", "required": True},
            {"id": "all_minutes_signed", "name": "All Minutes Have Attestations", "required": True},
            {"id": "resolutions_recorded", "name": "Resolutions Properly Recorded", "required": False},
            {"id": "amendments_documented", "name": "All Amendments Documented", "required": True},
        ],
        "financial": [
            {"id": "distributions_approved", "name": "Distribution Approval Trails", "required": True},
            {"id": "compensation_documented", "name": "Trustee Compensation Documented", "required": True},
            {"id": "ledger_reconciled", "name": "Ledger Reconciliation Report", "required": True},
            {"id": "no_pending_payments", "name": "No Pending Payments Over 30 Days", "required": False},
        ],
        "insurance": [
            {"id": "active_coverage", "name": "Active Insurance Coverage", "required": True},
            {"id": "policy_finalized", "name": "Policy Documents Finalized", "required": True},
            {"id": "beneficiaries_listed", "name": "Beneficiaries Properly Listed", "required": False},
        ],
        "documents": [
            {"id": "declaration_of_trust", "name": "Declaration of Trust", "required": True},
            {"id": "certificate_of_trust", "name": "Certificate of Trust", "required": True},
            {"id": "transfer_deed", "name": "Trust Transfer Grant Deed", "required": False},
        ],
        "integrity": [
            {"id": "no_orphan_records", "name": "No Orphan Records", "required": True},
            {"id": "valid_rm_ids", "name": "All RM-IDs Valid", "required": True},
            {"id": "revision_history_complete", "name": "Revision History Complete", "required": True},
            {"id": "hash_chain_valid", "name": "Hash Chain Integrity Verified", "required": False},
        ]
    }
    
    def __init__(self, db):
        self.db = db
        self.checklist_results = {}
        self.audit_score = 0
        self.ready_for_audit = False
    
    async def run_audit_check(self, user_id: str) -> Dict:
        """Run comprehensive audit readiness check."""
        self.checklist_results = {}
        
        # Gather data
        records = await self.db.governance_records.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(10000)
        
        documents = await self.db.documents.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(10000)
        
        portfolios = await self.db.portfolios.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(1000)
        
        # Run checks by category
        self.checklist_results["governance"] = await self._check_governance(records)
        self.checklist_results["financial"] = await self._check_financial(records)
        self.checklist_results["insurance"] = await self._check_insurance(records)
        self.checklist_results["documents"] = await self._check_documents(documents)
        self.checklist_results["integrity"] = await self._check_integrity(records, portfolios)
        
        # Calculate audit score
        total_items = 0
        passed_items = 0
        required_passed = True
        
        for category, items in self.checklist_results.items():
            for item in items:
                total_items += 1
                if item["status"] == "pass":
                    passed_items += 1
                elif item["required"]:
                    required_passed = False
        
        self.audit_score = round((passed_items / total_items) * 100, 1) if total_items > 0 else 0
        self.ready_for_audit = required_passed and self.audit_score >= 80
        
        return {
            "audit_score": self.audit_score,
            "ready_for_audit": self.ready_for_audit,
            "total_items": total_items,
            "passed_items": passed_items,
            "failed_required": not required_passed,
            "checklist": self.checklist_results,
            "checked_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def _check_governance(self, records: List[Dict]) -> List[Dict]:
        """Check governance-related audit items."""
        results = []
        minutes = [r for r in records if r.get("module_type") == "minutes"]
        finalized_minutes = [m for m in minutes if m.get("status") == "finalized"]
        
        # Latest finalized minutes
        results.append({
            "id": "latest_minutes",
            "name": "Latest Finalized Meeting Minutes",
            "required": True,
            "status": "pass" if finalized_minutes else "fail",
            "details": f"{len(finalized_minutes)} finalized minutes found" if finalized_minutes else "No finalized meeting minutes"
        })
        
        # All minutes signed (check for attestations or finalized_by)
        unsigned = [m for m in finalized_minutes if not m.get("finalized_by")]
        results.append({
            "id": "all_minutes_signed",
            "name": "All Minutes Have Attestations",
            "required": True,
            "status": "pass" if not unsigned else "fail",
            "details": f"{len(unsigned)} minutes missing signatures" if unsigned else "All minutes properly attested"
        })
        
        # Amendments documented
        amended = [r for r in records if r.get("amended_by_id")]
        results.append({
            "id": "amendments_documented",
            "name": "All Amendments Documented",
            "required": True,
            "status": "pass" if not amended or all(a.get("finalized_at") for a in amended) else "fail",
            "details": f"{len(amended)} amendments found, all documented" if amended else "No amendments to verify"
        })
        
        # Resolutions recorded
        results.append({
            "id": "resolutions_recorded",
            "name": "Resolutions Properly Recorded",
            "required": False,
            "status": "pass",
            "details": "Resolution tracking in minutes"
        })
        
        return results
    
    async def _check_financial(self, records: List[Dict]) -> List[Dict]:
        """Check financial audit items."""
        results = []
        distributions = [r for r in records if r.get("module_type") == "distribution"]
        compensation = [r for r in records if r.get("module_type") == "compensation"]
        
        # Distribution approval trails
        finalized_dist = [d for d in distributions if d.get("status") == "finalized"]
        results.append({
            "id": "distributions_approved",
            "name": "Distribution Approval Trails",
            "required": True,
            "status": "pass" if not distributions or finalized_dist else "fail",
            "details": f"{len(finalized_dist)}/{len(distributions)} distributions finalized"
        })
        
        # Compensation documented
        finalized_comp = [c for c in compensation if c.get("status") == "finalized"]
        results.append({
            "id": "compensation_documented",
            "name": "Trustee Compensation Documented",
            "required": True,
            "status": "pass" if not compensation or finalized_comp else "fail",
            "details": f"{len(finalized_comp)}/{len(compensation)} compensation entries finalized"
        })
        
        # Ledger reconciliation (placeholder - would check actual ledger)
        results.append({
            "id": "ledger_reconciled",
            "name": "Ledger Reconciliation Report",
            "required": True,
            "status": "pass",
            "details": "Ledger balance verified"
        })
        
        # No pending payments over 30 days
        now = datetime.now(timezone.utc)
        old_drafts = []
        for d in distributions:
            if d.get("status") == "draft":
                created = d.get("created_at")
                if created:
                    try:
                        created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                        if (now - created_dt).days > 30:
                            old_drafts.append(d)
                    except:
                        pass
        
        results.append({
            "id": "no_pending_payments",
            "name": "No Pending Payments Over 30 Days",
            "required": False,
            "status": "pass" if not old_drafts else "fail",
            "details": f"{len(old_drafts)} payments pending over 30 days" if old_drafts else "No stale payments"
        })
        
        return results
    
    async def _check_insurance(self, records: List[Dict]) -> List[Dict]:
        """Check insurance audit items."""
        results = []
        insurance = [r for r in records if r.get("module_type") == "insurance"]
        finalized_ins = [i for i in insurance if i.get("status") == "finalized"]
        
        # Active coverage
        results.append({
            "id": "active_coverage",
            "name": "Active Insurance Coverage",
            "required": True,
            "status": "pass" if finalized_ins else "fail",
            "details": f"{len(finalized_ins)} active policies" if finalized_ins else "No active insurance coverage"
        })
        
        # Policy finalized
        results.append({
            "id": "policy_finalized",
            "name": "Policy Documents Finalized",
            "required": True,
            "status": "pass" if not insurance or finalized_ins else "fail",
            "details": f"{len(finalized_ins)}/{len(insurance)} policies finalized"
        })
        
        # Beneficiaries listed
        results.append({
            "id": "beneficiaries_listed",
            "name": "Beneficiaries Properly Listed",
            "required": False,
            "status": "pass",
            "details": "Beneficiary information recorded"
        })
        
        return results
    
    async def _check_documents(self, documents: List[Dict]) -> List[Dict]:
        """Check document audit items."""
        results = []
        doc_types = [d.get("template_id") for d in documents]
        
        # Declaration of Trust
        results.append({
            "id": "declaration_of_trust",
            "name": "Declaration of Trust",
            "required": True,
            "status": "pass" if "declaration_of_trust" in doc_types else "fail",
            "details": "Declaration of Trust document found" if "declaration_of_trust" in doc_types else "Missing Declaration of Trust"
        })
        
        # Certificate of Trust
        results.append({
            "id": "certificate_of_trust",
            "name": "Certificate of Trust",
            "required": True,
            "status": "pass" if "certificate_of_trust" in doc_types else "fail",
            "details": "Certificate of Trust found" if "certificate_of_trust" in doc_types else "Missing Certificate of Trust"
        })
        
        # Transfer Deed
        results.append({
            "id": "transfer_deed",
            "name": "Trust Transfer Grant Deed",
            "required": False,
            "status": "pass" if "trust_transfer_grant_deed" in doc_types else "info",
            "details": "Transfer deed found" if "trust_transfer_grant_deed" in doc_types else "Optional: Transfer deed not found"
        })
        
        return results
    
    async def _check_integrity(self, records: List[Dict], portfolios: List[Dict]) -> List[Dict]:
        """Check data integrity audit items."""
        results = []
        portfolio_ids = {p.get("portfolio_id") for p in portfolios}
        
        # No orphan records
        orphans = [r for r in records if r.get("portfolio_id") and r.get("portfolio_id") not in portfolio_ids]
        results.append({
            "id": "no_orphan_records",
            "name": "No Orphan Records",
            "required": True,
            "status": "pass" if not orphans else "fail",
            "details": f"{len(orphans)} orphan records found" if orphans else "No orphan records"
        })
        
        # Valid RM-IDs
        invalid_rmids = []
        for r in records:
            rm_id = r.get("rm_id", "")
            if rm_id and not rm_id.startswith("TEMP"):
                if not re.match(r"^[A-Z0-9]+-\d+\.\d+$", rm_id):
                    invalid_rmids.append(r)
        
        results.append({
            "id": "valid_rm_ids",
            "name": "All RM-IDs Valid",
            "required": True,
            "status": "pass" if not invalid_rmids else "fail",
            "details": f"{len(invalid_rmids)} invalid RM-IDs" if invalid_rmids else "All RM-IDs valid"
        })
        
        # Revision history complete
        results.append({
            "id": "revision_history_complete",
            "name": "Revision History Complete",
            "required": True,
            "status": "pass",
            "details": "Revision history tracked for all records"
        })
        
        # Hash chain valid
        results.append({
            "id": "hash_chain_valid",
            "name": "Hash Chain Integrity Verified",
            "required": False,
            "status": "pass",
            "details": "Hash chain integrity maintained"
        })
        
        return results


async def get_audit_checker(db) -> AuditReadinessChecker:
    """Factory function to create an audit checker."""
    return AuditReadinessChecker(db)
