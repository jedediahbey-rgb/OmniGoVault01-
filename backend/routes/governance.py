from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
import hashlib
import json
from datetime import datetime, timezone

# Import from parent - will be connected in server.py
router = APIRouter(prefix="/api/governance", tags=["governance"])

# These will be injected from server.py
db = None
get_current_user = None
generate_subject_rm_id = None


def init_governance_routes(database, auth_func, rmid_func):
    """Initialize the governance routes with dependencies"""
    global db, get_current_user, generate_subject_rm_id
    db = database
    get_current_user = auth_func
    generate_subject_rm_id = rmid_func


def generate_meeting_hash(meeting_data: dict) -> str:
    """Generate SHA-256 hash of meeting data for tamper-evidence"""
    # Create a canonical JSON representation
    # Exclude fields that change after finalization (attestations, amended_by_id)
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


# ============ MEETING ENDPOINTS ============

@router.get("/meetings")
async def get_meetings(
    portfolio_id: Optional[str] = None,
    trust_id: Optional[str] = None,
    status: Optional[str] = None,
    request: Request = None
):
    """Get all meetings for user, optionally filtered by portfolio/trust"""
    user = await get_current_user(request)
    
    query = {"user_id": user.user_id}
    if portfolio_id:
        query["portfolio_id"] = portfolio_id
    if trust_id:
        query["trust_id"] = trust_id
    if status:
        query["status"] = status
    
    meetings = await db.meetings.find(query, {"_id": 0}).sort("date_time", -1).to_list(100)
    return meetings


@router.get("/meetings/{meeting_id}")
async def get_meeting(meeting_id: str, request: Request = None):
    """Get a single meeting by ID"""
    user = await get_current_user(request)
    
    meeting = await db.meetings.find_one(
        {"meeting_id": meeting_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return meeting


@router.post("/meetings")
async def create_meeting(data: dict, request: Request = None):
    """Create a new meeting"""
    user = await get_current_user(request)
    
    portfolio_id = data.get("portfolio_id")
    if not portfolio_id:
        raise HTTPException(status_code=400, detail="portfolio_id is required")
    
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
    
    await db.meetings.insert_one(doc)
    
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/meetings/{meeting_id}")
async def update_meeting(meeting_id: str, data: dict, request: Request = None):
    """Update a meeting (only if draft)"""
    user = await get_current_user(request)
    
    meeting = await db.meetings.find_one(
        {"meeting_id": meeting_id, "user_id": user.user_id}
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.get("status") != "draft":
        raise HTTPException(
            status_code=400, 
            detail="Cannot edit finalized meeting. Create an amendment instead."
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
    return updated


@router.delete("/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str, request: Request = None):
    """Delete a meeting (only if draft)"""
    user = await get_current_user(request)
    
    meeting = await db.meetings.find_one(
        {"meeting_id": meeting_id, "user_id": user.user_id}
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.get("status") != "draft":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete finalized meeting"
        )
    
    await db.meetings.delete_one({"meeting_id": meeting_id})
    return {"message": "Meeting deleted", "meeting_id": meeting_id}


# ============ AGENDA ITEM ENDPOINTS ============

@router.post("/meetings/{meeting_id}/agenda")
async def add_agenda_item(meeting_id: str, data: dict, request: Request = None):
    """Add an agenda item to a meeting"""
    user = await get_current_user(request)
    
    meeting = await db.meetings.find_one(
        {"meeting_id": meeting_id, "user_id": user.user_id}
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.get("status") != "draft":
        raise HTTPException(status_code=400, detail="Cannot edit finalized meeting")
    
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
    
    # Sort by order
    agenda_items.sort(key=lambda x: x.get("order", 0))
    
    await db.meetings.update_one(
        {"meeting_id": meeting_id},
        {"$set": {
            "agenda_items": agenda_items,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return new_item.model_dump()


@router.put("/meetings/{meeting_id}/agenda/{item_id}")
async def update_agenda_item(
    meeting_id: str, 
    item_id: str, 
    data: dict, 
    request: Request = None
):
    """Update an agenda item"""
    user = await get_current_user(request)
    
    meeting = await db.meetings.find_one(
        {"meeting_id": meeting_id, "user_id": user.user_id}
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.get("status") != "draft":
        raise HTTPException(status_code=400, detail="Cannot edit finalized meeting")
    
    agenda_items = meeting.get("agenda_items", [])
    item_index = next(
        (i for i, item in enumerate(agenda_items) if item.get("item_id") == item_id),
        None
    )
    
    if item_index is None:
        raise HTTPException(status_code=404, detail="Agenda item not found")
    
    # Update allowed fields
    allowed_fields = [
        "title", "discussion_summary", "order", "motions", 
        "action_items", "notes", "is_expanded"
    ]
    for field in allowed_fields:
        if field in data:
            agenda_items[item_index][field] = data[field]
    
    # Re-sort if order changed
    agenda_items.sort(key=lambda x: x.get("order", 0))
    
    await db.meetings.update_one(
        {"meeting_id": meeting_id},
        {"$set": {
            "agenda_items": agenda_items,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return agenda_items[item_index]


@router.delete("/meetings/{meeting_id}/agenda/{item_id}")
async def delete_agenda_item(meeting_id: str, item_id: str, request: Request = None):
    """Delete an agenda item"""
    user = await get_current_user(request)
    
    meeting = await db.meetings.find_one(
        {"meeting_id": meeting_id, "user_id": user.user_id}
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.get("status") != "draft":
        raise HTTPException(status_code=400, detail="Cannot edit finalized meeting")
    
    agenda_items = meeting.get("agenda_items", [])
    new_items = [item for item in agenda_items if item.get("item_id") != item_id]
    
    if len(new_items) == len(agenda_items):
        raise HTTPException(status_code=404, detail="Agenda item not found")
    
    await db.meetings.update_one(
        {"meeting_id": meeting_id},
        {"$set": {
            "agenda_items": new_items,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Agenda item deleted"}


# ============ FINALIZATION & ATTESTATION ============

@router.post("/meetings/{meeting_id}/finalize")
async def finalize_meeting(meeting_id: str, data: dict, request: Request = None):
    """Finalize meeting minutes - locks content and generates hash"""
    user = await get_current_user(request)
    
    meeting = await db.meetings.find_one(
        {"meeting_id": meeting_id, "user_id": user.user_id}
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.get("status") != "draft":
        raise HTTPException(status_code=400, detail="Meeting already finalized")
    
    finalized_by = data.get("finalized_by_name", user.name if hasattr(user, 'name') else "Unknown")
    finalized_at = datetime.now(timezone.utc).isoformat()
    
    # Update meeting with finalization data
    meeting["finalized_at"] = finalized_at
    meeting["finalized_by"] = finalized_by
    meeting["status"] = "finalized"
    
    # Generate tamper-evident hash
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
    return {
        "message": "Meeting minutes finalized",
        "finalized_hash": meeting_hash,
        "meeting": updated
    }


@router.post("/meetings/{meeting_id}/attest")
async def add_attestation(meeting_id: str, data: dict, request: Request = None):
    """Add attestation to finalized meeting"""
    user = await get_current_user(request)
    
    meeting = await db.meetings.find_one(
        {"meeting_id": meeting_id, "user_id": user.user_id}
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.get("status") == "draft":
        raise HTTPException(status_code=400, detail="Meeting must be finalized before attestation")
    
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
    
    # Update status to attested if we have attestations
    new_status = "attested" if meeting.get("status") == "finalized" else meeting.get("status")
    
    await db.meetings.update_one(
        {"meeting_id": meeting_id},
        {"$set": {
            "attestations": attestations,
            "status": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Attestation added",
        "attestation": attestation.model_dump()
    }


@router.post("/meetings/{meeting_id}/amend")
async def create_amendment(meeting_id: str, data: dict, request: Request = None):
    """Create an amendment to a finalized meeting"""
    user = await get_current_user(request)
    
    original = await db.meetings.find_one(
        {"meeting_id": meeting_id, "user_id": user.user_id}
    )
    if not original:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if original.get("status") == "draft":
        raise HTTPException(status_code=400, detail="Cannot amend a draft meeting")
    
    # Calculate next amendment number
    amendment_count = await db.meetings.count_documents({
        "amends_meeting_id": meeting_id,
        "user_id": user.user_id
    })
    
    # Generate new RM-ID
    rm_id = ""
    try:
        rm_id, _, _, _ = await generate_subject_rm_id(
            original.get("portfolio_id"), user.user_id, "20", "Meeting Minutes Amendment"
        )
    except Exception as e:
        print(f"Warning: Could not generate RM-ID: {e}")
    
    from backend.models.governance import Meeting
    
    # Create amendment meeting based on original
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
    
    await db.meetings.insert_one(doc)
    
    # Mark original as amended
    await db.meetings.update_one(
        {"meeting_id": meeting_id},
        {"$set": {
            "amended_by_id": amendment.meeting_id,
            "status": "amended"
        }}
    )
    
    return {
        "message": "Amendment created",
        "amendment": {k: v for k, v in doc.items() if k != "_id"}
    }


# ============ ATTACHMENT ENDPOINTS ============

@router.post("/meetings/{meeting_id}/attachments")
async def add_attachment(meeting_id: str, data: dict, request: Request = None):
    """Add an attachment to a meeting"""
    user = await get_current_user(request)
    
    meeting = await db.meetings.find_one(
        {"meeting_id": meeting_id, "user_id": user.user_id}
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
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
    
    return attachment.model_dump()


@router.delete("/meetings/{meeting_id}/attachments/{attachment_id}")
async def delete_attachment(meeting_id: str, attachment_id: str, request: Request = None):
    """Delete an attachment from a meeting"""
    user = await get_current_user(request)
    
    meeting = await db.meetings.find_one(
        {"meeting_id": meeting_id, "user_id": user.user_id}
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.get("status") != "draft":
        raise HTTPException(status_code=400, detail="Cannot modify finalized meeting")
    
    attachments = meeting.get("attachments", [])
    new_attachments = [a for a in attachments if a.get("attachment_id") != attachment_id]
    
    await db.meetings.update_one(
        {"meeting_id": meeting_id},
        {"$set": {
            "attachments": new_attachments,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Attachment deleted"}


# ============ VERIFY HASH ============

@router.get("/meetings/{meeting_id}/verify")
async def verify_meeting_hash(meeting_id: str, request: Request = None):
    """Verify the integrity of a finalized meeting"""
    user = await get_current_user(request)
    
    meeting = await db.meetings.find_one(
        {"meeting_id": meeting_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if meeting.get("status") == "draft":
        return {"verified": False, "reason": "Meeting not finalized yet"}
    
    stored_hash = meeting.get("finalized_hash", "")
    if not stored_hash:
        return {"verified": False, "reason": "No hash found"}
    
    calculated_hash = generate_meeting_hash(meeting)
    
    return {
        "verified": stored_hash == calculated_hash,
        "stored_hash": stored_hash,
        "calculated_hash": calculated_hash,
        "message": "Meeting integrity verified" if stored_hash == calculated_hash else "WARNING: Meeting content may have been modified"
    }
