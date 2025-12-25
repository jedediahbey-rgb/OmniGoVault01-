"""
Portfolio Binder API Routes

Endpoints for generating court/audit-ready consolidated PDF packets.
"""

from fastapi import APIRouter, HTTPException, Request, Query
from fastapi.responses import JSONResponse, Response
from typing import Optional
from datetime import datetime, timezone
import base64

from services.binder_service import (
    create_binder_service, 
    BinderProfile, 
    BinderStatus,
    PROFILE_DEFAULTS
)

router = APIRouter(prefix="/api/binder", tags=["binder"])

# Dependencies injected from server.py
db = None
get_current_user = None


def init_binder_routes(database, auth_func):
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


# ============ PROFILE ENDPOINTS ============

@router.get("/profiles")
async def get_profiles(
    request: Request,
    portfolio_id: str = Query(..., description="Portfolio ID")
):
    """
    Get all binder profiles for a portfolio.
    Creates default profiles if none exist.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        binder_service = create_binder_service(db)
        profiles = await binder_service.ensure_default_profiles(portfolio_id, user.user_id)
        
        return success_response({
            "profiles": profiles,
            "total": len(profiles)
        })
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.get("/profiles/{profile_id}")
async def get_profile(profile_id: str, request: Request):
    """Get a specific binder profile."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        binder_service = create_binder_service(db)
        profile = await binder_service.get_profile(profile_id)
        
        if not profile:
            return error_response("NOT_FOUND", "Profile not found", status_code=404)
        
        return success_response({"profile": profile})
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.put("/profiles/{profile_id}")
async def update_profile(profile_id: str, request: Request):
    """Update a binder profile's rules."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        body = await request.json()
        rules = body.get("rules", {})
        name = body.get("name")
        
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        if rules:
            update_data["rules_json"] = rules
        if name:
            update_data["name"] = name
        
        result = await db.binder_profiles.update_one(
            {"id": profile_id, "user_id": user.user_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return error_response("NOT_FOUND", "Profile not found or no changes", status_code=404)
        
        # Return updated profile
        profile = await db.binder_profiles.find_one({"id": profile_id}, {"_id": 0})
        
        return success_response({
            "profile": profile,
            "message": "Profile updated"
        })
        
    except Exception as e:
        return error_response("UPDATE_ERROR", str(e), status_code=500)


# ============ BINDER GENERATION ENDPOINTS ============

@router.post("/generate")
async def generate_binder(request: Request):
    """
    Generate a new binder PDF.
    
    Body:
    {
        "portfolio_id": "...",
        "profile_id": "..."
    }
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        body = await request.json()
        portfolio_id = body.get("portfolio_id")
        profile_id = body.get("profile_id")
        
        if not portfolio_id:
            return error_response("MISSING_FIELD", "portfolio_id is required")
        if not profile_id:
            return error_response("MISSING_FIELD", "profile_id is required")
        
        binder_service = create_binder_service(db)
        result = await binder_service.generate_binder(
            portfolio_id=portfolio_id,
            user_id=user.user_id,
            profile_id=profile_id
        )
        
        if result.get("success"):
            return success_response(result)
        else:
            return error_response(
                "GENERATION_ERROR",
                result.get("error", "Binder generation failed"),
                details={"run_id": result.get("run_id")},
                status_code=500
            )
        
    except Exception as e:
        return error_response("GENERATION_ERROR", str(e), status_code=500)


@router.get("/runs")
async def get_runs(
    request: Request,
    portfolio_id: str = Query(...),
    limit: int = Query(20, ge=1, le=100)
):
    """Get binder run history for a portfolio."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        binder_service = create_binder_service(db)
        runs = await binder_service.get_runs_for_portfolio(
            portfolio_id, user.user_id, limit
        )
        
        # Remove pdf_data from list response (too large)
        for run in runs:
            run.pop("pdf_data", None)
        
        return success_response({
            "runs": runs,
            "total": len(runs)
        })
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.get("/runs/{run_id}")
async def get_run(run_id: str, request: Request):
    """Get a specific binder run (without PDF data)."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        binder_service = create_binder_service(db)
        run = await binder_service.get_run(run_id)
        
        if not run:
            return error_response("NOT_FOUND", "Binder run not found", status_code=404)
        
        # Remove pdf_data from response (use download endpoint)
        run.pop("pdf_data", None)
        
        return success_response({"run": run})
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.get("/runs/{run_id}/download")
async def download_binder(run_id: str, request: Request):
    """Download the generated binder PDF."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        run = await db.binder_runs.find_one(
            {"id": run_id, "user_id": user.user_id},
            {"_id": 0}
        )
        
        if not run:
            return error_response("NOT_FOUND", "Binder run not found", status_code=404)
        
        if run.get("status") != BinderStatus.COMPLETE.value:
            return error_response(
                "NOT_READY",
                f"Binder is not complete. Status: {run.get('status')}",
                status_code=400
            )
        
        pdf_data = run.get("pdf_data")
        if not pdf_data:
            return error_response("NO_DATA", "PDF data not found", status_code=404)
        
        # Decode base64 PDF
        pdf_bytes = base64.b64decode(pdf_data)
        
        # Generate filename
        profile_name = run.get("profile_name", "Binder").replace(" ", "_")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{profile_name}_{timestamp}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except Exception as e:
        return error_response("DOWNLOAD_ERROR", str(e), status_code=500)


@router.get("/runs/{run_id}/view")
async def view_binder(run_id: str, request: Request):
    """View the generated binder PDF inline (for in-app viewer)."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        run = await db.binder_runs.find_one(
            {"id": run_id, "user_id": user.user_id},
            {"_id": 0}
        )
        
        if not run:
            return error_response("NOT_FOUND", "Binder run not found", status_code=404)
        
        if run.get("status") != BinderStatus.COMPLETE.value:
            return error_response(
                "NOT_READY",
                f"Binder is not complete. Status: {run.get('status')}",
                status_code=400
            )
        
        pdf_data = run.get("pdf_data")
        if not pdf_data:
            return error_response("NO_DATA", "PDF data not found", status_code=404)
        
        # Decode base64 PDF
        pdf_bytes = base64.b64decode(pdf_data)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline",
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except Exception as e:
        return error_response("VIEW_ERROR", str(e), status_code=500)


@router.get("/latest")
async def get_latest_binder(
    request: Request,
    portfolio_id: str = Query(...),
    profile_type: Optional[str] = Query(None)
):
    """Get the latest completed binder for a portfolio."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        binder_service = create_binder_service(db)
        run = await binder_service.get_latest_run(
            portfolio_id, user.user_id, profile_type
        )
        
        if not run:
            return success_response({
                "run": None,
                "message": "No completed binders found"
            })
        
        # Remove pdf_data from response
        run.pop("pdf_data", None)
        
        return success_response({"run": run})
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.get("/manifest/{run_id}")
async def get_manifest(run_id: str, request: Request):
    """Get the manifest for a binder run."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        run = await db.binder_runs.find_one(
            {"id": run_id, "user_id": user.user_id},
            {"_id": 0, "manifest_json": 1, "profile_name": 1, "finished_at": 1}
        )
        
        if not run:
            return error_response("NOT_FOUND", "Binder run not found", status_code=404)
        
        return success_response({
            "manifest": run.get("manifest_json", []),
            "profile_name": run.get("profile_name"),
            "generated_at": run.get("finished_at")
        })
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


# ============ STALE CHECK ENDPOINT ============

@router.get("/stale-check")
async def check_binder_stale(
    request: Request,
    portfolio_id: str = Query(...)
):
    """
    Check if the latest binder is stale (records changed since generation).
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        # Get latest completed binder
        latest_run = await db.binder_runs.find_one(
            {
                "portfolio_id": portfolio_id,
                "user_id": user.user_id,
                "status": BinderStatus.COMPLETE.value
            },
            {"_id": 0, "finished_at": 1, "id": 1, "profile_name": 1},
            sort=[("finished_at", -1)]
        )
        
        if not latest_run:
            return success_response({
                "is_stale": True,
                "reason": "no_binder",
                "message": "No binder has been generated yet"
            })
        
        binder_time = latest_run.get("finished_at")
        if not binder_time:
            return success_response({
                "is_stale": True,
                "reason": "no_timestamp",
                "message": "Binder has no timestamp"
            })
        
        # Check for records updated after binder generation
        updated_count = await db.governance_records.count_documents({
            "portfolio_id": portfolio_id,
            "user_id": user.user_id,
            "updated_at": {"$gt": binder_time}
        })
        
        # Check for new finalized records
        new_finalized = await db.governance_records.count_documents({
            "portfolio_id": portfolio_id,
            "user_id": user.user_id,
            "finalized_at": {"$gt": binder_time}
        })
        
        is_stale = updated_count > 0 or new_finalized > 0
        
        return success_response({
            "is_stale": is_stale,
            "latest_run_id": latest_run.get("id"),
            "latest_run_name": latest_run.get("profile_name"),
            "generated_at": binder_time,
            "records_updated_since": updated_count,
            "records_finalized_since": new_finalized,
            "message": "Binder is out of date" if is_stale else "Binder is current"
        })
        
    except Exception as e:
        return error_response("CHECK_ERROR", str(e), status_code=500)



# ============ SCHEDULE ENDPOINTS ============

@router.get("/schedules")
async def get_schedules(
    request: Request,
    portfolio_id: str = Query(...)
):
    """Get all binder schedules for a portfolio."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        schedules = await db.binder_schedules.find(
            {"portfolio_id": portfolio_id, "user_id": user.user_id},
            {"_id": 0}
        ).to_list(100)
        
        return success_response({
            "schedules": schedules,
            "total": len(schedules)
        })
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.post("/schedules")
async def create_schedule(request: Request):
    """
    Create a new binder generation schedule.
    
    Body:
    {
        "portfolio_id": "...",
        "profile_id": "...",
        "frequency": "daily|weekly|monthly",
        "enabled": true,
        "day_of_week": 0-6 (for weekly, 0=Sunday),
        "day_of_month": 1-28 (for monthly),
        "hour": 0-23,
        "minute": 0-59
    }
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        body = await request.json()
        portfolio_id = body.get("portfolio_id")
        profile_id = body.get("profile_id")
        frequency = body.get("frequency", "weekly")
        
        if not portfolio_id:
            return error_response("MISSING_FIELD", "portfolio_id is required")
        if not profile_id:
            return error_response("MISSING_FIELD", "profile_id is required")
        if frequency not in ["daily", "weekly", "monthly"]:
            return error_response("VALIDATION_ERROR", "frequency must be daily, weekly, or monthly")
        
        # Verify profile exists
        profile = await db.binder_profiles.find_one(
            {"id": profile_id, "user_id": user.user_id},
            {"_id": 0}
        )
        if not profile:
            return error_response("NOT_FOUND", "Profile not found", status_code=404)
        
        import uuid
        schedule_id = f"sched_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        
        schedule = {
            "id": schedule_id,
            "portfolio_id": portfolio_id,
            "profile_id": profile_id,
            "profile_name": profile.get("name"),
            "user_id": user.user_id,
            "frequency": frequency,
            "enabled": body.get("enabled", True),
            "day_of_week": body.get("day_of_week", 0),  # Sunday
            "day_of_month": body.get("day_of_month", 1),
            "hour": body.get("hour", 6),  # 6 AM
            "minute": body.get("minute", 0),
            "last_run_at": None,
            "next_run_at": None,
            "created_at": now,
            "updated_at": now
        }
        
        # Calculate next run time
        schedule["next_run_at"] = calculate_next_run(schedule)
        
        await db.binder_schedules.insert_one(schedule)
        schedule.pop("_id", None)
        
        return success_response({
            "schedule": schedule,
            "message": "Schedule created"
        })
        
    except Exception as e:
        return error_response("CREATE_ERROR", str(e), status_code=500)


@router.put("/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, request: Request):
    """Update a binder schedule."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        body = await request.json()
        
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if "enabled" in body:
            update_data["enabled"] = body["enabled"]
        if "frequency" in body:
            if body["frequency"] not in ["daily", "weekly", "monthly"]:
                return error_response("VALIDATION_ERROR", "Invalid frequency")
            update_data["frequency"] = body["frequency"]
        if "day_of_week" in body:
            update_data["day_of_week"] = body["day_of_week"]
        if "day_of_month" in body:
            update_data["day_of_month"] = body["day_of_month"]
        if "hour" in body:
            update_data["hour"] = body["hour"]
        if "minute" in body:
            update_data["minute"] = body["minute"]
        
        result = await db.binder_schedules.update_one(
            {"id": schedule_id, "user_id": user.user_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return error_response("NOT_FOUND", "Schedule not found", status_code=404)
        
        # Recalculate next run time
        schedule = await db.binder_schedules.find_one(
            {"id": schedule_id},
            {"_id": 0}
        )
        if schedule:
            next_run = calculate_next_run(schedule)
            await db.binder_schedules.update_one(
                {"id": schedule_id},
                {"$set": {"next_run_at": next_run}}
            )
            schedule["next_run_at"] = next_run
        
        return success_response({
            "schedule": schedule,
            "message": "Schedule updated"
        })
        
    except Exception as e:
        return error_response("UPDATE_ERROR", str(e), status_code=500)


@router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, request: Request):
    """Delete a binder schedule."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        result = await db.binder_schedules.delete_one(
            {"id": schedule_id, "user_id": user.user_id}
        )
        
        if result.deleted_count == 0:
            return error_response("NOT_FOUND", "Schedule not found", status_code=404)
        
        return success_response({"message": "Schedule deleted"})
        
    except Exception as e:
        return error_response("DELETE_ERROR", str(e), status_code=500)


def calculate_next_run(schedule: dict) -> str:
    """Calculate the next run time for a schedule."""
    from datetime import timedelta
    
    now = datetime.now(timezone.utc)
    frequency = schedule.get("frequency", "weekly")
    hour = schedule.get("hour", 6)
    minute = schedule.get("minute", 0)
    
    # Start with today at the scheduled time
    next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    
    if frequency == "daily":
        if next_run <= now:
            next_run += timedelta(days=1)
    
    elif frequency == "weekly":
        target_day = schedule.get("day_of_week", 0)  # 0 = Sunday
        days_ahead = target_day - now.weekday()
        if days_ahead < 0 or (days_ahead == 0 and next_run <= now):
            days_ahead += 7
        next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0) + timedelta(days=days_ahead)
    
    elif frequency == "monthly":
        target_day = min(schedule.get("day_of_month", 1), 28)
        next_run = now.replace(day=target_day, hour=hour, minute=minute, second=0, microsecond=0)
        if next_run <= now:
            # Move to next month
            if now.month == 12:
                next_run = next_run.replace(year=now.year + 1, month=1)
            else:
                next_run = next_run.replace(month=now.month + 1)
    
    return next_run.isoformat()
