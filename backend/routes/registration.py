"""
Registration Routes - User registration flow with compliance requirements
Creates pending registration on account creation, requires completion before app access
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import re

router = APIRouter(prefix="/api/registration", tags=["registration"])

# ---- Utilities ----

def now_utc():
    return datetime.now(timezone.utc)

def normalize_phone(phone: str) -> str:
    """Normalize phone number to E.164 format"""
    digits = re.sub(r"\D+", "", phone or "")
    if len(digits) == 10:
        return "+1" + digits
    if len(digits) == 11 and digits.startswith("1"):
        return "+" + digits
    if (phone or "").strip().startswith("+") and len(digits) >= 10:
        return (phone or "").strip()
    raise ValueError("Invalid phone number format.")

def require_nonempty(val: str, msg: str):
    if not (val or "").strip():
        raise HTTPException(status_code=422, detail=msg)

# ---- Schemas ----

class LegalName(BaseModel):
    first: str = Field(..., min_length=1)
    middle: Optional[str] = ""
    last: str = Field(..., min_length=1)

class Address(BaseModel):
    street1: str = Field(..., min_length=1)
    street2: Optional[str] = ""
    city: str = Field(..., min_length=1)
    state: str = Field(..., min_length=2, max_length=2)
    postal_code: str = Field(..., min_length=3)
    country: str = Field("US", min_length=2, max_length=3)

class AgreementDoc(BaseModel):
    accepted: bool
    version: str

class Agreements(BaseModel):
    terms: AgreementDoc
    privacy: AgreementDoc

class CompleteRegistrationRequest(BaseModel):
    legal_name: LegalName
    phone: str
    address: Address
    agreements: Agreements

# ---- Helper to create pending registration ----

async def ensure_pending_registration(db, user: dict):
    """Create a pending registration record if one doesn't exist"""
    existing = await db.user_registrations.find_one({"user_id": user["user_id"]})
    if existing:
        return existing

    # Attempt a name split for prefill
    name = (user.get("name") or "").strip()
    parts = [p for p in name.split() if p]
    first = parts[0] if parts else ""
    last = parts[-1] if len(parts) > 1 else ""
    middle = " ".join(parts[1:-1]) if len(parts) > 2 else ""

    reg = {
        "registration_id": f"reg_{user['user_id']}",
        "user_id": user["user_id"],
        "email": user.get("email"),
        "legal_name": {"first": first, "middle": middle, "last": last},
        "phone": "",
        "address": {
            "street1": "",
            "street2": "",
            "city": "",
            "state": "NY",
            "postal_code": "",
            "country": "US"
        },
        "agreements": {
            "terms": {"accepted": False, "version": "2026-01-01"},
            "privacy": {"accepted": False, "version": "2026-01-01"},
        },
        "metadata": {},
        "status": "pending",
        "created_at": now_utc(),
        "completed_at": None,
    }
    await db.user_registrations.insert_one(reg)
    return reg

# ---- Routes ----

@router.get("")
async def get_registration(request: Request):
    """Get current user's registration status and data"""
    db = request.app.state.db
    user = getattr(request.state, "user", None)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Ensure registration record exists
    reg = await ensure_pending_registration(db, user)
    
    # Remove Mongo _id
    if reg:
        reg = dict(reg)
        reg.pop("_id", None)
    
    return reg


@router.post("/complete")
async def complete_registration(req: CompleteRegistrationRequest, request: Request):
    """Complete user registration with required information"""
    db = request.app.state.db
    user = getattr(request.state, "user", None)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Validate agreements explicitly
    if not req.agreements.terms.accepted:
        raise HTTPException(status_code=422, detail="You must accept the Terms of Service.")
    if not req.agreements.privacy.accepted:
        raise HTTPException(status_code=422, detail="You must accept the Privacy Policy.")

    # Normalize phone
    try:
        normalized_phone = normalize_phone(req.phone)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Defensive validation for key fields
    require_nonempty(req.legal_name.first, "First name is required.")
    require_nonempty(req.legal_name.last, "Last name is required.")
    require_nonempty(req.address.street1, "Street address is required.")
    require_nonempty(req.address.city, "City is required.")
    require_nonempty(req.address.state, "State is required.")
    require_nonempty(req.address.postal_code, "ZIP/postal code is required.")

    reg_update = {
        "legal_name": {
            "first": req.legal_name.first.strip(),
            "middle": (req.legal_name.middle or "").strip(),
            "last": req.legal_name.last.strip(),
        },
        "phone": normalized_phone,
        "address": {
            "street1": req.address.street1.strip(),
            "street2": (req.address.street2 or "").strip(),
            "city": req.address.city.strip(),
            "state": req.address.state.strip().upper(),
            "postal_code": req.address.postal_code.strip(),
            "country": req.address.country.strip().upper(),
        },
        "agreements": {
            "terms": {
                "accepted": True,
                "version": req.agreements.terms.version,
                "accepted_at": now_utc().isoformat(),
            },
            "privacy": {
                "accepted": True,
                "version": req.agreements.privacy.version,
                "accepted_at": now_utc().isoformat(),
            },
        },
        "status": "complete",
        "completed_at": now_utc().isoformat(),
    }

    # Capture optional compliance metadata
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    reg_update["metadata"] = {"ip": ip, "user_agent": ua}

    # Upsert registration record
    await db.user_registrations.update_one(
        {"user_id": user["user_id"]},
        {"$set": reg_update, "$setOnInsert": {"created_at": now_utc().isoformat(), "email": user.get("email")}},
        upsert=True,
    )

    # Mark user registration_complete
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"registration_complete": True, "updated_at": now_utc().isoformat()}},
    )

    # Audit log
    await db.audit_log.insert_one({
        "event": "REGISTRATION_COMPLETED",
        "user_id": user["user_id"],
        "email": user.get("email"),
        "timestamp": now_utc().isoformat(),
        "metadata": {"ip": ip, "user_agent": ua},
    })

    return {"status": "complete"}
