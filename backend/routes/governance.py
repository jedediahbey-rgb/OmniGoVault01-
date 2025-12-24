"""
Governance API Routes - Comprehensive Implementation
Modules: Meeting Minutes, Distributions, Disputes, Insurance, Compensation

Response Envelope Standard:
- List: {ok, items, count, total, sort, empty_state?}
- Detail: {ok, item}
- Error: {ok: false, error: {code, message, details?}}
"""

from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
import hashlib
import json
import re
from datetime import datetime, timezone

router = APIRouter(prefix="/api/governance", tags=["governance"])

# Dependencies injected from server.py
db = None
get_current_user = None
generate_subject_rm_id = None


def init_governance_routes(database, auth_func, rmid_func):
    """Initialize the governance routes with dependencies"""
    global db, get_current_user, generate_subject_rm_id
    db = database
    get_current_user = auth_func
    generate_subject_rm_id = rmid_func


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
    except Exception as e:
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
    """Get a single meeting by ID"""
    try:
        user = await get_current_user(request)
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    if not meeting_id:
        return error_response("MISSING_MEETING_ID", "Meeting ID is required")
    
    try:
        meeting = await db.meetings.find_one(
            {"meeting_id": meeting_id, "user_id": user.user_id},
            {"_id": 0}
        )
        
        if not meeting:
            return error_response("NOT_FOUND", "Meeting not found", status_code=404)
        
        return success_item(meeting)
        
    except Exception as e:
        print(f"Error fetching meeting: {e}")
        return error_response("DB_ERROR", "Failed to fetch meeting", {"error": str(e)}, status_code=500)


@router.post("/meetings")
async def create_meeting(data: dict, request: Request):
    """Create a new meeting"""
    try:
        user = await get_current_user(request)
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    portfolio_id = data.get("portfolio_id")
    if not portfolio_id:
        return error_response("MISSING_PORTFOLIO_ID", "portfolio_id is required")
    
    try:
        # Generate RM-ID using subject code 20 for Governance/Meetings
        rm_id = ""
        try:
            rm_id, _, _, _ = await generate_subject_rm_id(
                portfolio_id, user.user_id, "20", "Meeting Minutes"
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
    except Exception as e:
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
    """Soft-delete a meeting (only if draft). Use hard=true for permanent deletion."""
    try:
        user = await get_current_user(request)
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    if not meeting_id:
        return error_response("MISSING_MEETING_ID", "Meeting ID is required")
    
    try:
        meeting = await db.meetings.find_one(
            {"meeting_id": meeting_id, "user_id": user.user_id}
        )
        
        if not meeting:
            return error_response("NOT_FOUND", "Meeting not found", status_code=404)
        
        if meeting.get("status") != "draft":
            return error_response("LOCKED", "Cannot delete finalized meeting")
        
        if hard:
            await db.meetings.delete_one({"meeting_id": meeting_id})
        else:
            # Soft delete
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
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
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


# ============ FINALIZATION & ATTESTATION ============

@router.post("/meetings/{meeting_id}/finalize")
async def finalize_meeting(meeting_id: str, data: dict, request: Request):
    """Finalize meeting minutes - locks content and generates hash"""
    try:
        user = await get_current_user(request)
    except Exception as e:
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
        
        updated = await db.meetings.find_one({"meeting_id": meeting_id}, {"_id": 0})
        return success_message("Meeting minutes finalized", {
            "finalized_hash": meeting_hash,
            "item": updated
        })
        
    except Exception as e:
        print(f"Error finalizing meeting: {e}")
        return error_response("FINALIZE_ERROR", "Failed to finalize meeting", {"error": str(e)}, status_code=500)


@router.post("/meetings/{meeting_id}/attest")
async def add_attestation(meeting_id: str, data: dict, request: Request):
    """Add attestation to finalized meeting"""
    try:
        user = await get_current_user(request)
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    if not data.get("portfolio_id"):
        return error_response("MISSING_PORTFOLIO", "Portfolio ID is required")
    if not data.get("title"):
        return error_response("MISSING_TITLE", "Distribution title is required")
    
    try:
        # Generate RM-ID
        rm_id = ""
        try:
            rm_id, _, _, _ = await generate_subject_rm_id(
                data.get("portfolio_id"), user.user_id, "21", "Distribution"
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
    """Get a single distribution"""
    try:
        user = await get_current_user(request)
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        distribution = await db.distributions.find_one(
            {"distribution_id": distribution_id, "user_id": user.user_id},
            {"_id": 0}
        )
        
        if not distribution:
            return error_response("NOT_FOUND", "Distribution not found", status_code=404)
        
        return success_item(normalize_distribution(distribution))
    except Exception as e:
        print(f"Error fetching distribution: {e}")
        return error_response("DB_ERROR", "Failed to fetch distribution", status_code=500)


@router.put("/distributions/{distribution_id}")
async def update_distribution(distribution_id: str, data: dict, request: Request):
    """Update a distribution (only if draft/unlocked)"""
    try:
        user = await get_current_user(request)
    except Exception as e:
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
    """Soft delete a distribution"""
    try:
        user = await get_current_user(request)
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        distribution = await db.distributions.find_one(
            {"distribution_id": distribution_id, "user_id": user.user_id}
        )
        
        if not distribution:
            return error_response("NOT_FOUND", "Distribution not found", status_code=404)
        
        # Can only delete drafts
        if distribution.get("status") != "draft":
            return error_response("CANNOT_DELETE", "Only draft distributions can be deleted")
        
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
    except Exception as e:
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
    except Exception as e:
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
    """Mark distribution as executed/completed"""
    try:
        user = await get_current_user(request)
    except Exception as e:
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
        
        updated = await db.distributions.find_one({"distribution_id": distribution_id}, {"_id": 0})
        return success_message("Distribution executed", {"item": normalize_distribution(updated)})
    except Exception as e:
        print(f"Error executing distribution: {e}")
        return error_response("EXECUTE_ERROR", "Failed to execute distribution", status_code=500)


# ============ DISPUTES (Stub with Empty State) ============

@router.get("/disputes")
async def get_disputes(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_dir: str = "asc",
    limit: int = 100,
    offset: int = 0
):
    """Get disputes list"""
    try:
        user = await get_current_user(request)
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    return success_list(
        items=[],
        total=0,
        sort_by=sort_by,
        sort_dir=sort_dir,
        empty_state=EMPTY_STATES["disputes"]
    )


@router.get("/disputes/board")
async def get_disputes_board(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None
):
    """Get disputes in kanban board format"""
    try:
        user = await get_current_user(request)
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    return success_item({
        "has_data": False,
        "columns": [
            {"id": "open", "title": "Open", "cards": []},
            {"id": "review", "title": "Under Review", "cards": []},
            {"id": "mediation", "title": "Mediation", "cards": []},
            {"id": "resolved", "title": "Resolved", "cards": []},
            {"id": "archived", "title": "Archived", "cards": []}
        ],
        "empty_state": EMPTY_STATES["disputes"]
    })


@router.post("/disputes")
async def create_dispute(data: dict, request: Request):
    """Create a dispute record"""
    try:
        user = await get_current_user(request)
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    return error_response("NOT_IMPLEMENTED", "Dispute creation coming soon")


# ============ INSURANCE POLICIES (Stub with Empty State) ============

@router.get("/insurance-policies")
async def get_insurance_policies(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None,
    sort_by: str = "created_at",
    sort_dir: str = "asc",
    limit: int = 100,
    offset: int = 0
):
    """Get insurance policies list"""
    try:
        user = await get_current_user(request)
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    return success_list(
        items=[],
        total=0,
        sort_by=sort_by,
        sort_dir=sort_dir,
        empty_state=EMPTY_STATES["insurance"]
    )


@router.get("/insurance-policies/summary")
async def get_insurance_summary(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None
):
    """Get insurance policies summary"""
    try:
        user = await get_current_user(request)
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    return success_item({
        "has_data": False,
        "total_coverage": 0,
        "active_policies": 0,
        "policies": [],
        "empty_state": EMPTY_STATES["insurance"]
    })


@router.post("/insurance-policies")
async def create_insurance_policy(data: dict, request: Request):
    """Create an insurance policy record"""
    try:
        user = await get_current_user(request)
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    return error_response("NOT_IMPLEMENTED", "Insurance policy creation coming soon")


# ============ TRUSTEE COMPENSATION (Stub with Empty State) ============

@router.get("/compensation")
async def get_compensation(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None,
    sort_by: str = "created_at",
    sort_dir: str = "asc",
    limit: int = 100,
    offset: int = 0
):
    """Get compensation records list"""
    try:
        user = await get_current_user(request)
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    return success_list(
        items=[],
        total=0,
        sort_by=sort_by,
        sort_dir=sort_dir,
        empty_state=EMPTY_STATES["compensation"]
    )


@router.get("/compensation/summary")
async def get_compensation_summary(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None
):
    """Get compensation summary with reasonableness meter"""
    try:
        user = await get_current_user(request)
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    return success_item({
        "has_data": False,
        "total_compensation": 0,
        "hours_logged": 0,
        "reasonableness_score": None,
        "entries": [],
        "empty_state": EMPTY_STATES["compensation"]
    })


@router.post("/compensation")
async def create_compensation_entry(data: dict, request: Request):
    """Create a compensation entry"""
    try:
        user = await get_current_user(request)
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    return error_response("NOT_IMPLEMENTED", "Compensation entry creation coming soon")


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
    except Exception as e:
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
    except Exception as e:
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
    except Exception as e:
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
