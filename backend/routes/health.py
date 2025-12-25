"""
Trust Health API Routes
Endpoints for the Trust Health scoring system.
"""

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from services.health_scanner import TrustHealthScanner, get_health_history, AuditReadinessChecker
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


async def get_current_user(request: Request):
    """Get current user from request."""
    class User:
        def __init__(self):
            self.user_id = "default_user"
            self.email = "default@example.com"
            self.name = "Default User"
    return User()


@router.get("/score")
async def get_health_score(request: Request):
    """
    Get the current trust health score.
    Returns the most recent scan or runs a new one if none exists.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    # Get most recent scan (less than 1 hour old)
    recent_scan = await db.health_scans.find_one(
        {"user_id": user.user_id},
        {"_id": 0},
        sort=[("scanned_at", -1)]
    )
    
    if recent_scan:
        # Check if scan is recent enough (within 1 hour)
        scanned_at = recent_scan.get("scanned_at")
        if scanned_at:
            try:
                scan_time = datetime.fromisoformat(scanned_at.replace("Z", "+00:00"))
                age_minutes = (datetime.now(timezone.utc) - scan_time).total_seconds() / 60
                if age_minutes < 60:
                    return success_response(recent_scan)
            except:
                pass
    
    # Run a new scan
    scanner = TrustHealthScanner(db)
    result = await scanner.run_full_scan(user.user_id)
    
    return success_response(result)


@router.post("/scan")
async def run_health_scan(request: Request):
    """
    Run a fresh trust health scan.
    Forces a new scan regardless of cache.
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
