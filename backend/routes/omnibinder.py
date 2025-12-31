"""
OmniBinder V2 API Routes

Endpoints for scheduled binder generation:
- Schedule CRUD operations
- Manual triggers
- Run history
- Statistics
"""
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional
import logging

from services.scheduled_binder_service import (
    get_scheduled_binder_service,
    CreateScheduleRequest,
    UpdateScheduleRequest,
    ScheduleStatus
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/omnibinder", tags=["omnibinder"])


def success_response(data: dict, status_code: int = 200):
    return {"success": True, "data": data}


def error_response(code: str, message: str, status_code: int = 400):
    raise HTTPException(status_code=status_code, detail={"code": code, "message": message})


# ============ SCHEDULE CRUD ============

@router.post("/schedules")
async def create_schedule(request: Request, body: CreateScheduleRequest):
    """Create a new scheduled binder generation"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    workspace_id = request.headers.get("X-Workspace-ID")
    if not workspace_id:
        return error_response("MISSING_WORKSPACE", "X-Workspace-ID header required")
    
    try:
        service = get_scheduled_binder_service()
        result = await service.create_schedule(
            workspace_id=workspace_id,
            user_id=user.user_id,
            data=body
        )
        return success_response(result)
    except ValueError as e:
        return error_response("VALIDATION_ERROR", str(e))
    except Exception as e:
        logger.error(f"Error creating schedule: {e}")
        return error_response("CREATE_ERROR", str(e), status_code=500)


@router.get("/schedules")
async def list_schedules(
    request: Request,
    portfolio_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """List all scheduled binders for a workspace"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)  # noqa: F841
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    workspace_id = request.headers.get("X-Workspace-ID")
    if not workspace_id:
        return error_response("MISSING_WORKSPACE", "X-Workspace-ID header required")
    
    try:
        service = get_scheduled_binder_service()
        
        schedule_status = None
        if status:
            try:
                schedule_status = ScheduleStatus(status)
            except ValueError:
                pass
        
        result = await service.list_schedules(
            workspace_id=workspace_id,
            portfolio_id=portfolio_id,
            status=schedule_status,
            skip=skip,
            limit=limit
        )
        return success_response(result)
    except Exception as e:
        logger.error(f"Error listing schedules: {e}")
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.get("/schedules/{schedule_id}")
async def get_schedule(schedule_id: str, request: Request):
    """Get a specific schedule"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)  # noqa: F841
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        service = get_scheduled_binder_service()
        schedule = await service.get_schedule(schedule_id)
        
        if not schedule:
            return error_response("NOT_FOUND", "Schedule not found", status_code=404)
        
        return success_response(schedule)
    except Exception as e:
        logger.error(f"Error getting schedule: {e}")
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.put("/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, request: Request, body: UpdateScheduleRequest):
    """Update a schedule"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)  # noqa: F841
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        service = get_scheduled_binder_service()
        result = await service.update_schedule(schedule_id, body)
        return success_response(result)
    except ValueError as e:
        return error_response("NOT_FOUND", str(e), status_code=404)
    except Exception as e:
        logger.error(f"Error updating schedule: {e}")
        return error_response("UPDATE_ERROR", str(e), status_code=500)


@router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, request: Request):
    """Delete a schedule"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)  # noqa: F841
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        service = get_scheduled_binder_service()
        result = await service.delete_schedule(schedule_id)
        return success_response(result)
    except ValueError as e:
        return error_response("NOT_FOUND", str(e), status_code=404)
    except Exception as e:
        logger.error(f"Error deleting schedule: {e}")
        return error_response("DELETE_ERROR", str(e), status_code=500)


# ============ SCHEDULE CONTROL ============

@router.post("/schedules/{schedule_id}/pause")
async def pause_schedule(schedule_id: str, request: Request):
    """Pause a schedule"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)  # noqa: F841
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        service = get_scheduled_binder_service()
        result = await service.pause_schedule(schedule_id)
        return success_response(result)
    except ValueError as e:
        return error_response("NOT_FOUND", str(e), status_code=404)
    except Exception as e:
        logger.error(f"Error pausing schedule: {e}")
        return error_response("UPDATE_ERROR", str(e), status_code=500)


@router.post("/schedules/{schedule_id}/resume")
async def resume_schedule(schedule_id: str, request: Request):
    """Resume a paused schedule"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)  # noqa: F841
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        service = get_scheduled_binder_service()
        result = await service.resume_schedule(schedule_id)
        return success_response(result)
    except ValueError as e:
        return error_response("NOT_FOUND", str(e), status_code=404)
    except Exception as e:
        logger.error(f"Error resuming schedule: {e}")
        return error_response("UPDATE_ERROR", str(e), status_code=500)


@router.post("/schedules/{schedule_id}/trigger")
async def trigger_schedule(schedule_id: str, request: Request):
    """Manually trigger a scheduled binder generation"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        service = get_scheduled_binder_service()
        result = await service.trigger_schedule(
            schedule_id=schedule_id,
            triggered_by="manual",
            user_id=user.user_id
        )
        return success_response(result)
    except ValueError as e:
        return error_response("NOT_FOUND", str(e), status_code=404)
    except Exception as e:
        logger.error(f"Error triggering schedule: {e}")
        return error_response("TRIGGER_ERROR", str(e), status_code=500)


# ============ RUN HISTORY ============

@router.get("/schedules/{schedule_id}/runs")
async def get_run_history(
    schedule_id: str,
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Get run history for a schedule"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)  # noqa: F841
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        service = get_scheduled_binder_service()
        result = await service.get_run_history(
            schedule_id=schedule_id,
            skip=skip,
            limit=limit
        )
        return success_response(result)
    except Exception as e:
        logger.error(f"Error getting run history: {e}")
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.get("/runs/{run_id}")
async def get_run(run_id: str, request: Request):
    """Get a specific run"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)  # noqa: F841
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        service = get_scheduled_binder_service()
        run = await service.get_run(run_id)
        
        if not run:
            return error_response("NOT_FOUND", "Run not found", status_code=404)
        
        return success_response(run)
    except Exception as e:
        logger.error(f"Error getting run: {e}")
        return error_response("FETCH_ERROR", str(e), status_code=500)


# ============ STATISTICS ============

@router.get("/stats")
async def get_stats(request: Request):
    """Get statistics for scheduled binders"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)  # noqa: F841
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    workspace_id = request.headers.get("X-Workspace-ID")
    if not workspace_id:
        return error_response("MISSING_WORKSPACE", "X-Workspace-ID header required")
    
    try:
        service = get_scheduled_binder_service()
        stats = await service.get_schedule_stats(workspace_id)
        return success_response(stats)
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return error_response("FETCH_ERROR", str(e), status_code=500)


# ============ SCHEDULER TICK (INTERNAL) ============

@router.post("/scheduler/tick")
async def scheduler_tick(request: Request):
    """
    Execute one tick of the scheduler (internal endpoint).
    Should be called periodically by a cron job or background task.
    """
    # This could be protected by an internal API key in production
    try:
        service = get_scheduled_binder_service()
        result = await service.run_scheduler_tick()
        return success_response(result)
    except Exception as e:
        logger.error(f"Error in scheduler tick: {e}")
        return error_response("SCHEDULER_ERROR", str(e), status_code=500)


# ============ SCHEDULE TYPES INFO ============

@router.get("/schedule-types")
async def get_schedule_types(request: Request):
    """Get available schedule types and their descriptions"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)  # noqa: F841
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    types = [
        {
            "type": "daily",
            "name": "Daily",
            "description": "Generate binder every day at the specified time",
            "requires_day": False
        },
        {
            "type": "weekly",
            "name": "Weekly",
            "description": "Generate binder once per week on the specified day",
            "requires_day": True,
            "day_options": [
                {"value": 0, "label": "Monday"},
                {"value": 1, "label": "Tuesday"},
                {"value": 2, "label": "Wednesday"},
                {"value": 3, "label": "Thursday"},
                {"value": 4, "label": "Friday"},
                {"value": 5, "label": "Saturday"},
                {"value": 6, "label": "Sunday"}
            ]
        },
        {
            "type": "biweekly",
            "name": "Bi-Weekly",
            "description": "Generate binder every two weeks on the specified day",
            "requires_day": True,
            "day_options": [
                {"value": 0, "label": "Monday"},
                {"value": 1, "label": "Tuesday"},
                {"value": 2, "label": "Wednesday"},
                {"value": 3, "label": "Thursday"},
                {"value": 4, "label": "Friday"},
                {"value": 5, "label": "Saturday"},
                {"value": 6, "label": "Sunday"}
            ]
        },
        {
            "type": "monthly",
            "name": "Monthly",
            "description": "Generate binder once per month on the specified day",
            "requires_day": True,
            "day_range": {"min": 1, "max": 28}
        },
        {
            "type": "quarterly",
            "name": "Quarterly",
            "description": "Generate binder every 3 months (Jan, Apr, Jul, Oct)",
            "requires_day": True,
            "day_range": {"min": 1, "max": 28}
        }
    ]
    
    return success_response({
        "types": types,
        "count": len(types)
    })
