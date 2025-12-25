"""
RM Subject API Routes - Ledger Thread Management
Handles subject matter creation, lookup, suggestion, and subnumber allocation.

Key Operations:
- List subjects for a portfolio
- Create new subject (spawn new thread)
- Auto-suggest subjects based on party/category
- Allocate next subnumber atomically
- Preview next RM-ID
"""

from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime, timezone
import random
import re

from models.rm_subject import (
    RMSubject, RMSubjectCreateRequest, RMSubjectSuggestRequest,
    RMSubjectSummary, RMSubjectDetail, SubnumberAllocation,
    SubjectCategory, CATEGORY_LABELS, MODULE_TO_CATEGORY,
    generate_subject_id
)

router = APIRouter(prefix="/api/rm", tags=["rm-subjects"])

# Dependencies injected from server.py
db = None
get_current_user = None

# Constants
GROUP_MIN = 1
GROUP_MAX = 99
MAX_SUBNUMBER = 999
MAX_ALLOCATION_RETRIES = 50


def init_rm_subject_routes(database, auth_func):
    """Initialize routes with dependencies"""
    global db, get_current_user
    db = database
    get_current_user = auth_func


# ============ RESPONSE HELPERS ============

def success_response(data: dict, message: str = None):
    """Standard success response"""
    response = {"ok": True, "data": data}
    if message:
        response["message"] = message
    return response


def error_response(code: str, message: str, details: dict = None, status_code: int = 400):
    """Standard error response"""
    error = {"code": code, "message": message}
    if details:
        error["details"] = details
    return JSONResponse(
        status_code=status_code,
        content={"ok": False, "error": error}
    )


def serialize_doc(doc: dict) -> dict:
    """Remove MongoDB _id and convert datetime objects"""
    if not doc:
        return doc
    result = {k: v for k, v in doc.items() if k != "_id"}
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


# ============ RM-ID HELPERS ============

def format_rm_id(rm_base: str, rm_group: int, rm_sub: int) -> str:
    """Format full RM-ID from components"""
    return f"{rm_base}-{rm_group}.{rm_sub:03d}"


def format_rm_id_group(rm_base: str, rm_group: int) -> str:
    """Format RM-ID group (without subnumber)"""
    return f"{rm_base}-{rm_group}"


async def get_rm_base(portfolio_id: str, user_id: str) -> str:
    """Get base RM-ID for a portfolio from trust profile"""
    trust_profile = await db.trust_profiles.find_one(
        {"portfolio_id": portfolio_id, "user_id": user_id},
        {"rm_id_normalized": 1, "rm_id_raw": 1, "rm_record_id": 1}
    )
    
    if trust_profile:
        if trust_profile.get("rm_id_normalized"):
            return re.sub(r'\s+', '', trust_profile["rm_id_normalized"].strip().upper())
        if trust_profile.get("rm_record_id"):
            return re.sub(r'\s+', '', trust_profile["rm_record_id"].strip().upper())
    
    # Generate a placeholder if no trust profile
    import uuid
    return f"RF{uuid.uuid4().hex[:9].upper()}US"


async def get_available_group_number(portfolio_id: str, rm_base: str) -> int:
    """Get a random available group number (1-99) not already in use"""
    used_groups = await db.rm_subjects.distinct(
        "rm_group",
        {"portfolio_id": portfolio_id, "rm_base": rm_base, "deleted_at": None}
    )
    used_set = set(used_groups)
    
    available = [g for g in range(GROUP_MIN, GROUP_MAX + 1) if g not in used_set]
    
    if not available:
        raise ValueError(f"No available group numbers for {rm_base} (all 1-99 in use)")
    
    return random.choice(available)


# ============ LIST SUBJECTS ============

@router.get("/subjects")
async def list_subjects(
    request: Request,
    portfolio_id: str = Query(..., description="Portfolio ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in title/party name"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """
    List all RM Subjects (Ledger Threads) for a portfolio.
    Used for the "Attach to Existing Thread" dropdown.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        # Build query
        query = {
            "portfolio_id": portfolio_id,
            "user_id": user.user_id,
            "deleted_at": None
        }
        
        if category:
            query["category"] = category
        
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"primary_party_name": {"$regex": search, "$options": "i"}},
                {"external_ref": {"$regex": search, "$options": "i"}}
            ]
        
        # Get subjects
        subjects = await db.rm_subjects.find(
            query, {"_id": 0}
        ).sort("rm_group", 1).skip(offset).limit(limit).to_list(limit)
        
        total = await db.rm_subjects.count_documents(query)
        
        # Enrich with record counts
        items = []
        for subj in subjects:
            # Count records linked to this subject
            record_count = await db.governance_records.count_documents({
                "rm_subject_id": subj["id"],
                "status": {"$ne": "voided"}
            })
            
            items.append({
                "id": subj["id"],
                "rm_group": subj["rm_group"],
                "title": subj["title"],
                "category": subj["category"],
                "category_label": CATEGORY_LABELS.get(subj["category"], subj["category"]),
                "primary_party_id": subj.get("primary_party_id"),
                "primary_party_name": subj.get("primary_party_name"),
                "external_ref": subj.get("external_ref"),
                "record_count": record_count,
                "rm_id_preview": format_rm_id_group(subj["rm_base"], subj["rm_group"]),
                "next_sub_preview": f".{subj.get('next_sub', 1):03d}"
            })
        
        return success_response({
            "items": items,
            "total": total,
            "limit": limit,
            "offset": offset
        })
        
    except Exception as e:
        print(f"Error listing subjects: {e}")
        return error_response("DB_ERROR", "Failed to list subjects", {"error": str(e)}, status_code=500)


# ============ AUTO-SUGGEST SUBJECTS ============

@router.get("/subjects/suggest")
async def suggest_subjects(
    request: Request,
    portfolio_id: str = Query(..., description="Portfolio ID"),
    category: Optional[str] = Query(None, description="Category to filter"),
    party_id: Optional[str] = Query(None, description="Primary party ID"),
    module_type: Optional[str] = Query(None, description="Module type (minutes, distribution, etc.)")
):
    """
    Auto-suggest matching RM Subjects based on party and/or category.
    
    Returns:
    - exact_match: Single subject if exactly one matches
    - suggestions: List of potential matches if multiple
    - should_create_new: True if no matches found
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        # Determine category from module_type if not provided
        effective_category = category
        if not effective_category and module_type:
            effective_category = MODULE_TO_CATEGORY.get(module_type, SubjectCategory.MISC).value
        
        # Build query for suggestions
        query = {
            "portfolio_id": portfolio_id,
            "user_id": user.user_id,
            "deleted_at": None
        }
        
        # If party_id is provided, look for subjects with that party
        if party_id:
            query["primary_party_id"] = party_id
        
        # If category is provided, filter by it
        if effective_category:
            query["category"] = effective_category
        
        # Find matching subjects
        subjects = await db.rm_subjects.find(
            query, {"_id": 0}
        ).sort("created_at", -1).limit(10).to_list(10)
        
        # Enrich with record counts
        suggestions = []
        for subj in subjects:
            record_count = await db.governance_records.count_documents({
                "rm_subject_id": subj["id"],
                "status": {"$ne": "voided"}
            })
            
            suggestions.append({
                "id": subj["id"],
                "rm_group": subj["rm_group"],
                "title": subj["title"],
                "category": subj["category"],
                "category_label": CATEGORY_LABELS.get(subj["category"], subj["category"]),
                "primary_party_id": subj.get("primary_party_id"),
                "primary_party_name": subj.get("primary_party_name"),
                "external_ref": subj.get("external_ref"),
                "record_count": record_count,
                "rm_id_preview": format_rm_id_group(subj["rm_base"], subj["rm_group"]),
                "next_sub_preview": f".{subj.get('next_sub', 1):03d}"
            })
        
        # Determine response based on matches
        if len(suggestions) == 1:
            return success_response({
                "exact_match": suggestions[0],
                "suggestions": [],
                "should_create_new": False,
                "match_type": "exact"
            })
        elif len(suggestions) > 1:
            return success_response({
                "exact_match": None,
                "suggestions": suggestions,
                "should_create_new": False,
                "match_type": "multiple"
            })
        else:
            return success_response({
                "exact_match": None,
                "suggestions": [],
                "should_create_new": True,
                "match_type": "none"
            })
        
    except Exception as e:
        print(f"Error suggesting subjects: {e}")
        return error_response("DB_ERROR", "Failed to suggest subjects", {"error": str(e)}, status_code=500)


# ============ GET SUBJECT DETAIL ============

@router.get("/subjects/{subject_id}")
async def get_subject(subject_id: str, request: Request):
    """Get detailed info about a specific RM Subject"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        subject = await db.rm_subjects.find_one(
            {"id": subject_id, "user_id": user.user_id, "deleted_at": None},
            {"_id": 0}
        )
        
        if not subject:
            return error_response("NOT_FOUND", "Subject not found", status_code=404)
        
        # Count records
        record_count = await db.governance_records.count_documents({
            "rm_subject_id": subject_id,
            "status": {"$ne": "voided"}
        })
        
        return success_response({
            "subject": serialize_doc(subject),
            "record_count": record_count,
            "rm_id_preview": format_rm_id_group(subject["rm_base"], subject["rm_group"]),
            "next_rm_id": format_rm_id(subject["rm_base"], subject["rm_group"], subject.get("next_sub", 1))
        })
        
    except Exception as e:
        print(f"Error getting subject: {e}")
        return error_response("DB_ERROR", "Failed to get subject", {"error": str(e)}, status_code=500)


# ============ CREATE SUBJECT (SPAWN NEW THREAD) ============

@router.post("/subjects")
async def create_subject(data: RMSubjectCreateRequest, request: Request):
    """
    Create a new RM Subject (spawn a new ledger thread).
    Allocates a random available group number (1-99).
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        # Get RM base for this portfolio
        rm_base = await get_rm_base(data.portfolio_id, user.user_id)
        
        # Allocate a random available group number
        for attempt in range(MAX_ALLOCATION_RETRIES):
            try:
                rm_group = await get_available_group_number(data.portfolio_id, rm_base)
                
                # Create the subject
                subject = RMSubject(
                    trust_id=data.trust_id,
                    portfolio_id=data.portfolio_id,
                    user_id=user.user_id,
                    rm_base=rm_base,
                    rm_group=rm_group,
                    title=data.title,
                    category=data.category,
                    primary_party_id=data.primary_party_id,
                    primary_party_name=data.primary_party_name,
                    external_ref=data.external_ref,
                    next_sub=1,
                    created_by=user.name if hasattr(user, 'name') else user.user_id
                )
                
                doc = subject.model_dump()
                doc["created_at"] = doc["created_at"].isoformat()
                doc["updated_at"] = doc["updated_at"].isoformat()
                
                await db.rm_subjects.insert_one(doc)
                
                return success_response({
                    "subject": serialize_doc(doc),
                    "rm_id_preview": format_rm_id_group(rm_base, rm_group),
                    "first_rm_id": format_rm_id(rm_base, rm_group, 1)
                }, message="Ledger thread created successfully")
                
            except Exception as e:
                if "duplicate key" in str(e).lower() or "E11000" in str(e):
                    # Race condition - retry with different group
                    continue
                raise
        
        return error_response(
            "ALLOCATION_FAILED",
            f"Failed to allocate group number after {MAX_ALLOCATION_RETRIES} attempts"
        )
        
    except ValueError as e:
        return error_response("NO_GROUPS_AVAILABLE", str(e))
    except Exception as e:
        print(f"Error creating subject: {e}")
        return error_response("CREATE_ERROR", "Failed to create subject", {"error": str(e)}, status_code=500)


# ============ ALLOCATE SUBNUMBER ============

@router.post("/subjects/{subject_id}/allocate")
async def allocate_subnumber(subject_id: str, request: Request):
    """
    Atomically allocate the next subnumber for a subject.
    Used when creating a new record linked to an existing subject.
    
    Returns the allocated subnumber and full RM-ID string.
    Thread-safe via atomic increment.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        # Atomic increment of next_sub
        result = await db.rm_subjects.find_one_and_update(
            {
                "id": subject_id,
                "user_id": user.user_id,
                "deleted_at": None
            },
            {
                "$inc": {"next_sub": 1},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            return_document=True  # Return the updated document
        )
        
        if not result:
            return error_response("NOT_FOUND", "Subject not found", status_code=404)
        
        # The allocated subnumber is (next_sub - 1) since we just incremented
        allocated_sub = result["next_sub"] - 1
        
        if allocated_sub > MAX_SUBNUMBER:
            return error_response(
                "MAX_SUBNUMBER_EXCEEDED",
                f"Maximum subnumber ({MAX_SUBNUMBER}) exceeded for this subject"
            )
        
        rm_id_display = format_rm_id(result["rm_base"], result["rm_group"], allocated_sub)
        
        return success_response({
            "rm_subject_id": subject_id,
            "rm_sub": allocated_sub,
            "rm_id_display": rm_id_display,
            "rm_base": result["rm_base"],
            "rm_group": result["rm_group"],
            "subject_title": result["title"],
            "is_first_entry": allocated_sub == 1
        }, message=f"Allocated RM-ID: {rm_id_display}")
        
    except Exception as e:
        print(f"Error allocating subnumber: {e}")
        return error_response("ALLOCATION_ERROR", "Failed to allocate subnumber", {"error": str(e)}, status_code=500)


# ============ PREVIEW NEXT RM-ID ============

@router.get("/subjects/{subject_id}/preview")
async def preview_next_rm_id(subject_id: str, request: Request):
    """
    Preview what the next RM-ID would be without actually allocating it.
    Used for the "Sequence Preview" UI element.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        subject = await db.rm_subjects.find_one(
            {"id": subject_id, "user_id": user.user_id, "deleted_at": None},
            {"_id": 0}
        )
        
        if not subject:
            return error_response("NOT_FOUND", "Subject not found", status_code=404)
        
        next_sub = subject.get("next_sub", 1)
        next_rm_id = format_rm_id(subject["rm_base"], subject["rm_group"], next_sub)
        
        return success_response({
            "subject_id": subject_id,
            "subject_title": subject["title"],
            "rm_base": subject["rm_base"],
            "rm_group": subject["rm_group"],
            "next_sub": next_sub,
            "next_rm_id": next_rm_id,
            "rm_id_preview": format_rm_id_group(subject["rm_base"], subject["rm_group"]),
            "sub_preview": f".{next_sub:03d}"
        })
        
    except Exception as e:
        print(f"Error previewing RM-ID: {e}")
        return error_response("PREVIEW_ERROR", "Failed to preview RM-ID", {"error": str(e)}, status_code=500)


# ============ DELETE SUBJECT ============

@router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: str, request: Request):
    """
    Soft-delete an RM Subject.
    Only allowed if no records are linked to it.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        subject = await db.rm_subjects.find_one(
            {"id": subject_id, "user_id": user.user_id, "deleted_at": None}
        )
        
        if not subject:
            return error_response("NOT_FOUND", "Subject not found", status_code=404)
        
        # Check if any records are linked
        record_count = await db.governance_records.count_documents({
            "rm_subject_id": subject_id,
            "status": {"$ne": "voided"}
        })
        
        if record_count > 0:
            return error_response(
                "HAS_RECORDS",
                f"Cannot delete subject with {record_count} linked records"
            )
        
        # Soft delete
        await db.rm_subjects.update_one(
            {"id": subject_id},
            {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return success_response({
            "deleted": True,
            "subject_id": subject_id
        }, message="Subject deleted successfully")
        
    except Exception as e:
        print(f"Error deleting subject: {e}")
        return error_response("DELETE_ERROR", "Failed to delete subject", {"error": str(e)}, status_code=500)


# ============ ENSURE INDEXES ============

async def ensure_rm_subject_indexes(database):
    """Create required indexes for RM Subjects"""
    # Unique constraint on (portfolio_id, rm_base, rm_group)
    await database.rm_subjects.create_index(
        [("portfolio_id", 1), ("rm_base", 1), ("rm_group", 1)],
        unique=True,
        name="unique_rm_subject_group"
    )
    
    # Index for lookups by portfolio
    await database.rm_subjects.create_index(
        [("portfolio_id", 1), ("user_id", 1), ("deleted_at", 1)],
        name="rm_subjects_portfolio_lookup"
    )
    
    # Index for party-based suggestions
    await database.rm_subjects.create_index(
        [("portfolio_id", 1), ("primary_party_id", 1), ("category", 1)],
        name="rm_subjects_party_suggest"
    )
    
    # Index for category filtering
    await database.rm_subjects.create_index(
        [("portfolio_id", 1), ("category", 1)],
        name="rm_subjects_category"
    )
    
    print("✅ RM Subject indexes created")
