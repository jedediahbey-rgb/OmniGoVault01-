"""
Trust Score Rules Configuration
Allows admin configuration of health score weights and rules.
"""

from fastapi import APIRouter, Request
from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/api/config", tags=["Configuration"])

# Database reference
db = None

def set_db(database):
    global db
    db = database


def success_response(data, message=None):
    response = {"ok": True, "data": data}
    if message:
        response["message"] = message
    return response


def error_response(code, message, status_code=400, details=None):
    return {
        "ok": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or {}
        }
    }


async def get_current_user(request: Request):
    """Get current user from request."""
    class User:
        def __init__(self):
            self.user_id = "default_user"
            self.is_admin = True  # For now, all users can edit config
    return User()


# Default configuration
DEFAULT_HEALTH_CONFIG = {
    "category_weights": {
        "governance_hygiene": 25,
        "financial_integrity": 25,
        "compliance_recordkeeping": 15,
        "risk_exposure": 15,
        "data_integrity": 20
    },
    "blocking_caps": {
        "ghost_records": {
            "enabled": True,
            "cap": 60,
            "description": "Orphan/ghost records detected"
        },
        "missing_required_fields": {
            "enabled": True,
            "cap": 70,
            "description": "Finalized records missing required fields"
        },
        "ledger_imbalance": {
            "enabled": True,
            "cap": 65,
            "description": "Ledger debits and credits don't balance"
        },
        "draft_showing_active": {
            "enabled": True,
            "cap": 75,
            "description": "Draft insurance showing as active"
        }
    },
    "severity_thresholds": {
        "excellent": 90,
        "good": 80,
        "fair": 60,
        "needs_attention": 40
    },
    "aging_rules": {
        "draft_warning_days": 30,
        "draft_critical_days": 60,
        "dispute_warning_days": 30,
        "dispute_critical_days": 60
    },
    "required_documents": [
        "declaration_of_trust",
        "certificate_of_trust"
    ],
    "optional_documents": [
        "trust_transfer_grant_deed",
        "acknowledgement_receipt",
        "affidavit_of_fact",
        "trustee_acceptance"
    ]
}


class CategoryWeight(BaseModel):
    governance_hygiene: int = 25
    financial_integrity: int = 25
    compliance_recordkeeping: int = 15
    risk_exposure: int = 15
    data_integrity: int = 20


class BlockingCap(BaseModel):
    enabled: bool = True
    cap: int = 60
    description: str = ""


class HealthConfigUpdate(BaseModel):
    category_weights: Optional[Dict[str, int]] = None
    blocking_caps: Optional[Dict[str, dict]] = None
    severity_thresholds: Optional[Dict[str, int]] = None
    aging_rules: Optional[Dict[str, int]] = None
    required_documents: Optional[List[str]] = None


@router.get("/health-rules")
async def get_health_rules(request: Request):
    """
    Get current health score configuration.
    Returns weights, caps, and rules.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Try to get custom config from database
    config = await db.system_config.find_one(
        {"config_type": "health_rules", "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not config:
        # Return default config
        return success_response({
            "config": DEFAULT_HEALTH_CONFIG,
            "is_default": True,
            "last_updated": None
        })
    
    return success_response({
        "config": config.get("config", DEFAULT_HEALTH_CONFIG),
        "is_default": False,
        "last_updated": config.get("updated_at")
    })


@router.put("/health-rules")
async def update_health_rules(request: Request):
    """
    Update health score configuration.
    Only updates provided fields, preserves others.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        body = await request.json()
    except Exception:
        return error_response("INVALID_BODY", "Invalid request body")
    
    # Get current config
    existing = await db.system_config.find_one(
        {"config_type": "health_rules", "user_id": user.user_id},
        {"_id": 0}
    )
    
    current_config = existing.get("config", DEFAULT_HEALTH_CONFIG.copy()) if existing else DEFAULT_HEALTH_CONFIG.copy()
    
    # Validate and update category weights
    if "category_weights" in body:
        weights = body["category_weights"]
        total = sum(weights.values())
        if total != 100:
            return error_response(
                "INVALID_WEIGHTS",
                f"Category weights must sum to 100 (current sum: {total})"
            )
        current_config["category_weights"] = weights
    
    # Update blocking caps
    if "blocking_caps" in body:
        for cap_name, cap_config in body["blocking_caps"].items():
            if cap_name in current_config["blocking_caps"]:
                current_config["blocking_caps"][cap_name].update(cap_config)
    
    # Update severity thresholds
    if "severity_thresholds" in body:
        current_config["severity_thresholds"] = body["severity_thresholds"]
    
    # Update aging rules
    if "aging_rules" in body:
        current_config["aging_rules"].update(body["aging_rules"])
    
    # Update required documents
    if "required_documents" in body:
        current_config["required_documents"] = body["required_documents"]
    
    # Save to database
    await db.system_config.update_one(
        {"config_type": "health_rules", "user_id": user.user_id},
        {
            "$set": {
                "config": current_config,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user.user_id
            }
        },
        upsert=True
    )
    
    return success_response({
        "config": current_config,
        "message": "Health rules updated successfully"
    })


@router.post("/health-rules/reset")
async def reset_health_rules(request: Request):
    """
    Reset health rules to defaults.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Delete custom config
    await db.system_config.delete_one(
        {"config_type": "health_rules", "user_id": user.user_id}
    )
    
    return success_response({
        "config": DEFAULT_HEALTH_CONFIG,
        "message": "Health rules reset to defaults"
    })


# Governance Checklists Configuration
DEFAULT_CHECKLISTS = {
    "minutes": {
        "name": "Meeting Minutes Checklist",
        "items": [
            {"id": "date_time", "label": "Date and time recorded", "required": True},
            {"id": "attendees", "label": "All attendees listed", "required": True},
            {"id": "agenda", "label": "Agenda items documented", "required": True},
            {"id": "motions", "label": "All motions recorded", "required": False},
            {"id": "votes", "label": "Voting results documented", "required": False},
            {"id": "action_items", "label": "Action items assigned", "required": False},
            {"id": "next_meeting", "label": "Next meeting scheduled", "required": False},
            {"id": "signature", "label": "Minutes signed/attested", "required": True}
        ]
    },
    "distribution": {
        "name": "Distribution Checklist",
        "items": [
            {"id": "amount", "label": "Distribution amount specified", "required": True},
            {"id": "recipients", "label": "All recipients listed", "required": True},
            {"id": "approval", "label": "Trustee approval obtained", "required": True},
            {"id": "tax_info", "label": "Tax implications reviewed", "required": False},
            {"id": "documentation", "label": "Supporting documents attached", "required": False},
            {"id": "payment_method", "label": "Payment method specified", "required": True},
            {"id": "receipt", "label": "Receipt acknowledged", "required": False}
        ]
    },
    "insurance": {
        "name": "Insurance Policy Checklist",
        "items": [
            {"id": "policy_number", "label": "Policy number recorded", "required": True},
            {"id": "coverage", "label": "Coverage amount specified", "required": True},
            {"id": "premium", "label": "Premium amount documented", "required": True},
            {"id": "dates", "label": "Effective dates set", "required": True},
            {"id": "beneficiaries", "label": "Beneficiaries listed", "required": True},
            {"id": "insurer", "label": "Insurer information complete", "required": True},
            {"id": "renewal", "label": "Renewal date tracked", "required": False},
            {"id": "claims", "label": "Claims procedure documented", "required": False}
        ]
    },
    "compensation": {
        "name": "Compensation Checklist",
        "items": [
            {"id": "recipient", "label": "Recipient identified", "required": True},
            {"id": "amount", "label": "Compensation amount specified", "required": True},
            {"id": "period", "label": "Service period documented", "required": True},
            {"id": "approval", "label": "Approval obtained", "required": True},
            {"id": "tax_withholding", "label": "Tax withholding addressed", "required": False},
            {"id": "time_records", "label": "Time records attached", "required": False},
            {"id": "reasonableness", "label": "Reasonableness reviewed", "required": False}
        ]
    },
    "dispute": {
        "name": "Dispute Checklist",
        "items": [
            {"id": "parties", "label": "All parties identified", "required": True},
            {"id": "description", "label": "Dispute description complete", "required": True},
            {"id": "timeline", "label": "Timeline documented", "required": True},
            {"id": "evidence", "label": "Evidence collected", "required": False},
            {"id": "resolution_attempts", "label": "Resolution attempts logged", "required": False},
            {"id": "legal_review", "label": "Legal review if needed", "required": False},
            {"id": "outcome", "label": "Outcome documented", "required": False},
            {"id": "lessons_learned", "label": "Lessons learned recorded", "required": False}
        ]
    }
}


@router.get("/checklists")
async def get_checklists(request: Request, module_type: Optional[str] = None):
    """
    Get governance checklists configuration.
    Optionally filter by module type.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Try to get custom checklists
    custom = await db.system_config.find_one(
        {"config_type": "checklists", "user_id": user.user_id},
        {"_id": 0}
    )
    
    checklists = custom.get("config", DEFAULT_CHECKLISTS) if custom else DEFAULT_CHECKLISTS
    
    if module_type:
        if module_type in checklists:
            return success_response({
                "checklist": checklists[module_type],
                "module_type": module_type
            })
        else:
            return error_response("NOT_FOUND", f"No checklist for module: {module_type}")
    
    return success_response({
        "checklists": checklists,
        "is_default": custom is None
    })


@router.put("/checklists/{module_type}")
async def update_checklist(request: Request, module_type: str):
    """
    Update checklist for a specific module.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    if module_type not in DEFAULT_CHECKLISTS:
        return error_response("INVALID_MODULE", f"Invalid module type: {module_type}")
    
    try:
        body = await request.json()
    except Exception:
        return error_response("INVALID_BODY", "Invalid request body")
    
    # Get current config
    existing = await db.system_config.find_one(
        {"config_type": "checklists", "user_id": user.user_id},
        {"_id": 0}
    )
    
    current_config = existing.get("config", DEFAULT_CHECKLISTS.copy()) if existing else DEFAULT_CHECKLISTS.copy()
    
    # Update the specific checklist
    if "name" in body:
        current_config[module_type]["name"] = body["name"]
    if "items" in body:
        current_config[module_type]["items"] = body["items"]
    
    # Save
    await db.system_config.update_one(
        {"config_type": "checklists", "user_id": user.user_id},
        {
            "$set": {
                "config": current_config,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return success_response({
        "checklist": current_config[module_type],
        "message": f"Checklist for {module_type} updated"
    })


@router.post("/checklists/reset")
async def reset_checklists(request: Request):
    """
    Reset all checklists to defaults.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    await db.system_config.delete_one(
        {"config_type": "checklists", "user_id": user.user_id}
    )
    
    return success_response({
        "checklists": DEFAULT_CHECKLISTS,
        "message": "Checklists reset to defaults"
    })
