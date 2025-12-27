"""
Comprehensive Audit Log API Routes

Endpoints for viewing, searching, and exporting audit trail data.
"""

from fastapi import APIRouter, Request, Query
from typing import Optional
from datetime import datetime, timezone

from db import db
from auth import get_current_user
from utils import success_response, error_response

from services.audit_log_service import (
    create_audit_log_service,
    AuditCategory,
    AuditSeverity
)

router = APIRouter(prefix="/audit-log", tags=["Audit Log"])


# ============ AUDIT LOG RETRIEVAL ============

@router.get("")
async def get_audit_entries(
    request: Request,
    portfolio_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    resource_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    sort: str = Query("desc", regex="^(asc|desc)$")
):
    """
    Get audit log entries with filtering and pagination.
    
    Query Parameters:
    - portfolio_id: Filter by portfolio
    - category: governance, binder, thread, integrity, auth, system, export, compliance
    - severity: info, notice, warning, critical
    - resource_type: record, binder_run, thread, seal
    - resource_id: Specific resource ID
    - start_date: ISO date string
    - end_date: ISO date string
    - search: Text search in action/event_type
    - limit: Max results (1-500)
    - offset: Pagination offset
    - sort: asc or desc by timestamp
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        audit_service = create_audit_log_service(db)
        
        result = await audit_service.get_entries(
            user_id=user.user_id,
            portfolio_id=portfolio_id,
            category=category,
            severity=severity,
            resource_type=resource_type,
            resource_id=resource_id,
            start_date=start_date,
            end_date=end_date,
            search=search,
            limit=limit,
            offset=offset,
            sort_order=sort
        )
        
        return success_response(result)
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.get("/entry/{entry_id}")
async def get_audit_entry(entry_id: str, request: Request):
    """Get a single audit log entry by ID."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        audit_service = create_audit_log_service(db)
        entry = await audit_service.get_entry(entry_id, user.user_id)
        
        if not entry:
            return error_response("NOT_FOUND", "Audit entry not found", status_code=404)
        
        return success_response({"entry": entry})
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.get("/resource/{resource_type}/{resource_id}")
async def get_resource_audit_history(
    resource_type: str,
    resource_id: str,
    request: Request,
    limit: int = Query(100, ge=1, le=500)
):
    """Get audit history for a specific resource."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        audit_service = create_audit_log_service(db)
        entries = await audit_service.get_resource_history(
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user.user_id,
            limit=limit
        )
        
        return success_response({
            "resource_type": resource_type,
            "resource_id": resource_id,
            "entries": entries,
            "total": len(entries)
        })
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


# ============ ANALYTICS AND SUMMARY ============

@router.get("/summary")
async def get_audit_summary(
    request: Request,
    portfolio_id: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365)
):
    """Get audit log summary statistics."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        audit_service = create_audit_log_service(db)
        summary = await audit_service.get_summary(
            user_id=user.user_id,
            portfolio_id=portfolio_id,
            days=days
        )
        
        return success_response(summary)
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.get("/timeline")
async def get_activity_timeline(
    request: Request,
    portfolio_id: Optional[str] = Query(None),
    days: int = Query(7, ge=1, le=90)
):
    """Get daily activity counts for timeline visualization."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        audit_service = create_audit_log_service(db)
        timeline = await audit_service.get_activity_timeline(
            user_id=user.user_id,
            portfolio_id=portfolio_id,
            days=days
        )
        
        return success_response({
            "timeline": timeline,
            "days": days,
            "portfolio_id": portfolio_id
        })
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


# ============ EXPORT ============

@router.get("/export")
async def export_audit_log(
    request: Request,
    portfolio_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    format: str = Query("json", regex="^(json|csv)$")
):
    """
    Export audit log entries for compliance reporting.
    
    Formats:
    - json: Full JSON export
    - csv: CSV-compatible structure with headers and rows
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        audit_service = create_audit_log_service(db)
        result = await audit_service.export_entries(
            user_id=user.user_id,
            portfolio_id=portfolio_id,
            start_date=start_date,
            end_date=end_date,
            format=format
        )
        
        return success_response(result)
        
    except Exception as e:
        return error_response("EXPORT_ERROR", str(e), status_code=500)


# ============ COMPLIANCE REPORT ============

@router.get("/compliance-report")
async def get_compliance_report(
    request: Request,
    portfolio_id: str = Query(..., description="Portfolio ID (required)"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """
    Generate a compliance-focused audit report for a portfolio.
    
    Includes:
    - Key compliance metrics
    - Records finalized/voided
    - Binders generated
    - Integrity verifications
    - Critical events
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        audit_service = create_audit_log_service(db)
        report = await audit_service.get_compliance_report(
            user_id=user.user_id,
            portfolio_id=portfolio_id,
            start_date=start_date,
            end_date=end_date
        )
        
        return success_response(report)
        
    except Exception as e:
        return error_response("REPORT_ERROR", str(e), status_code=500)


# ============ CATEGORIES AND METADATA ============

@router.get("/categories")
async def get_audit_categories(request: Request):
    """Get available audit categories and severities."""
    try:
        await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    return success_response({
        "categories": [
            {"id": c.value, "name": c.name.replace("_", " ").title()} 
            for c in AuditCategory
        ],
        "severities": [
            {"id": s.value, "name": s.name.title()} 
            for s in AuditSeverity
        ],
        "resource_types": [
            "record",
            "binder_run",
            "thread",
            "seal",
            "portfolio",
            "user"
        ]
    })
