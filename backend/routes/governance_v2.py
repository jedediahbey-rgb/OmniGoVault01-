"""
Governance V2 API Routes - Amendment Studio
Production-grade revisioning system with strict immutability.

Core Rules:
1. Finalized revisions are NEVER directly editable
2. Amendments create NEW revisions linked to prior
3. All actions logged to audit trail
4. Hash chain ensures tamper evidence
5. RM-ID linking via RMSubject (Ledger Thread)
6. Lifecycle engine enforces status transitions
"""

from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime, timezone
import json
import re

from models.governance_v2 import (
    GovernanceRecord, GovernanceRevision, GovernanceEvent,
    GovernanceAttachment, GovernanceAttestation,
    ModuleType, RecordStatus, ChangeType, EventType,
    RecordCreateRequest, RecordAmendRequest, RevisionUpdateRequest,
    RecordVoidRequest, AttestationCreateRequest,
    RecordSummary, RevisionSummary, RecordDetailResponse,
    MinutesPayload, DistributionPayload, DisputePayload,
    InsurancePayload, CompensationPayload,
    compute_content_hash, generate_id
)
from models.rm_subject import (
    RMSubject, SubjectCategory, MODULE_TO_CATEGORY,
    generate_subject_id
)
from services.lifecycle_engine import lifecycle_engine, LifecycleStatus

router = APIRouter(prefix="/api/governance/v2", tags=["governance-v2"])

# Dependencies injected from server.py
db = None
get_current_user = None
generate_subject_rm_id = None


def init_governance_v2_routes(database, auth_func, rmid_func):
    """Initialize routes with dependencies"""
    global db, get_current_user, generate_subject_rm_id
    db = database
    get_current_user = auth_func
    generate_subject_rm_id = rmid_func



# ============ RM SUBJECT HELPERS ============

def format_rm_id(rm_base: str, rm_group: int, rm_sub: int) -> str:
    """Format full RM-ID from components"""
    return f"{rm_base}-{rm_group}.{rm_sub:03d}"


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
    
    # Generate a placeholder if no trust profile
    import uuid
    return f"RF{uuid.uuid4().hex[:9].upper()}US"


async def allocate_rm_id_from_subject(
    subject_id: str,
    user_id: str
) -> tuple:
    """
    Atomically allocate the next subnumber from an RM Subject.
    Returns (rm_id, rm_sub, rm_base, rm_group, subject_title)
    """
    # Atomic increment of next_sub
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
        return_document=True
    )
    
    if not result:
        raise ValueError(f"Subject {subject_id} not found")
    
    # The allocated subnumber is (next_sub - 1) since we just incremented
    allocated_sub = result["next_sub"] - 1
    
    if allocated_sub > 999:
        raise ValueError(f"Maximum subnumber (999) exceeded for subject {subject_id}")
    
    rm_id = format_rm_id(result["rm_base"], result["rm_group"], allocated_sub)
    
    return (rm_id, allocated_sub, result["rm_base"], result["rm_group"], result["title"])


async def create_new_subject_and_allocate(
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
    Create a new RM Subject and allocate the first subnumber (.001).
    Returns (subject_id, rm_id, rm_sub, rm_base, rm_group)
    """
    import random
    
    rm_base = await get_rm_base_for_portfolio(portfolio_id, user_id)
    
    # Get available group number
    used_groups = await db.rm_subjects.distinct(
        "rm_group",
        {"portfolio_id": portfolio_id, "rm_base": rm_base, "deleted_at": None}
    )
    used_set = set(used_groups)
    available = [g for g in range(1, 100) if g not in used_set]
    
    if not available:
        raise ValueError(f"No available group numbers for {rm_base}")
    
    rm_group = random.choice(available)
    
    # Create subject
    subject = RMSubject(
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
    
    doc = subject.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    await db.rm_subjects.insert_one(doc)
    
    rm_id = format_rm_id(rm_base, rm_group, 1)
    
    return (subject.id, rm_id, 1, rm_base, rm_group)


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


# ============ AUDIT LOG HELPER ============

async def log_event(
    event_type: EventType,
    record_id: str,
    actor_id: str,
    portfolio_id: str,
    trust_id: str = None,
    revision_id: str = None,
    actor_name: str = "",
    meta: dict = None
):
    """Create an audit log entry"""
    event = GovernanceEvent(
        trust_id=trust_id,
        portfolio_id=portfolio_id,
        user_id=actor_id,
        record_id=record_id,
        revision_id=revision_id,
        event_type=event_type,
        actor_id=actor_id,
        actor_name=actor_name,
        meta_json=meta or {}
    )
    doc = event.model_dump()
    doc["at"] = doc["at"].isoformat()
    await db.governance_events.insert_one(doc)
    return doc


# ============ PAYLOAD VALIDATION ============

# Valid policy states for insurance (only ACTIVE allowed when finalized)
INSURANCE_POLICY_STATES = {"pending", "active", "lapsed", "paid_up", "surrendered", "claimed", "expired"}
INSURANCE_DRAFT_ALLOWED_STATES = {"pending"}  # When draft, only pending is allowed


def validate_payload(module_type: ModuleType, payload: dict, is_finalized: bool = False) -> tuple:
    """
    Validate payload against module-specific schema.
    Returns (is_valid, error_message, normalized_payload)
    
    For insurance records:
    - Draft records: policy_state must be "pending" (enforced)
    - Finalized records: policy_state can be any valid state
    """
    try:
        if module_type == ModuleType.MINUTES:
            validated = MinutesPayload(**payload)
        elif module_type == ModuleType.DISTRIBUTION:
            validated = DistributionPayload(**payload)
        elif module_type == ModuleType.DISPUTE:
            validated = DisputePayload(**payload)
        elif module_type == ModuleType.INSURANCE:
            validated = InsurancePayload(**payload)
            result = validated.model_dump()
            
            # Enforce policy_state rules
            policy_state = result.get("policy_state", "pending")
            if policy_state not in INSURANCE_POLICY_STATES:
                return False, f"Invalid policy_state: {policy_state}. Must be one of {INSURANCE_POLICY_STATES}", payload
            
            # Block "active" and other operational states unless record is finalized
            if not is_finalized and policy_state not in INSURANCE_DRAFT_ALLOWED_STATES:
                # Force back to pending for draft records
                result["policy_state"] = "pending"
            
            return True, None, result
        elif module_type == ModuleType.COMPENSATION:
            validated = CompensationPayload(**payload)
        else:
            return False, f"Unknown module type: {module_type}", payload
        
        return True, None, validated.model_dump()
    except Exception as e:
        return False, str(e), payload


# ============ RM-ID SUBJECT CODES ============

MODULE_SUBJECT_CODES = {
    ModuleType.MINUTES: ("20", "Meeting Minutes"),
    ModuleType.DISTRIBUTION: ("21", "Distributions"),
    ModuleType.DISPUTE: ("22", "Disputes"),
    ModuleType.INSURANCE: ("23", "Insurance"),
    ModuleType.COMPENSATION: ("24", "Compensation"),
}


# ============ LIST/GET ENDPOINTS ============

@router.get("/records")
async def list_records(
    request: Request,
    trust_id: Optional[str] = Query(None),
    portfolio_id: Optional[str] = Query(None),
    module_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    include_voided: bool = Query(False),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """
    List governance records with filters.
    Returns records with current revision summary.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Build query
    query = {"user_id": user.user_id}
    
    if portfolio_id:
        query["portfolio_id"] = portfolio_id
    if trust_id:
        query["trust_id"] = trust_id
    if module_type:
        query["module_type"] = module_type
    if status:
        query["status"] = status
    if not include_voided:
        query["status"] = {"$ne": "voided"}
    
    try:
        total = await db.governance_records.count_documents(query)
        records = await db.governance_records.find(
            query, {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
        
        # Enrich with current revision info
        items = []
        for rec in records:
            current_rev = None
            payload_json = {}
            if rec.get("current_revision_id"):
                current_rev = await db.governance_revisions.find_one(
                    {"id": rec["current_revision_id"]}, {"_id": 0}
                )
                if current_rev:
                    payload_json = current_rev.get("payload_json", {})
            
            items.append({
                "id": rec["id"],
                "module_type": rec["module_type"],
                "title": rec["title"],
                "rm_id": rec.get("rm_id", ""),
                "status": rec["status"],
                "current_version": current_rev.get("version", 1) if current_rev else 1,
                "created_at": rec.get("created_at"),
                "finalized_at": rec.get("finalized_at"),
                "created_by": rec.get("created_by", ""),
                # Include payload_json for frontend badge logic
                "payload_json": payload_json
            })
        
        return success_response({
            "items": items,
            "total": total,
            "limit": limit,
            "offset": offset
        })
        
    except Exception as e:
        print(f"Error listing records: {e}")
        return error_response("DB_ERROR", "Failed to list records", {"error": str(e)}, status_code=500)


# ============ ID RESOLUTION HELPER ============

async def resolve_record_by_id_or_rm(id_or_rm: str, user_id: str) -> dict:
    """
    Resolve a record by either its `id` or `rm_id`.
    
    Logic:
    1. First try exact match on `id` field
    2. If not found, try match on `rm_id` field
    
    Returns: (record, resolver_path) or (None, None)
    """
    # First try by record ID
    record = await db.governance_records.find_one(
        {"id": id_or_rm, "user_id": user_id}, {"_id": 0}
    )
    
    if record:
        return record, "id"
    
    # Try by RM-ID
    record = await db.governance_records.find_one(
        {"rm_id": id_or_rm, "user_id": user_id}, {"_id": 0}
    )
    
    if record:
        return record, "rm_id"
    
    # Log the failed resolution for debugging
    print(f"[RESOLVE_FAIL] Could not find record: id_or_rm={id_or_rm}, user_id={user_id}")
    
    return None, None


@router.get("/records/{record_id}")
async def get_record(record_id: str, request: Request):
    """
    Get a single record with current revision, attestations, and attachments.
    Accepts either record `id` or `rm_id` for lookup.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        # Resolve by id or rm_id
        record, resolver_path = await resolve_record_by_id_or_rm(record_id, user.user_id)
        
        if not record:
            print(f"[GET_RECORD] NOT_FOUND: record_id={record_id}, user_id={user.user_id}")
            return error_response("NOT_FOUND", "Record not found", status_code=404)
        
        # Get current revision
        current_revision = None
        if record.get("current_revision_id"):
            current_revision = await db.governance_revisions.find_one(
                {"id": record["current_revision_id"]}, {"_id": 0}
            )
        
        # Count all revisions
        revision_count = await db.governance_revisions.count_documents(
            {"record_id": record_id}
        )
        
        # Get attestations for current revision
        attestations = []
        if current_revision:
            attestations = await db.governance_attestations.find(
                {"revision_id": current_revision["id"]}, {"_id": 0}
            ).to_list(50)
        
        # Get attachments for current revision
        attachments = []
        if current_revision:
            attachments = await db.governance_attachments.find(
                {"revision_id": current_revision["id"]}, {"_id": 0}
            ).to_list(100)
        
        return success_response({
            "record": serialize_doc(record),
            "current_revision": serialize_doc(current_revision) if current_revision else None,
            "revision_count": revision_count,
            "attestations": [serialize_doc(a) for a in attestations],
            "attachments": [serialize_doc(a) for a in attachments]
        })
        
    except Exception as e:
        print(f"Error getting record: {e}")
        return error_response("DB_ERROR", "Failed to get record", {"error": str(e)}, status_code=500)


@router.get("/records/{record_id}/revisions")
async def get_revisions(record_id: str, request: Request):
    """
    Get revision history for a record.
    Accepts either record `id` or `rm_id` for lookup.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        # Resolve by id or rm_id
        record, resolver_path = await resolve_record_by_id_or_rm(record_id, user.user_id)
        
        if not record:
            return error_response("NOT_FOUND", "Record not found", status_code=404)
        
        # Use resolved record ID
        actual_id = record["id"]
        
        revisions = await db.governance_revisions.find(
            {"record_id": actual_id}, {"_id": 0}
        ).sort("version", 1).to_list(100)
        
        summaries = []
        for rev in revisions:
            summaries.append({
                "id": rev["id"],
                "version": rev["version"],
                "change_type": rev["change_type"],
                "change_reason": rev.get("change_reason", ""),
                "created_at": rev.get("created_at"),
                "created_by": rev.get("created_by", ""),
                "finalized_at": rev.get("finalized_at"),
                "finalized_by": rev.get("finalized_by"),
                "content_hash": rev.get("content_hash", "")
            })
        
        return success_response({
            "record_id": record_id,
            "record_title": record.get("title", ""),
            "revisions": summaries,
            "total": len(summaries)
        })
        
    except Exception as e:
        print(f"Error getting revisions: {e}")
        return error_response("DB_ERROR", "Failed to get revisions", {"error": str(e)}, status_code=500)


@router.get("/revisions/{revision_id}")
async def get_revision(revision_id: str, request: Request):
    """
    Get a specific revision by ID.
    Used to view historical versions in read-only mode.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        revision = await db.governance_revisions.find_one(
            {"id": revision_id}, {"_id": 0}
        )
        
        if not revision:
            return error_response("NOT_FOUND", "Revision not found", status_code=404)
        
        # Verify user has access to parent record
        record = await db.governance_records.find_one(
            {"id": revision["record_id"], "user_id": user.user_id}
        )
        
        if not record:
            return error_response("NOT_FOUND", "Record not found", status_code=404)
        
        # Get attachments for this revision
        attachments = await db.governance_attachments.find(
            {"revision_id": revision_id}, {"_id": 0}
        ).to_list(100)
        
        return success_response({
            "revision": serialize_doc(revision),
            "record_title": record.get("title", ""),
            "record_status": record.get("status", ""),
            "attachments": [serialize_doc(a) for a in attachments]
        })
        
    except Exception as e:
        print(f"Error getting revision: {e}")
        return error_response("DB_ERROR", "Failed to get revision", {"error": str(e)}, status_code=500)


# ============ CREATE ENDPOINT ============

@router.post("/records")
async def create_record(request: Request):
    """
    Create a new governance record with initial draft revision (v1).
    """
    import traceback
    
    # Step 1: Get raw body first for logging
    try:
        raw_body = await request.body()
        print(f"[CREATE_RECORD] Raw body bytes: {raw_body[:500]}")
    except Exception as e:
        print(f"[CREATE_RECORD] ERROR reading raw body: {e}")
        return error_response("BODY_ERROR", f"Cannot read request body: {str(e)}", status_code=400)
    
    # Step 2: Parse JSON
    try:
        import json as json_lib
        body = json_lib.loads(raw_body)
        print(f"[CREATE_RECORD] Parsed JSON: {json_lib.dumps(body, indent=2)}")
    except Exception as e:
        print(f"[CREATE_RECORD] ERROR parsing JSON: {e}")
        return error_response("JSON_ERROR", f"Invalid JSON: {str(e)}", status_code=400)
    
    # Step 3: Auth check
    try:
        user = await get_current_user(request)
        print(f"[CREATE_RECORD] Authenticated user: {user.user_id}")
    except Exception as e:
        print(f"[CREATE_RECORD] AUTH ERROR: {e}")
        print(f"[CREATE_RECORD] Cookies: {request.cookies}")
        print(f"[CREATE_RECORD] Auth header: {request.headers.get('Authorization', 'NONE')}")
        return error_response("AUTH_ERROR", f"Authentication required: {str(e)}", status_code=401)
    
    # Step 4: Validate against Pydantic model
    try:
        data = RecordCreateRequest(**body)
        print(f"[CREATE_RECORD] Pydantic validation passed - module_type={data.module_type}, portfolio_id={data.portfolio_id}, title={data.title}")
    except Exception as e:
        print(f"[CREATE_RECORD] PYDANTIC ERROR: {e}")
        print(f"[CREATE_RECORD] Traceback: {traceback.format_exc()}")
        return error_response("VALIDATION_ERROR", f"Invalid request fields: {str(e)}", status_code=422)
    
    # Step 5: Process the create request
    try:
        print(f"[CREATE_RECORD] Step 5: Processing create request...")
        
        # Validate payload
        is_valid, error_msg, normalized_payload = validate_payload(
            data.module_type, data.payload_json
        )
        if not is_valid:
            print(f"[CREATE_RECORD] Payload validation failed: {error_msg}")
            return error_response("VALIDATION_ERROR", f"Invalid payload: {error_msg}", status_code=422)
        
        print(f"[CREATE_RECORD] Payload validated successfully")
        
        # RM-ID and Subject handling
        rm_id = ""
        rm_subject_id = None
        rm_sub = 0
        
        # Determine category from module type
        category = MODULE_TO_CATEGORY.get(data.module_type.value, SubjectCategory.MISC)
        
        if data.rm_subject_id:
            # Link to existing subject - allocate next subnumber
            try:
                rm_id, rm_sub, rm_base, rm_group, subject_title = await allocate_rm_id_from_subject(
                    data.rm_subject_id,
                    user.user_id
                )
                rm_subject_id = data.rm_subject_id
                print(f"[CREATE_RECORD] Linked to subject {rm_subject_id}, rm_id={rm_id}")
            except ValueError as e:
                print(f"[CREATE_RECORD] Subject allocation error: {e}")
                return error_response("SUBJECT_ERROR", str(e), status_code=400)
                
        elif data.create_new_subject:
            # Create new subject (spawn new thread)
            if not data.new_subject_title:
                # Use record title as subject title
                new_subject_title = data.title
            else:
                new_subject_title = data.new_subject_title
            
            try:
                rm_subject_id, rm_id, rm_sub, rm_base, rm_group = await create_new_subject_and_allocate(
                    portfolio_id=data.portfolio_id,
                    user_id=user.user_id,
                    trust_id=data.trust_id,
                    title=new_subject_title,
                    category=category,
                    party_id=data.new_subject_party_id,
                    party_name=data.new_subject_party_name,
                    external_ref=data.new_subject_external_ref,
                    created_by=user.name if hasattr(user, 'name') else user.user_id
                )
                print(f"[CREATE_RECORD] Created new subject {rm_subject_id}, rm_id={rm_id}")
            except ValueError as e:
                print(f"[CREATE_RECORD] New subject creation error: {e}")
                return error_response("SUBJECT_ERROR", str(e), status_code=400)
                
        else:
            # Legacy fallback - generate RM-ID without subject linking
            print(f"[CREATE_RECORD] Using legacy RM-ID generation...")
            try:
                subject_code, subject_name = MODULE_SUBJECT_CODES.get(
                    data.module_type, ("00", "General")
                )
                rm_id, _, _, _ = await generate_subject_rm_id(
                    data.portfolio_id, user.user_id, subject_code, subject_name
                )
                print(f"[CREATE_RECORD] Legacy RM-ID generated: {rm_id}")
            except Exception as e:
                print(f"[CREATE_RECORD] Warning: Could not generate RM-ID: {e}")
        
        # Create record with RM Subject linking
        print(f"[CREATE_RECORD] Creating GovernanceRecord...")
        record = GovernanceRecord(
            trust_id=data.trust_id,
            portfolio_id=data.portfolio_id,
            user_id=user.user_id,
            module_type=data.module_type,
            title=data.title,
            rm_id=rm_id,
            rm_subject_id=rm_subject_id,  # Link to subject
            rm_sub=rm_sub,  # Subnumber within subject
            created_by=user.name if hasattr(user, 'name') else user.user_id
        )
        
        # Create initial revision (v1, draft)
        print(f"[CREATE_RECORD] Creating GovernanceRevision...")
        revision = GovernanceRevision(
            record_id=record.id,
            version=1,
            change_type=ChangeType.INITIAL,
            payload_json=normalized_payload,
            created_by=user.name if hasattr(user, 'name') else user.user_id
        )
        
        # Link record to revision
        record.current_revision_id = revision.id
        
        # Save to database
        print(f"[CREATE_RECORD] Saving to database...")
        record_doc = record.model_dump()
        record_doc["created_at"] = record_doc["created_at"].isoformat()
        
        revision_doc = revision.model_dump()
        revision_doc["created_at"] = revision_doc["created_at"].isoformat()
        
        await db.governance_records.insert_one(record_doc)
        print(f"[CREATE_RECORD] Record inserted: {record.id}")
        
        await db.governance_revisions.insert_one(revision_doc)
        print(f"[CREATE_RECORD] Revision inserted: {revision.id}")
        
        # Log event with subject info
        await log_event(
            event_type=EventType.CREATED,
            record_id=record.id,
            actor_id=user.user_id,
            portfolio_id=data.portfolio_id,
            trust_id=data.trust_id,
            revision_id=revision.id,
            actor_name=record.created_by,
            meta={
                "module_type": data.module_type.value,
                "title": data.title,
                "rm_subject_id": rm_subject_id,
                "rm_sub": rm_sub,
                "rm_id": rm_id
            }
        )
        print(f"[CREATE_RECORD] SUCCESS - Record {record.id} created")
        
        return success_response({
            "record": serialize_doc(record_doc),
            "revision": serialize_doc(revision_doc)
        }, message="Record created successfully")
        
    except Exception as e:
        print(f"Error creating record: {e}")
        return error_response("CREATE_ERROR", "Failed to create record", {"error": str(e)}, status_code=500)


# ============ UPDATE (PUT) ENDPOINT ============

@router.put("/records/{record_id}")
async def update_record(record_id: str, request: Request):
    """
    Update a draft record's title and payload.
    Accepts either record `id` or `rm_id` for lookup.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        body = await request.json()
        
        # Resolve by id or rm_id
        record, resolver_path = await resolve_record_by_id_or_rm(record_id, user.user_id)
        
        if not record:
            print(f"[UPDATE_RECORD] NOT_FOUND: record_id={record_id}, user_id={user.user_id}")
            return error_response("NOT_FOUND", "Record not found", status_code=404)
        
        # Use resolved record ID
        actual_id = record["id"]
        
        # Check if record is finalized
        if record.get("status") == "finalized":
            return error_response(
                "ALREADY_FINALIZED",
                "This record is finalized and cannot be edited. Use 'Amend' to create a new revision.",
                status_code=409
            )
        
        if record.get("status") == "voided":
            return error_response("VOIDED", "Cannot update a voided record", status_code=400)
        
        # Get current revision
        revision = None
        if record.get("current_revision_id"):
            revision = await db.governance_revisions.find_one(
                {"id": record["current_revision_id"]}
            )
        
        if revision and revision.get("finalized_at"):
            return error_response(
                "REVISION_FINALIZED",
                "Current revision is finalized. Use 'Amend' to create a new revision.",
                status_code=409
            )
        
        # Prepare updates
        now = datetime.now(timezone.utc).isoformat()
        record_updates = {"updated_at": now}
        revision_updates = {}
        
        # Update title if provided
        new_title = body.get("title")
        if new_title and new_title.strip():
            record_updates["title"] = new_title.strip()
        
        # Update payload if provided
        new_payload = body.get("payload_json")
        if new_payload is not None:
            # Validate payload for the module type
            is_valid, error_msg, validated_payload = validate_payload(
                ModuleType(record["module_type"]),
                new_payload,
                is_finalized=False
            )
            
            if not is_valid:
                return error_response("VALIDATION_ERROR", error_msg)
            
            revision_updates["payload_json"] = validated_payload
            # Also update title in payload if it exists
            if new_title:
                revision_updates["payload_json"]["title"] = new_title.strip()
        
        # Apply record updates (use actual_id from resolved record)
        if record_updates:
            await db.governance_records.update_one(
                {"id": actual_id},
                {"$set": record_updates}
            )
        
        # Apply revision updates
        if revision_updates and revision:
            await db.governance_revisions.update_one(
                {"id": revision["id"]},
                {"$set": revision_updates}
            )
        
        # Log audit event
        await log_event(
            event_type=EventType.UPDATED_DRAFT,
            record_id=actual_id,
            revision_id=revision["id"] if revision else None,
            portfolio_id=record.get("portfolio_id"),
            actor_id=user.user_id,
            actor_name=user.name if hasattr(user, 'name') else user.user_id,
            meta={"updated_fields": list(body.keys()), "resolver_path": resolver_path}
        )
        
        # Refetch and return updated record
        updated_record = await db.governance_records.find_one(
            {"id": actual_id}, {"_id": 0}
        )
        updated_revision = None
        if updated_record.get("current_revision_id"):
            updated_revision = await db.governance_revisions.find_one(
                {"id": updated_record["current_revision_id"]}, {"_id": 0}
            )
        
        return success_response({
            "record": serialize_doc(updated_record),
            "current_revision": serialize_doc(updated_revision) if updated_revision else None
        }, message="Record updated successfully")
        
    except Exception as e:
        print(f"Error updating record: {e}")
        return error_response("UPDATE_ERROR", "Failed to update record", {"error": str(e)}, status_code=500)


# ============ FINALIZE ENDPOINT ============

@router.post("/records/{record_id}/finalize")
async def finalize_record(record_id: str, request: Request):
    """
    Finalize the current draft revision.
    Accepts either record `id` or `rm_id` for lookup.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        # Resolve by id or rm_id
        record, resolver_path = await resolve_record_by_id_or_rm(record_id, user.user_id)
        
        if not record:
            print(f"[FINALIZE_RECORD] NOT_FOUND: record_id={record_id}, user_id={user.user_id}")
            return error_response("NOT_FOUND", "Record not found", status_code=404)
        
        # Use resolved record ID
        actual_id = record["id"]
        
        if not record.get("current_revision_id"):
            return error_response("NO_REVISION", "Record has no revision to finalize")
        
        revision = await db.governance_revisions.find_one(
            {"id": record["current_revision_id"]}
        )
        
        if not revision:
            return error_response("NOT_FOUND", "Current revision not found", status_code=404)
        
        # STRICT: Cannot finalize an already-finalized revision
        if revision.get("finalized_at"):
            return error_response(
                "ALREADY_FINALIZED",
                "This revision is already finalized. Use amend to create a new revision.",
                status_code=409
            )
        
        # Compute content hash
        finalized_at = datetime.now(timezone.utc)
        finalized_by = user.name if hasattr(user, 'name') else user.user_id
        
        content_hash = compute_content_hash(
            payload_json=revision.get("payload_json", {}),
            created_at=revision.get("created_at", ""),
            created_by=revision.get("created_by", ""),
            version=revision.get("version", 1),
            parent_hash=revision.get("parent_hash")
        )
        
        # Update revision
        await db.governance_revisions.update_one(
            {"id": revision["id"]},
            {"$set": {
                "finalized_at": finalized_at.isoformat(),
                "finalized_by": finalized_by,
                "content_hash": content_hash
            }}
        )
        
        # Update record status
        record_update = {
            "status": RecordStatus.FINALIZED.value,
            "finalized_at": finalized_at.isoformat(),
            "finalized_by": finalized_by
        }
        
        # Only set these on first finalization
        if not record.get("finalized_at"):
            record_update["finalized_at"] = finalized_at.isoformat()
            record_update["finalized_by"] = finalized_by
        
        await db.governance_records.update_one(
            {"id": actual_id},
            {"$set": record_update}
        )
        
        # Log event
        await log_event(
            event_type=EventType.FINALIZED,
            record_id=actual_id,
            actor_id=user.user_id,
            portfolio_id=record.get("portfolio_id", ""),
            trust_id=record.get("trust_id"),
            revision_id=revision["id"],
            actor_name=finalized_by,
            meta={"version": revision.get("version", 1), "content_hash": content_hash}
        )
        
        return success_response({
            "record_id": actual_id,
            "revision_id": revision["id"],
            "version": revision.get("version", 1),
            "finalized_at": finalized_at.isoformat(),
            "finalized_by": finalized_by,
            "content_hash": content_hash
        }, message="Record finalized successfully")
        
    except Exception as e:
        print(f"Error finalizing record: {e}")
        return error_response("FINALIZE_ERROR", "Failed to finalize record", {"error": str(e)}, status_code=500)


# ============ AMEND ENDPOINT ============

@router.post("/records/{record_id}/amend")
async def create_amendment(record_id: str, data: RecordAmendRequest, request: Request):
    """
    Create an amendment to a finalized record.
    Accepts either record `id` or `rm_id` for lookup.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    if not data.change_reason or not data.change_reason.strip():
        return error_response("VALIDATION_ERROR", "Change reason is required for amendments")
    
    try:
        # Resolve by id or rm_id
        record, resolver_path = await resolve_record_by_id_or_rm(record_id, user.user_id)
        
        if not record:
            print(f"[AMEND_RECORD] NOT_FOUND: record_id={record_id}, user_id={user.user_id}")
            return error_response("NOT_FOUND", "Record not found", status_code=404)
        
        # Use resolved record ID
        actual_id = record["id"]
        
        # STRICT: Can only amend finalized records
        if record.get("status") != RecordStatus.FINALIZED.value:
            return error_response(
                "NOT_FINALIZED",
                "Cannot amend a non-finalized record. Finalize it first or edit the draft directly.",
                status_code=409
            )
        
        # Get current revision
        current_revision = await db.governance_revisions.find_one(
            {"id": record.get("current_revision_id")}
        )
        
        if not current_revision:
            return error_response("NOT_FOUND", "Current revision not found", status_code=404)
        
        # STRICT: Current revision must be finalized
        if not current_revision.get("finalized_at"):
            return error_response(
                "NOT_FINALIZED",
                "Current revision is not finalized. Finalize it first.",
                status_code=409
            )
        
        # Create new draft revision
        new_version = current_revision.get("version", 1) + 1
        created_by = user.name if hasattr(user, 'name') else user.user_id
        
        new_revision = GovernanceRevision(
            record_id=actual_id,
            version=new_version,
            parent_revision_id=current_revision["id"],
            change_type=data.change_type,
            change_reason=data.change_reason.strip(),
            payload_json=current_revision.get("payload_json", {}),  # Deep copy
            created_by=created_by,
            parent_hash=current_revision.get("content_hash", "")
        )
        
        if data.effective_at:
            new_revision.effective_at = datetime.fromisoformat(data.effective_at.replace('Z', '+00:00'))
        
        revision_doc = new_revision.model_dump()
        revision_doc["created_at"] = revision_doc["created_at"].isoformat()
        if revision_doc.get("effective_at"):
            revision_doc["effective_at"] = revision_doc["effective_at"].isoformat()
        
        await db.governance_revisions.insert_one(revision_doc)
        
        # Update record to point to new draft
        await db.governance_records.update_one(
            {"id": actual_id},
            {"$set": {
                "current_revision_id": new_revision.id,
                "status": RecordStatus.DRAFT.value  # Back to draft until new revision finalized
            }}
        )
        
        # Log event
        await log_event(
            event_type=EventType.AMENDMENT_CREATED,
            record_id=actual_id,
            actor_id=user.user_id,
            portfolio_id=record.get("portfolio_id", ""),
            trust_id=record.get("trust_id"),
            revision_id=new_revision.id,
            actor_name=created_by,
            meta={
                "version": new_version,
                "change_type": data.change_type.value,
                "change_reason": data.change_reason,
                "parent_revision_id": current_revision["id"]
            }
        )
        
        return success_response({
            "record_id": actual_id,
            "revision_id": new_revision.id,
            "version": new_version,
            "parent_revision_id": current_revision["id"],
            "parent_hash": current_revision.get("content_hash", "")
        }, message="Amendment draft created. Edit and finalize when ready.")
        
    except Exception as e:
        print(f"Error creating amendment: {e}")
        return error_response("AMEND_ERROR", "Failed to create amendment", {"error": str(e)}, status_code=500)


# ============ UPDATE DRAFT ENDPOINT ============

@router.patch("/revisions/{revision_id}")
async def update_draft_revision(revision_id: str, data: RevisionUpdateRequest, request: Request):
    """
    Update a DRAFT revision only.
    
    STRICT: Returns 403/409 if revision is already finalized.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        revision = await db.governance_revisions.find_one({"id": revision_id})
        
        if not revision:
            return error_response("NOT_FOUND", "Revision not found", status_code=404)
        
        # Verify user access
        record = await db.governance_records.find_one(
            {"id": revision["record_id"], "user_id": user.user_id}
        )
        
        if not record:
            return error_response("NOT_FOUND", "Record not found", status_code=404)
        
        # STRICT: Cannot update finalized revision
        if revision.get("finalized_at"):
            return error_response(
                "REVISION_LOCKED",
                "Cannot edit a finalized revision. Create an amendment instead.",
                status_code=409
            )
        
        # Build update
        update_fields = {}
        
        if data.payload_json is not None:
            # Validate payload
            is_valid, error_msg, normalized = validate_payload(
                record.get("module_type"), data.payload_json
            )
            if not is_valid:
                return error_response("VALIDATION_ERROR", f"Invalid payload: {error_msg}")
            update_fields["payload_json"] = normalized
        
        if not update_fields:
            return error_response("NO_CHANGES", "No valid fields to update")
        
        await db.governance_revisions.update_one(
            {"id": revision_id},
            {"$set": update_fields}
        )
        
        # Update record title if provided
        if data.title:
            await db.governance_records.update_one(
                {"id": record["id"]},
                {"$set": {"title": data.title}}
            )
        
        # Log event
        await log_event(
            event_type=EventType.UPDATED_DRAFT,
            record_id=record["id"],
            actor_id=user.user_id,
            portfolio_id=record.get("portfolio_id", ""),
            trust_id=record.get("trust_id"),
            revision_id=revision_id,
            actor_name=user.name if hasattr(user, 'name') else user.user_id,
            meta={"fields_updated": list(update_fields.keys())}
        )
        
        # Return updated revision
        updated = await db.governance_revisions.find_one({"id": revision_id}, {"_id": 0})
        
        return success_response({
            "revision": serialize_doc(updated)
        }, message="Draft updated successfully")
        
    except Exception as e:
        print(f"Error updating revision: {e}")
        return error_response("UPDATE_ERROR", "Failed to update revision", {"error": str(e)}, status_code=500)


# ============ FINALIZE AMENDMENT ENDPOINT ============

@router.post("/revisions/{revision_id}/finalize")
async def finalize_amendment(revision_id: str, request: Request):
    """
    Finalize an amendment revision.
    
    - Computes hash chain: content_hash includes parent_hash
    - Updates record.current_revision_id
    - Record status stays/returns to finalized
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        revision = await db.governance_revisions.find_one({"id": revision_id})
        
        if not revision:
            return error_response("NOT_FOUND", "Revision not found", status_code=404)
        
        record = await db.governance_records.find_one(
            {"id": revision["record_id"], "user_id": user.user_id}
        )
        
        if not record:
            return error_response("NOT_FOUND", "Record not found", status_code=404)
        
        # STRICT: Cannot finalize already-finalized revision
        if revision.get("finalized_at"):
            return error_response(
                "ALREADY_FINALIZED",
                "This revision is already finalized.",
                status_code=409
            )
        
        # Compute content hash with parent hash for chain integrity
        finalized_at = datetime.now(timezone.utc)
        finalized_by = user.name if hasattr(user, 'name') else user.user_id
        
        content_hash = compute_content_hash(
            payload_json=revision.get("payload_json", {}),
            created_at=revision.get("created_at", ""),
            created_by=revision.get("created_by", ""),
            version=revision.get("version", 1),
            parent_hash=revision.get("parent_hash")
        )
        
        # Update revision
        await db.governance_revisions.update_one(
            {"id": revision_id},
            {"$set": {
                "finalized_at": finalized_at.isoformat(),
                "finalized_by": finalized_by,
                "content_hash": content_hash
            }}
        )
        
        # Update record
        await db.governance_records.update_one(
            {"id": record["id"]},
            {"$set": {
                "current_revision_id": revision_id,
                "status": RecordStatus.FINALIZED.value
            }}
        )
        
        # Log event
        await log_event(
            event_type=EventType.AMENDMENT_FINALIZED,
            record_id=record["id"],
            actor_id=user.user_id,
            portfolio_id=record.get("portfolio_id", ""),
            trust_id=record.get("trust_id"),
            revision_id=revision_id,
            actor_name=finalized_by,
            meta={
                "version": revision.get("version", 1),
                "content_hash": content_hash,
                "parent_hash": revision.get("parent_hash", "")
            }
        )
        
        return success_response({
            "record_id": record["id"],
            "revision_id": revision_id,
            "version": revision.get("version", 1),
            "finalized_at": finalized_at.isoformat(),
            "finalized_by": finalized_by,
            "content_hash": content_hash
        }, message="Amendment finalized successfully")
        
    except Exception as e:
        print(f"Error finalizing amendment: {e}")
        return error_response("FINALIZE_ERROR", "Failed to finalize amendment", {"error": str(e)}, status_code=500)


# ============ VOID ENDPOINT ============

@router.post("/records/{record_id}/void")
async def void_record(record_id: str, data: RecordVoidRequest, request: Request):
    """
    Void (soft-delete) a record.
    Accepts either record `id` or `rm_id` for lookup.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    if not data.void_reason or not data.void_reason.strip():
        return error_response("VALIDATION_ERROR", "Void reason is required")
    
    try:
        # Resolve by id or rm_id
        record, resolver_path = await resolve_record_by_id_or_rm(record_id, user.user_id)
        
        if not record:
            print(f"[VOID_RECORD] NOT_FOUND: record_id={record_id}, user_id={user.user_id}")
            return error_response("NOT_FOUND", "Record not found", status_code=404)
        
        # Use resolved record ID
        actual_id = record["id"]
        
        if record.get("status") == RecordStatus.VOIDED.value:
            return error_response("ALREADY_VOIDED", "Record is already voided", status_code=409)
        
        voided_at = datetime.now(timezone.utc)
        voided_by = user.name if hasattr(user, 'name') else user.user_id
        
        await db.governance_records.update_one(
            {"id": actual_id},
            {"$set": {
                "status": RecordStatus.VOIDED.value,
                "voided_at": voided_at.isoformat(),
                "voided_by": voided_by,
                "void_reason": data.void_reason.strip()
            }}
        )
        
        # Log event
        await log_event(
            event_type=EventType.VOIDED,
            record_id=actual_id,
            actor_id=user.user_id,
            portfolio_id=record.get("portfolio_id", ""),
            trust_id=record.get("trust_id"),
            actor_name=voided_by,
            meta={"void_reason": data.void_reason.strip()}
        )
        
        return success_response({
            "record_id": actual_id,
            "voided_at": voided_at.isoformat(),
            "voided_by": voided_by
        }, message="Record voided successfully")
        
    except Exception as e:
        print(f"Error voiding record: {e}")
        return error_response("VOID_ERROR", "Failed to void record", {"error": str(e)}, status_code=500)


# ============ ATTESTATION ENDPOINT ============

@router.post("/revisions/{revision_id}/attest")
async def add_attestation(revision_id: str, data: AttestationCreateRequest, request: Request):
    """
    Add an attestation to a finalized revision.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        revision = await db.governance_revisions.find_one({"id": revision_id})
        
        if not revision:
            return error_response("NOT_FOUND", "Revision not found", status_code=404)
        
        # Can only attest finalized revisions
        if not revision.get("finalized_at"):
            return error_response(
                "NOT_FINALIZED",
                "Can only attest finalized revisions",
                status_code=409
            )
        
        record = await db.governance_records.find_one(
            {"id": revision["record_id"], "user_id": user.user_id}
        )
        
        if not record:
            return error_response("NOT_FOUND", "Record not found", status_code=404)
        
        attestation = GovernanceAttestation(
            trust_id=record.get("trust_id"),
            portfolio_id=record.get("portfolio_id"),
            record_id=record["id"],
            revision_id=revision_id,
            role=data.role,
            signer_id=user.user_id,
            signer_name=data.signer_name,
            signature_type=data.signature_type,
            attestation_text=data.attestation_text,
            ip_address=request.client.host if request.client else ""
        )
        
        doc = attestation.model_dump()
        doc["signed_at"] = doc["signed_at"].isoformat()
        
        await db.governance_attestations.insert_one(doc)
        
        # Log event
        await log_event(
            event_type=EventType.ATTESTATION_ADDED,
            record_id=record["id"],
            actor_id=user.user_id,
            portfolio_id=record.get("portfolio_id", ""),
            trust_id=record.get("trust_id"),
            revision_id=revision_id,
            actor_name=data.signer_name,
            meta={"role": data.role.value, "signature_type": data.signature_type}
        )
        
        return success_response({
            "attestation": serialize_doc(doc)
        }, message="Attestation added successfully")
        
    except Exception as e:
        print(f"Error adding attestation: {e}")
        return error_response("ATTEST_ERROR", "Failed to add attestation", {"error": str(e)}, status_code=500)


# ============ AUDIT LOG ENDPOINT ============

@router.get("/records/{record_id}/events")
async def get_record_events(record_id: str, request: Request, limit: int = Query(100, ge=1, le=500)):
    """
    Get audit log for a record.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        record = await db.governance_records.find_one(
            {"id": record_id, "user_id": user.user_id}
        )
        
        if not record:
            return error_response("NOT_FOUND", "Record not found", status_code=404)
        
        events = await db.governance_events.find(
            {"record_id": record_id}, {"_id": 0}
        ).sort("at", -1).to_list(limit)
        
        return success_response({
            "record_id": record_id,
            "events": [serialize_doc(e) for e in events],
            "total": len(events)
        })
        
    except Exception as e:
        print(f"Error getting events: {e}")
        return error_response("DB_ERROR", "Failed to get events", {"error": str(e)}, status_code=500)


# ============ DIFF ENDPOINT ============

@router.get("/revisions/{revision_id}/diff")
async def get_revision_diff(revision_id: str, request: Request, compare_to: Optional[str] = Query(None)):
    """
    Get diff between two revisions.
    If compare_to is not provided, compares to parent revision.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        revision = await db.governance_revisions.find_one({"id": revision_id}, {"_id": 0})
        
        if not revision:
            return error_response("NOT_FOUND", "Revision not found", status_code=404)
        
        record = await db.governance_records.find_one(
            {"id": revision["record_id"], "user_id": user.user_id}
        )
        
        if not record:
            return error_response("NOT_FOUND", "Record not found", status_code=404)
        
        # Get comparison revision
        compare_revision = None
        if compare_to:
            compare_revision = await db.governance_revisions.find_one(
                {"id": compare_to}, {"_id": 0}
            )
        elif revision.get("parent_revision_id"):
            compare_revision = await db.governance_revisions.find_one(
                {"id": revision["parent_revision_id"]}, {"_id": 0}
            )
        
        # Compute simple key-based diff
        current_payload = revision.get("payload_json", {})
        parent_payload = compare_revision.get("payload_json", {}) if compare_revision else {}
        
        changes = []
        all_keys = set(current_payload.keys()) | set(parent_payload.keys())
        
        for key in all_keys:
            old_val = parent_payload.get(key)
            new_val = current_payload.get(key)
            
            if old_val != new_val:
                changes.append({
                    "field": key,
                    "old_value": old_val,
                    "new_value": new_val,
                    "type": "modified" if key in parent_payload and key in current_payload else (
                        "added" if key not in parent_payload else "removed"
                    )
                })
        
        return success_response({
            "revision_id": revision_id,
            "revision_version": revision.get("version", 1),
            "compare_to_id": compare_revision["id"] if compare_revision else None,
            "compare_to_version": compare_revision.get("version") if compare_revision else None,
            "changes": changes,
            "before_payload": parent_payload,
            "after_payload": current_payload
        })
        
    except Exception as e:
        print(f"Error getting diff: {e}")
        return error_response("DB_ERROR", "Failed to get diff", {"error": str(e)}, status_code=500)
