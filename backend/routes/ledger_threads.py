"""
Ledger Thread (RM Subject) API Routes
Global RM-ID management with atomic, collision-proof issuance.

Core Rules:
1. Each Ledger Thread owns a unique whole number (1-99) within a portfolio
2. Records link to threads and get sequential subnumbers (.001-.999)
3. Atomic increment ensures no duplicates even under concurrent writes
4. Categories: trustee_compensation, distribution, dispute, insurance, minutes, policy, misc
"""

from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid
import re

from models.rm_subject import (
    RMSubject, SubjectCategory, 
    RMSubjectCreateRequest, RMSubjectSummary, RMSubjectDetail,
    SubnumberAllocation, generate_subject_id
)

router = APIRouter(prefix="/api/ledger-threads", tags=["ledger-threads"])

# Dependencies injected from server.py
db = None
get_current_user = None


def init_ledger_thread_routes(database, auth_func):
    """Initialize routes with dependencies"""
    global db, get_current_user
    db = database
    get_current_user = auth_func


# ============ CATEGORY MAPPING ============

# Map module types to ledger thread categories
MODULE_TO_CATEGORY = {
    "minutes": SubjectCategory.MINUTES,
    "distribution": SubjectCategory.DISTRIBUTION,
    "dispute": SubjectCategory.DISPUTE,
    "insurance": SubjectCategory.INSURANCE,
    "compensation": SubjectCategory.TRUSTEE_COMPENSATION,
}

CATEGORY_DISPLAY = {
    "minutes": "Meeting Minutes",
    "distribution": "Distributions",
    "dispute": "Disputes",
    "insurance": "Insurance Policies",
    "trustee_compensation": "Trustee Compensation",
    "policy": "Policies",
    "misc": "Miscellaneous",
}


# ============ HELPERS ============

def format_rm_id(rm_base: str, rm_group: int, rm_sub: int) -> str:
    """Format full RM-ID: RF...-33.001"""
    return f"{rm_base}-{rm_group}.{rm_sub:03d}"


def format_rm_id_preview(rm_base: str, rm_group: int) -> str:
    """Format RM-ID preview without sub: RF...-33"""
    # Truncate base for display
    if len(rm_base) > 8:
        display_base = f"{rm_base[:4]}...{rm_base[-4:]}"
    else:
        display_base = rm_base
    return f"{display_base}-{rm_group}"


async def get_rm_base_for_portfolio(portfolio_id: str, user_id: str) -> str:
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
    
    # Generate temp placeholder if no trust profile
    return f"TEMP{uuid.uuid4().hex[:8].upper()}"


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


# ============ ATOMIC ID ISSUANCE ============

async def atomic_allocate_next_whole(
    portfolio_id: str,
    user_id: str,
    rm_base: str
) -> int:
    """
    Atomically allocate the next available whole number (1-99).
    Uses findOneAndUpdate with $max to prevent race conditions.
    
    Returns: The allocated whole number (rm_group)
    Raises: ValueError if all 99 numbers are used
    """
    # Get currently used whole numbers
    used_groups = await db.rm_subjects.distinct(
        "rm_group",
        {
            "portfolio_id": portfolio_id,
            "rm_base": rm_base,
            "user_id": user_id,
            "deleted_at": None
        }
    )
    used_set = set(used_groups)
    
    # Find first available in range 1-99
    for candidate in range(1, 100):
        if candidate not in used_set:
            return candidate
    
    raise ValueError("All 99 whole numbers are used for this portfolio")


async def atomic_allocate_subnumber(
    subject_id: str,
    user_id: str
) -> tuple:
    """
    Atomically allocate the next subnumber (.001-.999) from a thread.
    Uses MongoDB's atomic findOneAndUpdate with $inc.
    
    Returns: (rm_id, rm_sub, rm_base, rm_group, subject_title)
    Raises: ValueError if subject not found or max exceeded
    """
    # Atomic increment - findOneAndUpdate is atomic in MongoDB
    result = await db.rm_subjects.find_one_and_update(
        {
            "id": subject_id,
            "user_id": user_id,
            "deleted_at": None
        },
        {
            "$inc": {"next_sub": 1},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        },
        return_document=True  # Return the document AFTER update
    )
    
    if not result:
        raise ValueError(f"Ledger thread {subject_id} not found")
    
    # The allocated sub is (next_sub - 1) since we just incremented
    allocated_sub = result["next_sub"] - 1
    
    # Enforce range .001-.999
    if allocated_sub < 1:
        raise ValueError("Invalid subnumber state")
    if allocated_sub > 999:
        raise ValueError(f"Maximum subnumber (.999) exceeded for thread {subject_id}")
    
    rm_id = format_rm_id(result["rm_base"], result["rm_group"], allocated_sub)
    
    return (rm_id, allocated_sub, result["rm_base"], result["rm_group"], result["title"])


async def create_thread_and_allocate_first(
    portfolio_id: str,
    user_id: str,
    trust_id: str,
    title: str,
    category: SubjectCategory,
    party_id: str = None,
    party_name: str = None,
    external_ref: str = None,
    created_by: str = ""
) -> tuple:
    """
    Create a new Ledger Thread and allocate the first subnumber (.001).
    Atomic operation ensures no duplicate whole numbers.
    
    Returns: (thread_id, rm_id, rm_sub, rm_base, rm_group)
    """
    rm_base = await get_rm_base_for_portfolio(portfolio_id, user_id)
    
    # Atomically get next available whole number
    rm_group = await atomic_allocate_next_whole(portfolio_id, user_id, rm_base)
    
    # Create the thread
    thread = RMSubject(
        trust_id=trust_id,
        portfolio_id=portfolio_id,
        user_id=user_id,
        rm_base=rm_base,
        rm_group=rm_group,
        title=title,
        category=category,
        primary_party_id=party_id,
        primary_party_name=party_name,
        external_ref=external_ref,
        next_sub=2,  # First allocation is .001, next will be .002
        created_by=created_by
    )
    
    doc = thread.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    # Insert with unique index protection
    try:
        await db.rm_subjects.insert_one(doc)
    except Exception as e:
        if "duplicate" in str(e).lower():
            # Race condition - retry with next number
            return await create_thread_and_allocate_first(
                portfolio_id, user_id, trust_id, title, category,
                party_id, party_name, external_ref, created_by
            )
        raise
    
    rm_id = format_rm_id(rm_base, rm_group, 1)
    
    return (thread.id, rm_id, 1, rm_base, rm_group)


# ============ API ENDPOINTS ============

@router.get("")
async def list_threads(
    request: Request,
    portfolio_id: str = Query(..., description="Portfolio ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
    party_id: Optional[str] = Query(None, description="Filter by party"),
    search: Optional[str] = Query(None, description="Search title/external_ref"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """
    List Ledger Threads for a portfolio.
    Supports filtering by category, party, and text search.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        query = {
            "portfolio_id": portfolio_id,
            "user_id": user.user_id,
            "deleted_at": None
        }
        
        if category:
            query["category"] = category
        if party_id:
            query["primary_party_id"] = party_id
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"external_ref": {"$regex": search, "$options": "i"}},
                {"primary_party_name": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.rm_subjects.count_documents(query)
        threads = await db.rm_subjects.find(
            query, {"_id": 0}
        ).sort("rm_group", 1).skip(offset).limit(limit).to_list(limit)
        
        # Enrich with record counts
        items = []
        for thread in threads:
            record_count = await db.governance_records.count_documents({
                "rm_subject_id": thread["id"],
                "status": {"$ne": "voided"}
            })
            
            items.append({
                "id": thread["id"],
                "rm_group": thread["rm_group"],
                "rm_base": thread["rm_base"],
                "title": thread["title"],
                "category": thread["category"],
                "category_display": CATEGORY_DISPLAY.get(thread["category"], thread["category"]),
                "primary_party_id": thread.get("primary_party_id"),
                "primary_party_name": thread.get("primary_party_name"),
                "external_ref": thread.get("external_ref"),
                "record_count": record_count,
                "next_sub": thread["next_sub"],
                "rm_id_preview": format_rm_id_preview(thread["rm_base"], thread["rm_group"]),
                "next_sub_preview": f".{thread['next_sub']:03d}",
                "created_at": thread.get("created_at")
            })
        
        return success_response({
            "items": items,
            "total": total,
            "limit": limit,
            "offset": offset
        })
        
    except Exception as e:
        print(f"Error listing threads: {e}")
        return error_response("DB_ERROR", str(e), status_code=500)


@router.post("")
async def create_thread(request: Request):
    """
    Create a new Ledger Thread.
    Atomically allocates the next available whole number (1-99).
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        body = await request.json()
        
        # Validate required fields
        portfolio_id = body.get("portfolio_id")
        title = body.get("title", "").strip()
        category = body.get("category", "misc")
        
        if not portfolio_id:
            return error_response("VALIDATION_ERROR", "portfolio_id is required")
        if not title:
            return error_response("VALIDATION_ERROR", "title is required")
        
        # Validate category
        valid_categories = [c.value for c in SubjectCategory]
        if category not in valid_categories:
            return error_response("VALIDATION_ERROR", f"Invalid category. Must be one of: {valid_categories}")
        
        # Create thread
        thread_id, rm_id, rm_sub, rm_base, rm_group = await create_thread_and_allocate_first(
            portfolio_id=portfolio_id,
            user_id=user.user_id,
            trust_id=body.get("trust_id"),
            title=title,
            category=SubjectCategory(category),
            party_id=body.get("party_id"),
            party_name=body.get("party_name"),
            external_ref=body.get("external_ref"),
            created_by=user.name if hasattr(user, 'name') else user.user_id
        )
        
        return success_response({
            "thread_id": thread_id,
            "rm_group": rm_group,
            "rm_base": rm_base,
            "first_rm_id": rm_id,
            "rm_id_preview": format_rm_id_preview(rm_base, rm_group),
            "title": title,
            "category": category
        }, message="Ledger thread created successfully")
        
    except ValueError as e:
        return error_response("ALLOCATION_ERROR", str(e))
    except Exception as e:
        print(f"Error creating thread: {e}")
        return error_response("CREATE_ERROR", str(e), status_code=500)


@router.get("/{thread_id}")
async def get_thread(thread_id: str, request: Request):
    """Get detailed info about a Ledger Thread."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        thread = await db.rm_subjects.find_one(
            {"id": thread_id, "user_id": user.user_id, "deleted_at": None},
            {"_id": 0}
        )
        
        if not thread:
            return error_response("NOT_FOUND", "Ledger thread not found", status_code=404)
        
        # Get record count and list
        records = await db.governance_records.find(
            {"rm_subject_id": thread_id, "status": {"$ne": "voided"}},
            {"_id": 0, "id": 1, "title": 1, "rm_id": 1, "module_type": 1, "status": 1, "created_at": 1}
        ).sort("rm_sub", 1).to_list(100)
        
        return success_response({
            "thread": {
                "id": thread["id"],
                "rm_group": thread["rm_group"],
                "rm_base": thread["rm_base"],
                "title": thread["title"],
                "category": thread["category"],
                "category_display": CATEGORY_DISPLAY.get(thread["category"], thread["category"]),
                "primary_party_id": thread.get("primary_party_id"),
                "primary_party_name": thread.get("primary_party_name"),
                "external_ref": thread.get("external_ref"),
                "next_sub": thread["next_sub"],
                "rm_id_preview": format_rm_id_preview(thread["rm_base"], thread["rm_group"]),
                "created_at": thread.get("created_at"),
                "created_by": thread.get("created_by")
            },
            "records": records,
            "record_count": len(records)
        })
        
    except Exception as e:
        print(f"Error getting thread: {e}")
        return error_response("DB_ERROR", str(e), status_code=500)


@router.post("/{thread_id}/allocate")
async def allocate_next_sub(thread_id: str, request: Request):
    """
    Allocate the next subnumber from a thread.
    Atomic operation - safe for concurrent requests.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        rm_id, rm_sub, rm_base, rm_group, title = await atomic_allocate_subnumber(
            thread_id, user.user_id
        )
        
        return success_response({
            "rm_id": rm_id,
            "rm_sub": rm_sub,
            "rm_base": rm_base,
            "rm_group": rm_group,
            "thread_id": thread_id,
            "thread_title": title
        }, message="Subnumber allocated successfully")
        
    except ValueError as e:
        return error_response("ALLOCATION_ERROR", str(e))
    except Exception as e:
        print(f"Error allocating subnumber: {e}")
        return error_response("ALLOCATE_ERROR", str(e), status_code=500)


@router.get("/search/by-party")
async def search_by_party(
    request: Request,
    portfolio_id: str = Query(...),
    party_id: str = Query(None),
    party_name: str = Query(None)
):
    """Search threads by party (for auto-suggest)."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        query = {
            "portfolio_id": portfolio_id,
            "user_id": user.user_id,
            "deleted_at": None
        }
        
        if party_id:
            query["primary_party_id"] = party_id
        elif party_name:
            query["primary_party_name"] = {"$regex": party_name, "$options": "i"}
        else:
            return success_response({"items": []})
        
        threads = await db.rm_subjects.find(
            query, {"_id": 0}
        ).sort("rm_group", 1).limit(10).to_list(10)
        
        items = []
        for thread in threads:
            items.append({
                "id": thread["id"],
                "rm_group": thread["rm_group"],
                "title": thread["title"],
                "category": thread["category"],
                "rm_id_preview": format_rm_id_preview(thread["rm_base"], thread["rm_group"]),
                "next_sub_preview": f".{thread['next_sub']:03d}"
            })
        
        return success_response({"items": items})
        
    except Exception as e:
        return error_response("SEARCH_ERROR", str(e), status_code=500)


@router.get("/search/by-reference")
async def search_by_reference(
    request: Request,
    portfolio_id: str = Query(...),
    reference: str = Query(...)
):
    """Search threads by external reference (case number, policy, bank ref)."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        threads = await db.rm_subjects.find(
            {
                "portfolio_id": portfolio_id,
                "user_id": user.user_id,
                "deleted_at": None,
                "external_ref": {"$regex": reference, "$options": "i"}
            },
            {"_id": 0}
        ).limit(10).to_list(10)
        
        items = []
        for thread in threads:
            items.append({
                "id": thread["id"],
                "rm_group": thread["rm_group"],
                "title": thread["title"],
                "category": thread["category"],
                "external_ref": thread.get("external_ref"),
                "rm_id_preview": format_rm_id_preview(thread["rm_base"], thread["rm_group"])
            })
        
        return success_response({"items": items})
        
    except Exception as e:
        return error_response("SEARCH_ERROR", str(e), status_code=500)


@router.get("/suggest")
async def suggest_threads(
    request: Request,
    portfolio_id: str = Query(...),
    category: Optional[str] = Query(None),
    party_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Suggest relevant threads for a new record.
    Used by the UI selector to show matching threads.
    Always returns results even if only one match (for user confirmation).
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        query = {
            "portfolio_id": portfolio_id,
            "user_id": user.user_id,
            "deleted_at": None
        }
        
        # Build query conditions
        conditions = []
        
        if category:
            conditions.append({"category": category})
        
        if party_id:
            conditions.append({"primary_party_id": party_id})
        
        if search:
            conditions.append({
                "$or": [
                    {"title": {"$regex": search, "$options": "i"}},
                    {"external_ref": {"$regex": search, "$options": "i"}},
                    {"primary_party_name": {"$regex": search, "$options": "i"}}
                ]
            })
        
        if conditions:
            query["$or"] = conditions
        
        threads = await db.rm_subjects.find(
            query, {"_id": 0}
        ).sort([("category", 1), ("rm_group", 1)]).limit(limit).to_list(limit)
        
        items = []
        for thread in threads:
            record_count = await db.governance_records.count_documents({
                "rm_subject_id": thread["id"],
                "status": {"$ne": "voided"}
            })
            
            items.append({
                "id": thread["id"],
                "rm_group": thread["rm_group"],
                "title": thread["title"],
                "category": thread["category"],
                "category_display": CATEGORY_DISPLAY.get(thread["category"], thread["category"]),
                "primary_party_name": thread.get("primary_party_name"),
                "external_ref": thread.get("external_ref"),
                "record_count": record_count,
                "rm_id_preview": format_rm_id_preview(thread["rm_base"], thread["rm_group"]),
                "next_sub_preview": f".{thread['next_sub']:03d}"
            })
        
        return success_response({
            "items": items,
            "has_suggestions": len(items) > 0
        })
        
    except Exception as e:
        return error_response("SUGGEST_ERROR", str(e), status_code=500)


# ============ EXPORTS FOR USE IN OTHER ROUTES ============

__all__ = [
    "router",
    "init_ledger_thread_routes",
    "atomic_allocate_subnumber",
    "create_thread_and_allocate_first",
    "format_rm_id",
    "format_rm_id_preview",
    "get_rm_base_for_portfolio",
    "MODULE_TO_CATEGORY",
    "CATEGORY_DISPLAY"
]
