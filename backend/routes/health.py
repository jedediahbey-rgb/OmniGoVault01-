"""
Trust Health API Routes
Endpoints for the Trust Health scoring system.
Supports both V1 and V2 scanners with feature flagging.
"""

from fastapi import APIRouter, Request, HTTPException, Query
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from services.health_scanner import TrustHealthScanner, get_health_history, AuditReadinessChecker
from services.health_scanner_v2 import TrustHealthScannerV2, get_default_v2_ruleset
import json
import io

router = APIRouter(prefix="/api/health", tags=["Trust Health"])

# Get database reference (injected from server.py)
db = None

def set_db(database):
    global db
    db = database


def success_response(data, message=None):
    response = {"ok": True, "data": data}
    if message:
        response["message"] = message
    return response


def error_response(code, message, status_code=400, details=None):
    return {
        "ok": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or {}
        }
    }


# Import the main authentication dependency
_get_current_user_func = None

def set_auth_dependency(auth_func):
    """Set the authentication function from server.py"""
    global _get_current_user_func
    _get_current_user_func = auth_func


async def get_current_user(request: Request):
    """Get current user using the main app's authentication."""
    if _get_current_user_func is None:
        raise HTTPException(status_code=500, detail="Authentication not configured")
    return await _get_current_user_func(request)


async def get_user_health_version(user_id: str) -> str:
    """Get user's preferred health rules version (v1 or v2)."""
    try:
        config = await db.system_config.find_one(
            {"config_type": "health_rules_version", "user_id": user_id},
            {"_id": 0}
        )
        if config:
            return config.get("version", "v2")
    except:
        pass
    return "v2"  # Default to V2 for new users


@router.get("/score")
async def get_health_score(request: Request, version: str = Query(default=None)):
    """
    Get the current trust health score.
    Returns the most recent scan or runs a new one if none exists.
    Supports both V1 and V2 scanners via version parameter or user preference.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Determine version to use
    use_version = version or await get_user_health_version(user.user_id)
    
    # Get most recent scan (less than 1 hour old, matching version)
    recent_scan = await db.health_scans.find_one(
        {"user_id": user.user_id, "version": use_version} if use_version == "v2" else {"user_id": user.user_id},
        {"_id": 0},
        sort=[("scanned_at", -1)]
    )
    
    if recent_scan:
        # Check if scan is recent enough (within 1 hour) and matches version
        scanned_at = recent_scan.get("scanned_at")
        scan_version = recent_scan.get("version", "v1")
        if scanned_at and scan_version == use_version:
            try:
                scan_time = datetime.fromisoformat(scanned_at.replace("Z", "+00:00"))
                age_minutes = (datetime.now(timezone.utc) - scan_time).total_seconds() / 60
                if age_minutes < 60:
                    return success_response(recent_scan)
            except:
                pass
    
    # Run a new scan with appropriate version
    if use_version == "v2":
        scanner = TrustHealthScannerV2(db)
    else:
        scanner = TrustHealthScanner(db)
    
    result = await scanner.run_full_scan(user.user_id)
    
    return success_response(result)


@router.post("/scan")
async def run_health_scan(request: Request, version: str = Query(default=None)):
    """
    Run a fresh trust health scan.
    Forces a new scan regardless of cache.
    Supports both V1 and V2 scanners.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    scanner = TrustHealthScanner(db)
    result = await scanner.run_full_scan(user.user_id)
    
    return success_response(result, "Health scan completed")


@router.get("/history")
async def get_score_history(request: Request, days: int = 30):
    """
    Get health score history for trend analysis.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    history = await get_health_history(db, user.user_id, days)
    
    return success_response({
        "history": history,
        "days": days,
        "count": len(history)
    })


@router.get("/findings")
async def get_findings(request: Request, severity: str = None, category: str = None):
    """
    Get findings from the most recent scan.
    Optional filters: severity (critical, warning, info), category
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Get most recent scan
    recent_scan = await db.health_scans.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "findings": 1, "scan_id": 1, "scanned_at": 1},
        sort=[("scanned_at", -1)]
    )
    
    if not recent_scan:
        return success_response({"findings": [], "scan_id": None})
    
    findings = recent_scan.get("findings", [])
    
    # Apply filters
    if severity:
        findings = [f for f in findings if f.get("severity") == severity]
    if category:
        findings = [f for f in findings if f.get("category") == category]
    
    return success_response({
        "findings": findings,
        "scan_id": recent_scan.get("scan_id"),
        "scanned_at": recent_scan.get("scanned_at"),
        "total": len(findings)
    })


@router.get("/actions")
async def get_next_actions(request: Request, limit: int = 10):
    """
    Get prioritized next actions to improve health score.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Get most recent scan
    recent_scan = await db.health_scans.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "next_actions": 1, "scan_id": 1, "overall_score": 1},
        sort=[("scanned_at", -1)]
    )
    
    if not recent_scan:
        return success_response({
            "actions": [],
            "potential_improvement": 0
        })
    
    actions = recent_scan.get("next_actions", [])[:limit]
    potential_improvement = sum(a.get("impact_points", 0) for a in actions)
    
    return success_response({
        "actions": actions,
        "current_score": recent_scan.get("overall_score", 0),
        "potential_improvement": round(potential_improvement, 1),
        "potential_score": min(100, recent_scan.get("overall_score", 0) + potential_improvement)
    })


@router.get("/categories")
async def get_category_breakdown(request: Request):
    """
    Get detailed category score breakdown.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Get most recent scan
    recent_scan = await db.health_scans.find_one(
        {"user_id": user.user_id},
        {"_id": 0},
        sort=[("scanned_at", -1)]
    )
    
    if not recent_scan:
        # Return default categories with 0 scores
        return success_response({
            "categories": [
                {"id": "governance_hygiene", "name": "Governance Hygiene", "score": 0, "weight": 25, "findings": []},
                {"id": "financial_integrity", "name": "Financial Integrity", "score": 0, "weight": 25, "findings": []},
                {"id": "compliance_recordkeeping", "name": "Compliance & Recordkeeping", "score": 0, "weight": 15, "findings": []},
                {"id": "risk_exposure", "name": "Risk & Exposure", "score": 0, "weight": 15, "findings": []},
                {"id": "data_integrity", "name": "Data Integrity", "score": 0, "weight": 20, "findings": []}
            ]
        })
    
    category_scores = recent_scan.get("category_scores", {})
    findings = recent_scan.get("findings", [])
    
    category_names = {
        "governance_hygiene": "Governance Hygiene",
        "financial_integrity": "Financial Integrity",
        "compliance_recordkeeping": "Compliance & Recordkeeping",
        "risk_exposure": "Risk & Exposure",
        "data_integrity": "Data Integrity"
    }
    
    category_weights = {
        "governance_hygiene": 25,
        "financial_integrity": 25,
        "compliance_recordkeeping": 15,
        "risk_exposure": 15,
        "data_integrity": 20
    }
    
    categories = []
    for cat_id, name in category_names.items():
        cat_findings = [f for f in findings if f.get("category") == cat_id]
        categories.append({
            "id": cat_id,
            "name": name,
            "score": category_scores.get(cat_id, 0),
            "weight": category_weights.get(cat_id, 0),
            "findings": cat_findings[:3],  # Top 3 findings per category
            "finding_count": len(cat_findings)
        })
    
    return success_response({
        "categories": categories,
        "overall_score": recent_scan.get("overall_score", 0),
        "blocking_conditions": recent_scan.get("blocking_conditions", [])
    })


@router.post("/fix/{action_id}")
async def execute_fix_action(request: Request, action_id: str):
    """
    Execute an auto-fix action.
    Only works for findings marked as auto_fixable.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Get most recent scan to find the action
    recent_scan = await db.health_scans.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "findings": 1, "next_actions": 1},
        sort=[("scanned_at", -1)]
    )
    
    if not recent_scan:
        return error_response("NOT_FOUND", "No scan found")
    
    # Find the action
    actions = recent_scan.get("next_actions", [])
    action = next((a for a in actions if a.get("id") == action_id), None)
    
    if not action:
        return error_response("NOT_FOUND", f"Action {action_id} not found")
    
    if not action.get("auto_fixable"):
        return error_response("NOT_FIXABLE", "This action cannot be auto-fixed")
    
    fix_action = action.get("fix_action")
    
    # Execute the fix
    if fix_action == "delete_orphans":
        # Find the related finding
        finding = next((f for f in recent_scan.get("findings", []) if f.get("id") == action.get("finding_id")), None)
        if finding and finding.get("details", {}).get("orphan_ids"):
            orphan_ids = finding["details"]["orphan_ids"]
            result = await db.governance_records.delete_many({"id": {"$in": orphan_ids}})
            
            return success_response({
                "fixed": True,
                "action": fix_action,
                "deleted_count": result.deleted_count,
                "message": f"Deleted {result.deleted_count} orphan records"
            })
    
    return error_response("UNKNOWN_ACTION", f"Unknown fix action: {fix_action}")


@router.get("/summary")
async def get_health_summary(request: Request):
    """
    Get a quick summary for dashboard display.
    Lightweight endpoint for the landing page widget.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Get most recent scan
    recent_scan = await db.health_scans.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "overall_score": 1, "category_scores": 1, "findings_count": 1, 
         "next_actions": 1, "scanned_at": 1, "stats": 1},
        sort=[("scanned_at", -1)]
    )
    
    # Get history for trend
    history = await get_health_history(db, user.user_id, 7)
    
    if not recent_scan:
        return success_response({
            "score": None,
            "trend": None,
            "needs_scan": True,
            "next_actions": [],
            "history": []
        })
    
    # Calculate trend
    trend = None
    if len(history) >= 2:
        old_score = history[0].get("overall_score", 0)
        new_score = recent_scan.get("overall_score", 0)
        trend = round(new_score - old_score, 1)
    
    return success_response({
        "score": recent_scan.get("overall_score"),
        "trend": trend,
        "trend_direction": "up" if trend and trend > 0 else "down" if trend and trend < 0 else "stable",
        "findings_count": recent_scan.get("findings_count", {}),
        "next_actions": recent_scan.get("next_actions", [])[:3],
        "scanned_at": recent_scan.get("scanned_at"),
        "history": [{"score": h.get("overall_score"), "date": h.get("scanned_at")} for h in history[-7:]],
        "stats": recent_scan.get("stats", {}),
        "needs_scan": False
    })



@router.get("/audit")
async def get_audit_readiness(request: Request):
    """
    Run audit readiness check.
    Returns a comprehensive checklist for audit preparation.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    checker = AuditReadinessChecker(db)
    result = await checker.run_audit_check(user.user_id)
    
    return success_response(result)


@router.get("/audit/export")
async def export_audit_report(request: Request):
    """
    Export audit readiness report as JSON.
    Can be used for record-keeping or sharing with auditors.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    checker = AuditReadinessChecker(db)
    result = await checker.run_audit_check(user.user_id)
    
    # Create exportable report
    report = {
        "report_type": "Audit Readiness Report",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "user_id": user.user_id,
        "audit_score": result["audit_score"],
        "ready_for_audit": result["ready_for_audit"],
        "summary": {
            "total_items": result["total_items"],
            "passed_items": result["passed_items"],
            "failed_required": result["failed_required"]
        },
        "checklist_by_category": result["checklist"]
    }
    
    # Return as downloadable JSON
    report_json = json.dumps(report, indent=2)
    buffer = io.BytesIO(report_json.encode('utf-8'))
    
    return StreamingResponse(
        buffer,
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=audit_readiness_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        }
    )


@router.get("/timeline")
async def get_health_timeline(request: Request, days: int = 30):
    """
    Get health score timeline with events.
    Returns score history and notable governance events.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Get score history
    history = await get_health_history(db, user.user_id, days)
    
    # Get governance events (records created/finalized in the period)
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    events = []
    
    # Fetch recent governance records
    records = await db.governance_records.find(
        {
            "user_id": user.user_id,
            "created_at": {"$gte": cutoff.isoformat()}
        },
        {"_id": 0, "id": 1, "title": 1, "module_type": 1, "status": 1, 
         "created_at": 1, "finalized_at": 1}
    ).sort("created_at", -1).to_list(50)
    
    for record in records:
        # Record creation event
        events.append({
            "type": "record_created",
            "date": record.get("created_at"),
            "title": f"New {record.get('module_type', 'record')}: {record.get('title', 'Untitled')}",
            "module": record.get("module_type"),
            "record_id": record.get("id"),
            "impact": "neutral"
        })
        
        # Finalization event
        if record.get("finalized_at"):
            events.append({
                "type": "record_finalized",
                "date": record.get("finalized_at"),
                "title": f"Finalized: {record.get('title', 'Untitled')}",
                "module": record.get("module_type"),
                "record_id": record.get("id"),
                "impact": "positive"
            })
    
    # Sort events by date
    events.sort(key=lambda e: e.get("date", ""), reverse=True)
    
    return success_response({
        "history": [
            {
                "date": h.get("scanned_at"),
                "score": h.get("overall_score"),
                "category_scores": h.get("category_scores", {})
            }
            for h in history
        ],
        "events": events[:20],  # Last 20 events
        "days": days,
        "data_points": len(history)
    })



@router.get("/report/pdf")
async def generate_pdf_report(request: Request, trust_name: str = "Equity Trust"):
    """
    Generate a comprehensive Trust Health PDF report.
    Returns a downloadable PDF file.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        from services.report_generator import generate_health_report_pdf
        
        pdf_buffer = await generate_health_report_pdf(db, user.user_id, trust_name)
        
        filename = f"trust_health_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        return error_response("REPORT_ERROR", f"Failed to generate PDF report: {str(e)}")


@router.get("/reliability")
async def get_system_reliability(request: Request):
    """
    Get system reliability metrics.
    Measures API success rates and system stability.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Calculate reliability metrics from recent operations
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    
    # Count recent governance operations (as a proxy for system activity)
    recent_records = await db.governance_records.count_documents({
        "user_id": user.user_id,
        "created_at": {"$gte": cutoff.isoformat()}
    })
    
    recent_revisions = await db.governance_revisions.count_documents({
        "user_id": user.user_id,
        "created_at": {"$gte": cutoff.isoformat()}
    })
    
    # Check for any integrity issues (orphans indicate failed operations)
    total_records = await db.governance_records.count_documents({"user_id": user.user_id})
    
    # Get portfolio IDs for orphan check
    portfolios = await db.portfolios.find(
        {"user_id": user.user_id},
        {"_id": 0, "portfolio_id": 1}
    ).to_list(1000)
    portfolio_ids = [p.get("portfolio_id") for p in portfolios]
    
    orphan_count = 0
    if portfolio_ids:
        orphan_count = await db.governance_records.count_documents({
            "user_id": user.user_id,
            "portfolio_id": {"$nin": portfolio_ids, "$ne": None}
        })
    
    # Calculate reliability score
    if total_records == 0:
        reliability_score = 100.0
    else:
        orphan_rate = (orphan_count / total_records) * 100
        reliability_score = max(0, 100 - orphan_rate * 10)  # Each 1% orphans = -10 points
    
    return success_response({
        "reliability_score": round(reliability_score, 1),
        "metrics": {
            "records_created_7d": recent_records,
            "revisions_created_7d": recent_revisions,
            "total_records": total_records,
            "orphan_records": orphan_count,
            "orphan_rate": round((orphan_count / total_records * 100) if total_records > 0 else 0, 2)
        },
        "status": "healthy" if reliability_score >= 90 else "degraded" if reliability_score >= 70 else "critical",
        "checked_at": datetime.now(timezone.utc).isoformat()
    })


@router.get("/integrity-seals")
async def get_integrity_seals(request: Request, limit: int = 20):
    """
    Get integrity seals for finalized records.
    Shows tamper-evident hashes and verification status.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    import hashlib
    
    # Get finalized records
    finalized_records = await db.governance_records.find(
        {
            "user_id": user.user_id,
            "status": "finalized"
        },
        {"_id": 0}
    ).sort("finalized_at", -1).to_list(limit)
    
    seals = []
    for record in finalized_records:
        # Generate integrity hash from record content
        content_for_hash = f"{record.get('id')}|{record.get('rm_id')}|{record.get('title')}|{record.get('finalized_at')}|{record.get('finalized_by')}"
        integrity_hash = hashlib.sha256(content_for_hash.encode()).hexdigest()
        
        # Check if stored hash matches (if we have one)
        stored_hash = record.get('integrity_hash')
        verified = stored_hash == integrity_hash if stored_hash else None
        
        seals.append({
            "record_id": record.get("id"),
            "rm_id": record.get("rm_id"),
            "title": record.get("title"),
            "module_type": record.get("module_type"),
            "finalized_at": record.get("finalized_at"),
            "finalized_by": record.get("finalized_by"),
            "integrity_hash": integrity_hash[:16] + "...",  # Truncated for display
            "full_hash": integrity_hash,
            "verified": verified,
            "has_stored_hash": stored_hash is not None
        })
    
    return success_response({
        "seals": seals,
        "total_finalized": len(finalized_records),
        "verified_count": len([s for s in seals if s.get("verified") == True]),
        "unverified_count": len([s for s in seals if s.get("verified") == False]),
        "new_seals_count": len([s for s in seals if s.get("verified") is None])
    })


@router.post("/integrity-seals/verify/{record_id}")
async def verify_integrity_seal(request: Request, record_id: str):
    """
    Verify the integrity seal of a specific record.
    Recalculates hash and compares with stored value.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    import hashlib
    
    record = await db.governance_records.find_one(
        {"id": record_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not record:
        return error_response("NOT_FOUND", f"Record {record_id} not found")
    
    if record.get("status") != "finalized":
        return error_response("NOT_FINALIZED", "Only finalized records have integrity seals")
    
    # Generate current hash
    content_for_hash = f"{record.get('id')}|{record.get('rm_id')}|{record.get('title')}|{record.get('finalized_at')}|{record.get('finalized_by')}"
    current_hash = hashlib.sha256(content_for_hash.encode()).hexdigest()
    
    stored_hash = record.get('integrity_hash')
    
    if not stored_hash:
        # Store the hash if not present
        await db.governance_records.update_one(
            {"id": record_id},
            {"$set": {"integrity_hash": current_hash}}
        )
        return success_response({
            "record_id": record_id,
            "status": "sealed",
            "message": "Integrity seal created and stored",
            "hash": current_hash[:16] + "..."
        })
    
    # Verify
    verified = stored_hash == current_hash
    
    return success_response({
        "record_id": record_id,
        "status": "verified" if verified else "tampered",
        "verified": verified,
        "stored_hash": stored_hash[:16] + "...",
        "current_hash": current_hash[:16] + "...",
        "message": "Record integrity verified" if verified else "WARNING: Record may have been tampered with!"
    })
