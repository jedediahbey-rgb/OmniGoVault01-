"""
Governance API Routes - Comprehensive Implementation
Modules: Meeting Minutes, Distributions, Disputes, Insurance, Compensation

Response Envelope Standard:
- List: {ok, items, count, total, sort, empty_state?}
- Detail: {ok, item}
- Error: {ok: false, error: {code, message, details?}}
"""

from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse
from typing import Optional
import hashlib
import json
import re
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api/governance", tags=["governance"])

# Dependencies injected from server.py
db = None
get_current_user = None
generate_subject_rm_id = None
generate_rm_id_v2 = None  # V2 atomic allocator


def init_governance_routes(database, auth_func, rmid_func, rmid_v2_func=None):
    """Initialize the governance routes with dependencies"""
    global db, get_current_user, generate_subject_rm_id, generate_rm_id_v2
    db = database
    get_current_user = auth_func
    generate_subject_rm_id = rmid_func
    generate_rm_id_v2 = rmid_v2_func  # Optional V2 allocator


async def allocate_rm_id_for_governance(
    portfolio_id: str,
    user_id: str,
    module_type: str,
    related_to: dict = None
) -> str:
    """
    Allocate RM-ID for governance records using V2 allocator if available.
    Falls back to V1 if V2 is not initialized.
    
    Args:
        portfolio_id: Portfolio ID
        user_id: User ID
        module_type: One of 'minutes', 'distribution', 'dispute', 'insurance', 'compensation'
        related_to: Optional dict with {record_id, court_name, case_number, institution, reference_id}
    
    Returns:
        Allocated RM-ID string
    """
    # Try V2 allocator first
    if generate_rm_id_v2:
        try:
            rm_id, _, _, _ = await generate_rm_id_v2(
                portfolio_id=portfolio_id,
                user_id=user_id,
                module_type=module_type,
                related_to_record_id=related_to.get("record_id") if related_to else None,
                court_name=related_to.get("court_name") if related_to else None,
                case_number=related_to.get("case_number") if related_to else None
            )
            return rm_id
        except Exception as e:
            print(f"V2 RM-ID allocation failed, falling back to V1: {e}")
    
    # Fallback to V1
    module_to_code = {
        "minutes": "20",
        "distribution": "21",
        "dispute": "22",
        "insurance": "23",
        "compensation": "24"
    }
    subject_code = module_to_code.get(module_type, "00")
    rm_id, _, _, _ = await generate_subject_rm_id(portfolio_id, user_id, subject_code, module_type)
    return rm_id


# ============ RESPONSE HELPERS ============

def normalize_meeting(meeting: dict) -> dict:
    """Normalize meeting data for API responses.
    - Adds `id` field (alias for meeting_id) for frontend compatibility
    - Ensures `locked` boolean is present
    - Ensures `revision` is present
    """
    if not meeting:
        return meeting
    
    # Add id field as alias for meeting_id
    meeting["id"] = meeting.get("meeting_id", "")
    
    # Ensure locked field is present (derived from status if not set)
    if "locked" not in meeting:
        meeting["locked"] = meeting.get("status") in ("finalized", "attested", "amended")
    
    # Ensure revision field is present
    if "revision" not in meeting:
        meeting["revision"] = 1 if not meeting.get("is_amendment") else (meeting.get("amendment_number", 0) + 1)
    
    # Ensure parent_meeting_id is set from amends_meeting_id for compatibility
    if "parent_meeting_id" not in meeting and meeting.get("amends_meeting_id"):
        meeting["parent_meeting_id"] = meeting.get("amends_meeting_id")
    
    return meeting


def success_list(items: list, total: int = None, sort_by: str = "created_at", sort_dir: str = "asc", empty_state: dict = None):
    """Standard list response envelope"""
    # Normalize all meeting items
    normalized_items = [normalize_meeting(item) if isinstance(item, dict) and "meeting_id" in item else item for item in items]
    
    response = {
        "ok": True,
        "items": normalized_items,
        "count": len(normalized_items),
        "total": total if total is not None else len(normalized_items),
        "sort": {"by": sort_by, "dir": sort_dir}
    }
    if not normalized_items and empty_state:
        response["empty_state"] = empty_state
    return response


def success_item(item: dict):
    """Standard detail response envelope"""
    # Normalize meeting item if it has meeting_id
    if isinstance(item, dict) and "meeting_id" in item:
        item = normalize_meeting(item)
    return {"ok": True, "item": item}


def success_message(message: str, data: dict = None):
    """Standard success response with message"""
    response = {"ok": True, "message": message}
    if data:
        # Normalize meeting item if present in data
        if "item" in data and isinstance(data["item"], dict) and "meeting_id" in data["item"]:
            data["item"] = normalize_meeting(data["item"])
        response.update(data)
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


# ============ EMPTY STATE PAYLOADS ============

EMPTY_STATES = {
    "meetings": {
        "module": "minutes",
        "headline": "No meetings yet",
        "subhead": "Create your first trust meeting minutes with attendees, agenda, motions, and tamper-evident finalization.",
        "primary_cta": {"label": "New Meeting", "action": "create_meeting"},
        "preview": {
            "attendee_roles": ["Trustee", "Co-Trustee", "Beneficiary", "Counsel", "Protector"],
            "sample_agenda": ["Review Financials", "Vote on Distribution", "Record Resolution", "Approve Amendments"]
        }
    },
    "distributions": {
        "module": "distributions",
        "headline": "No distributions recorded",
        "subhead": "Visualize beneficiary shares, payout history, and track distribution approvals.",
        "primary_cta": {"label": "Create Distribution", "action": "create_distribution"},
        "preview": {
            "donut": [
                {"label": "Primary Beneficiary", "value": 40, "color": "#D4AF37"},
                {"label": "Secondary Beneficiary", "value": 35, "color": "#10B981"},
                {"label": "Trust Reserve", "value": 25, "color": "#3B82F6"}
            ],
            "categories": ["Education", "Health", "Maintenance", "Discretionary"]
        }
    },
    "disputes": {
        "module": "disputes",
        "headline": "No disputes logged",
        "subhead": "Track conflicts with evidence, timelines, mediation notes, and resolution states.",
        "primary_cta": {"label": "Open Dispute", "action": "create_dispute"},
        "preview": {
            "board_columns": ["Open", "Under Review", "Mediation", "Resolved", "Archived"],
            "tags": ["Trustee/Beneficiary", "Distribution", "Accounting", "Interpretation"]
        }
    },
    "insurance": {
        "module": "insurance",
        "headline": "No life insurance policies",
        "subhead": "Store policy details, beneficiaries, premiums, riders, and visualize proceeds flow.",
        "primary_cta": {"label": "Add Policy", "action": "create_policy"},
        "preview": {
            "policy_card": {
                "carrier": "Sample Life Insurance Co.",
                "policy_type": "Whole Life",
                "face_value": 1000000,
                "premium": "$250/mo",
                "status": "Active"
            },
            "types": ["Term", "Whole Life", "Universal", "Variable"]
        }
    },
    "compensation": {
        "module": "compensation",
        "headline": "No trustee compensation logged",
        "subhead": "Track trustee time, service categories, approvals, and reasonableness metrics.",
        "primary_cta": {"label": "Log Time", "action": "create_comp_entry"},
        "preview": {
            "meter": {"label": "Reasonableness", "value": 0.62, "max": 1.0},
            "categories": ["Administration", "Accounting", "Investment Oversight", "Beneficiary Communications"],
            "policy_types": ["No Compensation", "Fixed Annual", "Hourly", "% of Assets", "Custom"]
        }
    }
}


# ============ SORTING HELPERS ============

def parse_rm_id_for_sort(rm_id: str) -> tuple:
    """
    Parse RM-ID for proper sorting.
    Format: RF743916765US-20.001 -> (prefix, category, sequence)
    Returns tuple for comparison that sorts correctly.
    """
    if not rm_id:
        return ("", 0, 0)
    
    try:
        # Match pattern: PREFIX-CATEGORY.SEQUENCE
        match = re.match(r'^(.+)-(\d+)\.(\d+)$', rm_id)
        if match:
            prefix = match.group(1)
            category = int(match.group(2))
            sequence = int(match.group(3))
            return (prefix, category, sequence)
    except Exception:
        pass
    
    return (rm_id, 0, 0)


def sort_by_rm_id(items: list, ascending: bool = True) -> list:
    """Sort items by RM-ID numerically"""
    return sorted(
        items,
        key=lambda x: parse_rm_id_for_sort(x.get("rm_id", "")),
        reverse=not ascending
    )


def generate_meeting_hash(meeting_data: dict) -> str:
    """Generate SHA-256 hash of meeting data for tamper-evidence"""
    hashable_data = {
        "meeting_id": meeting_data.get("meeting_id"),
        "title": meeting_data.get("title"),
        "meeting_type": meeting_data.get("meeting_type"),
        "date_time": meeting_data.get("date_time"),
        "location": meeting_data.get("location"),
        "called_by": meeting_data.get("called_by"),
        "attendees": meeting_data.get("attendees", []),
        "agenda_items": meeting_data.get("agenda_items", []),
        "rm_id": meeting_data.get("rm_id"),
        "finalized_at": meeting_data.get("finalized_at"),
        "finalized_by": meeting_data.get("finalized_by"),
    }
    canonical_json = json.dumps(hashable_data, sort_keys=True, default=str)
    return hashlib.sha256(canonical_json.encode()).hexdigest()


# ============ MEETING MINUTES ENDPOINTS ============

@router.get("/meetings")
async def get_meetings(
    request: Request,
    portfolio_id: Optional[str] = Query(None, description="Filter by portfolio ID"),
    trust_id: Optional[str] = Query(None, description="Filter by trust ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search in title or rm_id"),
    sort_by: Optional[str] = Query("rm_id", description="Sort field: rm_id, created_at, date_time"),
    sort_dir: Optional[str] = Query("asc", description="Sort direction: asc, desc"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    include_deleted: bool = Query(False, description="Include soft-deleted items")
):
    """Get all meetings with consistent envelope response"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Build query
    query = {"user_id": user.user_id}
    
    # Accept either portfolio_id or trust_id
    if portfolio_id:
        query["portfolio_id"] = portfolio_id
    if trust_id:
        query["trust_id"] = trust_id
    
    # Filter deleted
    if not include_deleted:
        query["$or"] = [{"deleted_at": None}, {"deleted_at": {"$exists": False}}]
    
    # Status filter
    if status:
        query["status"] = status
    
    # Search filter
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"rm_id": {"$regex": search, "$options": "i"}}
        ]
    
    try:
        # Get total count first
        total = await db.meetings.count_documents(query)
        
        # Determine sort direction (default ASC - lowest first)
        mongo_sort_dir = 1 if sort_dir.lower() == "asc" else -1
        
        # Get items with pagination
        if sort_by == "rm_id":
            # For rm_id, fetch all and sort in Python for numeric sorting
            all_items = await db.meetings.find(query, {"_id": 0}).to_list(1000)
            sorted_items = sort_by_rm_id(all_items, ascending=(sort_dir.lower() == "asc"))
            items = sorted_items[offset:offset + limit]
        else:
            # Use MongoDB sort for other fields
            sort_field = sort_by if sort_by in ["created_at", "date_time", "updated_at", "title"] else "created_at"
            items = await db.meetings.find(query, {"_id": 0}).sort(sort_field, mongo_sort_dir).skip(offset).limit(limit).to_list(limit)
        
        return success_list(
            items=items,
            total=total,
            sort_by=sort_by,
            sort_dir=sort_dir,
            empty_state=EMPTY_STATES["meetings"]
        )
        
    except Exception as e:
        print(f"Error fetching meetings: {e}")
        return error_response("DB_ERROR", "Failed to fetch meetings", {"error": str(e)}, status_code=500)


@router.get("/meetings/{meeting_id}")
async def get_meeting(meeting_id: str, request: Request):
    """Get a single meeting by ID - checks both V1 and V2 collections"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    if not meeting_id:
        return error_response("MISSING_MEETING_ID", "Meeting ID is required")
    
    try:
        # First check legacy V1 collection
        meeting = await db.meetings.find_one(
            {"meeting_id": meeting_id, "user_id": user.user_id},
            {"_id": 0}
        )
        
        if meeting:
            return success_item(meeting)
        
        # If not found, check V2 governance_records collection
        v2_record = await db.governance_records.find_one(
            {"id": meeting_id, "user_id": user.user_id, "module_type": "minutes", "status": {"$ne": "voided"}},
            {"_id": 0}
        )
        
        if v2_record:
            # Get the latest revision payload
            revision = await db.governance_revisions.find_one(
                {"id": v2_record.get("current_revision_id")},
                {"_id": 0}
            )
            
            payload = revision.get("payload_json", {}) if revision else {}
            
            # Transform V2 record to V1 format
            meeting = {
                "meeting_id": v2_record["id"],
                "id": v2_record["id"],
                "portfolio_id": v2_record.get("portfolio_id"),
                "user_id": v2_record.get("user_id"),
                "title": v2_record.get("title") or payload.get("title", ""),
                "rm_id": v2_record.get("rm_id", ""),
                "status": v2_record.get("status", "draft"),
                "locked": v2_record.get("status") == "finalized",
                "created_at": v2_record.get("created_at"),
                "finalized_at": v2_record.get("finalized_at"),
                "attendees": payload.get("attendees", []),
                "agenda_items": payload.get("agenda_items", []),
                # Merge payload fields
                **payload
            }
            return success_item(meeting)
        
        return error_response("NOT_FOUND", "Meeting not found", status_code=404)
        
    except Exception as e:
        print(f"Error fetching meeting: {e}")
        return error_response("DB_ERROR", "Failed to fetch meeting", {"error": str(e)}, status_code=500)


@router.post("/meetings")
async def create_meeting(data: dict, request: Request):
    """Create a new meeting"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    portfolio_id = data.get("portfolio_id")
    if not portfolio_id:
        return error_response("MISSING_PORTFOLIO_ID", "portfolio_id is required")
    
    try:
        # Generate RM-ID using V2 allocator (atomic, unique)
        rm_id = ""
        try:
            rm_id = await allocate_rm_id_for_governance(
                portfolio_id=portfolio_id,
                user_id=user.user_id,
                module_type="minutes",
                related_to=data.get("related_to")
            )
        except Exception as e:
            print(f"Warning: Could not generate RM-ID: {e}")
        
        from models.governance import Meeting, Attendee
        
        # Parse attendees
        attendees = []
        for att_data in data.get("attendees", []):
            attendees.append(Attendee(
                party_id=att_data.get("party_id"),
                name=att_data.get("name", ""),
                role=att_data.get("role", "observer"),
                present=att_data.get("present", True),
                notes=att_data.get("notes", "")
            ))
        
        meeting = Meeting(
            portfolio_id=portfolio_id,
            trust_id=data.get("trust_id"),
            user_id=user.user_id,
            title=data.get("title", "Untitled Meeting"),
            meeting_type=data.get("meeting_type", "regular"),
            date_time=data.get("date_time", datetime.now(timezone.utc).isoformat()),
            location=data.get("location", ""),
            called_by=data.get("called_by", ""),
            rm_id=rm_id,
            attendees=attendees
        )
        
        doc = meeting.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        doc["deleted_at"] = None  # Soft delete support
        
        await db.meetings.insert_one(doc)
        
        return success_item({k: v for k, v in doc.items() if k != "_id"})
        
    except Exception as e:
        print(f"Error creating meeting: {e}")
        return error_response("CREATE_ERROR", "Failed to create meeting", {"error": str(e)}, status_code=500)


@router.put("/meetings/{meeting_id}")
async def update_meeting(meeting_id: str, data: dict, request: Request):
    """Update a meeting (only if draft/unlocked)"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    if not meeting_id:
        return error_response("MISSING_MEETING_ID", "Meeting ID is required")
    
    try:
        meeting = await db.meetings.find_one(
            {"meeting_id": meeting_id, "user_id": user.user_id}
        )
        
        if not meeting:
            return error_response("NOT_FOUND", "Meeting not found", status_code=404)
        
        # Check if meeting is locked/finalized - return 409 Conflict
        is_locked = meeting.get("locked", False) or meeting.get("status") in ("finalized", "attested", "amended") or meeting.get("locked_at") is not None
        
        if is_locked:
            return error_response(
                "MEETING_LOCKED", 
                "Meeting is finalized and cannot be edited. Use amend to create a new revision.",
                {"meeting_id": meeting_id, "status": meeting.get("status"), "locked": True},
                status_code=409
            )
        
        # Build update data
        update_fields = {}
        allowed_fields = [
            "title", "meeting_type", "date_time", "location", "called_by",
            "attendees", "agenda_items", "visibility", "allowed_party_ids",
            "attachments"
        ]
        
        for field in allowed_fields:
            if field in data:
                update_fields[field] = data[field]
        
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.meetings.update_one(
            {"meeting_id": meeting_id},
            {"$set": update_fields}
        )
        
        updated = await db.meetings.find_one({"meeting_id": meeting_id}, {"_id": 0})
        return success_item(updated)
        
    except Exception as e:
        print(f"Error updating meeting: {e}")
        return error_response("UPDATE_ERROR", "Failed to update meeting", {"error": str(e)}, status_code=500)


@router.delete("/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str, request: Request, hard: bool = Query(False)):
    """Delete a meeting - handles amendment chain cleanup"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    if not meeting_id:
        return error_response("MISSING_MEETING_ID", "Meeting ID is required")
    
    try:
        meeting = await db.meetings.find_one(
            {"meeting_id": meeting_id, "user_id": user.user_id}
        )
        
        if not meeting:
            return error_response("NOT_FOUND", "Meeting not found", status_code=404)
        
        # Allow deletion of drafts and amendments
        is_finalized = meeting.get("locked") or meeting.get("status") == "finalized"
        if is_finalized and not meeting.get("is_amendment"):
            return error_response("LOCKED", "Cannot delete finalized meeting. Create an amendment instead.")
        
        # If this is an amendment, clean up the parent's amended_by_id
        parent_id = meeting.get("amends_meeting_id") or meeting.get("parent_meeting_id")
        if parent_id and meeting.get("is_amendment"):
            other_amendments = await db.meetings.count_documents({
                "meeting_id": {"$ne": meeting_id},
                "$or": [
                    {"amends_meeting_id": parent_id},
                    {"parent_meeting_id": parent_id}
                ],
                "deleted_at": None
            })
            
            if other_amendments == 0:
                await db.meetings.update_one(
                    {"meeting_id": parent_id},
                    {"$set": {"amended_by_id": None}}
                )
        
        if hard:
            await db.meetings.delete_one({"meeting_id": meeting_id})
        else:
            await db.meetings.update_one(
                {"meeting_id": meeting_id},
                {"$set": {
                    "deleted_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return success_message("Meeting deleted", {"meeting_id": meeting_id, "hard_delete": hard})
        
    except Exception as e:
        print(f"Error deleting meeting: {e}")
        return error_response("DELETE_ERROR", "Failed to delete meeting", {"error": str(e)}, status_code=500)


# ============ AGENDA ITEM ENDPOINTS ============

@router.post("/meetings/{meeting_id}/agenda")
async def add_agenda_item(meeting_id: str, data: dict, request: Request):
    """Add an agenda item to a meeting"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        meeting = await db.meetings.find_one(
            {"meeting_id": meeting_id, "user_id": user.user_id}
        )
        
        if not meeting:
            return error_response("NOT_FOUND", "Meeting not found", status_code=404)
        
        if meeting.get("status") != "draft":
            return error_response("LOCKED", "Cannot edit finalized meeting")
        
        from models.governance import AgendaItem
        
        agenda_items = meeting.get("agenda_items", [])
        order = data.get("order", len(agenda_items) + 1)
        
        new_item = AgendaItem(
            title=data.get("title", "New Agenda Item"),
            discussion_summary=data.get("discussion_summary", ""),
            order=order,
            notes=data.get("notes", "")
        )
        
        agenda_items.append(new_item.model_dump())
        agenda_items.sort(key=lambda x: x.get("order", 0))
        
        await db.meetings.update_one(
            {"meeting_id": meeting_id},
            {"$set": {
                "agenda_items": agenda_items,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return success_item(new_item.model_dump())
        
    except Exception as e:
        print(f"Error adding agenda item: {e}")
        return error_response("CREATE_ERROR", "Failed to add agenda item", {"error": str(e)}, status_code=500)


@router.put("/meetings/{meeting_id}/agenda/{item_id}")
async def update_agenda_item(meeting_id: str, item_id: str, data: dict, request: Request):
    """Update an agenda item"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        meeting = await db.meetings.find_one(
            {"meeting_id": meeting_id, "user_id": user.user_id}
        )
        
        if not meeting:
            return error_response("NOT_FOUND", "Meeting not found", status_code=404)
        
        if meeting.get("status") != "draft":
            return error_response("LOCKED", "Cannot edit finalized meeting")
        
        agenda_items = meeting.get("agenda_items", [])
        item_index = next(
            (i for i, item in enumerate(agenda_items) if item.get("item_id") == item_id),
            None
        )
        
        if item_index is None:
            return error_response("NOT_FOUND", "Agenda item not found", status_code=404)
        
        allowed_fields = [
            "title", "discussion_summary", "order", "motions",
            "action_items", "notes", "is_expanded"
        ]
        for field in allowed_fields:
            if field in data:
                agenda_items[item_index][field] = data[field]
        
        agenda_items.sort(key=lambda x: x.get("order", 0))
        
        await db.meetings.update_one(
            {"meeting_id": meeting_id},
            {"$set": {
                "agenda_items": agenda_items,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return success_item(agenda_items[item_index])
        
    except Exception as e:
        print(f"Error updating agenda item: {e}")
        return error_response("UPDATE_ERROR", "Failed to update agenda item", {"error": str(e)}, status_code=500)


@router.delete("/meetings/{meeting_id}/agenda/{item_id}")
async def delete_agenda_item(meeting_id: str, item_id: str, request: Request):
    """Delete an agenda item"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        meeting = await db.meetings.find_one(
            {"meeting_id": meeting_id, "user_id": user.user_id}
        )
        
        if not meeting:
            return error_response("NOT_FOUND", "Meeting not found", status_code=404)
        
        if meeting.get("status") != "draft":
            return error_response("LOCKED", "Cannot edit finalized meeting")
        
        agenda_items = meeting.get("agenda_items", [])
        new_items = [item for item in agenda_items if item.get("item_id") != item_id]
        
        if len(new_items) == len(agenda_items):
            return error_response("NOT_FOUND", "Agenda item not found", status_code=404)
        
        await db.meetings.update_one(
            {"meeting_id": meeting_id},
            {"$set": {
                "agenda_items": new_items,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return success_message("Agenda item deleted")
        
    except Exception as e:
        print(f"Error deleting agenda item: {e}")
        return error_response("DELETE_ERROR", "Failed to delete agenda item", {"error": str(e)}, status_code=500)


# ============ LEDGER INTEGRATION HELPER ============

async def create_governance_ledger_entry(
    portfolio_id: str,
    user_id: str, 
    governance_type: str,  # "meeting", "distribution", "dispute", "insurance", "compensation"
    governance_id: str,
    rm_id: str,
    title: str,
    description: str = "",
    value: float = None,
    entry_type: str = "governance_record",
    balance_effect: str = "credit",
    subject_code: str = "20",
    subject_name: str = "Governance"
):
    """
    Create a ledger entry when a governance item is finalized.
    This ensures all finalized governance items appear on the trust ledger with their RM-ID.
    
    Subject codes for governance:
    - 20: Meeting Minutes
    - 21: Distributions
    - 22: Disputes
    - 23: Insurance
    - 24: Compensation
    """
    import uuid
    
    # Parse rm_id to get sequence number if it exists
    sequence_number = 1
    if rm_id and "-" in rm_id and "." in rm_id:
        try:
            # Format: BASE-CODE.SEQUENCE (e.g., RF123456789US-20.001)
            seq_part = rm_id.split(".")[-1]
            sequence_number = int(seq_part)
        except:
            pass
    
    ledger_doc = {
        "entry_id": f"ledger_{uuid.uuid4().hex[:12]}",
        "portfolio_id": portfolio_id,
        "user_id": user_id,
        "rm_id": rm_id,
        "subject_code": subject_code,
        "subject_name": subject_name,
        "sequence_number": sequence_number,
        "entry_type": entry_type,
        "description": f"[{governance_type.title()}] {title}" + (f" - {description}" if description else ""),
        "governance_type": governance_type,
        "governance_id": governance_id,
        "value": value,
        "balance_effect": balance_effect,
        "notes": f"Auto-recorded from finalized {governance_type}",
        "recorded_date": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.trust_ledger.insert_one(ledger_doc)
    return {k: v for k, v in ledger_doc.items() if k != "_id"}


# ============ FINALIZATION & ATTESTATION ============

@router.post("/meetings/{meeting_id}/finalize")
async def finalize_meeting(meeting_id: str, data: dict, request: Request):
    """Finalize meeting minutes - locks content, generates hash, and creates ledger entry"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        meeting = await db.meetings.find_one(
            {"meeting_id": meeting_id, "user_id": user.user_id}
        )
        
        if not meeting:
            return error_response("NOT_FOUND", "Meeting not found", status_code=404)
        
        if meeting.get("status") != "draft":
            return error_response("ALREADY_FINALIZED", "Meeting already finalized")
        
        finalized_by = data.get("finalized_by_name", user.name if hasattr(user, 'name') else "Unknown")
        finalized_at = datetime.now(timezone.utc).isoformat()
        
        meeting["finalized_at"] = finalized_at
        meeting["finalized_by"] = finalized_by
        meeting["status"] = "finalized"
        meeting["locked"] = True
        meeting["locked_at"] = finalized_at
        
        meeting_hash = generate_meeting_hash(meeting)
        
        await db.meetings.update_one(
            {"meeting_id": meeting_id},
            {"$set": {
                "status": "finalized",
                "locked": True,
                "locked_at": finalized_at,
                "finalized_at": finalized_at,
                "finalized_by": finalized_by,
                "finalized_hash": meeting_hash,
                "updated_at": finalized_at
            }}
        )
        
        # Create ledger entry for the finalized meeting
        ledger_entry = None
        if meeting.get("rm_id"):
            try:
                ledger_entry = await create_governance_ledger_entry(
                    portfolio_id=meeting.get("portfolio_id"),
                    user_id=user.user_id,
                    governance_type="meeting",
                    governance_id=meeting_id,
                    rm_id=meeting.get("rm_id"),
                    title=meeting.get("title", "Untitled Meeting"),
                    description=f"Finalized by {finalized_by}",
                    entry_type="meeting_minutes",
                    balance_effect="credit",
                    subject_code="20",
                    subject_name="Meeting Minutes"
                )
            except Exception as le_err:
                print(f"Warning: Could not create ledger entry: {le_err}")
        
        updated = await db.meetings.find_one({"meeting_id": meeting_id}, {"_id": 0})
        return success_message("Meeting minutes finalized", {
            "finalized_hash": meeting_hash,
            "item": updated,
            "ledger_entry": ledger_entry
        })
        
    except Exception as e:
        print(f"Error finalizing meeting: {e}")
        return error_response("FINALIZE_ERROR", "Failed to finalize meeting", {"error": str(e)}, status_code=500)


@router.post("/meetings/{meeting_id}/attest")
async def add_attestation(meeting_id: str, data: dict, request: Request):
    """Add attestation to finalized meeting"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        meeting = await db.meetings.find_one(
            {"meeting_id": meeting_id, "user_id": user.user_id}
        )
        
        if not meeting:
            return error_response("NOT_FOUND", "Meeting not found", status_code=404)
        
        if meeting.get("status") == "draft":
            return error_response("NOT_FINALIZED", "Meeting must be finalized before attestation")
        
        from models.governance import Attestation
        
        attestation = Attestation(
            party_id=data.get("party_id"),
            party_name=data.get("party_name", ""),
            party_role=data.get("party_role", "trustee"),
            attested_at=datetime.now(timezone.utc).isoformat(),
            signature_type=data.get("signature_type", "typed"),
            signature_data=data.get("signature_data", ""),
            ip_address=request.client.host if request and request.client else ""
        )
        
        attestations = meeting.get("attestations", [])
        attestations.append(attestation.model_dump())
        
        new_status = "attested" if meeting.get("status") == "finalized" else meeting.get("status")
        
        await db.meetings.update_one(
            {"meeting_id": meeting_id},
            {"$set": {
                "attestations": attestations,
                "status": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return success_message("Attestation added", {"attestation": attestation.model_dump()})
        
    except Exception as e:
        print(f"Error adding attestation: {e}")
        return error_response("ATTEST_ERROR", "Failed to add attestation", {"error": str(e)}, status_code=500)


@router.post("/meetings/{meeting_id}/amend")
async def create_amendment(meeting_id: str, data: dict, request: Request):
    """Create an amendment to a finalized meeting.
    Clones the finalized meeting into a new draft revision.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        original = await db.meetings.find_one(
            {"meeting_id": meeting_id, "user_id": user.user_id}
        )
        
        if not original:
            return error_response("NOT_FOUND", "Meeting not found", status_code=404)
        
        if original.get("status") == "draft":
            return error_response("NOT_FINALIZED", "Cannot amend a draft meeting. Edit it directly instead.")
        
        # Count existing amendments to this meeting
        amendment_count = await db.meetings.count_documents({
            "$or": [
                {"amends_meeting_id": meeting_id},
                {"parent_meeting_id": meeting_id}
            ],
            "user_id": user.user_id
        })
        
        # Calculate new revision number
        original_revision = original.get("revision", 1)
        new_revision = original_revision + amendment_count + 1
        
        rm_id = ""
        try:
            rm_id, _, _, _ = await generate_subject_rm_id(
                original.get("portfolio_id"), user.user_id, "20", "Meeting Minutes Amendment"
            )
        except Exception as e:
            print(f"Warning: Could not generate RM-ID: {e}")
        
        from models.governance import Meeting
        
        # Create amendment as new draft revision
        amendment = Meeting(
            portfolio_id=original.get("portfolio_id"),
            trust_id=original.get("trust_id"),
            user_id=user.user_id,
            title=f"{original.get('title', '')} (Amendment v{new_revision})",
            meeting_type=original.get("meeting_type", "regular"),
            date_time=datetime.now(timezone.utc).isoformat(),
            location=original.get("location", ""),
            called_by=original.get("called_by", ""),
            rm_id=rm_id,
            # New revision fields
            revision=new_revision,
            parent_meeting_id=meeting_id,
            # Legacy fields for compatibility
            is_amendment=True,
            amends_meeting_id=meeting_id,
            amendment_number=amendment_count + 1,
            prior_hash=original.get("finalized_hash", ""),
            # Clone content from original
            attendees=original.get("attendees", []),
            agenda_items=original.get("agenda_items", []),
            visibility=original.get("visibility", "trustee_only")
        )
        
        doc = amendment.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        doc["deleted_at"] = None
        doc["locked"] = False  # New amendment is unlocked/draft
        doc["locked_at"] = None
        
        await db.meetings.insert_one(doc)
        
        # Update original to point to the amendment
        await db.meetings.update_one(
            {"meeting_id": meeting_id},
            {"$set": {
                "amended_by_id": amendment.meeting_id,
                "status": "amended"
            }}
        )
        
        return success_message("Amendment created", {
            "item": {k: v for k, v in doc.items() if k != "_id"}
        })
        
    except Exception as e:
        print(f"Error creating amendment: {e}")
        return error_response("AMEND_ERROR", "Failed to create amendment", {"error": str(e)}, status_code=500)


@router.get("/meetings/{meeting_id}/versions")
async def get_meeting_versions(meeting_id: str, request: Request):
    """Get all versions/revisions of a meeting (original + all amendments).
    Returns the version chain sorted by revision ascending.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        # Get the original meeting
        meeting = await db.meetings.find_one(
            {"meeting_id": meeting_id, "user_id": user.user_id},
            {"_id": 0}
        )
        
        if not meeting:
            return error_response("NOT_FOUND", "Meeting not found", status_code=404)
        
        # Find the root meeting (traverse up parent chain)
        root_meeting_id = meeting_id
        if meeting.get("parent_meeting_id") or meeting.get("amends_meeting_id"):
            parent_id = meeting.get("parent_meeting_id") or meeting.get("amends_meeting_id")
            while parent_id:
                parent = await db.meetings.find_one(
                    {"meeting_id": parent_id, "user_id": user.user_id},
                    {"_id": 0}
                )
                if parent:
                    root_meeting_id = parent_id
                    parent_id = parent.get("parent_meeting_id") or parent.get("amends_meeting_id")
                else:
                    break
        
        # Get all meetings in the version chain
        versions = []
        
        # Get the root meeting
        root = await db.meetings.find_one(
            {"meeting_id": root_meeting_id, "user_id": user.user_id},
            {"_id": 0}
        )
        if root:
            versions.append(root)
        
        # Get all amendments (children)
        amendments = await db.meetings.find(
            {
                "$or": [
                    {"parent_meeting_id": root_meeting_id},
                    {"amends_meeting_id": root_meeting_id}
                ],
                "user_id": user.user_id
            },
            {"_id": 0}
        ).to_list(100)
        
        versions.extend(amendments)
        
        # Also get amendments of amendments (recursive children)
        child_ids = [a.get("meeting_id") for a in amendments]
        while child_ids:
            nested_amendments = await db.meetings.find(
                {
                    "$or": [
                        {"parent_meeting_id": {"$in": child_ids}},
                        {"amends_meeting_id": {"$in": child_ids}}
                    ],
                    "user_id": user.user_id
                },
                {"_id": 0}
            ).to_list(100)
            
            if not nested_amendments:
                break
            
            versions.extend(nested_amendments)
            child_ids = [a.get("meeting_id") for a in nested_amendments]
        
        # Sort by revision ascending
        versions.sort(key=lambda x: x.get("revision", 1))
        
        return success_list(
            items=versions,
            total=len(versions),
            sort_by="revision",
            sort_dir="asc"
        )
        
    except Exception as e:
        print(f"Error fetching meeting versions: {e}")
        return error_response("DB_ERROR", "Failed to fetch meeting versions", {"error": str(e)}, status_code=500)


# ============ ATTACHMENTS ============

@router.post("/meetings/{meeting_id}/attachments")
async def add_attachment(meeting_id: str, data: dict, request: Request):
    """Add an attachment to a meeting"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        meeting = await db.meetings.find_one(
            {"meeting_id": meeting_id, "user_id": user.user_id}
        )
        
        if not meeting:
            return error_response("NOT_FOUND", "Meeting not found", status_code=404)
        
        from models.governance import MeetingAttachment
        
        attachment = MeetingAttachment(
            agenda_item_id=data.get("agenda_item_id"),
            file_name=data.get("file_name", "Untitled"),
            file_type=data.get("file_type", "other"),
            file_url=data.get("file_url", ""),
            description=data.get("description", "")
        )
        
        attachments = meeting.get("attachments", [])
        attachments.append(attachment.model_dump())
        
        await db.meetings.update_one(
            {"meeting_id": meeting_id},
            {"$set": {
                "attachments": attachments,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return success_item(attachment.model_dump())
        
    except Exception as e:
        print(f"Error adding attachment: {e}")
        return error_response("CREATE_ERROR", "Failed to add attachment", {"error": str(e)}, status_code=500)


@router.delete("/meetings/{meeting_id}/attachments/{attachment_id}")
async def delete_attachment(meeting_id: str, attachment_id: str, request: Request):
    """Delete an attachment from a meeting"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        meeting = await db.meetings.find_one(
            {"meeting_id": meeting_id, "user_id": user.user_id}
        )
        
        if not meeting:
            return error_response("NOT_FOUND", "Meeting not found", status_code=404)
        
        if meeting.get("status") != "draft":
            return error_response("LOCKED", "Cannot modify finalized meeting")
        
        attachments = meeting.get("attachments", [])
        new_attachments = [a for a in attachments if a.get("attachment_id") != attachment_id]
        
        await db.meetings.update_one(
            {"meeting_id": meeting_id},
            {"$set": {
                "attachments": new_attachments,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return success_message("Attachment deleted")
        
    except Exception as e:
        print(f"Error deleting attachment: {e}")
        return error_response("DELETE_ERROR", "Failed to delete attachment", {"error": str(e)}, status_code=500)


# ============ VERIFY HASH ============

@router.get("/meetings/{meeting_id}/verify")
async def verify_meeting_hash(meeting_id: str, request: Request):
    """Verify the integrity of a finalized meeting"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        meeting = await db.meetings.find_one(
            {"meeting_id": meeting_id, "user_id": user.user_id},
            {"_id": 0}
        )
        
        if not meeting:
            return error_response("NOT_FOUND", "Meeting not found", status_code=404)
        
        if meeting.get("status") == "draft":
            return success_item({"verified": False, "reason": "Meeting not finalized yet"})
        
        stored_hash = meeting.get("finalized_hash", "")
        if not stored_hash:
            return success_item({"verified": False, "reason": "No hash found"})
        
        calculated_hash = generate_meeting_hash(meeting)
        verified = stored_hash == calculated_hash
        
        return success_item({
            "verified": verified,
            "stored_hash": stored_hash,
            "calculated_hash": calculated_hash,
            "message": "Meeting integrity verified" if verified else "WARNING: Meeting content may have been modified"
        })
        
    except Exception as e:
        print(f"Error verifying meeting: {e}")
        return error_response("VERIFY_ERROR", "Failed to verify meeting", {"error": str(e)}, status_code=500)


# ============ DISTRIBUTIONS ============

def normalize_distribution(dist: dict) -> dict:
    """Normalize distribution data for API responses"""
    if not dist:
        return dist
    dist["id"] = dist.get("distribution_id", "")
    if "locked" not in dist:
        dist["locked"] = dist.get("status") in ("approved", "in_progress", "completed")
    return dist


@router.get("/distributions")
async def get_distributions(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_dir: str = "asc",
    limit: int = 100,
    offset: int = 0
):
    """Get distributions list"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        query = {"user_id": user.user_id, "deleted_at": None}
        if portfolio_id:
            query["portfolio_id"] = portfolio_id
        if trust_id:
            query["trust_id"] = trust_id
        if status:
            query["status"] = status
        
        sort_direction = 1 if sort_dir == "asc" else -1
        
        distributions = await db.distributions.find(query, {"_id": 0}).sort(
            sort_by, sort_direction
        ).skip(offset).limit(limit).to_list(limit)
        
        total = await db.distributions.count_documents(query)
        
        # Normalize all distributions
        distributions = [normalize_distribution(d) for d in distributions]
        
        return success_list(
            items=distributions,
            total=total,
            sort_by=sort_by,
            sort_dir=sort_dir,
            empty_state=EMPTY_STATES["distributions"] if not distributions else None
        )
    except Exception as e:
        print(f"Error fetching distributions: {e}")
        return error_response("DB_ERROR", "Failed to fetch distributions", status_code=500)


@router.get("/distributions/summary")
async def get_distributions_summary(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None
):
    """Get aggregated distribution summary for charts"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        query = {"user_id": user.user_id, "deleted_at": None}
        if portfolio_id:
            query["portfolio_id"] = portfolio_id
        if trust_id:
            query["trust_id"] = trust_id
        
        distributions = await db.distributions.find(query, {"_id": 0}).to_list(1000)
        
        if not distributions:
            return success_item({
                "has_data": False,
                "total_distributed": 0,
                "pending_amount": 0,
                "distribution_count": 0,
                "donut_data": [],
                "timeline_data": [],
                "by_type": {},
                "by_status": {},
                "empty_state": EMPTY_STATES["distributions"]
            })
        
        # Calculate summary stats
        total_distributed = sum(d.get("total_amount", 0) for d in distributions if d.get("status") == "completed")
        pending_amount = sum(d.get("total_amount", 0) for d in distributions if d.get("status") in ("draft", "pending_approval", "approved"))
        
        # Group by type
        by_type = {}
        for d in distributions:
            dtype = d.get("distribution_type", "regular")
            by_type[dtype] = by_type.get(dtype, 0) + d.get("total_amount", 0)
        
        # Group by status
        by_status = {}
        for d in distributions:
            status = d.get("status", "draft")
            by_status[status] = by_status.get(status, 0) + 1
        
        # Donut chart data (by recipient role)
        recipient_totals = {}
        for d in distributions:
            for r in d.get("recipients", []):
                role = r.get("role", "beneficiary")
                recipient_totals[role] = recipient_totals.get(role, 0) + r.get("amount", 0)
        
        donut_data = [{"name": k, "value": v} for k, v in recipient_totals.items()]
        
        return success_item({
            "has_data": True,
            "total_distributed": total_distributed,
            "pending_amount": pending_amount,
            "distribution_count": len(distributions),
            "donut_data": donut_data,
            "timeline_data": [],  # Would need date-based aggregation
            "by_type": by_type,
            "by_status": by_status
        })
    except Exception as e:
        print(f"Error fetching distribution summary: {e}")
        return error_response("DB_ERROR", "Failed to fetch summary", status_code=500)


@router.post("/distributions")
async def create_distribution(data: dict, request: Request):
    """Create a distribution record"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    if not data.get("portfolio_id"):
        return error_response("MISSING_PORTFOLIO", "Portfolio ID is required")
    if not data.get("title"):
        return error_response("MISSING_TITLE", "Distribution title is required")
    
    try:
        # Generate RM-ID using V2 allocator (atomic, unique)
        rm_id = ""
        try:
            rm_id = await allocate_rm_id_for_governance(
                portfolio_id=data.get("portfolio_id"),
                user_id=user.user_id,
                module_type="distribution",
                related_to=data.get("related_to")
            )
        except Exception as e:
            print(f"Warning: Could not generate RM-ID: {e}")
        
        from models.governance import Distribution, DistributionRecipient
        
        # Process recipients
        recipients = []
        for r in data.get("recipients", []):
            recipients.append(DistributionRecipient(
                party_id=r.get("party_id"),
                name=r.get("name", ""),
                role=r.get("role", "beneficiary"),
                share_percentage=r.get("share_percentage", 0),
                amount=r.get("amount", 0),
                payment_method=r.get("payment_method", ""),
                notes=r.get("notes", "")
            ).model_dump())
        
        distribution = Distribution(
            portfolio_id=data.get("portfolio_id"),
            trust_id=data.get("trust_id"),
            user_id=user.user_id,
            title=data.get("title"),
            distribution_type=data.get("distribution_type", "regular"),
            description=data.get("description", ""),
            rm_id=rm_id,
            total_amount=data.get("total_amount", 0),
            currency=data.get("currency", "USD"),
            asset_type=data.get("asset_type", "cash"),
            source_account=data.get("source_account", ""),
            scheduled_date=data.get("scheduled_date"),
            requires_approval=data.get("requires_approval", True),
            approval_threshold=data.get("approval_threshold", 1),
            recipients=recipients,
            authorized_meeting_id=data.get("authorized_meeting_id")
        )
        
        doc = distribution.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        
        await db.distributions.insert_one(doc)
        
        return success_item({k: v for k, v in doc.items() if k != "_id"})
    except Exception as e:
        print(f"Error creating distribution: {e}")
        return error_response("CREATE_ERROR", f"Failed to create distribution: {str(e)}", status_code=500)


@router.get("/distributions/{distribution_id}")
async def get_distribution(distribution_id: str, request: Request):
    """Get a single distribution - checks both V1 and V2 collections"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        # First check legacy V1 collection
        distribution = await db.distributions.find_one(
            {"distribution_id": distribution_id, "user_id": user.user_id},
            {"_id": 0}
        )
        
        if distribution:
            return success_item(normalize_distribution(distribution))
        
        # If not found, check V2 governance_records collection
        v2_record = await db.governance_records.find_one(
            {"id": distribution_id, "user_id": user.user_id, "module_type": "distribution", "status": {"$ne": "voided"}},
            {"_id": 0}
        )
        
        if v2_record:
            # Get the latest revision payload
            revision = await db.governance_revisions.find_one(
                {"id": v2_record.get("current_revision_id")},
                {"_id": 0}
            )
            
            payload = revision.get("payload_json", {}) if revision else {}
            
            # Transform V2 record to V1 format
            dist = {
                "distribution_id": v2_record["id"],
                "id": v2_record["id"],
                "portfolio_id": v2_record.get("portfolio_id"),
                "user_id": v2_record.get("user_id"),
                "title": v2_record.get("title") or payload.get("title", ""),
                "rm_id": v2_record.get("rm_id", ""),
                "status": v2_record.get("status", "draft"),
                "locked": v2_record.get("status") == "finalized",
                "created_at": v2_record.get("created_at"),
                "finalized_at": v2_record.get("finalized_at"),
                "recipients": payload.get("recipients", []),
                # Merge payload fields
                **payload
            }
            return success_item(dist)
        
        return error_response("NOT_FOUND", "Distribution not found", status_code=404)
    except Exception as e:
        print(f"Error fetching distribution: {e}")
        return error_response("DB_ERROR", "Failed to fetch distribution", status_code=500)


@router.put("/distributions/{distribution_id}")
async def update_distribution(distribution_id: str, data: dict, request: Request):
    """Update a distribution (only if draft/unlocked)"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        distribution = await db.distributions.find_one(
            {"distribution_id": distribution_id, "user_id": user.user_id}
        )
        
        if not distribution:
            return error_response("NOT_FOUND", "Distribution not found", status_code=404)
        
        # Check if locked
        is_locked = distribution.get("locked", False) or distribution.get("status") in ("approved", "in_progress", "completed")
        if is_locked:
            return error_response(
                "DISTRIBUTION_LOCKED",
                "Distribution is locked and cannot be edited.",
                status_code=409
            )
        
        # Build update
        update_fields = {}
        allowed_fields = [
            "title", "distribution_type", "description", "total_amount",
            "currency", "asset_type", "source_account", "scheduled_date",
            "requires_approval", "approval_threshold", "recipients",
            "authorized_meeting_id", "authorization_notes"
        ]
        
        for field in allowed_fields:
            if field in data:
                update_fields[field] = data[field]
        
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.distributions.update_one(
            {"distribution_id": distribution_id},
            {"$set": update_fields}
        )
        
        updated = await db.distributions.find_one({"distribution_id": distribution_id}, {"_id": 0})
        return success_item(normalize_distribution(updated))
    except Exception as e:
        print(f"Error updating distribution: {e}")
        return error_response("UPDATE_ERROR", "Failed to update distribution", status_code=500)


@router.delete("/distributions/{distribution_id}")
async def delete_distribution(distribution_id: str, request: Request):
    """Delete a distribution - handles amendment chain cleanup"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        distribution = await db.distributions.find_one(
            {"distribution_id": distribution_id, "user_id": user.user_id}
        )
        
        if not distribution:
            return error_response("NOT_FOUND", "Distribution not found", status_code=404)
        
        # Allow deletion of drafts and amendments
        is_finalized = distribution.get("locked") or distribution.get("status") in ("finalized", "executed")
        if is_finalized and not distribution.get("is_amendment"):
            return error_response("CANNOT_DELETE", "Cannot delete finalized distribution. Create an amendment instead.")
        
        # If this is an amendment, clean up the parent's amended_by_id
        parent_id = distribution.get("amends_distribution_id") or distribution.get("parent_distribution_id")
        if parent_id and distribution.get("is_amendment"):
            other_amendments = await db.distributions.count_documents({
                "distribution_id": {"$ne": distribution_id},
                "$or": [
                    {"amends_distribution_id": parent_id},
                    {"parent_distribution_id": parent_id}
                ],
                "deleted_at": None
            })
            
            if other_amendments == 0:
                await db.distributions.update_one(
                    {"distribution_id": parent_id},
                    {"$set": {"amended_by_id": None, "status": "finalized"}}
                )
        
        await db.distributions.update_one(
            {"distribution_id": distribution_id},
            {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return success_message("Distribution deleted")
    except Exception as e:
        print(f"Error deleting distribution: {e}")
        return error_response("DELETE_ERROR", "Failed to delete distribution", status_code=500)


@router.post("/distributions/{distribution_id}/submit")
async def submit_distribution_for_approval(distribution_id: str, request: Request):
    """Submit a distribution for approval"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        distribution = await db.distributions.find_one(
            {"distribution_id": distribution_id, "user_id": user.user_id}
        )
        
        if not distribution:
            return error_response("NOT_FOUND", "Distribution not found", status_code=404)
        
        if distribution.get("status") != "draft":
            return error_response("INVALID_STATUS", "Only draft distributions can be submitted")
        
        if not distribution.get("recipients"):
            return error_response("NO_RECIPIENTS", "Distribution must have at least one recipient")
        
        new_status = "pending_approval" if distribution.get("requires_approval") else "approved"
        
        await db.distributions.update_one(
            {"distribution_id": distribution_id},
            {"$set": {
                "status": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        updated = await db.distributions.find_one({"distribution_id": distribution_id}, {"_id": 0})
        return success_message(f"Distribution submitted for {'approval' if new_status == 'pending_approval' else 'execution'}", {"item": normalize_distribution(updated)})
    except Exception as e:
        print(f"Error submitting distribution: {e}")
        return error_response("SUBMIT_ERROR", "Failed to submit distribution", status_code=500)


@router.post("/distributions/{distribution_id}/approve")
async def approve_distribution(distribution_id: str, data: dict, request: Request):
    """Add approval to a distribution"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        distribution = await db.distributions.find_one(
            {"distribution_id": distribution_id, "user_id": user.user_id}
        )
        
        if not distribution:
            return error_response("NOT_FOUND", "Distribution not found", status_code=404)
        
        if distribution.get("status") != "pending_approval":
            return error_response("INVALID_STATUS", "Distribution is not pending approval")
        
        from models.governance import DistributionApproval
        
        approval = DistributionApproval(
            approver_party_id=data.get("approver_party_id"),
            approver_name=data.get("approver_name", ""),
            approver_role=data.get("approver_role", "trustee"),
            status="approved",
            approved_at=datetime.now(timezone.utc).isoformat(),
            signature_data=data.get("signature_data", ""),
            notes=data.get("notes", "")
        ).model_dump()
        
        approvals = distribution.get("approvals", [])
        approvals.append(approval)
        
        # Check if we have enough approvals
        threshold = distribution.get("approval_threshold", 1)
        approved_count = len([a for a in approvals if a.get("status") == "approved"])
        new_status = "approved" if approved_count >= threshold else "pending_approval"
        
        update_data = {
            "approvals": approvals,
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if new_status == "approved":
            update_data["locked"] = True
            update_data["locked_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.distributions.update_one(
            {"distribution_id": distribution_id},
            {"$set": update_data}
        )
        
        updated = await db.distributions.find_one({"distribution_id": distribution_id}, {"_id": 0})
        return success_message("Approval added", {"item": normalize_distribution(updated)})
    except Exception as e:
        print(f"Error approving distribution: {e}")
        return error_response("APPROVE_ERROR", "Failed to approve distribution", status_code=500)


@router.post("/distributions/{distribution_id}/execute")
async def execute_distribution(distribution_id: str, data: dict, request: Request):
    """Mark distribution as executed/completed and create ledger entry"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        distribution = await db.distributions.find_one(
            {"distribution_id": distribution_id, "user_id": user.user_id}
        )
        
        if not distribution:
            return error_response("NOT_FOUND", "Distribution not found", status_code=404)
        
        if distribution.get("status") not in ("approved", "in_progress"):
            return error_response("INVALID_STATUS", "Distribution must be approved before execution")
        
        execution_date = datetime.now(timezone.utc).isoformat()
        
        # Update all recipients to paid
        recipients = distribution.get("recipients", [])
        for r in recipients:
            if r.get("status") == "pending" or r.get("status") == "approved":
                r["status"] = "paid"
                r["paid_at"] = execution_date
                r["payment_reference"] = data.get("payment_reference", "")
        
        await db.distributions.update_one(
            {"distribution_id": distribution_id},
            {"$set": {
                "status": "completed",
                "execution_date": execution_date,
                "recipients": recipients,
                "updated_at": execution_date
            }}
        )
        
        # Create ledger entry for the completed distribution (debit - funds leaving trust)
        ledger_entry = None
        if distribution.get("rm_id"):
            try:
                ledger_entry = await create_governance_ledger_entry(
                    portfolio_id=distribution.get("portfolio_id"),
                    user_id=user.user_id,
                    governance_type="distribution",
                    governance_id=distribution_id,
                    rm_id=distribution.get("rm_id"),
                    title=distribution.get("title", "Distribution"),
                    description=f"Executed on {execution_date[:10]}",
                    value=distribution.get("total_amount"),
                    entry_type="distribution",
                    balance_effect="debit",  # Distribution removes funds from trust
                    subject_code="21",
                    subject_name="Distribution"
                )
            except Exception as le_err:
                print(f"Warning: Could not create ledger entry: {le_err}")
        
        updated = await db.distributions.find_one({"distribution_id": distribution_id}, {"_id": 0})
        return success_message("Distribution executed", {
            "item": normalize_distribution(updated),
            "ledger_entry": ledger_entry
        })
    except Exception as e:
        print(f"Error executing distribution: {e}")
        return error_response("EXECUTE_ERROR", "Failed to execute distribution", status_code=500)


@router.post("/distributions/{distribution_id}/finalize")
async def finalize_distribution(distribution_id: str, data: dict, request: Request):
    """Finalize a distribution - locks it and creates ledger entry"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        distribution = await db.distributions.find_one(
            {"distribution_id": distribution_id, "user_id": user.user_id}
        )
        
        if not distribution:
            return error_response("NOT_FOUND", "Distribution not found", status_code=404)
        
        if distribution.get("locked"):
            return error_response("ALREADY_FINALIZED", "Distribution already finalized")
        
        finalized_at = datetime.now(timezone.utc).isoformat()
        finalized_by = data.get("finalized_by", user.name if hasattr(user, 'name') else "Unknown")
        
        await db.distributions.update_one(
            {"distribution_id": distribution_id},
            {"$set": {
                "status": "finalized",
                "locked": True,
                "locked_at": finalized_at,
                "finalized_at": finalized_at,
                "finalized_by": finalized_by,
                "updated_at": finalized_at
            }}
        )
        
        # Create ledger entry
        if distribution.get("rm_id"):
            try:
                await create_governance_ledger_entry(
                    portfolio_id=distribution.get("portfolio_id"),
                    user_id=user.user_id,
                    governance_type="distribution",
                    governance_id=distribution_id,
                    rm_id=distribution.get("rm_id"),
                    title=distribution.get("title", "Distribution"),
                    description=f"Finalized on {finalized_at[:10]}",
                    value=distribution.get("total_amount"),
                    entry_type="distribution",
                    balance_effect="debit",
                    subject_code="21",
                    subject_name="Distribution"
                )
            except Exception as le_err:
                print(f"Warning: Could not create ledger entry: {le_err}")
        
        updated = await db.distributions.find_one({"distribution_id": distribution_id}, {"_id": 0})
        return success_message("Distribution finalized", {"item": normalize_distribution(updated)})
    except Exception as e:
        print(f"Error finalizing distribution: {e}")
        return error_response("FINALIZE_ERROR", "Failed to finalize distribution", status_code=500)


@router.post("/distributions/{distribution_id}/amend")
async def create_distribution_amendment(distribution_id: str, data: dict, request: Request):
    """Create an amendment to a finalized distribution"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        original = await db.distributions.find_one(
            {"distribution_id": distribution_id, "user_id": user.user_id}
        )
        
        if not original:
            return error_response("NOT_FOUND", "Distribution not found", status_code=404)
        
        if not original.get("locked"):
            return error_response("NOT_FINALIZED", "Cannot amend an unlocked distribution. Edit it directly instead.")
        
        # Count existing amendments
        amendment_count = await db.distributions.count_documents({
            "parent_distribution_id": distribution_id,
            "user_id": user.user_id
        })
        
        new_revision = original.get("revision", 1) + amendment_count + 1
        
        rm_id = ""
        try:
            rm_id, _, _, _ = await generate_subject_rm_id(
                original.get("portfolio_id"), user.user_id, "21", "Distribution Amendment"
            )
        except Exception as e:
            print(f"Warning: Could not generate RM-ID: {e}")
        
        new_id = f"dist_{uuid.uuid4().hex[:12]}"
        
        amendment = {
            "distribution_id": new_id,
            "portfolio_id": original.get("portfolio_id"),
            "trust_id": original.get("trust_id"),
            "user_id": user.user_id,
            "title": f"{original.get('title', '')} (Amendment v{new_revision})",
            "distribution_type": original.get("distribution_type", "income"),
            "total_amount": original.get("total_amount", 0),
            "currency": original.get("currency", "USD"),
            "recipients": original.get("recipients", []),
            "rm_id": rm_id,
            "revision": new_revision,
            "parent_distribution_id": distribution_id,
            "is_amendment": True,
            "status": "draft",
            "locked": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "deleted_at": None
        }
        
        await db.distributions.insert_one(amendment)
        
        await db.distributions.update_one(
            {"distribution_id": distribution_id},
            {"$set": {"amended_by_id": new_id, "status": "amended"}}
        )
        
        # Remove MongoDB _id field before returning
        clean_amendment = {k: v for k, v in amendment.items() if k != "_id"}
        return success_message("Amendment created", {"item": normalize_distribution(clean_amendment)})
    except Exception as e:
        print(f"Error creating amendment: {e}")
        return error_response("AMEND_ERROR", "Failed to create amendment", status_code=500)


# ============ DISPUTES ============

def normalize_dispute(dispute: dict) -> dict:
    """Normalize dispute data for API responses"""
    if not dispute:
        return dispute
    dispute["id"] = dispute.get("dispute_id", "")
    if "locked" not in dispute:
        dispute["locked"] = dispute.get("status") in ("settled", "closed")
    return dispute


@router.get("/disputes")
async def get_disputes(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    sort_by: str = "created_at",
    sort_dir: str = "asc",
    limit: int = 100,
    offset: int = 0
):
    """Get disputes list"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        query = {"user_id": user.user_id, "deleted_at": None}
        if portfolio_id:
            query["portfolio_id"] = portfolio_id
        if trust_id:
            query["trust_id"] = trust_id
        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority
        
        sort_direction = 1 if sort_dir == "asc" else -1
        
        disputes = await db.disputes.find(query, {"_id": 0}).sort(
            sort_by, sort_direction
        ).skip(offset).limit(limit).to_list(limit)
        
        total = await db.disputes.count_documents(query)
        
        disputes = [normalize_dispute(d) for d in disputes]
        
        return success_list(
            items=disputes,
            total=total,
            sort_by=sort_by,
            sort_dir=sort_dir,
            empty_state=EMPTY_STATES["disputes"] if not disputes else None
        )
    except Exception as e:
        print(f"Error fetching disputes: {e}")
        return error_response("DB_ERROR", "Failed to fetch disputes", status_code=500)


@router.get("/disputes/board")
async def get_disputes_board(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None
):
    """Get disputes in kanban board format"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        query = {"user_id": user.user_id, "deleted_at": None}
        if portfolio_id:
            query["portfolio_id"] = portfolio_id
        if trust_id:
            query["trust_id"] = trust_id
        
        disputes = await db.disputes.find(query, {"_id": 0}).to_list(1000)
        
        if not disputes:
            return success_item({
                "has_data": False,
                "columns": [
                    {"id": "open", "title": "Open", "cards": []},
                    {"id": "in_progress", "title": "In Progress", "cards": []},
                    {"id": "mediation", "title": "Mediation", "cards": []},
                    {"id": "litigation", "title": "Litigation", "cards": []},
                    {"id": "settled", "title": "Settled", "cards": []},
                    {"id": "closed", "title": "Closed", "cards": []}
                ],
                "empty_state": EMPTY_STATES["disputes"]
            })
        
        # Group by status
        columns = {
            "open": {"id": "open", "title": "Open", "cards": []},
            "in_progress": {"id": "in_progress", "title": "In Progress", "cards": []},
            "mediation": {"id": "mediation", "title": "Mediation", "cards": []},
            "litigation": {"id": "litigation", "title": "Litigation", "cards": []},
            "settled": {"id": "settled", "title": "Settled", "cards": []},
            "closed": {"id": "closed", "title": "Closed", "cards": []},
            "appealed": {"id": "appealed", "title": "Appealed", "cards": []}
        }
        
        for d in disputes:
            status = d.get("status", "open")
            if status in columns:
                columns[status]["cards"].append(normalize_dispute(d))
        
        return success_item({
            "has_data": True,
            "columns": list(columns.values())
        })
    except Exception as e:
        print(f"Error fetching disputes board: {e}")
        return error_response("DB_ERROR", "Failed to fetch disputes board", status_code=500)


@router.get("/disputes/summary")
async def get_disputes_summary(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None
):
    """Get aggregated disputes summary"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        query = {"user_id": user.user_id, "deleted_at": None}
        if portfolio_id:
            query["portfolio_id"] = portfolio_id
        if trust_id:
            query["trust_id"] = trust_id
        
        disputes = await db.disputes.find(query, {"_id": 0}).to_list(1000)
        
        if not disputes:
            return success_item({
                "has_data": False,
                "total_disputes": 0,
                "open_disputes": 0,
                "total_exposure": 0,
                "by_status": {},
                "by_priority": {},
                "by_type": {},
                "empty_state": EMPTY_STATES["disputes"]
            })
        
        # Calculate summary
        total_exposure = sum(d.get("estimated_exposure", 0) or d.get("amount_claimed", 0) for d in disputes)
        open_disputes = len([d for d in disputes if d.get("status") not in ("settled", "closed")])
        
        by_status = {}
        by_priority = {}
        by_type = {}
        
        for d in disputes:
            status = d.get("status", "open")
            by_status[status] = by_status.get(status, 0) + 1
            
            priority = d.get("priority", "medium")
            by_priority[priority] = by_priority.get(priority, 0) + 1
            
            dtype = d.get("dispute_type", "beneficiary")
            by_type[dtype] = by_type.get(dtype, 0) + 1
        
        return success_item({
            "has_data": True,
            "total_disputes": len(disputes),
            "open_disputes": open_disputes,
            "total_exposure": total_exposure,
            "by_status": by_status,
            "by_priority": by_priority,
            "by_type": by_type
        })
    except Exception as e:
        print(f"Error fetching disputes summary: {e}")
        return error_response("DB_ERROR", "Failed to fetch summary", status_code=500)


@router.post("/disputes")
async def create_dispute(data: dict, request: Request):
    """Create a dispute record"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    if not data.get("portfolio_id"):
        return error_response("MISSING_PORTFOLIO", "Portfolio ID is required")
    if not data.get("title"):
        return error_response("MISSING_TITLE", "Dispute title is required")
    
    try:
        # Generate RM-ID using V2 allocator (atomic, unique)
        rm_id = ""
        try:
            # Extract related_to info from request if provided
            related_to = data.get("related_to")
            if not related_to and data.get("case_number"):
                # Use case number as relation key if provided
                related_to = {
                    "court_name": data.get("jurisdiction", ""),
                    "case_number": data.get("case_number")
                }
            
            rm_id = await allocate_rm_id_for_governance(
                portfolio_id=data.get("portfolio_id"),
                user_id=user.user_id,
                module_type="dispute",
                related_to=related_to
            )
        except Exception as e:
            print(f"Warning: Could not generate RM-ID: {e}")
        
        from models.governance import Dispute
        
        dispute = Dispute(
            portfolio_id=data.get("portfolio_id"),
            trust_id=data.get("trust_id"),
            user_id=user.user_id,
            title=data.get("title"),
            dispute_type=data.get("dispute_type", "beneficiary"),
            description=data.get("description", ""),
            rm_id=rm_id,
            case_number=data.get("case_number", ""),
            jurisdiction=data.get("jurisdiction", ""),
            filing_date=data.get("filing_date"),
            amount_claimed=data.get("amount_claimed", 0),
            currency=data.get("currency", "USD"),
            estimated_exposure=data.get("estimated_exposure", 0),
            priority=data.get("priority", "medium"),
            primary_counsel=data.get("primary_counsel", ""),
            counsel_firm=data.get("counsel_firm", ""),
            next_deadline=data.get("next_deadline"),
            next_hearing_date=data.get("next_hearing_date")
        )
        
        doc = dispute.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        
        await db.disputes.insert_one(doc)
        
        return success_item({k: v for k, v in doc.items() if k != "_id"})
    except Exception as e:
        print(f"Error creating dispute: {e}")
        return error_response("CREATE_ERROR", f"Failed to create dispute: {str(e)}", status_code=500)


@router.get("/disputes/{dispute_id}")
async def get_dispute(dispute_id: str, request: Request):
    """Get a single dispute - checks both V1 and V2 collections"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        # First check legacy V1 collection
        dispute = await db.disputes.find_one(
            {"dispute_id": dispute_id, "user_id": user.user_id},
            {"_id": 0}
        )
        
        if dispute:
            return success_item(normalize_dispute(dispute))
        
        # If not found, check V2 governance_records collection
        v2_record = await db.governance_records.find_one(
            {"id": dispute_id, "user_id": user.user_id, "module_type": "dispute", "status": {"$ne": "voided"}},
            {"_id": 0}
        )
        
        if v2_record:
            # Get the latest revision payload
            revision = await db.governance_revisions.find_one(
                {"id": v2_record.get("current_revision_id")},
                {"_id": 0}
            )
            
            payload = revision.get("payload_json", {}) if revision else {}
            
            # Transform V2 record to V1 format
            disp = {
                "dispute_id": v2_record["id"],
                "id": v2_record["id"],
                "portfolio_id": v2_record.get("portfolio_id"),
                "user_id": v2_record.get("user_id"),
                "title": v2_record.get("title") or payload.get("title", ""),
                "rm_id": v2_record.get("rm_id", ""),
                "status": "open" if v2_record.get("status") == "draft" else ("closed" if v2_record.get("status") == "finalized" else v2_record.get("status")),
                "locked": v2_record.get("status") == "finalized",
                "created_at": v2_record.get("created_at"),
                "finalized_at": v2_record.get("finalized_at"),
                "parties": payload.get("parties", []),
                "events": payload.get("events", []),
                # Merge payload fields
                **payload
            }
            return success_item(disp)
        
        return error_response("NOT_FOUND", "Dispute not found", status_code=404)
    except Exception as e:
        print(f"Error fetching dispute: {e}")
        return error_response("DB_ERROR", "Failed to fetch dispute", status_code=500)


@router.put("/disputes/{dispute_id}")
async def update_dispute(dispute_id: str, data: dict, request: Request):
    """Update a dispute (only if not settled/closed)"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        dispute = await db.disputes.find_one(
            {"dispute_id": dispute_id, "user_id": user.user_id}
        )
        
        if not dispute:
            return error_response("NOT_FOUND", "Dispute not found", status_code=404)
        
        # Check if locked
        is_locked = dispute.get("locked", False) or dispute.get("status") in ("settled", "closed")
        if is_locked:
            return error_response(
                "DISPUTE_LOCKED",
                "Dispute is closed and cannot be edited.",
                status_code=409
            )
        
        # Build update
        update_fields = {}
        allowed_fields = [
            "title", "dispute_type", "description", "case_number", "jurisdiction",
            "filing_date", "amount_claimed", "currency", "estimated_exposure",
            "priority", "status", "parties", "events", "primary_counsel",
            "counsel_firm", "counsel_contact", "next_deadline", "next_hearing_date",
            "statute_of_limitations", "related_document_ids", "related_meeting_ids"
        ]
        
        for field in allowed_fields:
            if field in data:
                update_fields[field] = data[field]
        
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.disputes.update_one(
            {"dispute_id": dispute_id},
            {"$set": update_fields}
        )
        
        updated = await db.disputes.find_one({"dispute_id": dispute_id}, {"_id": 0})
        return success_item(normalize_dispute(updated))
    except Exception as e:
        print(f"Error updating dispute: {e}")
        return error_response("UPDATE_ERROR", "Failed to update dispute", status_code=500)


@router.delete("/disputes/{dispute_id}")
async def delete_dispute(dispute_id: str, request: Request):
    """Delete a dispute - handles amendment chain cleanup"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        dispute = await db.disputes.find_one(
            {"dispute_id": dispute_id, "user_id": user.user_id}
        )
        
        if not dispute:
            return error_response("NOT_FOUND", "Dispute not found", status_code=404)
        
        # Can only delete open/draft disputes or amendments
        is_finalized = dispute.get("locked") or dispute.get("status") == "finalized"
        if is_finalized and not dispute.get("is_amendment"):
            return error_response("CANNOT_DELETE", "Cannot delete finalized records. Create an amendment instead.")
        
        # If this is an amendment, clean up the parent's amended_by_id
        parent_id = dispute.get("amends_dispute_id") or dispute.get("parent_dispute_id")
        if parent_id and dispute.get("is_amendment"):
            # Check if there are other amendments to this parent
            other_amendments = await db.disputes.count_documents({
                "dispute_id": {"$ne": dispute_id},
                "$or": [
                    {"amends_dispute_id": parent_id},
                    {"parent_dispute_id": parent_id}
                ],
                "deleted_at": None
            })
            
            if other_amendments == 0:
                # No other amendments - clear parent's amended_by_id
                await db.disputes.update_one(
                    {"dispute_id": parent_id},
                    {"$set": {"amended_by_id": None}}
                )
        
        # Soft delete the dispute
        await db.disputes.update_one(
            {"dispute_id": dispute_id},
            {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return success_message("Dispute deleted")
    except Exception as e:
        print(f"Error deleting dispute: {e}")
        return error_response("DELETE_ERROR", "Failed to delete dispute", status_code=500)


@router.post("/disputes/{dispute_id}/events")
async def add_dispute_event(dispute_id: str, data: dict, request: Request):
    """Add a timeline event to a dispute"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        dispute = await db.disputes.find_one(
            {"dispute_id": dispute_id, "user_id": user.user_id}
        )
        
        if not dispute:
            return error_response("NOT_FOUND", "Dispute not found", status_code=404)
        
        from models.governance import DisputeEvent
        
        event = DisputeEvent(
            event_type=data.get("event_type", "filing"),
            title=data.get("title", ""),
            description=data.get("description", ""),
            event_date=data.get("event_date", datetime.now(timezone.utc).isoformat()),
            documents=data.get("documents", []),
            created_by=data.get("created_by", ""),
            created_at=datetime.now(timezone.utc).isoformat()
        ).model_dump()
        
        events = dispute.get("events", [])
        events.append(event)
        
        await db.disputes.update_one(
            {"dispute_id": dispute_id},
            {"$set": {
                "events": events,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        updated = await db.disputes.find_one({"dispute_id": dispute_id}, {"_id": 0})
        return success_message("Event added", {"item": normalize_dispute(updated)})
    except Exception as e:
        print(f"Error adding event: {e}")
        return error_response("EVENT_ERROR", "Failed to add event", status_code=500)


@router.post("/disputes/{dispute_id}/parties")
async def add_dispute_party(dispute_id: str, data: dict, request: Request):
    """Add a party to a dispute"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        dispute = await db.disputes.find_one(
            {"dispute_id": dispute_id, "user_id": user.user_id}
        )
        
        if not dispute:
            return error_response("NOT_FOUND", "Dispute not found", status_code=404)
        
        from models.governance import DisputeParty
        
        party = DisputeParty(
            name=data.get("name", ""),
            role=data.get("role", "claimant"),
            contact_info=data.get("contact_info", ""),
            represented_by=data.get("represented_by", ""),
            notes=data.get("notes", "")
        ).model_dump()
        
        parties = dispute.get("parties", [])
        parties.append(party)
        
        await db.disputes.update_one(
            {"dispute_id": dispute_id},
            {"$set": {
                "parties": parties,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        updated = await db.disputes.find_one({"dispute_id": dispute_id}, {"_id": 0})
        return success_message("Party added", {"item": normalize_dispute(updated)})
    except Exception as e:
        print(f"Error adding party: {e}")
        return error_response("PARTY_ERROR", "Failed to add party", status_code=500)


@router.delete("/disputes/{dispute_id}/parties/{party_id}")
async def delete_dispute_party(dispute_id: str, party_id: str, request: Request):
    """Remove a party from a dispute"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        dispute = await db.disputes.find_one(
            {"dispute_id": dispute_id, "user_id": user.user_id}
        )
        
        if not dispute:
            return error_response("NOT_FOUND", "Dispute not found", status_code=404)
        
        if dispute.get("status") in ("settled", "closed"):
            return error_response("CLOSED", "Cannot modify a closed dispute")
        
        parties = dispute.get("parties", [])
        parties = [p for p in parties if p.get("party_id") != party_id]
        
        await db.disputes.update_one(
            {"dispute_id": dispute_id},
            {"$set": {
                "parties": parties,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return success_message("Party removed")
    except Exception as e:
        print(f"Error removing party: {e}")
        return error_response("PARTY_ERROR", "Failed to remove party", status_code=500)


@router.delete("/disputes/{dispute_id}/events/{event_id}")
async def delete_dispute_event(dispute_id: str, event_id: str, request: Request):
    """Remove an event from a dispute timeline"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        dispute = await db.disputes.find_one(
            {"dispute_id": dispute_id, "user_id": user.user_id}
        )
        
        if not dispute:
            return error_response("NOT_FOUND", "Dispute not found", status_code=404)
        
        if dispute.get("status") in ("settled", "closed"):
            return error_response("CLOSED", "Cannot modify a closed dispute")
        
        events = dispute.get("events", [])
        events = [e for e in events if e.get("event_id") != event_id]
        
        await db.disputes.update_one(
            {"dispute_id": dispute_id},
            {"$set": {
                "events": events,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return success_message("Event removed")
    except Exception as e:
        print(f"Error removing event: {e}")
        return error_response("EVENT_ERROR", "Failed to remove event", status_code=500)


@router.post("/disputes/{dispute_id}/resolve")
async def resolve_dispute(dispute_id: str, data: dict, request: Request):
    """Resolve/close a dispute and create ledger entry"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        dispute = await db.disputes.find_one(
            {"dispute_id": dispute_id, "user_id": user.user_id}
        )
        
        if not dispute:
            return error_response("NOT_FOUND", "Dispute not found", status_code=404)
        
        if dispute.get("status") in ("settled", "closed"):
            return error_response("ALREADY_RESOLVED", "Dispute is already resolved")
        
        from models.governance import DisputeResolution
        
        resolution = DisputeResolution(
            resolution_type=data.get("resolution_type", "settlement"),
            resolution_date=datetime.now(timezone.utc).isoformat(),
            summary=data.get("summary", ""),
            terms=data.get("terms", ""),
            monetary_award=data.get("monetary_award", 0),
            currency=data.get("currency", dispute.get("currency", "USD")),
            in_favor_of=data.get("in_favor_of", ""),
            documents=data.get("documents", [])
        ).model_dump()
        
        new_status = "settled" if data.get("resolution_type") == "settlement" else "closed"
        
        await db.disputes.update_one(
            {"dispute_id": dispute_id},
            {"$set": {
                "resolution": resolution,
                "status": new_status,
                "locked": True,
                "locked_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Create ledger entry for the resolved dispute
        ledger_entry = None
        if dispute.get("rm_id"):
            try:
                # Determine balance effect based on resolution
                monetary_award = data.get("monetary_award", 0)
                in_favor_of = data.get("in_favor_of", "")
                # If award is positive and in favor of trust, it's a credit
                balance_effect = "credit" if monetary_award > 0 and "trust" in in_favor_of.lower() else "debit"
                
                ledger_entry = await create_governance_ledger_entry(
                    portfolio_id=dispute.get("portfolio_id"),
                    user_id=user.user_id,
                    governance_type="dispute",
                    governance_id=dispute_id,
                    rm_id=dispute.get("rm_id"),
                    title=dispute.get("title", "Dispute"),
                    description=f"Resolved: {data.get('resolution_type', 'settlement')} - {data.get('summary', '')[:50]}",
                    value=monetary_award if monetary_award > 0 else None,
                    entry_type="dispute_resolution",
                    balance_effect=balance_effect,
                    subject_code="22",
                    subject_name="Dispute"
                )
            except Exception as le_err:
                print(f"Warning: Could not create ledger entry: {le_err}")
        
        updated = await db.disputes.find_one({"dispute_id": dispute_id}, {"_id": 0})
        return success_message("Dispute resolved", {
            "item": normalize_dispute(updated),
            "ledger_entry": ledger_entry
        })
    except Exception as e:
        print(f"Error resolving dispute: {e}")
        return error_response("RESOLVE_ERROR", "Failed to resolve dispute", status_code=500)


@router.post("/disputes/{dispute_id}/finalize")
async def finalize_dispute(dispute_id: str, data: dict, request: Request):
    """Finalize a dispute - locks it permanently"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        dispute = await db.disputes.find_one(
            {"dispute_id": dispute_id, "user_id": user.user_id}
        )
        
        if not dispute:
            return error_response("NOT_FOUND", "Dispute not found", status_code=404)
        
        if dispute.get("locked"):
            return error_response("ALREADY_FINALIZED", "Dispute already finalized")
        
        finalized_at = datetime.now(timezone.utc).isoformat()
        finalized_by = data.get("finalized_by", user.name if hasattr(user, 'name') else "Unknown")
        
        new_status = "closed" if dispute.get("status") not in ("settled", "closed") else dispute.get("status")
        
        await db.disputes.update_one(
            {"dispute_id": dispute_id},
            {"$set": {
                "status": new_status,
                "locked": True,
                "locked_at": finalized_at,
                "finalized_at": finalized_at,
                "finalized_by": finalized_by,
                "updated_at": finalized_at
            }}
        )
        
        # Create ledger entry
        if dispute.get("rm_id"):
            try:
                await create_governance_ledger_entry(
                    portfolio_id=dispute.get("portfolio_id"),
                    user_id=user.user_id,
                    governance_type="dispute",
                    governance_id=dispute_id,
                    rm_id=dispute.get("rm_id"),
                    title=dispute.get("title", "Dispute"),
                    description=f"Finalized on {finalized_at[:10]}",
                    value=dispute.get("amount_claimed"),
                    entry_type="dispute",
                    balance_effect="neutral",
                    subject_code="22",
                    subject_name="Dispute"
                )
            except Exception as le_err:
                print(f"Warning: Could not create ledger entry: {le_err}")
        
        updated = await db.disputes.find_one({"dispute_id": dispute_id}, {"_id": 0})
        return success_message("Dispute finalized", {"item": normalize_dispute(updated)})
    except Exception as e:
        print(f"Error finalizing dispute: {e}")
        return error_response("FINALIZE_ERROR", "Failed to finalize dispute", status_code=500)


@router.post("/disputes/{dispute_id}/set-outcome")
async def set_dispute_outcome(dispute_id: str, data: dict, request: Request):
    """Set the outcome/status of a finalized dispute (settled, closed, mediation, etc.)
    This allows changing the outcome without creating an amendment.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        dispute = await db.disputes.find_one(
            {"dispute_id": dispute_id, "user_id": user.user_id}
        )
        
        if not dispute:
            return error_response("NOT_FOUND", "Dispute not found", status_code=404)
        
        new_status = data.get("status")
        valid_outcomes = ["open", "in_progress", "mediation", "litigation", "settled", "closed", "appealed"]
        
        if new_status not in valid_outcomes:
            return error_response("INVALID_STATUS", f"Status must be one of: {', '.join(valid_outcomes)}")
        
        updated_at = datetime.now(timezone.utc).isoformat()
        
        await db.disputes.update_one(
            {"dispute_id": dispute_id},
            {"$set": {
                "status": new_status,
                "updated_at": updated_at
            }}
        )
        
        updated = await db.disputes.find_one({"dispute_id": dispute_id}, {"_id": 0})
        return success_message(f"Dispute outcome set to {new_status}", {"item": normalize_dispute(updated)})
    except Exception as e:
        print(f"Error setting dispute outcome: {e}")
        return error_response("OUTCOME_ERROR", "Failed to set dispute outcome", status_code=500)


@router.post("/disputes/{dispute_id}/amend")
async def create_dispute_amendment(dispute_id: str, data: dict, request: Request):
    """Create an amendment to a finalized dispute"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        original = await db.disputes.find_one(
            {"dispute_id": dispute_id, "user_id": user.user_id}
        )
        
        if not original:
            return error_response("NOT_FOUND", "Dispute not found", status_code=404)
        
        if not original.get("locked"):
            return error_response("NOT_FINALIZED", "Cannot amend an unlocked dispute. Edit it directly instead.")
        
        amendment_count = await db.disputes.count_documents({
            "parent_dispute_id": dispute_id,
            "user_id": user.user_id
        })
        
        new_revision = original.get("revision", 1) + amendment_count + 1
        
        rm_id = ""
        try:
            rm_id, _, _, _ = await generate_subject_rm_id(
                original.get("portfolio_id"), user.user_id, "22", "Dispute Amendment"
            )
        except Exception as e:
            print(f"Warning: Could not generate RM-ID: {e}")
        
        new_id = f"disp_{uuid.uuid4().hex[:12]}"
        
        amendment = {
            "dispute_id": new_id,
            "portfolio_id": original.get("portfolio_id"),
            "trust_id": original.get("trust_id"),
            "user_id": user.user_id,
            "title": f"{original.get('title', '')} (Amendment v{new_revision})",
            "dispute_type": original.get("dispute_type", "beneficiary"),
            "description": original.get("description", ""),
            "amount_claimed": original.get("amount_claimed", 0),
            "currency": original.get("currency", "USD"),
            "parties": original.get("parties", []),
            "events": [],
            "rm_id": rm_id,
            "revision": new_revision,
            "parent_dispute_id": dispute_id,
            "is_amendment": True,
            "status": "open",
            "priority": original.get("priority", "medium"),
            "locked": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "deleted_at": None
        }
        
        await db.disputes.insert_one(amendment)
        
        await db.disputes.update_one(
            {"dispute_id": dispute_id},
            {"$set": {"amended_by_id": new_id}}
        )
        
        # Remove MongoDB _id field before returning
        clean_amendment = {k: v for k, v in amendment.items() if k != "_id"}
        return success_message("Amendment created", {"item": normalize_dispute(clean_amendment)})
    except Exception as e:
        print(f"Error creating amendment: {e}")
        return error_response("AMEND_ERROR", "Failed to create amendment", status_code=500)


# ============ INSURANCE POLICIES (Stub with Empty State) ============

@router.get("/insurance-policies")
async def get_insurance_policies(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    limit: int = 100,
    offset: int = 0
):
    """Get insurance policies list"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        query = {"user_id": user.user_id, "deleted_at": None}
        if portfolio_id:
            query["portfolio_id"] = portfolio_id
        if trust_id:
            query["trust_id"] = trust_id
        if status:
            query["status"] = status
        
        sort_direction = 1 if sort_dir == "asc" else -1
        
        policies = await db.insurance_policies.find(query, {"_id": 0}).sort(
            sort_by, sort_direction
        ).skip(offset).limit(limit).to_list(limit)
        
        total = await db.insurance_policies.count_documents(query)
        
        return success_list(
            items=policies,
            total=total,
            sort_by=sort_by,
            sort_dir=sort_dir,
            empty_state=EMPTY_STATES["insurance"] if total == 0 else None
        )
    except Exception as e:
        print(f"Error fetching insurance policies: {e}")
        return error_response("FETCH_ERROR", "Failed to fetch insurance policies", status_code=500)


@router.get("/insurance-policies/summary")
async def get_insurance_summary(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None
):
    """Get insurance policies summary"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        query = {"user_id": user.user_id, "deleted_at": None}
        if portfolio_id:
            query["portfolio_id"] = portfolio_id
        if trust_id:
            query["trust_id"] = trust_id
        
        policies = await db.insurance_policies.find(query, {"_id": 0}).to_list(1000)
        
        active_policies = [p for p in policies if p.get("status") == "active"]
        total_death_benefit = sum(p.get("death_benefit", 0) for p in active_policies)
        total_cash_value = sum(p.get("cash_value", 0) for p in active_policies)
        total_annual_premium = sum(
            p.get("premium_amount", 0) * (12 if p.get("premium_frequency") == "monthly" else
                                          4 if p.get("premium_frequency") == "quarterly" else
                                          2 if p.get("premium_frequency") == "semi_annual" else 1)
            for p in active_policies
        )
        
        return success_item({
            "has_data": len(policies) > 0,
            "total_policies": len(policies),
            "active_policies": len(active_policies),
            "total_death_benefit": total_death_benefit,
            "total_cash_value": total_cash_value,
            "total_annual_premium": total_annual_premium,
            "policies_by_type": {},
            "empty_state": EMPTY_STATES["insurance"] if len(policies) == 0 else None
        })
    except Exception as e:
        print(f"Error fetching insurance summary: {e}")
        return error_response("FETCH_ERROR", "Failed to fetch insurance summary", status_code=500)


@router.post("/insurance-policies")
async def create_insurance_policy(data: dict, request: Request):
    """Create an insurance policy record"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        from models.governance import InsurancePolicy
        
        portfolio_id = data.get("portfolio_id")
        trust_id = data.get("trust_id")
        
        if not portfolio_id:
            return error_response("MISSING_PORTFOLIO", "portfolio_id is required")
        
        # Generate RM-ID using V2 allocator (atomic, unique)
        rm_id = await allocate_rm_id_for_governance(
            portfolio_id=portfolio_id,
            user_id=user.user_id,
            module_type="insurance",
            related_to=data.get("related_to")
        )
        
        policy = InsurancePolicy(
            trust_id=trust_id,
            portfolio_id=portfolio_id,
            user_id=user.user_id,
            title=data.get("title", "Untitled Policy"),
            policy_number=data.get("policy_number", ""),
            policy_type=data.get("policy_type", "whole_life"),
            rm_id=rm_id,
            carrier_name=data.get("carrier_name", ""),
            carrier_contact=data.get("carrier_contact", ""),
            carrier_phone=data.get("carrier_phone", ""),
            agent_name=data.get("agent_name", ""),
            agent_contact=data.get("agent_contact", ""),
            insured_name=data.get("insured_name", ""),
            insured_dob=data.get("insured_dob"),
            death_benefit=float(data.get("death_benefit", 0)),
            cash_value=float(data.get("cash_value", 0)),
            currency=data.get("currency", "USD"),
            premium_amount=float(data.get("premium_amount", 0)),
            premium_frequency=data.get("premium_frequency", "monthly"),
            premium_due_date=data.get("premium_due_date"),
            effective_date=data.get("effective_date"),
            maturity_date=data.get("maturity_date"),
            expiration_date=data.get("expiration_date"),
            notes=data.get("notes", ""),
        )
        
        doc = policy.model_dump()
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        doc["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.insurance_policies.insert_one(doc)
        
        return success_message("Insurance policy created", {"item": {k: v for k, v in doc.items() if k != "_id"}})
    except Exception as e:
        print(f"Error creating insurance policy: {e}")
        return error_response("CREATE_ERROR", "Failed to create insurance policy", status_code=500)


@router.get("/insurance-policies/{policy_id}")
async def get_insurance_policy(policy_id: str, request: Request):
    """Get a single insurance policy - checks both V1 and V2 collections"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        # First check legacy V1 collection
        policy = await db.insurance_policies.find_one(
            {"policy_id": policy_id, "user_id": user.user_id, "deleted_at": None},
            {"_id": 0}
        )
        
        if policy:
            return {"item": policy}
        
        # If not found, check V2 governance_records collection
        v2_record = await db.governance_records.find_one(
            {"id": policy_id, "user_id": user.user_id, "module_type": "insurance", "status": {"$ne": "voided"}},
            {"_id": 0}
        )
        
        if v2_record:
            # Get the latest revision payload
            revision = await db.governance_revisions.find_one(
                {"id": v2_record.get("current_revision_id")},
                {"_id": 0}
            )
            
            payload = revision.get("payload_json", {}) if revision else {}
            
            # Transform V2 record to V1 format
            policy = {
                "policy_id": v2_record["id"],
                "id": v2_record["id"],
                "portfolio_id": v2_record.get("portfolio_id"),
                "user_id": v2_record.get("user_id"),
                "title": v2_record.get("title") or payload.get("title", ""),
                "rm_id": v2_record.get("rm_id", ""),
                "status": "active" if v2_record.get("status") == "finalized" else v2_record.get("status", "draft"),
                "locked": v2_record.get("status") == "finalized",
                "created_at": v2_record.get("created_at"),
                "finalized_at": v2_record.get("finalized_at"),
                # Merge payload fields
                **payload
            }
            return {"item": policy}
        
        return error_response("NOT_FOUND", "Insurance policy not found", status_code=404)
    except Exception as e:
        print(f"Error fetching insurance policy: {e}")
        return error_response("FETCH_ERROR", "Failed to fetch insurance policy", status_code=500)


@router.put("/insurance-policies/{policy_id}")
async def update_insurance_policy(policy_id: str, data: dict, request: Request):
    """Update an insurance policy"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        policy = await db.insurance_policies.find_one(
            {"policy_id": policy_id, "user_id": user.user_id}
        )
        
        if not policy:
            return error_response("NOT_FOUND", "Insurance policy not found", status_code=404)
        
        if policy.get("locked"):
            return error_response("LOCKED", "This policy is locked and cannot be edited", status_code=409)
        
        # Define allowed update fields
        allowed_fields = [
            "title", "policy_number", "policy_type", "carrier_name", "carrier_contact",
            "carrier_phone", "carrier_address", "agent_name", "agent_contact",
            "insured_name", "insured_dob", "insured_ssn_last4", "death_benefit",
            "cash_value", "currency", "premium_amount", "premium_frequency",
            "premium_due_date", "effective_date", "maturity_date", "expiration_date",
            "status", "loan_balance", "loan_interest_rate", "notes"
        ]
        
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.insurance_policies.update_one(
            {"policy_id": policy_id},
            {"$set": update_data}
        )
        
        updated = await db.insurance_policies.find_one({"policy_id": policy_id}, {"_id": 0})
        return success_message("Insurance policy updated", {"item": updated})
    except Exception as e:
        print(f"Error updating insurance policy: {e}")
        return error_response("UPDATE_ERROR", "Failed to update insurance policy", status_code=500)


@router.delete("/insurance-policies/{policy_id}")
async def delete_insurance_policy(policy_id: str, request: Request):
    """Delete an insurance policy - handles amendment chain cleanup"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        policy = await db.insurance_policies.find_one(
            {"policy_id": policy_id, "user_id": user.user_id}
        )
        
        if not policy:
            return error_response("NOT_FOUND", "Insurance policy not found", status_code=404)
        
        # Allow deletion of drafts and amendments
        is_finalized = policy.get("locked") or policy.get("status") == "finalized"
        if is_finalized and not policy.get("is_amendment"):
            return error_response("CANNOT_DELETE", "Cannot delete finalized policy. Create an amendment instead.")
        
        # If this is an amendment, clean up the parent's amended_by_id
        parent_id = policy.get("amends_policy_id") or policy.get("parent_policy_id")
        if parent_id and policy.get("is_amendment"):
            other_amendments = await db.insurance_policies.count_documents({
                "policy_id": {"$ne": policy_id},
                "$or": [
                    {"amends_policy_id": parent_id},
                    {"parent_policy_id": parent_id}
                ],
                "deleted_at": None
            })
            
            if other_amendments == 0:
                await db.insurance_policies.update_one(
                    {"policy_id": parent_id},
                    {"$set": {"amended_by_id": None}}
                )
        
        await db.insurance_policies.update_one(
            {"policy_id": policy_id},
            {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return success_message("Insurance policy deleted")
    except Exception as e:
        print(f"Error deleting insurance policy: {e}")
        return error_response("DELETE_ERROR", "Failed to delete insurance policy", status_code=500)


@router.post("/insurance-policies/{policy_id}/beneficiaries")
async def add_insurance_beneficiary(policy_id: str, data: dict, request: Request):
    """Add a beneficiary to an insurance policy"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        from models.governance import InsuranceBeneficiary
        
        policy = await db.insurance_policies.find_one(
            {"policy_id": policy_id, "user_id": user.user_id}
        )
        
        if not policy:
            return error_response("NOT_FOUND", "Insurance policy not found", status_code=404)
        
        beneficiary = InsuranceBeneficiary(
            party_id=data.get("party_id"),
            name=data.get("name", ""),
            relationship=data.get("relationship", ""),
            percentage=float(data.get("percentage", 0)),
            beneficiary_type=data.get("beneficiary_type", "primary"),
            notes=data.get("notes", "")
        ).model_dump()
        
        await db.insurance_policies.update_one(
            {"policy_id": policy_id},
            {
                "$push": {"beneficiaries": beneficiary},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        updated = await db.insurance_policies.find_one({"policy_id": policy_id}, {"_id": 0})
        return success_message("Beneficiary added", {"item": updated})
    except Exception as e:
        print(f"Error adding beneficiary: {e}")
        return error_response("ADD_ERROR", "Failed to add beneficiary", status_code=500)


@router.post("/insurance-policies/{policy_id}/premium-payments")
async def add_premium_payment(policy_id: str, data: dict, request: Request):
    """Record a premium payment"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        from models.governance import InsurancePremiumPayment
        
        policy = await db.insurance_policies.find_one(
            {"policy_id": policy_id, "user_id": user.user_id}
        )
        
        if not policy:
            return error_response("NOT_FOUND", "Insurance policy not found", status_code=404)
        
        payment = InsurancePremiumPayment(
            payment_date=data.get("payment_date", datetime.now(timezone.utc).isoformat()[:10]),
            amount=float(data.get("amount", 0)),
            currency=data.get("currency", policy.get("currency", "USD")),
            payment_method=data.get("payment_method", ""),
            confirmation_number=data.get("confirmation_number", ""),
            notes=data.get("notes", "")
        ).model_dump()
        
        await db.insurance_policies.update_one(
            {"policy_id": policy_id},
            {
                "$push": {"premium_payments": payment},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        updated = await db.insurance_policies.find_one({"policy_id": policy_id}, {"_id": 0})
        return success_message("Premium payment recorded", {"item": updated})
    except Exception as e:
        print(f"Error adding premium payment: {e}")
        return error_response("ADD_ERROR", "Failed to record premium payment", status_code=500)


@router.post("/insurance-policies/{policy_id}/finalize")
async def finalize_insurance_policy(policy_id: str, data: dict, request: Request):
    """Finalize an insurance policy record - locks it permanently"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        policy = await db.insurance_policies.find_one(
            {"policy_id": policy_id, "user_id": user.user_id}
        )
        
        if not policy:
            return error_response("NOT_FOUND", "Insurance policy not found", status_code=404)
        
        if policy.get("locked"):
            return error_response("ALREADY_FINALIZED", "Policy already finalized")
        
        finalized_at = datetime.now(timezone.utc).isoformat()
        finalized_by = data.get("finalized_by", user.name if hasattr(user, 'name') else "Unknown")
        
        await db.insurance_policies.update_one(
            {"policy_id": policy_id},
            {"$set": {
                "locked": True,
                "locked_at": finalized_at,
                "finalized_at": finalized_at,
                "finalized_by": finalized_by,
                "updated_at": finalized_at
            }}
        )
        
        # Create ledger entry
        if policy.get("rm_id"):
            try:
                await create_governance_ledger_entry(
                    portfolio_id=policy.get("portfolio_id"),
                    user_id=user.user_id,
                    governance_type="insurance",
                    governance_id=policy_id,
                    rm_id=policy.get("rm_id"),
                    title=policy.get("title", "Insurance Policy"),
                    description=f"Policy finalized on {finalized_at[:10]}",
                    value=policy.get("death_benefit"),
                    entry_type="insurance",
                    balance_effect="neutral",
                    subject_code="23",
                    subject_name="Insurance"
                )
            except Exception as le_err:
                print(f"Warning: Could not create ledger entry: {le_err}")
        
        updated = await db.insurance_policies.find_one({"policy_id": policy_id}, {"_id": 0})
        return success_message("Policy finalized", {"item": updated})
    except Exception as e:
        print(f"Error finalizing policy: {e}")
        return error_response("FINALIZE_ERROR", "Failed to finalize policy", status_code=500)


@router.post("/insurance-policies/{policy_id}/amend")
async def create_insurance_amendment(policy_id: str, data: dict, request: Request):
    """Create an amendment to a finalized insurance policy"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        original = await db.insurance_policies.find_one(
            {"policy_id": policy_id, "user_id": user.user_id}
        )
        
        if not original:
            return error_response("NOT_FOUND", "Insurance policy not found", status_code=404)
        
        if not original.get("locked"):
            return error_response("NOT_FINALIZED", "Cannot amend an unlocked policy. Edit it directly instead.")
        
        amendment_count = await db.insurance_policies.count_documents({
            "parent_policy_id": policy_id,
            "user_id": user.user_id
        })
        
        new_revision = original.get("revision", 1) + amendment_count + 1
        
        rm_id = ""
        try:
            rm_id, _, _, _ = await generate_subject_rm_id(
                original.get("portfolio_id"), user.user_id, "23", "Insurance Amendment"
            )
        except Exception as e:
            print(f"Warning: Could not generate RM-ID: {e}")
        
        new_id = f"ins_{uuid.uuid4().hex[:12]}"
        
        amendment = {
            "policy_id": new_id,
            "portfolio_id": original.get("portfolio_id"),
            "trust_id": original.get("trust_id"),
            "user_id": user.user_id,
            "title": f"{original.get('title', '')} (Amendment v{new_revision})",
            "policy_type": original.get("policy_type", "whole_life"),
            "policy_number": original.get("policy_number", ""),
            "carrier_name": original.get("carrier_name", ""),
            "death_benefit": original.get("death_benefit", 0),
            "cash_value": original.get("cash_value", 0),
            "premium_amount": original.get("premium_amount", 0),
            "beneficiaries": original.get("beneficiaries", []),
            "rm_id": rm_id,
            "revision": new_revision,
            "parent_policy_id": policy_id,
            "is_amendment": True,
            "status": "active",
            "locked": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "deleted_at": None
        }
        
        await db.insurance_policies.insert_one(amendment)
        
        await db.insurance_policies.update_one(
            {"policy_id": policy_id},
            {"$set": {"amended_by_id": new_id}}
        )
        
        # Remove MongoDB _id field before returning
        clean_amendment = {k: v for k, v in amendment.items() if k != "_id"}
        return success_message("Amendment created", {"item": clean_amendment})
    except Exception as e:
        print(f"Error creating amendment: {e}")
        return error_response("AMEND_ERROR", "Failed to create amendment", status_code=500)


# ============ TRUSTEE COMPENSATION ============

@router.get("/compensation")
async def get_compensation(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    limit: int = 100,
    offset: int = 0
):
    """Get compensation records list"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        query = {"user_id": user.user_id, "deleted_at": None}
        if portfolio_id:
            query["portfolio_id"] = portfolio_id
        if trust_id:
            query["trust_id"] = trust_id
        if status:
            query["status"] = status
        
        sort_direction = -1 if sort_dir == "desc" else 1
        
        entries = await db.compensation_entries.find(query, {"_id": 0}).sort(
            sort_by, sort_direction
        ).skip(offset).limit(limit).to_list(limit)
        
        total = await db.compensation_entries.count_documents(query)
        
        if total == 0:
            return success_list(
                items=[],
                total=0,
                sort_by=sort_by,
                sort_dir=sort_dir,
                empty_state=EMPTY_STATES["compensation"]
            )
        
        return success_list(
            items=entries,
            total=total,
            sort_by=sort_by,
            sort_dir=sort_dir
        )
    except Exception as e:
        print(f"Error fetching compensation: {e}")
        return error_response("DB_ERROR", "Failed to fetch compensation entries", status_code=500)


@router.get("/compensation/summary")
async def get_compensation_summary(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None,
    fiscal_year: Optional[str] = None
):
    """Get compensation summary with reasonableness metrics"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        query = {"user_id": user.user_id, "deleted_at": None}
        if portfolio_id:
            query["portfolio_id"] = portfolio_id
        if trust_id:
            query["trust_id"] = trust_id
        if fiscal_year:
            query["fiscal_year"] = fiscal_year
        
        entries = await db.compensation_entries.find(query, {"_id": 0}).to_list(1000)
        
        if not entries:
            return success_item({
                "has_data": False,
                "total_compensation": 0,
                "total_hours": 0,
                "entry_count": 0,
                "by_recipient": [],
                "by_type": [],
                "empty_state": EMPTY_STATES["compensation"]
            })
        
        total_compensation = sum(e.get("amount", 0) for e in entries)
        total_hours = sum(e.get("hours_worked", 0) for e in entries)
        
        # Group by recipient
        by_recipient = {}
        for e in entries:
            name = e.get("recipient_name", "Unknown")
            if name not in by_recipient:
                by_recipient[name] = {"name": name, "role": e.get("recipient_role", ""), "total": 0, "count": 0}
            by_recipient[name]["total"] += e.get("amount", 0)
            by_recipient[name]["count"] += 1
        
        # Group by type
        by_type = {}
        for e in entries:
            comp_type = e.get("compensation_type", "other")
            if comp_type not in by_type:
                by_type[comp_type] = {"type": comp_type, "total": 0, "count": 0}
            by_type[comp_type]["total"] += e.get("amount", 0)
            by_type[comp_type]["count"] += 1
        
        return success_item({
            "has_data": True,
            "total_compensation": total_compensation,
            "total_hours": total_hours,
            "entry_count": len(entries),
            "by_recipient": list(by_recipient.values()),
            "by_type": list(by_type.values())
        })
    except Exception as e:
        print(f"Error fetching compensation summary: {e}")
        return error_response("DB_ERROR", "Failed to fetch summary", status_code=500)


@router.post("/compensation")
async def create_compensation_entry(data: dict, request: Request):
    """Create a compensation entry"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    if not data.get("portfolio_id"):
        return error_response("MISSING_PORTFOLIO", "Portfolio ID is required")
    if not data.get("title"):
        return error_response("MISSING_TITLE", "Title is required")
    if not data.get("recipient_name"):
        return error_response("MISSING_RECIPIENT", "Recipient name is required")
    
    try:
        # Generate RM-ID using V2 allocator (atomic, unique)
        rm_id = ""
        try:
            rm_id = await allocate_rm_id_for_governance(
                portfolio_id=data.get("portfolio_id"),
                user_id=user.user_id,
                module_type="compensation",
                related_to=data.get("related_to")
            )
        except Exception as e:
            print(f"Warning: Could not generate RM-ID: {e}")
        
        from models.governance import CompensationEntry
        
        entry = CompensationEntry(
            portfolio_id=data.get("portfolio_id"),
            trust_id=data.get("trust_id"),
            user_id=user.user_id,
            rm_id=rm_id,
            recipient_party_id=data.get("recipient_party_id"),
            recipient_name=data.get("recipient_name"),
            recipient_role=data.get("recipient_role", "trustee"),
            title=data.get("title"),
            compensation_type=data.get("compensation_type", "annual_fee"),
            description=data.get("description", ""),
            amount=float(data.get("amount", 0)),
            currency=data.get("currency", "USD"),
            payment_method=data.get("payment_method", ""),
            period_start=data.get("period_start"),
            period_end=data.get("period_end"),
            fiscal_year=data.get("fiscal_year"),
            basis_of_calculation=data.get("basis_of_calculation", ""),
            comparable_fees=data.get("comparable_fees", ""),
            trust_assets_value=float(data.get("trust_assets_value", 0)),
            fee_percentage=float(data.get("fee_percentage", 0)),
            hours_worked=float(data.get("hours_worked", 0)),
            hourly_rate=float(data.get("hourly_rate", 0)),
            authorized_meeting_id=data.get("authorized_meeting_id"),
            authorization_notes=data.get("authorization_notes", ""),
            notes=data.get("notes", "")
        )
        
        doc = entry.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        
        await db.compensation_entries.insert_one(doc)
        
        return success_item({k: v for k, v in doc.items() if k != "_id"})
    except Exception as e:
        print(f"Error creating compensation: {e}")
        return error_response("CREATE_ERROR", "Failed to create compensation entry", status_code=500)


@router.get("/compensation/{compensation_id}")
async def get_compensation_entry(compensation_id: str, request: Request):
    """Get a single compensation entry - checks both V1 and V2 collections"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        # First check legacy V1 collection
        entry = await db.compensation_entries.find_one(
            {"compensation_id": compensation_id, "user_id": user.user_id},
            {"_id": 0}
        )
        
        if entry:
            return success_item(entry)
        
        # If not found, check V2 governance_records collection
        v2_record = await db.governance_records.find_one(
            {"id": compensation_id, "user_id": user.user_id, "module_type": "compensation", "status": {"$ne": "voided"}},
            {"_id": 0}
        )
        
        if v2_record:
            # Get the latest revision payload
            revision = await db.governance_revisions.find_one(
                {"id": v2_record.get("current_revision_id")},
                {"_id": 0}
            )
            
            payload = revision.get("payload_json", {}) if revision else {}
            
            # Transform V2 record to V1 format
            comp = {
                "compensation_id": v2_record["id"],
                "id": v2_record["id"],
                "portfolio_id": v2_record.get("portfolio_id"),
                "user_id": v2_record.get("user_id"),
                "title": v2_record.get("title") or payload.get("title", ""),
                "rm_id": v2_record.get("rm_id", ""),
                "status": v2_record.get("status", "draft"),
                "locked": v2_record.get("status") == "finalized",
                "created_at": v2_record.get("created_at"),
                "finalized_at": v2_record.get("finalized_at"),
                # Merge payload fields
                **payload
            }
            return success_item(comp)
        
        return error_response("NOT_FOUND", "Compensation entry not found", status_code=404)
    except Exception as e:
        print(f"Error fetching compensation: {e}")
        return error_response("DB_ERROR", "Failed to fetch entry", status_code=500)


@router.put("/compensation/{compensation_id}")
async def update_compensation_entry(compensation_id: str, data: dict, request: Request):
    """Update a compensation entry"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        entry = await db.compensation_entries.find_one(
            {"compensation_id": compensation_id, "user_id": user.user_id}
        )
        
        if not entry:
            return error_response("NOT_FOUND", "Compensation entry not found", status_code=404)
        
        if entry.get("locked"):
            return error_response("LOCKED", "Cannot update a locked entry", status_code=409)
        
        # Update fields
        update_fields = {}
        allowed_fields = [
            "title", "compensation_type", "description", "amount", "currency",
            "payment_method", "period_start", "period_end", "fiscal_year",
            "basis_of_calculation", "comparable_fees", "trust_assets_value",
            "fee_percentage", "hours_worked", "hourly_rate", "recipient_name",
            "recipient_role", "recipient_party_id", "notes"
        ]
        
        for field in allowed_fields:
            if field in data:
                update_fields[field] = data[field]
        
        if update_fields:
            update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.compensation_entries.update_one(
                {"compensation_id": compensation_id},
                {"$set": update_fields}
            )
        
        updated = await db.compensation_entries.find_one(
            {"compensation_id": compensation_id}, {"_id": 0}
        )
        return success_item(updated)
    except Exception as e:
        print(f"Error updating compensation: {e}")
        return error_response("UPDATE_ERROR", "Failed to update entry", status_code=500)


@router.delete("/compensation/{compensation_id}")
async def delete_compensation_entry(compensation_id: str, request: Request):
    """Delete a compensation entry - handles amendment chain cleanup"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        entry = await db.compensation_entries.find_one(
            {"compensation_id": compensation_id, "user_id": user.user_id}
        )
        
        if not entry:
            return error_response("NOT_FOUND", "Compensation entry not found", status_code=404)
        
        # Allow deletion of drafts and amendments
        is_finalized = entry.get("locked") or entry.get("status") in ("finalized", "paid", "approved")
        if is_finalized and not entry.get("is_amendment"):
            return error_response("LOCKED", "Cannot delete finalized entry. Create an amendment instead.", status_code=409)
        
        # If this is an amendment, clean up the parent's amended_by_id
        parent_id = entry.get("amends_compensation_id") or entry.get("parent_compensation_id")
        if parent_id and entry.get("is_amendment"):
            other_amendments = await db.compensation_entries.count_documents({
                "compensation_id": {"$ne": compensation_id},
                "$or": [
                    {"amends_compensation_id": parent_id},
                    {"parent_compensation_id": parent_id}
                ],
                "deleted_at": None
            })
            
            if other_amendments == 0:
                await db.compensation_entries.update_one(
                    {"compensation_id": parent_id},
                    {"$set": {"amended_by_id": None}}
                )
        
        await db.compensation_entries.update_one(
            {"compensation_id": compensation_id},
            {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return success_message("Compensation entry deleted")
    except Exception as e:
        print(f"Error deleting compensation: {e}")
        return error_response("DELETE_ERROR", "Failed to delete entry", status_code=500)


@router.post("/compensation/{compensation_id}/submit")
async def submit_compensation(compensation_id: str, request: Request):
    """Submit compensation for approval"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        entry = await db.compensation_entries.find_one(
            {"compensation_id": compensation_id, "user_id": user.user_id}
        )
        
        if not entry:
            return error_response("NOT_FOUND", "Compensation entry not found", status_code=404)
        
        if entry.get("status") != "draft":
            return error_response("INVALID_STATUS", "Only draft entries can be submitted", status_code=400)
        
        await db.compensation_entries.update_one(
            {"compensation_id": compensation_id},
            {"$set": {
                "status": "pending_approval",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        updated = await db.compensation_entries.find_one(
            {"compensation_id": compensation_id}, {"_id": 0}
        )
        return success_item(updated)
    except Exception as e:
        print(f"Error submitting compensation: {e}")
        return error_response("SUBMIT_ERROR", "Failed to submit entry", status_code=500)


@router.post("/compensation/{compensation_id}/approve")
async def approve_compensation(compensation_id: str, data: dict, request: Request):
    """Add approval to compensation entry"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        entry = await db.compensation_entries.find_one(
            {"compensation_id": compensation_id, "user_id": user.user_id}
        )
        
        if not entry:
            return error_response("NOT_FOUND", "Compensation entry not found", status_code=404)
        
        from models.governance import CompensationApproval
        
        approval = CompensationApproval(
            approver_party_id=data.get("approver_party_id"),
            approver_name=data.get("approver_name", user.name),
            approver_role=data.get("approver_role", "trustee"),
            status="approved",
            approved_at=datetime.now(timezone.utc).isoformat(),
            notes=data.get("notes", "")
        )
        
        approvals = entry.get("approvals", [])
        approvals.append(approval.model_dump())
        
        # Check if we have enough approvals
        new_status = entry.get("status")
        if len(approvals) >= entry.get("approval_threshold", 1):
            new_status = "approved"
        
        await db.compensation_entries.update_one(
            {"compensation_id": compensation_id},
            {"$set": {
                "approvals": approvals,
                "status": new_status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        updated = await db.compensation_entries.find_one(
            {"compensation_id": compensation_id}, {"_id": 0}
        )
        return success_item(updated)
    except Exception as e:
        print(f"Error approving compensation: {e}")
        return error_response("APPROVE_ERROR", "Failed to approve entry", status_code=500)


@router.post("/compensation/{compensation_id}/pay")
async def mark_compensation_paid(compensation_id: str, data: dict, request: Request):
    """Mark compensation as paid"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        entry = await db.compensation_entries.find_one(
            {"compensation_id": compensation_id, "user_id": user.user_id}
        )
        
        if not entry:
            return error_response("NOT_FOUND", "Compensation entry not found", status_code=404)
        
        if entry.get("status") != "approved":
            return error_response("INVALID_STATUS", "Only approved entries can be marked as paid", status_code=400)
        
        await db.compensation_entries.update_one(
            {"compensation_id": compensation_id},
            {"$set": {
                "status": "paid",
                "locked": True,
                "locked_at": datetime.now(timezone.utc).isoformat(),
                "paid_at": datetime.now(timezone.utc).isoformat(),
                "payment_method": data.get("payment_method", entry.get("payment_method", "")),
                "payment_reference": data.get("payment_reference", ""),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        updated = await db.compensation_entries.find_one(
            {"compensation_id": compensation_id}, {"_id": 0}
        )
        return success_item(updated)
    except Exception as e:
        print(f"Error marking compensation paid: {e}")
        return error_response("PAY_ERROR", "Failed to mark as paid", status_code=500)


@router.post("/compensation/{compensation_id}/finalize")
async def finalize_compensation(compensation_id: str, data: dict, request: Request):
    """Finalize a compensation entry - locks it permanently"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        entry = await db.compensation_entries.find_one(
            {"compensation_id": compensation_id, "user_id": user.user_id}
        )
        
        if not entry:
            return error_response("NOT_FOUND", "Compensation entry not found", status_code=404)
        
        if entry.get("locked"):
            return error_response("ALREADY_FINALIZED", "Compensation already finalized")
        
        finalized_at = datetime.now(timezone.utc).isoformat()
        finalized_by = data.get("finalized_by", user.name if hasattr(user, 'name') else "Unknown")
        
        await db.compensation_entries.update_one(
            {"compensation_id": compensation_id},
            {"$set": {
                "status": "finalized",
                "locked": True,
                "locked_at": finalized_at,
                "finalized_at": finalized_at,
                "finalized_by": finalized_by,
                "updated_at": finalized_at
            }}
        )
        
        # Create ledger entry
        if entry.get("rm_id"):
            try:
                await create_governance_ledger_entry(
                    portfolio_id=entry.get("portfolio_id"),
                    user_id=user.user_id,
                    governance_type="compensation",
                    governance_id=compensation_id,
                    rm_id=entry.get("rm_id"),
                    title=entry.get("title", "Compensation"),
                    description=f"Finalized on {finalized_at[:10]} - {entry.get('recipient_name', '')}",
                    value=entry.get("amount"),
                    entry_type="compensation",
                    balance_effect="debit",
                    subject_code="24",
                    subject_name="Compensation"
                )
            except Exception as le_err:
                print(f"Warning: Could not create ledger entry: {le_err}")
        
        updated = await db.compensation_entries.find_one(
            {"compensation_id": compensation_id}, {"_id": 0}
        )
        return success_item(updated)
    except Exception as e:
        print(f"Error finalizing compensation: {e}")
        return error_response("FINALIZE_ERROR", "Failed to finalize compensation", status_code=500)


@router.post("/compensation/{compensation_id}/amend")
async def create_compensation_amendment(compensation_id: str, data: dict, request: Request):
    """Create an amendment to a finalized compensation entry"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        original = await db.compensation_entries.find_one(
            {"compensation_id": compensation_id, "user_id": user.user_id}
        )
        
        if not original:
            return error_response("NOT_FOUND", "Compensation entry not found", status_code=404)
        
        if not original.get("locked"):
            return error_response("NOT_FINALIZED", "Cannot amend an unlocked entry. Edit it directly instead.")
        
        amendment_count = await db.compensation_entries.count_documents({
            "parent_compensation_id": compensation_id,
            "user_id": user.user_id
        })
        
        new_revision = original.get("revision", 1) + amendment_count + 1
        
        rm_id = ""
        try:
            rm_id, _, _, _ = await generate_subject_rm_id(
                original.get("portfolio_id"), user.user_id, "24", "Compensation Amendment"
            )
        except Exception as e:
            print(f"Warning: Could not generate RM-ID: {e}")
        
        new_id = f"comp_{uuid.uuid4().hex[:12]}"
        
        amendment = {
            "compensation_id": new_id,
            "portfolio_id": original.get("portfolio_id"),
            "trust_id": original.get("trust_id"),
            "user_id": user.user_id,
            "title": f"{original.get('title', '')} (Amendment v{new_revision})",
            "compensation_type": original.get("compensation_type", "annual_fee"),
            "recipient_name": original.get("recipient_name", ""),
            "recipient_role": original.get("recipient_role", "trustee"),
            "amount": original.get("amount", 0),
            "currency": original.get("currency", "USD"),
            "fiscal_year": original.get("fiscal_year", ""),
            "rm_id": rm_id,
            "revision": new_revision,
            "parent_compensation_id": compensation_id,
            "is_amendment": True,
            "status": "draft",
            "locked": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "deleted_at": None
        }
        
        await db.compensation_entries.insert_one(amendment)
        
        await db.compensation_entries.update_one(
            {"compensation_id": compensation_id},
            {"$set": {"amended_by_id": new_id}}
        )
        
        # Remove MongoDB _id field before returning
        clean_amendment = {k: v for k, v in amendment.items() if k != "_id"}
        return success_message("Amendment created", {"item": clean_amendment})
    except Exception as e:
        print(f"Error creating amendment: {e}")
        return error_response("AMEND_ERROR", "Failed to create amendment", status_code=500)


# ============ GOVERNANCE TRASH ============

@router.get("/trash")
async def get_governance_trash(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None,
    module: Optional[str] = Query(None, description="Filter by module: meetings, distributions, disputes, insurance, compensation"),
    limit: int = 100,
    offset: int = 0
):
    """Get soft-deleted governance items"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        items = []
        
        # Get deleted meetings
        if not module or module == "meetings":
            query = {
                "user_id": user.user_id,
                "deleted_at": {"$ne": None, "$exists": True}
            }
            if portfolio_id:
                query["portfolio_id"] = portfolio_id
            if trust_id:
                query["trust_id"] = trust_id
            
            deleted_meetings = await db.meetings.find(query, {"_id": 0}).sort("deleted_at", -1).to_list(100)
            for m in deleted_meetings:
                m["_module"] = "meetings"
            items.extend(deleted_meetings)
        
        # Sort all by deleted_at desc
        items.sort(key=lambda x: x.get("deleted_at", ""), reverse=True)
        
        return success_list(
            items=items[offset:offset + limit],
            total=len(items),
            sort_by="deleted_at",
            sort_dir="desc"
        )
        
    except Exception as e:
        print(f"Error fetching trash: {e}")
        return error_response("DB_ERROR", "Failed to fetch trash", {"error": str(e)}, status_code=500)


@router.post("/trash/{item_id}/restore")
async def restore_from_trash(item_id: str, request: Request, module: str = Query(...)):
    """Restore a soft-deleted item"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        if module == "meetings":
            result = await db.meetings.update_one(
                {"meeting_id": item_id, "user_id": user.user_id},
                {"$set": {"deleted_at": None, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            if result.modified_count == 0:
                return error_response("NOT_FOUND", "Item not found in trash", status_code=404)
        else:
            return error_response("INVALID_MODULE", f"Unknown module: {module}")
        
        return success_message("Item restored", {"item_id": item_id, "module": module})
        
    except Exception as e:
        print(f"Error restoring from trash: {e}")
        return error_response("RESTORE_ERROR", "Failed to restore item", {"error": str(e)}, status_code=500)


# ============ MODULE STATUS (for tab enabling/disabling) ============

@router.get("/status")
async def get_governance_status(request: Request):
    """Get status of all governance modules (for enabling/disabling tabs)"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    return success_item({
        "modules": {
            "meetings": {"enabled": True, "has_data": True},
            "distributions": {"enabled": True, "has_data": False, "coming_soon": False},
            "disputes": {"enabled": True, "has_data": False, "coming_soon": False},
            "insurance": {"enabled": True, "has_data": False, "coming_soon": False},
            "compensation": {"enabled": True, "has_data": False, "coming_soon": False}
        },
        "empty_states": EMPTY_STATES
    })


# ============ ACTIVITY FEED ============

@router.get("/activity-feed")
async def get_activity_feed(
    request: Request,
    portfolio_id: Optional[str] = None,
    limit: int = 10
):
    """Get recent activity across all governance modules for the Signal Feed"""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        activities = []
        base_query = {"user_id": user.user_id, "deleted_at": None}
        if portfolio_id:
            base_query["portfolio_id"] = portfolio_id
        
        # Fetch recent meetings
        meetings = await db.meetings.find(
            base_query, {"_id": 0, "meeting_id": 1, "title": 1, "rm_id": 1, "status": 1, "created_at": 1, "updated_at": 1}
        ).sort("updated_at", -1).limit(limit).to_list(limit)
        
        for m in meetings:
            status_msg = "Meeting Finalized" if m.get("status") == "finalized" else "Meeting Created"
            activities.append({
                "id": m.get("meeting_id"),
                "type": "meeting",
                "message": status_msg,
                "detail": f"RM-ID {m.get('rm_id', 'N/A')}",
                "timestamp": m.get("updated_at") or m.get("created_at"),
                "rm_id": m.get("rm_id")
            })
        
        # Fetch recent distributions
        distributions = await db.distributions.find(
            base_query, {"_id": 0, "distribution_id": 1, "title": 1, "rm_id": 1, "status": 1, "amount": 1, "created_at": 1, "updated_at": 1}
        ).sort("updated_at", -1).limit(limit).to_list(limit)
        
        for d in distributions:
            status_msgs = {
                "draft": "Distribution Drafted",
                "pending": "Distribution Pending",
                "approved": "Distribution Approved",
                "paid": "Distribution Paid"
            }
            msg = status_msgs.get(d.get("status"), "Distribution Logged")
            activities.append({
                "id": d.get("distribution_id"),
                "type": "distribution",
                "message": msg,
                "detail": f"${d.get('amount', 0):,.0f} • {d.get('rm_id', 'N/A')}",
                "timestamp": d.get("updated_at") or d.get("created_at"),
                "rm_id": d.get("rm_id")
            })
        
        # Fetch recent disputes
        disputes = await db.disputes.find(
            base_query, {"_id": 0, "dispute_id": 1, "title": 1, "rm_id": 1, "status": 1, "created_at": 1, "updated_at": 1}
        ).sort("updated_at", -1).limit(limit).to_list(limit)
        
        for dp in disputes:
            status_msgs = {
                "open": "Dispute Opened",
                "in_progress": "Dispute In Progress",
                "resolved": "Dispute Resolved",
                "closed": "Dispute Closed"
            }
            msg = status_msgs.get(dp.get("status"), "Dispute Updated")
            activities.append({
                "id": dp.get("dispute_id"),
                "type": "dispute",
                "message": msg,
                "detail": f"{dp.get('title', 'Unknown')} • {dp.get('rm_id', 'N/A')}",
                "timestamp": dp.get("updated_at") or dp.get("created_at"),
                "rm_id": dp.get("rm_id")
            })
        
        # Fetch recent insurance policies
        insurance = await db.insurance_policies.find(
            base_query, {"_id": 0, "policy_id": 1, "title": 1, "rm_id": 1, "status": 1, "death_benefit": 1, "created_at": 1, "updated_at": 1}
        ).sort("updated_at", -1).limit(limit).to_list(limit)
        
        for ins in insurance:
            status_msgs = {
                "active": "Policy Active",
                "pending": "Policy Pending",
                "lapsed": "Policy Lapsed",
                "claimed": "Policy Claimed"
            }
            msg = status_msgs.get(ins.get("status"), "Insurance Updated")
            benefit = ins.get("death_benefit", 0)
            activities.append({
                "id": ins.get("policy_id"),
                "type": "insurance",
                "message": msg,
                "detail": f"Benefit ${benefit:,.0f} • {ins.get('rm_id', 'N/A')}",
                "timestamp": ins.get("updated_at") or ins.get("created_at"),
                "rm_id": ins.get("rm_id")
            })
        
        # Fetch recent compensation entries
        compensation = await db.compensation_entries.find(
            base_query, {"_id": 0, "compensation_id": 1, "title": 1, "rm_id": 1, "status": 1, "amount": 1, "recipient_name": 1, "created_at": 1, "updated_at": 1}
        ).sort("updated_at", -1).limit(limit).to_list(limit)
        
        for comp in compensation:
            status_msgs = {
                "draft": "Compensation Drafted",
                "pending_approval": "Compensation Pending",
                "approved": "Compensation Approved",
                "paid": "Compensation Paid"
            }
            msg = status_msgs.get(comp.get("status"), "Compensation Logged")
            activities.append({
                "id": comp.get("compensation_id"),
                "type": "compensation",
                "message": msg,
                "detail": f"${comp.get('amount', 0):,.0f} to {comp.get('recipient_name', 'Unknown')}",
                "timestamp": comp.get("updated_at") or comp.get("created_at"),
                "rm_id": comp.get("rm_id")
            })
        
        # Sort all activities by timestamp (most recent first)
        def parse_timestamp(item):
            ts = item.get("timestamp", "")
            if not ts:
                return datetime.min
            try:
                if isinstance(ts, str):
                    return datetime.fromisoformat(ts.replace("Z", "+00:00"))
                return ts
            except:
                return datetime.min
        
        activities.sort(key=parse_timestamp, reverse=True)
        
        # Format timestamps as relative time
        now = datetime.now(timezone.utc)
        for activity in activities:
            ts = activity.get("timestamp")
            if ts:
                try:
                    if isinstance(ts, str):
                        ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    delta = now - ts
                    if delta.total_seconds() < 60:
                        activity["time"] = "Just now"
                    elif delta.total_seconds() < 3600:
                        mins = int(delta.total_seconds() / 60)
                        activity["time"] = f"{mins}m ago"
                    elif delta.total_seconds() < 86400:
                        hours = int(delta.total_seconds() / 3600)
                        activity["time"] = f"{hours}h ago"
                    else:
                        days = int(delta.total_seconds() / 86400)
                        activity["time"] = f"{days}d ago"
                except:
                    activity["time"] = "Unknown"
            else:
                activity["time"] = "Unknown"
        
        return success_list(
            items=activities[:limit],
            total=len(activities)
        )
        
    except Exception as e:
        print(f"Error fetching activity feed: {e}")
        import traceback
        traceback.print_exc()
        return error_response("DB_ERROR", "Failed to fetch activity feed", status_code=500)
