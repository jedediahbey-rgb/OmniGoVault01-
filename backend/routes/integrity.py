"""
Integrity & Diagnostics API Routes

Provides endpoints for:
- Running integrity scans
- Viewing scan results
- Executing repair actions
"""

from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime, timezone
import json

from services.integrity_checker import create_integrity_checker, IntegrityScanResult
from services.lifecycle_engine import lifecycle_engine, FinalizeValidation

router = APIRouter(prefix="/api/integrity", tags=["integrity"])

# Dependencies injected from server.py
db = None
get_current_user = None


def init_integrity_routes(database, auth_func):
    """Initialize routes with dependencies"""
    global db, get_current_user
    db = database
    get_current_user = auth_func


def success_response(data, status_code=200):
    return JSONResponse(content={"ok": True, "data": data}, status_code=status_code)


def error_response(code, message, details=None, status_code=400):
    return JSONResponse(
        content={"ok": False, "error": {"code": code, "message": message, "details": details or {}}},
        status_code=status_code
    )


# ============ SCAN ENDPOINTS ============

@router.post("/scan")
async def run_integrity_scan(request: Request):
    """
    Run a full integrity scan for the current user's data.
    Returns detailed report of any issues found.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    checker = create_integrity_checker(db)
    result = await checker.run_full_scan(user.user_id)
    
    # Convert to JSON-serializable format
    result_dict = {
        "scan_id": result.scan_id,
        "started_at": result.started_at,
        "completed_at": result.completed_at,
        "total_records_scanned": result.total_records_scanned,
        "total_issues_found": result.total_issues_found,
        "issues_by_severity": result.issues_by_severity,
        "issues_by_type": result.issues_by_type,
        "auto_fixable_count": result.auto_fixable_count,
        "errors": result.errors,
        "issues": [
            {
                "issue_type": issue.issue_type.value,
                "severity": issue.severity.value,
                "record_id": issue.record_id,
                "record_type": issue.record_type,
                "description": issue.description,
                "details": issue.details,
                "suggested_fix": issue.suggested_fix,
                "auto_fixable": issue.auto_fixable,
            }
            for issue in result.issues
        ]
    }
    
    # Store scan result for later reference
    await db.integrity_scans.insert_one({
        **result_dict,
        "user_id": user.user_id,
        "_id": None  # Let MongoDB generate
    })
    
    return success_response(result_dict)


@router.get("/scans")
async def list_scan_results(request: Request, limit: int = Query(10, ge=1, le=50)):
    """
    List previous integrity scan results.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    scans = await db.integrity_scans.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("started_at", -1).limit(limit).to_list(limit)
    
    # Return summary only
    summaries = [
        {
            "scan_id": s.get("scan_id"),
            "started_at": s.get("started_at"),
            "completed_at": s.get("completed_at"),
            "total_records_scanned": s.get("total_records_scanned"),
            "total_issues_found": s.get("total_issues_found"),
            "issues_by_severity": s.get("issues_by_severity"),
            "auto_fixable_count": s.get("auto_fixable_count"),
        }
        for s in scans
    ]
    
    return success_response({"scans": summaries})


@router.get("/scans/{scan_id}")
async def get_scan_result(request: Request, scan_id: str):
    """
    Get detailed results of a specific scan.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    scan = await db.integrity_scans.find_one(
        {"scan_id": scan_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not scan:
        return error_response("NOT_FOUND", "Scan not found", status_code=404)
    
    return success_response(scan)


# ============ REPAIR ENDPOINTS ============

@router.post("/repair/missing-revision/{record_id}")
async def repair_missing_revision(request: Request, record_id: str):
    """
    Create initial revision for a record that has none.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    checker = create_integrity_checker(db)
    result = await checker.repair_missing_revision(record_id, user.user_id)
    
    if result.get("success"):
        return success_response(result)
    else:
        return error_response("REPAIR_FAILED", result.get("error", "Unknown error"))


@router.post("/repair/invalid-status/{record_id}")
async def repair_invalid_status(
    request: Request,
    record_id: str,
    new_status: str = Query("draft")
):
    """
    Fix invalid status by setting to a valid value.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    checker = create_integrity_checker(db)
    result = await checker.repair_invalid_status(record_id, user.user_id, new_status)
    
    if result.get("success"):
        return success_response(result)
    else:
        return error_response("REPAIR_FAILED", result.get("error", "Unknown error"))


@router.delete("/repair/orphan-revision/{revision_id}")
async def delete_orphan_revision(request: Request, revision_id: str):
    """
    Delete an orphaned revision.
    """
    try:
        await get_current_user(request)  # Verify auth
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    checker = create_integrity_checker(db)
    result = await checker.delete_orphan_revision(revision_id)
    
    if result.get("success"):
        return success_response(result)
    else:
        return error_response("REPAIR_FAILED", result.get("error", "Unknown error"))


@router.post("/repair/merge-threads")
async def merge_duplicate_threads(
    request: Request,
    primary_thread_id: str = Query(...),
    duplicate_thread_ids: str = Query(...)  # Comma-separated
):
    """
    Merge duplicate RM-ID threads into a primary thread.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    duplicate_ids = [id.strip() for id in duplicate_thread_ids.split(",") if id.strip()]
    
    if not duplicate_ids:
        return error_response("INVALID_INPUT", "No duplicate thread IDs provided")
    
    checker = create_integrity_checker(db)
    result = await checker.merge_duplicate_threads(
        primary_thread_id,
        duplicate_ids,
        user.user_id
    )
    
    if result.get("success"):
        return success_response(result)
    else:
        return error_response("REPAIR_FAILED", result.get("error", "Unknown error"))


# ============ LIFECYCLE VALIDATION ENDPOINTS ============

@router.post("/validate/finalize/{record_id}")
async def validate_finalization(request: Request, record_id: str):
    """
    Validate whether a record can be finalized.
    Returns detailed information about what will happen.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Get the record
    record = await db.governance_records.find_one(
        {"id": record_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not record:
        return error_response("NOT_FOUND", "Record not found", status_code=404)
    
    # Get current revision payload
    revision = None
    if record.get("current_revision_id"):
        revision = await db.governance_revisions.find_one(
            {"id": record["current_revision_id"]},
            {"_id": 0}
        )
    
    payload = revision.get("payload_json", {}) if revision else {}
    
    # Validate using lifecycle engine
    validation = lifecycle_engine.validate_finalization(
        module_type=record.get("module_type", "minutes"),
        payload=payload,
        current_status=record.get("status", "draft")
    )
    
    return success_response({
        "record_id": record_id,
        "module_type": record.get("module_type"),
        "current_status": record.get("status"),
        "can_finalize": validation.can_finalize,
        "errors": validation.errors,
        "warnings": validation.warnings,
        "missing_required": validation.missing_required,
        "will_lock": validation.will_lock,
        "remains_editable": validation.remains_editable,
        "confirmation_message": validation.confirmation_message,
    })


@router.get("/lifecycle/transitions/{record_id}")
async def get_available_transitions(request: Request, record_id: str):
    """
    Get available status transitions for a record.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    record = await db.governance_records.find_one(
        {"id": record_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not record:
        return error_response("NOT_FOUND", "Record not found", status_code=404)
    
    transitions = lifecycle_engine.get_available_transitions(
        current_status=record.get("status", "draft"),
        module_type=record.get("module_type", "minutes")
    )
    
    return success_response({
        "record_id": record_id,
        "current_status": record.get("status"),
        "available_transitions": transitions
    })


@router.get("/lifecycle/derive-status")
async def derive_operational_status(
    request: Request,
    module_type: str = Query(...),
    lifecycle_status: str = Query(...),
    effective_date: Optional[str] = Query(None)
):
    """
    Get the derived operational status based on lifecycle and dates.
    Demonstrates the rule that Draft can never show as "Active".
    """
    # This is a stateless utility endpoint
    payload = {}
    if effective_date:
        payload["effective_date"] = effective_date
    
    derived = lifecycle_engine.derive_operational_status(
        module_type=module_type,
        lifecycle_status=lifecycle_status,
        payload=payload,
        effective_date=effective_date
    )
    
    return success_response({
        "module_type": module_type,
        "lifecycle_status": lifecycle_status,
        "effective_date": effective_date,
        "derived_operational_status": derived,
        "rule_explanation": "Draft records always show lifecycle status, never operational status like 'Active'"
    })
