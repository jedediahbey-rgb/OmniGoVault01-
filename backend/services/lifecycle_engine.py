"""
Record Lifecycle Engine - Central State Machine for Governance Records

Canonical Status Flow:
  Draft → Pending Approval → Approved → Executed/Paid → Finalized → Amended (new revision)

Rules:
1. Status transitions must follow defined paths
2. Each module type can skip certain states (e.g., Minutes: Draft → Finalized)
3. "Active" status for Insurance is DERIVED from lifecycle + effective dates
4. Finalization requires all mandatory fields to be present
5. All transitions create audit events
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from pydantic import BaseModel


# ============ LIFECYCLE STATUS ENUM ============

class LifecycleStatus(str, Enum):
    """Full lifecycle statuses for governance records"""
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    EXECUTED = "executed"  # For distributions/compensation (paid)
    FINALIZED = "finalized"
    AMENDED = "amended"  # Record has been superseded by amendment
    VOIDED = "voided"  # Soft deleted


class OperationalStatus(str, Enum):
    """Operational status (module-specific, derived from lifecycle + dates)"""
    # Insurance
    PENDING = "pending"
    ACTIVE = "active"
    LAPSED = "lapsed"
    PAID_UP = "paid_up"
    SURRENDERED = "surrendered"
    CLAIMED = "claimed"
    EXPIRED = "expired"
    
    # Disputes
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    MEDIATION = "mediation"
    LITIGATION = "litigation"
    SETTLED = "settled"
    CLOSED = "closed"
    APPEALED = "appealed"
    
    # Distributions/Compensation
    SCHEDULED = "scheduled"
    PAID = "paid"
    CANCELLED = "cancelled"


# ============ TRANSITION DEFINITIONS ============

# Valid transitions for each status
LIFECYCLE_TRANSITIONS: Dict[LifecycleStatus, List[LifecycleStatus]] = {
    LifecycleStatus.DRAFT: [
        LifecycleStatus.PENDING_APPROVAL,
        LifecycleStatus.FINALIZED,  # Direct finalize for simple records
        LifecycleStatus.VOIDED,
    ],
    LifecycleStatus.PENDING_APPROVAL: [
        LifecycleStatus.APPROVED,
        LifecycleStatus.DRAFT,  # Return to draft (rejection)
        LifecycleStatus.VOIDED,
    ],
    LifecycleStatus.APPROVED: [
        LifecycleStatus.EXECUTED,
        LifecycleStatus.FINALIZED,  # Direct finalize if no execution step
        LifecycleStatus.PENDING_APPROVAL,  # Revoke approval
        LifecycleStatus.VOIDED,
    ],
    LifecycleStatus.EXECUTED: [
        LifecycleStatus.FINALIZED,
        LifecycleStatus.VOIDED,
    ],
    LifecycleStatus.FINALIZED: [
        LifecycleStatus.AMENDED,  # Only via amendment
    ],
    LifecycleStatus.AMENDED: [],  # Terminal - the amendment creates a new record
    LifecycleStatus.VOIDED: [],  # Terminal
}


# ============ MODULE-SPECIFIC CONFIGURATIONS ============

class ModuleLifecycleConfig(BaseModel):
    """Configuration for each module type's lifecycle behavior"""
    module_type: str
    
    # Which statuses this module uses
    uses_approval: bool = False
    uses_execution: bool = False
    
    # Skip directly from Draft to Finalized
    allow_direct_finalize: bool = True
    
    # Required fields for finalization
    required_fields: List[str] = []
    
    # Fields that trigger approval requirement
    approval_trigger_fields: List[str] = []
    
    # Operational status field name in payload
    operational_status_field: Optional[str] = None
    
    # Valid operational statuses for this module
    valid_operational_statuses: List[str] = []


# Module configurations
MODULE_CONFIGS: Dict[str, ModuleLifecycleConfig] = {
    "minutes": ModuleLifecycleConfig(
        module_type="minutes",
        uses_approval=False,
        uses_execution=False,
        allow_direct_finalize=True,
        required_fields=["title", "meeting_datetime"],
        operational_status_field=None,
        valid_operational_statuses=[],
    ),
    "distribution": ModuleLifecycleConfig(
        module_type="distribution",
        uses_approval=True,
        uses_execution=True,  # "Executed" = paid out
        allow_direct_finalize=False,  # Must go through approval
        required_fields=["title", "total_amount", "distribution_date"],
        approval_trigger_fields=["total_amount"],
        operational_status_field="distribution_status",
        valid_operational_statuses=["scheduled", "pending", "paid", "cancelled"],
    ),
    "dispute": ModuleLifecycleConfig(
        module_type="dispute",
        uses_approval=False,
        uses_execution=False,
        allow_direct_finalize=True,
        required_fields=["title", "dispute_type"],
        operational_status_field="dispute_status",
        valid_operational_statuses=["open", "in_progress", "mediation", "litigation", "settled", "closed", "appealed"],
    ),
    "insurance": ModuleLifecycleConfig(
        module_type="insurance",
        uses_approval=False,
        uses_execution=False,
        allow_direct_finalize=True,
        required_fields=["title", "policy_number", "insured_name"],
        operational_status_field="policy_state",
        valid_operational_statuses=["pending", "active", "lapsed", "paid_up", "surrendered", "claimed", "expired"],
    ),
    "compensation": ModuleLifecycleConfig(
        module_type="compensation",
        uses_approval=True,
        uses_execution=True,  # "Executed" = paid
        allow_direct_finalize=False,
        required_fields=["title", "amount", "recipient_name"],
        approval_trigger_fields=["amount"],
        operational_status_field="payment_status",
        valid_operational_statuses=["pending", "approved", "paid", "cancelled"],
    ),
}


# ============ VALIDATION RESULT ============

class TransitionResult(BaseModel):
    """Result of a status transition attempt"""
    allowed: bool
    current_status: str
    target_status: str
    errors: List[str] = []
    warnings: List[str] = []
    required_fields_missing: List[str] = []
    confirmation_required: bool = False
    confirmation_message: str = ""


class FinalizeValidation(BaseModel):
    """Validation result for finalization"""
    can_finalize: bool
    errors: List[str] = []
    warnings: List[str] = []
    missing_required: List[str] = []
    will_lock: List[str] = []
    remains_editable: List[str] = []
    confirmation_message: str = ""


# ============ LIFECYCLE ENGINE ============

class RecordLifecycleEngine:
    """
    Central engine for managing governance record lifecycles.
    Enforces status transitions, validates required fields,
    and provides guards against invalid state changes.
    """
    
    def __init__(self):
        self.configs = MODULE_CONFIGS
    
    def get_config(self, module_type: str) -> ModuleLifecycleConfig:
        """Get lifecycle configuration for a module type"""
        return self.configs.get(module_type, self.configs["minutes"])
    
    def can_transition(
        self,
        current_status: str,
        target_status: str,
        module_type: str,
        payload: Dict[str, Any] = None
    ) -> TransitionResult:
        """
        Check if a status transition is allowed.
        Returns detailed result with errors/warnings.
        """
        config = self.get_config(module_type)
        errors = []
        warnings = []
        
        # Normalize statuses
        try:
            current = LifecycleStatus(current_status)
        except ValueError:
            # Handle legacy statuses
            if current_status in ["active", "pending", "paid"]:
                current = LifecycleStatus.DRAFT
            else:
                current = LifecycleStatus.DRAFT
        
        try:
            target = LifecycleStatus(target_status)
        except ValueError:
            errors.append(f"Invalid target status: {target_status}")
            return TransitionResult(
                allowed=False,
                current_status=current_status,
                target_status=target_status,
                errors=errors
            )
        
        # Check if transition is valid
        allowed_targets = LIFECYCLE_TRANSITIONS.get(current, [])
        
        if target not in allowed_targets:
            errors.append(
                f"Cannot transition from '{current.value}' to '{target.value}'. "
                f"Allowed transitions: {[s.value for s in allowed_targets]}"
            )
        
        # Module-specific checks
        if target == LifecycleStatus.FINALIZED:
            if not config.allow_direct_finalize and current == LifecycleStatus.DRAFT:
                if config.uses_approval:
                    errors.append(
                        f"{module_type} records require approval before finalization. "
                        f"Please submit for approval first."
                    )
        
        if target == LifecycleStatus.PENDING_APPROVAL:
            if not config.uses_approval:
                warnings.append(
                    f"{module_type} records typically don't require approval. "
                    f"You can finalize directly."
                )
        
        return TransitionResult(
            allowed=len(errors) == 0,
            current_status=current_status,
            target_status=target_status,
            errors=errors,
            warnings=warnings
        )
    
    def validate_finalization(
        self,
        module_type: str,
        payload: Dict[str, Any],
        current_status: str = "draft"
    ) -> FinalizeValidation:
        """
        Validate whether a record can be finalized.
        Returns detailed information about what will happen.
        """
        config = self.get_config(module_type)
        errors = []
        warnings = []
        missing_required = []
        
        # Check current status allows finalization
        transition = self.can_transition(current_status, "finalized", module_type, payload)
        if not transition.allowed:
            errors.extend(transition.errors)
        
        # Check required fields
        for field in config.required_fields:
            value = payload.get(field)
            if value is None or value == "" or value == 0:
                missing_required.append(field)
        
        if missing_required:
            errors.append(
                f"Missing required fields for finalization: {', '.join(missing_required)}"
            )
        
        # Generate confirmation message
        will_lock = [
            "Title and core content",
            "RM-ID assignment",
            "Creation date",
            "All current revision data"
        ]
        
        remains_editable = [
            "Attachments (via amendment)",
            "Attestations (can be added)",
            "Amendments (creates new revision)"
        ]
        
        confirmation_message = (
            "⚠️ FINALIZING WILL LOCK THIS RECORD\n\n"
            "This action is irreversible. Once finalized:\n"
            "• The record becomes read-only\n"
            "• Changes require creating an amendment\n"
            "• All content will be cryptographically sealed\n\n"
            "Are you sure you want to finalize this record?"
        )
        
        return FinalizeValidation(
            can_finalize=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            missing_required=missing_required,
            will_lock=will_lock,
            remains_editable=remains_editable,
            confirmation_message=confirmation_message
        )
    
    def derive_operational_status(
        self,
        module_type: str,
        lifecycle_status: str,
        payload: Dict[str, Any],
        effective_date: Optional[str] = None
    ) -> Optional[str]:
        """
        Derive the operational status based on lifecycle status and dates.
        
        CRITICAL RULE: "Active" can NEVER be shown for Draft records.
        Operational status is only meaningful after finalization.
        """
        config = self.get_config(module_type)
        
        # No operational status for this module
        if not config.operational_status_field:
            return None
        
        # RULE: Draft records always show their lifecycle status, not operational
        if lifecycle_status == "draft":
            return "draft"  # Override any payload value
        
        # RULE: Voided records show voided
        if lifecycle_status == "voided":
            return "voided"
        
        # For finalized records, derive from payload and dates
        stored_status = payload.get(config.operational_status_field)
        
        # Insurance-specific derivation
        if module_type == "insurance":
            return self._derive_insurance_status(lifecycle_status, payload, effective_date)
        
        # For other modules, use stored status if valid
        if stored_status in config.valid_operational_statuses:
            return stored_status
        
        # Default operational status based on lifecycle
        if lifecycle_status == "finalized":
            if module_type == "dispute":
                return stored_status if stored_status else "open"
            elif module_type == "distribution":
                return "scheduled"
            elif module_type == "compensation":
                return "pending"
        
        return stored_status
    
    def _derive_insurance_status(
        self,
        lifecycle_status: str,
        payload: Dict[str, Any],
        effective_date: Optional[str] = None
    ) -> str:
        """
        Derive insurance policy operational status.
        
        Rules:
        1. Draft = always "pending" (never "active")
        2. Finalized + effective_date <= today = "active"
        3. Finalized + effective_date > today = "pending"
        4. Explicit status overrides (lapsed, surrendered, etc.) take precedence
        """
        stored_status = payload.get("policy_state", "pending")
        
        # Draft is always pending
        if lifecycle_status != "finalized":
            return "pending"
        
        # Terminal statuses override date logic
        terminal_statuses = ["lapsed", "surrendered", "claimed", "expired"]
        if stored_status in terminal_statuses:
            return stored_status
        
        # Check effective date
        eff_date_str = effective_date or payload.get("effective_date", "")
        if eff_date_str:
            try:
                eff_date = datetime.fromisoformat(eff_date_str.replace("Z", "+00:00"))
                now = datetime.now(timezone.utc)
                
                if eff_date.date() <= now.date():
                    return "active"
                else:
                    return "pending"
            except (ValueError, TypeError):
                pass
        
        # Default for finalized without date
        return stored_status if stored_status else "pending"
    
    def get_available_transitions(
        self,
        current_status: str,
        module_type: str
    ) -> List[Dict[str, Any]]:
        """
        Get list of available status transitions with descriptions.
        """
        config = self.get_config(module_type)
        
        try:
            current = LifecycleStatus(current_status)
        except ValueError:
            current = LifecycleStatus.DRAFT
        
        allowed = LIFECYCLE_TRANSITIONS.get(current, [])
        
        transitions = []
        for target in allowed:
            # Filter based on module config
            if target == LifecycleStatus.PENDING_APPROVAL and not config.uses_approval:
                continue
            if target == LifecycleStatus.EXECUTED and not config.uses_execution:
                continue
            
            transitions.append({
                "status": target.value,
                "label": self._get_status_label(target),
                "description": self._get_transition_description(current, target),
                "requires_confirmation": target == LifecycleStatus.FINALIZED,
            })
        
        return transitions
    
    def _get_status_label(self, status: LifecycleStatus) -> str:
        """Get human-readable label for status"""
        labels = {
            LifecycleStatus.DRAFT: "Draft",
            LifecycleStatus.PENDING_APPROVAL: "Pending Approval",
            LifecycleStatus.APPROVED: "Approved",
            LifecycleStatus.EXECUTED: "Executed",
            LifecycleStatus.FINALIZED: "Finalized",
            LifecycleStatus.AMENDED: "Amended",
            LifecycleStatus.VOIDED: "Voided",
        }
        return labels.get(status, status.value)
    
    def _get_transition_description(self, from_status: LifecycleStatus, to_status: LifecycleStatus) -> str:
        """Get description of what happens in this transition"""
        descriptions = {
            (LifecycleStatus.DRAFT, LifecycleStatus.PENDING_APPROVAL): 
                "Submit for approval. Record will be reviewed before execution.",
            (LifecycleStatus.DRAFT, LifecycleStatus.FINALIZED): 
                "Lock record permanently. No further edits without amendment.",
            (LifecycleStatus.DRAFT, LifecycleStatus.VOIDED): 
                "Mark as void/deleted. Can be recovered by admin.",
            (LifecycleStatus.PENDING_APPROVAL, LifecycleStatus.APPROVED): 
                "Approve for execution. Record can proceed to payment/execution.",
            (LifecycleStatus.PENDING_APPROVAL, LifecycleStatus.DRAFT): 
                "Return to draft for edits. Approval request withdrawn.",
            (LifecycleStatus.APPROVED, LifecycleStatus.EXECUTED): 
                "Mark as executed/paid. Record proceeds to finalization.",
            (LifecycleStatus.APPROVED, LifecycleStatus.FINALIZED): 
                "Skip execution and finalize directly.",
            (LifecycleStatus.EXECUTED, LifecycleStatus.FINALIZED): 
                "Complete the record lifecycle. Lock permanently.",
            (LifecycleStatus.FINALIZED, LifecycleStatus.AMENDED): 
                "Create amendment. Original remains locked, new revision created.",
        }
        return descriptions.get((from_status, to_status), "")


# Singleton instance
lifecycle_engine = RecordLifecycleEngine()
