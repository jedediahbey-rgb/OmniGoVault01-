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
    """Update a meeting (only if draft)"""
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
            return error_response("LOCKED", "Cannot edit finalized meeting. Create an amendment instead.")
        
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
        
        meeting_hash = generate_meeting_hash(meeting)
        
        await db.meetings.update_one(
            {"meeting_id": meeting_id},
            {"$set": {
                "status": "finalized",
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
    """Create an amendment to a finalized meeting"""
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
            return error_response("NOT_FINALIZED", "Cannot amend a draft meeting")
        
        amendment_count = await db.meetings.count_documents({
            "amends_meeting_id": meeting_id,
            "user_id": user.user_id
        })
        
        rm_id = ""
        try:
            rm_id, _, _, _ = await generate_subject_rm_id(
                original.get("portfolio_id"), user.user_id, "20", "Meeting Minutes Amendment"
            )
        except Exception as e:
            print(f"Warning: Could not generate RM-ID: {e}")
        
        from models.governance import Meeting
        
        amendment = Meeting(
            portfolio_id=original.get("portfolio_id"),
            trust_id=original.get("trust_id"),
            user_id=user.user_id,
            title=f"Amendment #{amendment_count + 1} to: {original.get('title', '')}",
            meeting_type=original.get("meeting_type", "regular"),
            date_time=datetime.now(timezone.utc).isoformat(),
            location=original.get("location", ""),
            called_by=original.get("called_by", ""),
            rm_id=rm_id,
            is_amendment=True,
            amends_meeting_id=meeting_id,
            amendment_number=amendment_count + 1,
            prior_hash=original.get("finalized_hash", ""),
            attendees=original.get("attendees", []),
            agenda_items=original.get("agenda_items", []),
            visibility=original.get("visibility", "trustee_only")
        )
        
        doc = amendment.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        doc["deleted_at"] = None
        
        await db.meetings.insert_one(doc)
        
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


# ============ DISTRIBUTIONS (Stub with Empty State) ============

@router.get("/distributions")
async def get_distributions(
    request: Request,
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None,
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
    
    # For now, return empty with rich empty_state
    return success_list(
        items=[],
        total=0,
        sort_by=sort_by,
        sort_dir=sort_dir,
        empty_state=EMPTY_STATES["distributions"]
    )


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
    
    return success_item({
        "has_data": False,
        "donut_data": [],
        "timeline_data": [],
        "waterfall_data": [],
        "empty_state": EMPTY_STATES["distributions"]
    })


@router.post("/distributions")
async def create_distribution(data: dict, request: Request):
    """Create a distribution record"""
    try:
        user = await get_current_user(request)
    except Exception as e:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Placeholder - would create in governance_distributions collection
    return error_response("NOT_IMPLEMENTED", "Distribution creation coming soon")


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
