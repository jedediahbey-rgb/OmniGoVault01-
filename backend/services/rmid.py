"""RM-ID generation and management service"""
import re
import uuid
from datetime import datetime, timezone
from database import db
from models.asset import SubjectCategory, DEFAULT_SUBJECT_CATEGORIES


def normalize_rm_id(rm_id_raw: str) -> str:
    """Normalize RM-ID: uppercase, remove extra spaces"""
    if not rm_id_raw:
        return ""
    normalized = re.sub(r'\s+', '', rm_id_raw.strip().upper())
    return normalized


async def seed_default_categories(portfolio_id: str, user_id: str):
    """Seed default subject categories for a new portfolio"""
    existing = await db.subject_categories.count_documents({
        "portfolio_id": portfolio_id,
        "user_id": user_id
    })
    
    if existing > 0:
        return  # Already has categories
    
    for cat_data in DEFAULT_SUBJECT_CATEGORIES:
        category = SubjectCategory(
            portfolio_id=portfolio_id,
            user_id=user_id,
            code=cat_data["code"],
            name=cat_data["name"],
            description=cat_data["description"],
            next_sequence=1
        )
        doc = category.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.subject_categories.insert_one(doc)


async def get_or_create_subject_category(portfolio_id: str, user_id: str, subject_code: str = "00", subject_name: str = "General") -> dict:
    """Get or create a subject category by code and return its details"""
    await seed_default_categories(portfolio_id, user_id)
    
    existing = await db.subject_categories.find_one({
        "portfolio_id": portfolio_id,
        "user_id": user_id,
        "code": subject_code
    })
    
    if existing:
        return existing
    
    existing_by_name = await db.subject_categories.find_one({
        "portfolio_id": portfolio_id,
        "user_id": user_id,
        "name": subject_name
    })
    
    if existing_by_name:
        return existing_by_name
    
    all_codes = await db.subject_categories.find(
        {"portfolio_id": portfolio_id, "user_id": user_id},
        {"code": 1}
    ).to_list(100)
    used_codes = set(c.get("code", "00") for c in all_codes)
    
    new_code = subject_code
    if new_code in used_codes:
        for i in range(8, 100):
            potential_code = f"{i:02d}"
            if potential_code not in used_codes:
                new_code = potential_code
                break
    
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


async def generate_subject_rm_id(portfolio_id: str, user_id: str, subject_code: str = "00", subject_name: str = "General") -> tuple:
    """Generate RM-ID based on subject category. Returns (full_rm_id, subject_code, sequence_num, subject_name)"""
    trust_profile = await db.trust_profiles.find_one(
        {"portfolio_id": portfolio_id, "user_id": user_id},
        {"rm_id_normalized": 1, "rm_id_raw": 1, "rm_record_id": 1}
    )
    
    base_rm_id = None
    if trust_profile:
        if trust_profile.get("rm_id_normalized"):
            base_rm_id = trust_profile["rm_id_normalized"]
        elif trust_profile.get("rm_record_id"):
            base_rm_id = normalize_rm_id(trust_profile["rm_record_id"])
    
    if not base_rm_id:
        base_rm_id = f"TEMP{uuid.uuid4().hex[:8].upper()}"
    
    category = await get_or_create_subject_category(portfolio_id, user_id, subject_code, subject_name)
    cat_code = category.get("code", "00")
    cat_name = category.get("name", "General")
    sequence_num = category.get("next_sequence", 1)
    
    await db.subject_categories.update_one(
        {"category_id": category["category_id"]},
        {"$inc": {"next_sequence": 1}}
    )
    
    full_rm_id = f"{base_rm_id}-{cat_code}.{sequence_num:03d}"
    
    return full_rm_id, cat_code, sequence_num, cat_name
