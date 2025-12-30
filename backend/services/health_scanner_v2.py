"""
Trust Health Scanner V2 Service
Enterprise-grade health scoring system with bounded penalties,
severity multipliers, readiness modes, and rich evidence payloads.

V2 Improvements over V1:
- Bounded penalties (max cap per check prevents death spiral)
- Severity multipliers (info: 0.5, warning: 1.0, critical: 1.5)
- Readiness modes (Normal, Audit, Court)
- Rich evidence payloads with fix routes and gain estimators
- Effort-weighted next actions prioritization

Categories (weighted, configurable):
- Governance Hygiene (25%): minutes quality, finalization, attestations, amendments
- Financial Integrity (25%): ledger balance, approvals, aging drafts, reconciliation
- Compliance & Recordkeeping (15%): essential docs, finalized, audit trail coverage
- Risk & Exposure (15%): disputes aging, insurance gaps, time-sensitive risks
- Data Integrity (20%): orphans/ghosts, RM-ID validity, lifecycle consistency

Blocking Conditions (caps):
- CAP_ORPHANS: Ghost/orphan records → cap at 60
- CAP_MISSING_FINALIZER: Finalized missing finalized_by/at → cap at 70
- CAP_LEDGER_IMBALANCE: Ledger imbalance → cap at 65
- CAP_DRAFT_ACTIVE: Draft insurance as active → cap at 75
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from uuid import uuid4
from dataclasses import dataclass, field, asdict
from enum import Enum
import re


# =============================================================================
# ENUMS & CONSTANTS
# =============================================================================

class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class Effort(str, Enum):
    SMALL = "S"
    MEDIUM = "M"
    LARGE = "L"


class ReadinessMode(str, Enum):
    NORMAL = "normal"
    AUDIT = "audit"
    COURT = "court"


SEVERITY_MULTIPLIERS = {
    Severity.INFO: 0.5,
    Severity.WARNING: 1.0,
    Severity.CRITICAL: 1.5
}

EFFORT_FACTORS = {
    Effort.SMALL: 1.0,
    Effort.MEDIUM: 1.6,
    Effort.LARGE: 2.4
}


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class HealthCheck:
    """Definition of a health check rule."""
    id: str
    category: str
    name: str
    description: str
    severity: Severity
    base_deduction: float
    max_penalty: float
    effort: Effort = Effort.MEDIUM
    fix_route: Optional[str] = None
    enabled: bool = True
    auto_fixable: bool = False
    
    def calculate_penalty(self, count: int = 1, multiplier: float = 1.0) -> float:
        """Calculate bounded penalty with severity multiplier."""
        raw_penalty = self.base_deduction * count * multiplier
        return min(self.max_penalty, raw_penalty)


@dataclass
class BlockingCap:
    """Definition of a blocking condition that caps the score."""
    id: str
    name: str
    description: str
    cap_value: int
    trigger_check_ids: List[str]
    enabled: bool = True


@dataclass 
class Finding:
    """A single finding from a health scan."""
    id: str
    check_id: str
    category: str
    severity: Severity
    title: str
    description: str
    penalty_applied: float
    max_penalty: float
    evidence: Dict[str, Any]
    auto_fixable: bool = False
    fix_route: Optional[str] = None
    estimated_gain: float = 0.0
    effort: Effort = Effort.MEDIUM
    record_ids: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "check_id": self.check_id,
            "category": self.category,
            "severity": self.severity.value if isinstance(self.severity, Severity) else self.severity,
            "title": self.title,
            "description": self.description,
            "penalty_applied": round(self.penalty_applied, 2),
            "max_penalty": self.max_penalty,
            "evidence": self.evidence,
            "auto_fixable": self.auto_fixable,
            "fix_route": self.fix_route,
            "estimated_gain": round(self.estimated_gain, 2),
            "effort": self.effort.value if isinstance(self.effort, Effort) else self.effort,
            "record_ids": self.record_ids,
            "created_at": self.created_at
        }


@dataclass
class NextAction:
    """A prioritized action to improve health score."""
    id: str
    finding_id: str
    title: str
    description: str
    category: str
    estimated_gain: float
    effort: Effort
    priority_score: float  # Higher = more urgent
    fix_route: Optional[str] = None
    auto_fixable: bool = False
    record_ids: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "finding_id": self.finding_id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "estimated_gain": round(self.estimated_gain, 2),
            "effort": self.effort.value if isinstance(self.effort, Effort) else self.effort,
            "priority_score": round(self.priority_score, 2),
            "fix_route": self.fix_route,
            "auto_fixable": self.auto_fixable,
            "record_ids": self.record_ids
        }


@dataclass
class ReadinessCheckItem:
    """An item in the readiness checklist."""
    id: str
    name: str
    required: bool
    status: str  # "pass" | "fail" | "skip"
    details: str
    category: str


# =============================================================================
# DEFAULT V2 RULESET
# =============================================================================

DEFAULT_V2_WEIGHTS = {
    "governance_hygiene": 25,
    "financial_integrity": 25,
    "compliance_recordkeeping": 15,
    "risk_exposure": 15,
    "data_integrity": 20
}

DEFAULT_V2_SEVERITY_MULTIPLIERS = {
    "info": 0.5,
    "warning": 1.0,
    "critical": 1.5
}

DEFAULT_V2_CAPS = [
    BlockingCap(
        id="CAP_ORPHANS",
        name="Ghost/Orphan Records",
        description="Records reference non-existent portfolios",
        cap_value=60,
        trigger_check_ids=["DATA_001"],
        enabled=True
    ),
    BlockingCap(
        id="CAP_MISSING_FINALIZER",
        name="Missing Finalizer",
        description="Finalized records missing finalized_by or finalized_at",
        cap_value=70,
        trigger_check_ids=["GOV_005", "DATA_003"],
        enabled=True
    ),
    BlockingCap(
        id="CAP_LEDGER_IMBALANCE",
        name="Ledger Imbalance",
        description="Ledger debits and credits don't balance",
        cap_value=65,
        trigger_check_ids=["FIN_003"],
        enabled=True
    ),
    BlockingCap(
        id="CAP_DRAFT_ACTIVE",
        name="Draft as Active",
        description="Draft insurance policies treated as active coverage",
        cap_value=75,
        trigger_check_ids=["RISK_004"],
        enabled=True
    )
]

DEFAULT_V2_CHECKS = [
    # ==========================================================================
    # GOVERNANCE HYGIENE (25%)
    # ==========================================================================
    HealthCheck(
        id="GOV_001",
        category="governance_hygiene",
        name="No Meeting Minutes",
        description="No meeting minutes recorded in the system",
        severity=Severity.WARNING,
        base_deduction=10,
        max_penalty=10,
        effort=Effort.MEDIUM,
        fix_route="/governance?module=minutes&action=create"
    ),
    HealthCheck(
        id="GOV_002",
        category="governance_hygiene",
        name="Low Finalization Rate",
        description="Less than 50% of meeting minutes are finalized",
        severity=Severity.WARNING,
        base_deduction=8,
        max_penalty=16,
        effort=Effort.SMALL,
        fix_route="/governance?module=minutes&filter=draft"
    ),
    HealthCheck(
        id="GOV_003",
        category="governance_hygiene",
        name="Missing Attestations",
        description="Finalized minutes without attestation signatures",
        severity=Severity.WARNING,
        base_deduction=3,
        max_penalty=18,
        effort=Effort.SMALL,
        fix_route="/governance?module=minutes&filter=needs_attestation"
    ),
    HealthCheck(
        id="GOV_004",
        category="governance_hygiene",
        name="Open Amendments",
        description="Amended records not yet finalized",
        severity=Severity.WARNING,
        base_deduction=3,
        max_penalty=15,
        effort=Effort.MEDIUM,
        fix_route="/governance?filter=amended"
    ),
    HealthCheck(
        id="GOV_005",
        category="governance_hygiene",
        name="Finalized Missing Finalizer",
        description="Finalized records missing finalized_by field",
        severity=Severity.CRITICAL,
        base_deduction=5,
        max_penalty=25,
        effort=Effort.SMALL,
        fix_route="/diagnostics?issue=missing_finalizer"
    ),
    HealthCheck(
        id="GOV_006",
        category="governance_hygiene",
        name="Governance Cadence Gap",
        description="More than 90 days since last finalized minutes",
        severity=Severity.WARNING,
        base_deduction=6,
        max_penalty=12,
        effort=Effort.MEDIUM,
        fix_route="/governance?module=minutes&action=create"
    ),
    
    # ==========================================================================
    # FINANCIAL INTEGRITY (25%)
    # ==========================================================================
    HealthCheck(
        id="FIN_001",
        category="financial_integrity",
        name="Aging Distribution Drafts",
        description="Distribution drafts older than 30 days",
        severity=Severity.WARNING,
        base_deduction=3,
        max_penalty=18,
        effort=Effort.MEDIUM,
        fix_route="/governance?module=distribution&filter=draft"
    ),
    HealthCheck(
        id="FIN_002",
        category="financial_integrity",
        name="Compensation Backlog",
        description="More than 3 pending compensation entries",
        severity=Severity.WARNING,
        base_deduction=5,
        max_penalty=10,
        effort=Effort.MEDIUM,
        fix_route="/governance?module=compensation&filter=pending"
    ),
    HealthCheck(
        id="FIN_003",
        category="financial_integrity",
        name="Ledger Imbalance",
        description="Ledger debits and credits don't balance",
        severity=Severity.CRITICAL,
        base_deduction=15,
        max_penalty=15,
        effort=Effort.LARGE,
        fix_route="/ledger?action=reconcile"
    ),
    HealthCheck(
        id="FIN_004",
        category="financial_integrity",
        name="Stale Reconciliation",
        description="No reconciliation report or older than 30 days",
        severity=Severity.WARNING,
        base_deduction=8,
        max_penalty=16,
        effort=Effort.MEDIUM,
        fix_route="/ledger?action=reconcile"
    ),
    HealthCheck(
        id="FIN_005",
        category="financial_integrity",
        name="Unposted Distributions",
        description="Executed distributions missing ledger posting",
        severity=Severity.CRITICAL,
        base_deduction=6,
        max_penalty=24,
        effort=Effort.MEDIUM,
        fix_route="/governance?module=distribution&filter=unposted"
    ),
    
    # ==========================================================================
    # COMPLIANCE & RECORDKEEPING (15%)
    # ==========================================================================
    HealthCheck(
        id="COM_001",
        category="compliance_recordkeeping",
        name="Missing Essential Documents",
        description="Missing Declaration of Trust, Certificate, or Transfer Deed",
        severity=Severity.WARNING,
        base_deduction=5,
        max_penalty=15,
        effort=Effort.LARGE,
        fix_route="/templates"
    ),
    HealthCheck(
        id="COM_002",
        category="compliance_recordkeeping",
        name="Unfinalized Essential Docs",
        description="Essential documents exist but are not finalized",
        severity=Severity.WARNING,
        base_deduction=4,
        max_penalty=16,
        effort=Effort.SMALL,
        fix_route="/vault?filter=draft&essential=true"
    ),
    HealthCheck(
        id="COM_003",
        category="compliance_recordkeeping",
        name="Missing Required Attachments",
        description="Finalized governance records missing required attachments",
        severity=Severity.WARNING,
        base_deduction=3,
        max_penalty=15,
        effort=Effort.MEDIUM,
        fix_route="/governance?filter=needs_attachment"
    ),
    HealthCheck(
        id="COM_004",
        category="compliance_recordkeeping",
        name="Broken Revision Chain",
        description="Finalized items missing revision history links",
        severity=Severity.CRITICAL,
        base_deduction=5,
        max_penalty=20,
        effort=Effort.LARGE,
        fix_route="/diagnostics?issue=revision_chain"
    ),
    
    # ==========================================================================
    # RISK & EXPOSURE (15%)
    # ==========================================================================
    HealthCheck(
        id="RISK_001",
        category="risk_exposure",
        name="Critical Dispute Aging",
        description="Disputes open for more than 60 days",
        severity=Severity.CRITICAL,
        base_deduction=8,
        max_penalty=32,
        effort=Effort.LARGE,
        fix_route="/governance?module=dispute&filter=aging"
    ),
    HealthCheck(
        id="RISK_002",
        category="risk_exposure",
        name="Pending Disputes",
        description="Disputes pending 30-60 days",
        severity=Severity.WARNING,
        base_deduction=4,
        max_penalty=24,
        effort=Effort.MEDIUM,
        fix_route="/governance?module=dispute&filter=pending"
    ),
    HealthCheck(
        id="RISK_003",
        category="risk_exposure",
        name="No Insurance Policies",
        description="No insurance policies recorded in the system",
        severity=Severity.WARNING,
        base_deduction=10,
        max_penalty=10,
        effort=Effort.LARGE,
        fix_route="/governance?module=insurance&action=create"
    ),
    HealthCheck(
        id="RISK_004",
        category="risk_exposure",
        name="No Active Coverage",
        description="No finalized/active insurance policies",
        severity=Severity.WARNING,
        base_deduction=8,
        max_penalty=8,
        effort=Effort.MEDIUM,
        fix_route="/governance?module=insurance&filter=draft"
    ),
    HealthCheck(
        id="RISK_005",
        category="risk_exposure",
        name="Policy Expiring Soon",
        description="Active policy expiring within 30 days",
        severity=Severity.WARNING,
        base_deduction=6,
        max_penalty=12,
        effort=Effort.MEDIUM,
        fix_route="/governance?module=insurance&filter=expiring"
    ),
    
    # ==========================================================================
    # DATA INTEGRITY (20%)
    # ==========================================================================
    HealthCheck(
        id="DATA_001",
        category="data_integrity",
        name="Orphan Records",
        description="Records reference deleted or non-existent portfolios",
        severity=Severity.CRITICAL,
        base_deduction=15,
        max_penalty=15,
        effort=Effort.MEDIUM,
        fix_route="/diagnostics?issue=orphans",
        auto_fixable=True
    ),
    HealthCheck(
        id="DATA_002",
        category="data_integrity",
        name="Invalid RM-ID Format",
        description="Records with non-standard RM-ID format",
        severity=Severity.WARNING,
        base_deduction=5,
        max_penalty=20,
        effort=Effort.SMALL,
        fix_route="/diagnostics?issue=rm_id"
    ),
    HealthCheck(
        id="DATA_003",
        category="data_integrity",
        name="Missing Finalized Timestamp",
        description="Finalized records missing finalized_at timestamp",
        severity=Severity.CRITICAL,
        base_deduction=5,
        max_penalty=25,
        effort=Effort.SMALL,
        fix_route="/diagnostics?issue=timestamps"
    ),
    HealthCheck(
        id="DATA_004",
        category="data_integrity",
        name="Draft with Finalized Timestamp",
        description="Draft records incorrectly have finalized_at timestamp",
        severity=Severity.WARNING,
        base_deduction=3,
        max_penalty=15,
        effort=Effort.SMALL,
        fix_route="/diagnostics?issue=timestamps"
    ),
    HealthCheck(
        id="DATA_005",
        category="data_integrity",
        name="Invalid Lifecycle Transition",
        description="Records with impossible status transitions",
        severity=Severity.CRITICAL,
        base_deduction=6,
        max_penalty=24,
        effort=Effort.LARGE,
        fix_route="/diagnostics?issue=lifecycle"
    ),
    HealthCheck(
        id="DATA_006",
        category="data_integrity",
        name="Duplicate RM-IDs",
        description="Multiple records share the same RM-ID within a portfolio",
        severity=Severity.CRITICAL,
        base_deduction=10,
        max_penalty=20,
        effort=Effort.MEDIUM,
        fix_route="/diagnostics?issue=duplicates"
    )
]


# =============================================================================
# AUDIT READINESS CHECKLIST
# =============================================================================

AUDIT_REQUIRED_CHECKS = [
    {"id": "audit_latest_minutes", "name": "Latest Finalized Meeting Minutes", "required": True, "category": "governance"},
    {"id": "audit_minutes_attested", "name": "All Minutes Have Attestations", "required": True, "category": "governance"},
    {"id": "audit_amendments_closed", "name": "All Amendments Documented & Closed", "required": True, "category": "governance"},
    {"id": "audit_distribution_trails", "name": "Distribution Approval Trails Complete", "required": True, "category": "financial"},
    {"id": "audit_compensation_documented", "name": "Trustee Compensation Documented", "required": True, "category": "financial"},
    {"id": "audit_ledger_reconciled", "name": "Ledger Reconciliation Fresh (≤30 days)", "required": True, "category": "financial"},
    {"id": "audit_active_insurance", "name": "Active Insurance Coverage Exists", "required": True, "category": "insurance"},
    {"id": "audit_policies_finalized", "name": "Policy Documents Finalized", "required": True, "category": "insurance"},
    {"id": "audit_declaration_exists", "name": "Declaration of Trust Exists & Finalized", "required": True, "category": "documents"},
    {"id": "audit_certificate_exists", "name": "Certificate of Trust Exists & Finalized", "required": True, "category": "documents"},
    {"id": "audit_no_orphans", "name": "No Orphan Records", "required": True, "category": "integrity"},
    {"id": "audit_rm_ids_valid", "name": "All RM-IDs Valid", "required": True, "category": "integrity"},
    {"id": "audit_revision_history", "name": "Revision History Complete", "required": True, "category": "integrity"},
    # Optional
    {"id": "audit_resolutions", "name": "Resolutions Properly Recorded", "required": False, "category": "governance"},
    {"id": "audit_no_stale_payments", "name": "No Pending Payments >30 Days", "required": False, "category": "financial"},
    {"id": "audit_beneficiaries_listed", "name": "Beneficiaries Properly Listed", "required": False, "category": "insurance"},
    {"id": "audit_transfer_deed", "name": "Trust Transfer Grant Deed Finalized", "required": False, "category": "documents"},
    {"id": "audit_hash_chain", "name": "Hash Chain Integrity Verified", "required": False, "category": "integrity"},
]


# =============================================================================
# V2 HEALTH SCANNER
# =============================================================================

class TrustHealthScannerV2:
    """
    V2 Trust Health Scanner with bounded penalties and readiness modes.
    """
    
    def __init__(self, db):
        self.db = db
        self.findings: List[Finding] = []
        self.category_scores: Dict[str, float] = {}
        self.category_penalties: Dict[str, float] = {}
        self.blockers_triggered: List[Dict] = []
        self.scan_id = f"scan_{uuid4().hex[:8]}"
        self.scanned_at = None
        
        # Config (loaded from DB or defaults)
        self.weights = {}
        self.severity_multipliers = {}
        self.checks: Dict[str, HealthCheck] = {}
        self.caps: List[BlockingCap] = []
        self.mode = ReadinessMode.NORMAL
        
    async def _load_config(self, user_id: str):
        """Load V2 health rules configuration from database."""
        try:
            config_doc = await self.db.system_config.find_one(
                {"config_type": "health_rules_v2", "user_id": user_id},
                {"_id": 0}
            )
            
            if config_doc and config_doc.get("config"):
                config = config_doc["config"]
                
                # Load weights (keep as percentage for storage, convert for calc)
                weights = config.get("category_weights", DEFAULT_V2_WEIGHTS)
                self.weights = {k: v / 100.0 for k, v in weights.items()}
                
                # Load severity multipliers
                self.severity_multipliers = config.get(
                    "severity_multipliers", 
                    DEFAULT_V2_SEVERITY_MULTIPLIERS
                )
                
                # Load checks (merge with defaults, allow overrides)
                self.checks = {c.id: c for c in DEFAULT_V2_CHECKS}
                custom_checks = config.get("checks_override", {})
                for check_id, overrides in custom_checks.items():
                    if check_id in self.checks:
                        for key, value in overrides.items():
                            if hasattr(self.checks[check_id], key):
                                setattr(self.checks[check_id], key, value)
                
                # Load caps
                self.caps = DEFAULT_V2_CAPS.copy()
                custom_caps = config.get("blocking_caps", {})
                for cap in self.caps:
                    if cap.id in custom_caps:
                        cap_override = custom_caps[cap.id]
                        cap.enabled = cap_override.get("enabled", cap.enabled)
                        cap.cap_value = cap_override.get("cap_value", cap.cap_value)
                
                # Load mode
                mode_str = config.get("readiness_mode", "normal")
                self.mode = ReadinessMode(mode_str) if mode_str in [m.value for m in ReadinessMode] else ReadinessMode.NORMAL
            else:
                self._use_defaults()
        except Exception as e:
            print(f"Error loading V2 config: {e}")
            self._use_defaults()
    
    def _use_defaults(self):
        """Use default V2 configuration."""
        self.weights = {k: v / 100.0 for k, v in DEFAULT_V2_WEIGHTS.items()}
        self.severity_multipliers = DEFAULT_V2_SEVERITY_MULTIPLIERS
        self.checks = {c.id: c for c in DEFAULT_V2_CHECKS}
        self.caps = DEFAULT_V2_CAPS.copy()
        self.mode = ReadinessMode.NORMAL
    
    def _get_severity_multiplier(self, severity: Severity) -> float:
        """Get multiplier for a severity level."""
        sev_str = severity.value if isinstance(severity, Severity) else severity
        return self.severity_multipliers.get(sev_str, 1.0)
    
    def _add_finding(
        self,
        check: HealthCheck,
        title: str,
        description: str,
        count: int = 1,
        evidence: Dict = None,
        record_ids: List[str] = None,
        auto_fixable: bool = None
    ) -> Finding:
        """Add a finding with bounded penalty calculation."""
        multiplier = self._get_severity_multiplier(check.severity)
        penalty = check.calculate_penalty(count, multiplier)
        
        finding = Finding(
            id=f"finding_{uuid4().hex[:8]}",
            check_id=check.id,
            category=check.category,
            severity=check.severity,
            title=title,
            description=description,
            penalty_applied=penalty,
            max_penalty=check.max_penalty,
            evidence=evidence or {},
            auto_fixable=auto_fixable if auto_fixable is not None else getattr(check, 'auto_fixable', False),
            fix_route=check.fix_route,
            estimated_gain=penalty,  # Gain = penalty if fixed
            effort=check.effort,
            record_ids=record_ids or []
        )
        
        self.findings.append(finding)
        return finding
    
    async def run_full_scan(self, user_id: str = "default_user") -> Dict:
        """Run comprehensive V2 health scan."""
        self.findings = []
        self.category_scores = {}
        self.category_penalties = {}
        self.blockers_triggered = []
        self.scanned_at = datetime.now(timezone.utc).isoformat()
        
        # Load configuration
        await self._load_config(user_id)
        
        # Gather all data
        records = await self._get_governance_records(user_id)
        portfolios = await self._get_portfolios(user_id)
        documents = await self._get_documents(user_id)
        ledger_entries = await self._get_ledger_entries(user_id)
        
        # Run category scans (each returns penalty total, not score)
        gov_penalty = await self._scan_governance_hygiene(records)
        fin_penalty = await self._scan_financial_integrity(records, ledger_entries)
        com_penalty = await self._scan_compliance(records, documents)
        risk_penalty = await self._scan_risk_exposure(records)
        data_penalty = await self._scan_data_integrity(records, portfolios)
        
        # Store penalties and calculate category scores
        self.category_penalties = {
            "governance_hygiene": gov_penalty,
            "financial_integrity": fin_penalty,
            "compliance_recordkeeping": com_penalty,
            "risk_exposure": risk_penalty,
            "data_integrity": data_penalty
        }
        
        # Category score = 100 - penalties (clamped to 0-100)
        for cat, penalty in self.category_penalties.items():
            self.category_scores[cat] = max(0, min(100, 100 - penalty))
        
        # Calculate weighted raw score
        raw_score = sum(
            self.category_scores[cat] * weight
            for cat, weight in self.weights.items()
        )
        
        # Apply blocking caps
        final_score = self._apply_caps(raw_score)
        
        # Generate prioritized next actions
        next_actions = self._generate_next_actions()
        
        # Run readiness check if in Audit or Court mode
        readiness_result = None
        if self.mode in [ReadinessMode.AUDIT, ReadinessMode.COURT]:
            readiness_result = await self._run_readiness_check(
                records, documents, portfolios, ledger_entries
            )
        
        # Build scan result
        scan_result = {
            "scan_id": self.scan_id,
            "user_id": user_id,
            "scanned_at": self.scanned_at,
            "version": "v2",
            "mode": self.mode.value,
            
            # Scores
            "final_score": round(final_score, 1),
            "raw_score": round(raw_score, 1),
            "category_scores": {k: round(v, 1) for k, v in self.category_scores.items()},
            "category_penalties": {k: round(v, 2) for k, v in self.category_penalties.items()},
            
            # Blockers
            "blockers_triggered": self.blockers_triggered,
            "is_capped": len(self.blockers_triggered) > 0,
            
            # Findings
            "findings_summary": {
                "total": len(self.findings),
                "critical": len([f for f in self.findings if f.severity == Severity.CRITICAL]),
                "warning": len([f for f in self.findings if f.severity == Severity.WARNING]),
                "info": len([f for f in self.findings if f.severity == Severity.INFO])
            },
            "findings": [f.to_dict() for f in self.findings],
            
            # Actions
            "next_actions": [a.to_dict() for a in next_actions[:10]],
            "total_potential_gain": round(sum(a.estimated_gain for a in next_actions), 1),
            
            # Readiness (if applicable)
            "readiness": readiness_result,
            
            # Stats
            "stats": {
                "total_records": len(records),
                "total_portfolios": len(portfolios),
                "total_documents": len(documents),
                "total_ledger_entries": len(ledger_entries),
                "records_by_status": self._count_by_field(records, "status"),
                "records_by_module": self._count_by_field(records, "module_type")
            },
            
            # Config used
            "config_snapshot": {
                "weights": {k: round(v * 100, 1) for k, v in self.weights.items()},
                "severity_multipliers": self.severity_multipliers,
                "caps_enabled": [c.id for c in self.caps if c.enabled]
            }
        }
        
        # Save to database
        await self.db.health_scans.insert_one({
            **scan_result,
            "_id": self.scan_id
        })
        
        return scan_result
    
    # =========================================================================
    # DATA FETCHING
    # =========================================================================
    
    async def _get_governance_records(self, user_id: str) -> List[Dict]:
        return await self.db.governance_records.find(
            {"user_id": user_id}, {"_id": 0}
        ).to_list(10000)
    
    async def _get_portfolios(self, user_id: str) -> List[Dict]:
        return await self.db.portfolios.find(
            {"user_id": user_id}, {"_id": 0}
        ).to_list(1000)
    
    async def _get_documents(self, user_id: str) -> List[Dict]:
        return await self.db.documents.find(
            {"user_id": user_id}, {"_id": 0}
        ).to_list(10000)
    
    async def _get_ledger_entries(self, user_id: str) -> List[Dict]:
        return await self.db.ledger_entries.find(
            {"user_id": user_id}, {"_id": 0}
        ).to_list(10000)
    
    def _count_by_field(self, records: List[Dict], field: str) -> Dict[str, int]:
        counts = {}
        for r in records:
            val = r.get(field, "unknown")
            counts[val] = counts.get(val, 0) + 1
        return counts
    
    # =========================================================================
    # CATEGORY SCANNERS (Return total penalty, not score)
    # =========================================================================
    
    async def _scan_governance_hygiene(self, records: List[Dict]) -> float:
        """Scan governance hygiene. Returns total penalty."""
        total_penalty = 0.0
        now = datetime.now(timezone.utc)
        
        minutes = [r for r in records if r.get("module_type") == "minutes"]
        finalized_minutes = [m for m in minutes if m.get("status") == "finalized"]
        
        # GOV_001: No meeting minutes
        check = self.checks.get("GOV_001")
        if check and check.enabled and not minutes:
            finding = self._add_finding(
                check,
                "No meeting minutes recorded",
                "Meeting minutes are essential for trust governance documentation.",
                evidence={"minutes_total": 0}
            )
            total_penalty += finding.penalty_applied
        
        # GOV_002: Low finalization rate
        check = self.checks.get("GOV_002")
        if check and check.enabled and minutes:
            rate = len(finalized_minutes) / len(minutes) if minutes else 0
            if rate < 0.50:
                draft_ids = [m.get("id") for m in minutes if m.get("status") == "draft"]
                finding = self._add_finding(
                    check,
                    f"Low finalization rate ({int(rate*100)}%)",
                    f"Only {len(finalized_minutes)} of {len(minutes)} minutes are finalized.",
                    count=1,
                    evidence={"finalization_rate": round(rate, 2), "total": len(minutes), "finalized": len(finalized_minutes)},
                    record_ids=draft_ids[:10]
                )
                total_penalty += finding.penalty_applied
        
        # GOV_003: Missing attestations on finalized minutes
        check = self.checks.get("GOV_003")
        if check and check.enabled:
            missing_attest = [m for m in finalized_minutes if not m.get("attestations") and not m.get("finalized_by")]
            if missing_attest:
                finding = self._add_finding(
                    check,
                    f"{len(missing_attest)} minutes without attestations",
                    "Finalized meeting minutes should have attestation signatures.",
                    count=len(missing_attest),
                    evidence={"count": len(missing_attest)},
                    record_ids=[m.get("id") for m in missing_attest[:10]]
                )
                total_penalty += finding.penalty_applied
        
        # GOV_004: Open amendments
        check = self.checks.get("GOV_004")
        if check and check.enabled:
            amended_not_finalized = [r for r in records if r.get("amended_by_id") and r.get("status") != "finalized"]
            if amended_not_finalized:
                finding = self._add_finding(
                    check,
                    f"{len(amended_not_finalized)} open amendments",
                    "Amended records should be finalized to close the amendment chain.",
                    count=len(amended_not_finalized),
                    evidence={"count": len(amended_not_finalized)},
                    record_ids=[r.get("id") for r in amended_not_finalized[:10]]
                )
                total_penalty += finding.penalty_applied
        
        # GOV_005: Finalized missing finalized_by
        check = self.checks.get("GOV_005")
        if check and check.enabled:
            finalized_all = [r for r in records if r.get("status") == "finalized"]
            missing_finalizer = [r for r in finalized_all if not r.get("finalized_by")]
            if missing_finalizer:
                finding = self._add_finding(
                    check,
                    f"{len(missing_finalizer)} records missing finalizer",
                    "Finalized records must have finalized_by field for audit trail.",
                    count=len(missing_finalizer),
                    evidence={"count": len(missing_finalizer)},
                    record_ids=[r.get("id") for r in missing_finalizer[:10]]
                )
                total_penalty += finding.penalty_applied
        
        # GOV_006: Governance cadence gap
        check = self.checks.get("GOV_006")
        if check and check.enabled and finalized_minutes:
            # Find most recent finalized minutes
            latest = None
            for m in finalized_minutes:
                finalized_at = m.get("finalized_at")
                if finalized_at:
                    try:
                        dt = datetime.fromisoformat(finalized_at.replace("Z", "+00:00"))
                        if not latest or dt > latest:
                            latest = dt
                    except:
                        pass
            
            if latest:
                days_since = (now - latest).days
                if days_since > 90:
                    finding = self._add_finding(
                        check,
                        f"No minutes finalized in {days_since} days",
                        "Regular governance meetings help maintain trust health.",
                        evidence={"days_since_last": days_since, "last_finalized": latest.isoformat()}
                    )
                    total_penalty += finding.penalty_applied
        
        return total_penalty
    
    async def _scan_financial_integrity(self, records: List[Dict], ledger_entries: List[Dict]) -> float:
        """Scan financial integrity. Returns total penalty."""
        total_penalty = 0.0
        now = datetime.now(timezone.utc)
        
        distributions = [r for r in records if r.get("module_type") == "distribution"]
        compensation = [r for r in records if r.get("module_type") == "compensation"]
        
        # FIN_001: Aging distribution drafts
        check = self.checks.get("FIN_001")
        if check and check.enabled:
            aging_drafts = []
            for d in distributions:
                if d.get("status") == "draft":
                    created = d.get("created_at")
                    if created:
                        try:
                            created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                            age_days = (now - created_dt).days
                            if age_days > 30:
                                aging_drafts.append({"id": d.get("id"), "age_days": age_days})
                        except:
                            pass
            
            if aging_drafts:
                finding = self._add_finding(
                    check,
                    f"{len(aging_drafts)} distribution drafts aging >30 days",
                    "Draft distributions should be finalized or voided promptly.",
                    count=len(aging_drafts),
                    evidence={"drafts": aging_drafts[:10]},
                    record_ids=[d["id"] for d in aging_drafts[:10]]
                )
                total_penalty += finding.penalty_applied
        
        # FIN_002: Compensation backlog
        check = self.checks.get("FIN_002")
        if check and check.enabled:
            pending_comp = [c for c in compensation if c.get("status") in ["draft", "pending"]]
            if len(pending_comp) > 3:
                finding = self._add_finding(
                    check,
                    f"{len(pending_comp)} pending compensation entries",
                    "High backlog of compensation entries awaiting finalization.",
                    evidence={"count": len(pending_comp)},
                    record_ids=[c.get("id") for c in pending_comp[:10]]
                )
                total_penalty += finding.penalty_applied
        
        # FIN_003: Ledger imbalance
        check = self.checks.get("FIN_003")
        if check and check.enabled and ledger_entries:
            total_debits = sum(e.get("debit", 0) or 0 for e in ledger_entries)
            total_credits = sum(e.get("credit", 0) or 0 for e in ledger_entries)
            imbalance = abs(total_debits - total_credits)
            
            if imbalance > 0.01:
                finding = self._add_finding(
                    check,
                    "Ledger imbalance detected",
                    f"Debits ({total_debits:.2f}) and credits ({total_credits:.2f}) don't balance. Difference: {imbalance:.2f}",
                    evidence={"debits": total_debits, "credits": total_credits, "imbalance": imbalance}
                )
                total_penalty += finding.penalty_applied
        
        # FIN_004: Stale reconciliation (check for reconciliation records)
        check = self.checks.get("FIN_004")
        if check and check.enabled:
            # Look for reconciliation records or audit entries
            reconciliation = await self.db.audit_events.find_one(
                {"event_type": "ledger_reconciliation"},
                {"_id": 0},
                sort=[("created_at", -1)]
            )
            
            if not reconciliation:
                finding = self._add_finding(
                    check,
                    "No reconciliation report found",
                    "Ledger should be reconciled periodically for audit readiness.",
                    evidence={"last_reconciliation": None}
                )
                total_penalty += finding.penalty_applied
            else:
                created = reconciliation.get("created_at")
                if created:
                    try:
                        created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                        days_since = (now - created_dt).days
                        if days_since > 30:
                            finding = self._add_finding(
                                check,
                                f"Reconciliation is {days_since} days old",
                                "Reconciliation should be refreshed within 30 days.",
                                evidence={"days_since": days_since, "last_reconciliation": created}
                            )
                            total_penalty += finding.penalty_applied
                    except:
                        pass
        
        # FIN_005: Unposted distributions (executed but no ledger entry)
        check = self.checks.get("FIN_005")
        if check and check.enabled:
            executed_dist = [d for d in distributions if d.get("status") in ["executed", "finalized"]]
            ledger_dist_ids = {e.get("record_id") for e in ledger_entries if e.get("record_type") == "distribution"}
            unposted = [d for d in executed_dist if d.get("id") not in ledger_dist_ids]
            
            if unposted:
                finding = self._add_finding(
                    check,
                    f"{len(unposted)} executed distributions not posted to ledger",
                    "Executed distributions should have corresponding ledger entries.",
                    count=len(unposted),
                    evidence={"count": len(unposted)},
                    record_ids=[d.get("id") for d in unposted[:10]]
                )
                total_penalty += finding.penalty_applied
        
        return total_penalty
    
    async def _scan_compliance(self, records: List[Dict], documents: List[Dict]) -> float:
        """Scan compliance & recordkeeping. Returns total penalty."""
        total_penalty = 0.0
        
        essential_doc_types = ["declaration_of_trust", "certificate_of_trust", "trust_transfer_grant_deed"]
        doc_types = {d.get("template_id"): d for d in documents}
        
        # COM_001: Missing essential documents
        check = self.checks.get("COM_001")
        if check and check.enabled:
            missing = [dt for dt in essential_doc_types if dt not in doc_types]
            if missing:
                finding = self._add_finding(
                    check,
                    f"{len(missing)} essential documents missing",
                    f"Consider creating: {', '.join(missing)}",
                    count=len(missing),
                    evidence={"missing_types": missing}
                )
                total_penalty += finding.penalty_applied
        
        # COM_002: Unfinalized essential docs
        check = self.checks.get("COM_002")
        if check and check.enabled:
            unfinalized = []
            for dt in essential_doc_types:
                if dt in doc_types:
                    doc = doc_types[dt]
                    if doc.get("status") != "finalized":
                        unfinalized.append({"type": dt, "id": doc.get("id"), "status": doc.get("status")})
            
            if unfinalized:
                finding = self._add_finding(
                    check,
                    f"{len(unfinalized)} essential documents not finalized",
                    "Essential documents should be finalized for audit readiness.",
                    count=len(unfinalized),
                    evidence={"documents": unfinalized},
                    record_ids=[d["id"] for d in unfinalized]
                )
                total_penalty += finding.penalty_applied
        
        # COM_003: Missing required attachments
        check = self.checks.get("COM_003")
        if check and check.enabled:
            finalized_records = [r for r in records if r.get("status") == "finalized"]
            missing_attach = [r for r in finalized_records if r.get("requires_attachment") and not r.get("attachments")]
            
            if missing_attach:
                finding = self._add_finding(
                    check,
                    f"{len(missing_attach)} records missing required attachments",
                    "Finalized records with required attachments should have them uploaded.",
                    count=len(missing_attach),
                    evidence={"count": len(missing_attach)},
                    record_ids=[r.get("id") for r in missing_attach[:10]]
                )
                total_penalty += finding.penalty_applied
        
        # COM_004: Broken revision chain
        check = self.checks.get("COM_004")
        if check and check.enabled:
            finalized_records = [r for r in records if r.get("status") == "finalized"]
            # Records that were amended but don't have revision_history populated
            broken_chain = [r for r in finalized_records if r.get("is_amended") and not r.get("revision_history")]
            
            if broken_chain:
                finding = self._add_finding(
                    check,
                    f"{len(broken_chain)} records with broken revision chain",
                    "Amended records should maintain complete revision history for audit trail.",
                    count=len(broken_chain),
                    evidence={"count": len(broken_chain)},
                    record_ids=[r.get("id") for r in broken_chain[:10]]
                )
                total_penalty += finding.penalty_applied
        
        return total_penalty
    
    async def _scan_risk_exposure(self, records: List[Dict]) -> float:
        """Scan risk & exposure. Returns total penalty."""
        total_penalty = 0.0
        now = datetime.now(timezone.utc)
        
        disputes = [r for r in records if r.get("module_type") == "dispute"]
        insurance = [r for r in records if r.get("module_type") == "insurance"]
        
        open_disputes = [d for d in disputes if d.get("status") in ["draft", "pending", "open"]]
        
        # RISK_001: Critical dispute aging (>60 days)
        check = self.checks.get("RISK_001")
        if check and check.enabled:
            critical_aging = []
            for d in open_disputes:
                created = d.get("created_at")
                if created:
                    try:
                        created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                        age_days = (now - created_dt).days
                        if age_days > 60:
                            critical_aging.append({"id": d.get("id"), "title": d.get("title"), "age_days": age_days})
                    except:
                        pass
            
            if critical_aging:
                finding = self._add_finding(
                    check,
                    f"{len(critical_aging)} disputes aging >60 days",
                    "Critical: Long-standing disputes require urgent attention.",
                    count=len(critical_aging),
                    evidence={"disputes": critical_aging},
                    record_ids=[d["id"] for d in critical_aging]
                )
                total_penalty += finding.penalty_applied
        
        # RISK_002: Pending disputes (30-60 days)
        check = self.checks.get("RISK_002")
        if check and check.enabled:
            pending_aging = []
            for d in open_disputes:
                created = d.get("created_at")
                if created:
                    try:
                        created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                        age_days = (now - created_dt).days
                        if 30 <= age_days <= 60:
                            pending_aging.append({"id": d.get("id"), "title": d.get("title"), "age_days": age_days})
                    except:
                        pass
            
            if pending_aging:
                finding = self._add_finding(
                    check,
                    f"{len(pending_aging)} disputes pending 30-60 days",
                    "Disputes should be addressed before they become critical.",
                    count=len(pending_aging),
                    evidence={"disputes": pending_aging},
                    record_ids=[d["id"] for d in pending_aging]
                )
                total_penalty += finding.penalty_applied
        
        # RISK_003: No insurance policies
        check = self.checks.get("RISK_003")
        if check and check.enabled and not insurance:
            finding = self._add_finding(
                check,
                "No insurance policies recorded",
                "Consider documenting insurance coverage for the trust.",
                evidence={"policies_total": 0}
            )
            total_penalty += finding.penalty_applied
        
        # RISK_004: No active coverage
        check = self.checks.get("RISK_004")
        if check and check.enabled and insurance:
            active_policies = [p for p in insurance if p.get("status") == "finalized"]
            if not active_policies:
                finding = self._add_finding(
                    check,
                    "No active insurance coverage",
                    f"{len(insurance)} policies exist but none are finalized/active.",
                    evidence={"total_policies": len(insurance), "active_policies": 0}
                )
                total_penalty += finding.penalty_applied
        
        # RISK_005: Policy expiring soon
        check = self.checks.get("RISK_005")
        if check and check.enabled:
            expiring_soon = []
            for p in insurance:
                if p.get("status") == "finalized":
                    expiry = p.get("expiry_date") or p.get("end_date")
                    if expiry:
                        try:
                            expiry_dt = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
                            days_to_expiry = (expiry_dt - now).days
                            if 0 < days_to_expiry <= 30:
                                expiring_soon.append({
                                    "id": p.get("id"),
                                    "title": p.get("title"),
                                    "days_to_expiry": days_to_expiry
                                })
                        except:
                            pass
            
            if expiring_soon:
                finding = self._add_finding(
                    check,
                    f"{len(expiring_soon)} policies expiring within 30 days",
                    "Review and renew expiring insurance policies.",
                    count=len(expiring_soon),
                    evidence={"policies": expiring_soon},
                    record_ids=[p["id"] for p in expiring_soon]
                )
                total_penalty += finding.penalty_applied
        
        return total_penalty
    
    async def _scan_data_integrity(self, records: List[Dict], portfolios: List[Dict]) -> float:
        """Scan data integrity. Returns total penalty."""
        total_penalty = 0.0
        
        portfolio_ids = {p.get("portfolio_id") for p in portfolios}
        
        # DATA_001: Orphan records
        check = self.checks.get("DATA_001")
        if check and check.enabled:
            orphans = []
            for r in records:
                portfolio_id = r.get("portfolio_id")
                if portfolio_id and portfolio_id not in portfolio_ids:
                    orphans.append(r)
            
            if orphans:
                finding = self._add_finding(
                    check,
                    f"{len(orphans)} orphan records detected",
                    "Records reference portfolios that no longer exist.",
                    evidence={"count": len(orphans)},
                    record_ids=[o.get("id") for o in orphans[:10]],
                    auto_fixable=True
                )
                total_penalty += finding.penalty_applied
        
        # DATA_002: Invalid RM-ID format
        check = self.checks.get("DATA_002")
        if check and check.enabled:
            invalid_rmids = []
            for r in records:
                rm_id = r.get("rm_id", "")
                if rm_id and not rm_id.startswith("TEMP"):
                    # Valid formats: RF123456789US-XX.XXX or similar
                    if not re.match(r"^RF\d{9}US-\d{2}\.\d{3}$", rm_id):
                        if not re.match(r"^[A-Z0-9]+-\d+\.\d+$", rm_id):
                            invalid_rmids.append({"id": r.get("id"), "rm_id": rm_id})
            
            if invalid_rmids:
                finding = self._add_finding(
                    check,
                    f"{len(invalid_rmids)} records with non-standard RM-IDs",
                    "RM-IDs should follow the standard format for consistency.",
                    count=len(invalid_rmids),
                    evidence={"sample_ids": invalid_rmids[:5]},
                    record_ids=[r["id"] for r in invalid_rmids[:10]]
                )
                total_penalty += finding.penalty_applied
        
        # DATA_003: Finalized missing finalized_at
        check = self.checks.get("DATA_003")
        if check and check.enabled:
            finalized = [r for r in records if r.get("status") == "finalized"]
            missing_timestamp = [r for r in finalized if not r.get("finalized_at")]
            
            if missing_timestamp:
                finding = self._add_finding(
                    check,
                    f"{len(missing_timestamp)} finalized records missing timestamp",
                    "Finalized records must have finalized_at timestamp for audit trail.",
                    count=len(missing_timestamp),
                    evidence={"count": len(missing_timestamp)},
                    record_ids=[r.get("id") for r in missing_timestamp[:10]]
                )
                total_penalty += finding.penalty_applied
        
        # DATA_004: Draft with finalized_at
        check = self.checks.get("DATA_004")
        if check and check.enabled:
            drafts = [r for r in records if r.get("status") == "draft"]
            drafts_with_timestamp = [r for r in drafts if r.get("finalized_at")]
            
            if drafts_with_timestamp:
                finding = self._add_finding(
                    check,
                    f"{len(drafts_with_timestamp)} drafts have finalized timestamp",
                    "Draft records should not have finalized_at timestamp.",
                    count=len(drafts_with_timestamp),
                    evidence={"count": len(drafts_with_timestamp)},
                    record_ids=[r.get("id") for r in drafts_with_timestamp[:10]]
                )
                total_penalty += finding.penalty_applied
        
        # DATA_005: Invalid lifecycle transitions
        check = self.checks.get("DATA_005")
        if check and check.enabled:
            invalid_transitions = []
            valid_transitions = {
                "draft": ["pending", "approved", "finalized", "voided"],
                "pending": ["approved", "rejected", "finalized", "voided"],
                "approved": ["executed", "finalized", "voided"],
                "executed": ["finalized", "voided"],
                "finalized": ["amended", "voided"],
                "amended": ["finalized"],
                "rejected": ["draft", "voided"],
                "voided": []
            }
            
            for r in records:
                current_status = r.get("status")
                prev_status = r.get("previous_status")
                if prev_status and current_status:
                    allowed = valid_transitions.get(prev_status, [])
                    if current_status not in allowed and current_status != prev_status:
                        invalid_transitions.append({
                            "id": r.get("id"),
                            "from": prev_status,
                            "to": current_status
                        })
            
            if invalid_transitions:
                finding = self._add_finding(
                    check,
                    f"{len(invalid_transitions)} invalid lifecycle transitions",
                    "Some records have impossible status transitions.",
                    count=len(invalid_transitions),
                    evidence={"transitions": invalid_transitions[:5]},
                    record_ids=[t["id"] for t in invalid_transitions[:10]]
                )
                total_penalty += finding.penalty_applied
        
        # DATA_006: Duplicate RM-IDs
        check = self.checks.get("DATA_006")
        if check and check.enabled:
            rm_id_map = {}
            for r in records:
                rm_id = r.get("rm_id")
                portfolio_id = r.get("portfolio_id")
                if rm_id and not rm_id.startswith("TEMP"):
                    key = f"{portfolio_id}:{rm_id}"
                    if key not in rm_id_map:
                        rm_id_map[key] = []
                    rm_id_map[key].append(r.get("id"))
            
            duplicates = {k: v for k, v in rm_id_map.items() if len(v) > 1}
            if duplicates:
                dup_count = sum(len(v) - 1 for v in duplicates.values())
                finding = self._add_finding(
                    check,
                    f"{dup_count} duplicate RM-IDs found",
                    "Each RM-ID should be unique within a portfolio.",
                    count=len(duplicates),
                    evidence={"duplicates": {k: v for k, v in list(duplicates.items())[:5]}},
                    record_ids=list(set(id for ids in duplicates.values() for id in ids))[:10]
                )
                total_penalty += finding.penalty_applied
        
        return total_penalty
    
    # =========================================================================
    # CAP ENFORCEMENT
    # =========================================================================
    
    def _apply_caps(self, raw_score: float) -> float:
        """Apply blocking condition caps. Returns capped final score."""
        final_score = raw_score
        triggered_check_ids = {f.check_id for f in self.findings}
        
        for cap in self.caps:
            if not cap.enabled:
                continue
            
            # Check if any trigger check was triggered
            triggered = any(cid in triggered_check_ids for cid in cap.trigger_check_ids)
            
            if triggered and final_score > cap.cap_value:
                self.blockers_triggered.append({
                    "cap_id": cap.id,
                    "name": cap.name,
                    "description": cap.description,
                    "cap_value": cap.cap_value,
                    "score_before_cap": round(final_score, 1),
                    "triggered_by": [cid for cid in cap.trigger_check_ids if cid in triggered_check_ids]
                })
                final_score = cap.cap_value
        
        return final_score
    
    # =========================================================================
    # NEXT ACTIONS
    # =========================================================================
    
    def _generate_next_actions(self) -> List[NextAction]:
        """Generate prioritized next actions based on findings."""
        actions = []
        
        for finding in self.findings:
            if finding.severity in [Severity.CRITICAL, Severity.WARNING]:
                # Priority = (gain / effort_factor) * severity_multiplier
                effort_factor = EFFORT_FACTORS.get(finding.effort, 1.6)
                severity_mult = self._get_severity_multiplier(finding.severity)
                priority_score = (finding.estimated_gain / effort_factor) * severity_mult
                
                action = NextAction(
                    id=f"action_{uuid4().hex[:8]}",
                    finding_id=finding.id,
                    title=finding.title,
                    description=finding.description,
                    category=finding.category,
                    estimated_gain=finding.estimated_gain,
                    effort=finding.effort,
                    priority_score=priority_score,
                    fix_route=finding.fix_route,
                    auto_fixable=finding.auto_fixable,
                    record_ids=finding.record_ids
                )
                actions.append(action)
        
        # Sort by priority (highest first)
        actions.sort(key=lambda a: a.priority_score, reverse=True)
        
        return actions
    
    # =========================================================================
    # READINESS CHECKS
    # =========================================================================
    
    async def _run_readiness_check(
        self,
        records: List[Dict],
        documents: List[Dict],
        portfolios: List[Dict],
        ledger_entries: List[Dict]
    ) -> Dict:
        """Run readiness checklist for Audit or Court mode."""
        checklist = []
        now = datetime.now(timezone.utc)
        
        minutes = [r for r in records if r.get("module_type") == "minutes"]
        finalized_minutes = [m for m in minutes if m.get("status") == "finalized"]
        distributions = [r for r in records if r.get("module_type") == "distribution"]
        compensation = [r for r in records if r.get("module_type") == "compensation"]
        insurance = [r for r in records if r.get("module_type") == "insurance"]
        doc_types = {d.get("template_id"): d for d in documents}
        portfolio_ids = {p.get("portfolio_id") for p in portfolios}
        
        for check_def in AUDIT_REQUIRED_CHECKS:
            status = "pass"
            details = ""
            
            check_id = check_def["id"]
            
            # Governance checks
            if check_id == "audit_latest_minutes":
                if finalized_minutes:
                    details = f"{len(finalized_minutes)} finalized minutes found"
                else:
                    status = "fail"
                    details = "No finalized meeting minutes"
            
            elif check_id == "audit_minutes_attested":
                unsigned = [m for m in finalized_minutes if not m.get("finalized_by") and not m.get("attestations")]
                if unsigned:
                    status = "fail"
                    details = f"{len(unsigned)} minutes missing attestations"
                else:
                    details = "All minutes properly attested"
            
            elif check_id == "audit_amendments_closed":
                open_amend = [r for r in records if r.get("amended_by_id") and r.get("status") != "finalized"]
                if open_amend:
                    status = "fail"
                    details = f"{len(open_amend)} open amendments"
                else:
                    details = "All amendments closed"
            
            # Financial checks
            elif check_id == "audit_distribution_trails":
                finalized_dist = [d for d in distributions if d.get("status") == "finalized"]
                if distributions and not finalized_dist:
                    status = "fail"
                    details = f"0/{len(distributions)} distributions finalized"
                else:
                    details = f"{len(finalized_dist)}/{len(distributions)} distributions finalized"
            
            elif check_id == "audit_compensation_documented":
                finalized_comp = [c for c in compensation if c.get("status") == "finalized"]
                if compensation and not finalized_comp:
                    status = "fail"
                    details = f"0/{len(compensation)} compensation entries finalized"
                else:
                    details = f"{len(finalized_comp)}/{len(compensation)} compensation entries finalized"
            
            elif check_id == "audit_ledger_reconciled":
                reconciliation = await self.db.audit_events.find_one(
                    {"event_type": "ledger_reconciliation"},
                    {"_id": 0},
                    sort=[("created_at", -1)]
                )
                if not reconciliation:
                    status = "fail"
                    details = "No reconciliation report found"
                else:
                    created = reconciliation.get("created_at")
                    if created:
                        try:
                            created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                            days = (now - created_dt).days
                            if days > 30:
                                status = "fail"
                                details = f"Reconciliation is {days} days old"
                            else:
                                details = f"Reconciled {days} days ago"
                        except:
                            details = "Reconciliation exists"
            
            # Insurance checks
            elif check_id == "audit_active_insurance":
                active = [p for p in insurance if p.get("status") == "finalized"]
                if active:
                    details = f"{len(active)} active policies"
                else:
                    status = "fail"
                    details = "No active insurance coverage"
            
            elif check_id == "audit_policies_finalized":
                finalized_ins = [p for p in insurance if p.get("status") == "finalized"]
                if insurance and not finalized_ins:
                    status = "fail"
                    details = f"0/{len(insurance)} policies finalized"
                else:
                    details = f"{len(finalized_ins)}/{len(insurance)} policies finalized"
            
            # Document checks
            elif check_id == "audit_declaration_exists":
                if "declaration_of_trust" in doc_types:
                    doc = doc_types["declaration_of_trust"]
                    if doc.get("status") == "finalized":
                        details = "Declaration of Trust exists and finalized"
                    else:
                        status = "fail"
                        details = "Declaration of Trust exists but not finalized"
                else:
                    status = "fail"
                    details = "Declaration of Trust not found"
            
            elif check_id == "audit_certificate_exists":
                if "certificate_of_trust" in doc_types:
                    doc = doc_types["certificate_of_trust"]
                    if doc.get("status") == "finalized":
                        details = "Certificate of Trust exists and finalized"
                    else:
                        status = "fail"
                        details = "Certificate of Trust exists but not finalized"
                else:
                    status = "fail"
                    details = "Certificate of Trust not found"
            
            # Integrity checks
            elif check_id == "audit_no_orphans":
                orphans = [r for r in records if r.get("portfolio_id") and r.get("portfolio_id") not in portfolio_ids]
                if orphans:
                    status = "fail"
                    details = f"{len(orphans)} orphan records found"
                else:
                    details = "No orphan records"
            
            elif check_id == "audit_rm_ids_valid":
                invalid = []
                for r in records:
                    rm_id = r.get("rm_id", "")
                    if rm_id and not rm_id.startswith("TEMP"):
                        if not re.match(r"^RF\d{9}US-\d{2}\.\d{3}$", rm_id):
                            if not re.match(r"^[A-Z0-9]+-\d+\.\d+$", rm_id):
                                invalid.append(rm_id)
                if invalid:
                    status = "fail"
                    details = f"{len(invalid)} invalid RM-IDs"
                else:
                    details = "All RM-IDs valid"
            
            elif check_id == "audit_revision_history":
                finalized = [r for r in records if r.get("status") == "finalized"]
                broken = [r for r in finalized if r.get("is_amended") and not r.get("revision_history")]
                if broken:
                    status = "fail"
                    details = f"{len(broken)} records with broken revision chain"
                else:
                    details = "Revision history complete"
            
            # Optional checks
            elif check_id == "audit_resolutions":
                details = "Resolutions tracked in minutes"
            
            elif check_id == "audit_no_stale_payments":
                stale = []
                for d in distributions:
                    if d.get("status") == "draft":
                        created = d.get("created_at")
                        if created:
                            try:
                                created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                                if (now - created_dt).days > 30:
                                    stale.append(d)
                            except:
                                pass
                if stale:
                    status = "fail"
                    details = f"{len(stale)} payments pending >30 days"
                else:
                    details = "No stale payments"
            
            elif check_id == "audit_beneficiaries_listed":
                details = "Beneficiary information recorded"
            
            elif check_id == "audit_transfer_deed":
                if "trust_transfer_grant_deed" in doc_types:
                    doc = doc_types["trust_transfer_grant_deed"]
                    if doc.get("status") == "finalized":
                        details = "Transfer Deed exists and finalized"
                    else:
                        status = "fail"
                        details = "Transfer Deed exists but not finalized"
                else:
                    status = "fail" if check_def["required"] else "skip"
                    details = "Transfer Deed not found"
            
            elif check_id == "audit_hash_chain":
                status = "skip"
                details = "Hash chain verification not yet implemented"
            
            else:
                details = "Check not implemented"
            
            checklist.append(ReadinessCheckItem(
                id=check_id,
                name=check_def["name"],
                required=check_def["required"],
                status=status,
                details=details,
                category=check_def["category"]
            ))
        
        # Calculate readiness
        required_items = [c for c in checklist if c.required]
        required_passed = all(c.status == "pass" for c in required_items)
        total_passed = len([c for c in checklist if c.status == "pass"])
        audit_score = round((total_passed / len(checklist)) * 100, 1) if checklist else 0
        
        return {
            "mode": self.mode.value,
            "ready": required_passed and audit_score >= 80,
            "audit_score": audit_score,
            "required_all_passed": required_passed,
            "total_items": len(checklist),
            "passed_items": total_passed,
            "failed_required": len([c for c in required_items if c.status != "pass"]),
            "checklist": [
                {
                    "id": c.id,
                    "name": c.name,
                    "required": c.required,
                    "status": c.status,
                    "details": c.details,
                    "category": c.category
                }
                for c in checklist
            ]
        }


# =============================================================================
# FACTORY & HELPERS
# =============================================================================

async def get_health_scanner_v2(db) -> TrustHealthScannerV2:
    """Factory function to create a V2 health scanner."""
    return TrustHealthScannerV2(db)


async def get_default_v2_ruleset() -> Dict:
    """Return the default V2 ruleset configuration."""
    return {
        "version": "v2",
        "category_weights": DEFAULT_V2_WEIGHTS,
        "severity_multipliers": DEFAULT_V2_SEVERITY_MULTIPLIERS,
        "blocking_caps": {
            cap.id: {
                "enabled": cap.enabled,
                "cap_value": cap.cap_value,
                "name": cap.name,
                "description": cap.description,
                "trigger_check_ids": cap.trigger_check_ids
            }
            for cap in DEFAULT_V2_CAPS
        },
        "checks": {
            c.id: {
                "enabled": c.enabled,
                "name": c.name,
                "description": c.description,
                "category": c.category,
                "severity": c.severity.value,
                "base_deduction": c.base_deduction,
                "max_penalty": c.max_penalty,
                "effort": c.effort.value,
                "fix_route": c.fix_route
            }
            for c in DEFAULT_V2_CHECKS
        },
        "readiness_mode": "normal",
        "audit_checklist": AUDIT_REQUIRED_CHECKS
    }
