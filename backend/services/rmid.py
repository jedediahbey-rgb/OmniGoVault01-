"""
RM-ID (Registered Mail ID) generation and management services.
Handles the subject-based record keeping system.
"""
import re
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple
from utils.db import db
from models.trust import SubjectCategory


def normalize_rm_id(rm_id_raw: str) -> str:
    """Normalize RM-ID: uppercase, remove extra spaces"""
    if not rm_id_raw:
        return ""
    # Remove extra spaces and uppercase
    normalized = re.sub(r'\s+', '', rm_id_raw.strip().upper())
    return normalized


def parse_currency_value(value) -> Optional[float]:
    """Parse a currency value that may contain formatting like $, commas, etc."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        # Remove currency symbols, commas, and whitespace
        cleaned = re.sub(r'[$,\s]', '', value.strip())
        if not cleaned:
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


# Default subject categories (01-09 reserved for document templates, 10+ for user-defined)
DEFAULT_SUBJECT_CATEGORIES = [
    {"code": "01", "name": "Declaration of Trust", "description": "Trust declarations and founding documents"},
    {"code": "02", "name": "Trust Transfer Grant Deed", "description": "Property transfer documents"},
    {"code": "03", "name": "Notice of Interest", "description": "Notice of beneficial interest documents"},
    {"code": "04", "name": "Private Notice", "description": "Private notice documents"},
    {"code": "05", "name": "Special Notice", "description": "Special notices and communications"},
    {"code": "06", "name": "Affidavit", "description": "Sworn statements and affidavits"},
    {"code": "07", "name": "Schedule A", "description": "Property schedules and asset lists"},
    {"code": "08", "name": "Acknowledgement", "description": "Acknowledgement and receipt documents"},
    {"code": "09", "name": "Governing Documents", "description": "Trust governance and controlling documents"},
]


async def seed_default_categories(portfolio_id: str, user_id: str):
    """Seed default subject categories for a new portfolio using upsert to prevent race conditions"""
    for cat_data in DEFAULT_SUBJECT_CATEGORIES:
        await db.subject_categories.update_one(
            {
                "portfolio_id": portfolio_id,
                "user_id": user_id,
                "code": cat_data["code"]
            },
            {
                "$setOnInsert": {
                    "category_id": f"cat_{uuid.uuid4().hex[:12]}",
                    "portfolio_id": portfolio_id,
                    "user_id": user_id,
                    "code": cat_data["code"],
                    "name": cat_data["name"],
                    "description": cat_data["description"],
                    "is_active": True,
                    "next_sequence": 1,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )


async def get_or_create_subject_category(portfolio_id: str, user_id: str, subject_code: str = "00", subject_name: str = "General") -> dict:
    """Get or create a subject category by code and return its details"""
    # Seed defaults if needed
    await seed_default_categories(portfolio_id, user_id)
    
    # Look for existing category with this code
    existing = await db.subject_categories.find_one({
        "portfolio_id": portfolio_id,
        "user_id": user_id,
        "code": subject_code
    })
    
    if existing:
        return existing
    
    # If not found by code, try by name
    existing_by_name = await db.subject_categories.find_one({
        "portfolio_id": portfolio_id,
        "user_id": user_id,
        "name": subject_name
    })
    
    if existing_by_name:
        return existing_by_name
    
    # Find the next available code
    all_codes = await db.subject_categories.find(
        {"portfolio_id": portfolio_id, "user_id": user_id},
        {"code": 1}
    ).to_list(100)
    used_codes = set(c.get("code", "00") for c in all_codes)
    
    new_code = subject_code
    if new_code in used_codes:
        # Find next available - start from 10 to skip reserved template codes (01-09)
        for i in range(10, 100):
            potential_code = f"{i:02d}"
            if potential_code not in used_codes:
                new_code = potential_code
                break
    
    # Create new category
    category = SubjectCategory(
        portfolio_id=portfolio_id,
        user_id=user_id,
        code=new_code,
        name=subject_name,
        next_sequence=1
    )
    doc = category.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.subject_categories.insert_one(doc)
    
    return doc


async def generate_subject_rm_id(portfolio_id: str, user_id: str, subject_code: str = "00", subject_name: str = "General") -> Tuple[str, str, int, str]:
    """Generate RM-ID based on subject category. Returns (full_rm_id, subject_code, sequence_num, subject_name)
    Finds the lowest available sequence number (reuses gaps from deleted items)."""
    
    # Get trust profile for base RM-ID
    trust_profile = await db.trust_profiles.find_one(
        {"portfolio_id": portfolio_id, "user_id": user_id},
        {"rm_id_normalized": 1, "rm_id_raw": 1, "rm_record_id": 1}
    )
    
    # Priority: rm_id_normalized > rm_record_id (legacy) > placeholder
    base_rm_id = None
    if trust_profile:
        if trust_profile.get("rm_id_normalized"):
            base_rm_id = trust_profile["rm_id_normalized"]
        elif trust_profile.get("rm_record_id"):
            base_rm_id = normalize_rm_id(trust_profile["rm_record_id"])
    
    if not base_rm_id:
        # Generate a placeholder RM-ID
        base_rm_id = f"TEMP{uuid.uuid4().hex[:8].upper()}"
    
    # Get or create subject category (seeds defaults if needed)
    category = await get_or_create_subject_category(portfolio_id, user_id, subject_code, subject_name)
    cat_code = category.get("code", "00")
    cat_name = category.get("name", "General")
    category_id = category.get("category_id")
    
    # Find all used sequence numbers for this category across documents, assets, and ledger entries
    used_sequences = set()
    
    # Check documents
    docs = await db.documents.find(
        {"portfolio_id": portfolio_id, "user_id": user_id, "subject_code": cat_code, "is_deleted": {"$ne": True}},
        {"sequence_number": 1}
    ).to_list(1000)
    for doc in docs:
        if doc.get("sequence_number"):
            used_sequences.add(doc["sequence_number"])
    
    # Check assets
    assets = await db.assets.find(
        {"portfolio_id": portfolio_id, "user_id": user_id, "subject_code": cat_code},
        {"sequence_number": 1}
    ).to_list(1000)
    for asset in assets:
        if asset.get("sequence_number"):
            used_sequences.add(asset["sequence_number"])
    
    # Check ledger entries (only standalone ones, not linked to assets)
    ledger_entries = await db.trust_ledger.find(
        {"portfolio_id": portfolio_id, "user_id": user_id, "subject_code": cat_code, "asset_id": None},
        {"sequence_number": 1}
    ).to_list(1000)
    for entry in ledger_entries:
        if entry.get("sequence_number"):
            used_sequences.add(entry["sequence_number"])
    
    # Find the lowest available sequence number starting from 1
    sequence_num = 1
    while sequence_num in used_sequences:
        sequence_num += 1
    
    # Update the category's next_sequence if needed (for tracking purposes)
    max_used = max(used_sequences) if used_sequences else 0
    if max_used >= category.get("next_sequence", 1):
        await db.subject_categories.update_one(
            {"category_id": category_id},
            {"$set": {"next_sequence": max_used + 1}}
        )
    
    # Format: BASE-CODE.SEQUENCE (e.g., RF123456789US-01.001)
    full_rm_id = f"{base_rm_id}-{cat_code}.{sequence_num:03d}"
    
    return full_rm_id, cat_code, sequence_num, cat_name
