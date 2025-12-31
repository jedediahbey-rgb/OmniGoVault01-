"""
OmniBinder V2 - Scheduled Binder Service

Provides automated binder generation on configurable schedules:
- Daily, weekly, monthly schedules
- Next run calculation
- Execution tracking and history
- Email notifications
- Manual triggers
"""
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from enum import Enum
import uuid
import logging
import asyncio

logger = logging.getLogger(__name__)


# ============ MODELS ============

class ScheduleType(str, Enum):
    """Types of schedule frequencies"""
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    CUSTOM = "custom"  # Custom cron-like expression


class ScheduleStatus(str, Enum):
    """Status of a schedule"""
    ACTIVE = "active"
    PAUSED = "paused"
    DISABLED = "disabled"


class RunStatus(str, Enum):
    """Status of a schedule run"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class BinderSchedule(BaseModel):
    """A scheduled binder generation configuration"""
    schedule_id: str = Field(default_factory=lambda: f"sched_{uuid.uuid4().hex[:12]}")
    workspace_id: str
    portfolio_id: str
    profile_id: str
    user_id: str  # Creator
    
    # Schedule configuration
    name: str = "Scheduled Binder"
    description: Optional[str] = None
    schedule_type: ScheduleType = ScheduleType.WEEKLY
    schedule_day: Optional[int] = None  # 0-6 for weekly, 1-28 for monthly
    schedule_time: str = "09:00"  # HH:MM in UTC
    timezone: str = "UTC"
    
    # Execution options
    auto_export: bool = True
    export_format: str = "pdf"  # pdf, zip
    retention_days: int = 90  # How long to keep generated binders
    
    # Notification settings
    notify_emails: List[str] = []
    notify_on_success: bool = True
    notify_on_failure: bool = True
    
    # Status
    status: ScheduleStatus = ScheduleStatus.ACTIVE
    
    # Tracking
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None
    last_run_status: Optional[RunStatus] = None
    next_run_at: Optional[datetime] = None
    run_count: int = 0
    success_count: int = 0
    failure_count: int = 0


class ScheduleRun(BaseModel):
    """Record of a single schedule execution"""
    run_id: str = Field(default_factory=lambda: f"run_{uuid.uuid4().hex[:12]}")
    schedule_id: str
    workspace_id: str
    portfolio_id: str
    
    # Timing
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    
    # Status
    status: RunStatus = RunStatus.PENDING
    error_message: Optional[str] = None
    
    # Results
    binder_id: Optional[str] = None
    file_size_bytes: Optional[int] = None
    page_count: Optional[int] = None
    document_count: Optional[int] = None
    
    # Trigger info
    triggered_by: str = "scheduler"  # scheduler, manual, api
    triggered_by_user: Optional[str] = None


# ============ REQUEST/RESPONSE MODELS ============

class CreateScheduleRequest(BaseModel):
    portfolio_id: str
    profile_id: str
    name: str = "Scheduled Binder"
    description: Optional[str] = None
    schedule_type: ScheduleType = ScheduleType.WEEKLY
    schedule_day: Optional[int] = None
    schedule_time: str = "09:00"
    timezone: str = "UTC"
    notify_emails: List[str] = []
    auto_export: bool = True
    retention_days: int = 90


class UpdateScheduleRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    schedule_type: Optional[ScheduleType] = None
    schedule_day: Optional[int] = None
    schedule_time: Optional[str] = None
    timezone: Optional[str] = None
    notify_emails: Optional[List[str]] = None
    auto_export: Optional[bool] = None
    retention_days: Optional[int] = None
    status: Optional[ScheduleStatus] = None


# ============ SERVICE ============

class ScheduledBinderService:
    """Service for managing scheduled binder generation"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self._scheduler_running = False
    
    # ============ SCHEDULE MANAGEMENT ============
    
    async def create_schedule(
        self,
        workspace_id: str,
        user_id: str,
        data: CreateScheduleRequest
    ) -> Dict:
        """Create a new binder schedule"""
        schedule = BinderSchedule(
            workspace_id=workspace_id,
            portfolio_id=data.portfolio_id,
            profile_id=data.profile_id,
            user_id=user_id,
            name=data.name,
            description=data.description,
            schedule_type=data.schedule_type,
            schedule_day=data.schedule_day,
            schedule_time=data.schedule_time,
            timezone=data.timezone,
            notify_emails=data.notify_emails,
            auto_export=data.auto_export,
            retention_days=data.retention_days
        )
        
        # Calculate next run time
        schedule.next_run_at = self.calculate_next_run(
            schedule.schedule_type,
            schedule.schedule_day,
            schedule.schedule_time
        )
        
        await self.db.omnibinder_schedules.insert_one(schedule.dict())
        
        logger.info(f"Created schedule {schedule.schedule_id} for portfolio {data.portfolio_id}")
        
        return {
            "schedule_id": schedule.schedule_id,
            "name": schedule.name,
            "schedule_type": schedule.schedule_type.value,
            "next_run_at": schedule.next_run_at.isoformat() if schedule.next_run_at else None
        }
    
    async def get_schedule(self, schedule_id: str) -> Optional[Dict]:
        """Get a specific schedule"""
        schedule = await self.db.omnibinder_schedules.find_one(
            {"schedule_id": schedule_id},
            {"_id": 0}
        )
        return schedule
    
    async def list_schedules(
        self,
        workspace_id: str,
        portfolio_id: Optional[str] = None,
        status: Optional[ScheduleStatus] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Dict:
        """List schedules for a workspace"""
        query = {"workspace_id": workspace_id}
        if portfolio_id:
            query["portfolio_id"] = portfolio_id
        if status:
            query["status"] = status.value
        
        schedules = await self.db.omnibinder_schedules.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await self.db.omnibinder_schedules.count_documents(query)
        
        return {
            "schedules": schedules,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    
    async def update_schedule(
        self,
        schedule_id: str,
        data: UpdateScheduleRequest
    ) -> Dict:
        """Update a schedule"""
        schedule = await self.get_schedule(schedule_id)
        if not schedule:
            raise ValueError("Schedule not found")
        
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if data.name is not None:
            update_data["name"] = data.name
        if data.description is not None:
            update_data["description"] = data.description
        if data.schedule_type is not None:
            update_data["schedule_type"] = data.schedule_type.value
        if data.schedule_day is not None:
            update_data["schedule_day"] = data.schedule_day
        if data.schedule_time is not None:
            update_data["schedule_time"] = data.schedule_time
        if data.timezone is not None:
            update_data["timezone"] = data.timezone
        if data.notify_emails is not None:
            update_data["notify_emails"] = data.notify_emails
        if data.auto_export is not None:
            update_data["auto_export"] = data.auto_export
        if data.retention_days is not None:
            update_data["retention_days"] = data.retention_days
        if data.status is not None:
            update_data["status"] = data.status.value
        
        # Recalculate next run if schedule changed
        schedule_type = data.schedule_type or ScheduleType(schedule["schedule_type"])
        schedule_day = data.schedule_day if data.schedule_day is not None else schedule.get("schedule_day")
        schedule_time = data.schedule_time or schedule.get("schedule_time", "09:00")
        
        update_data["next_run_at"] = self.calculate_next_run(
            schedule_type, schedule_day, schedule_time
        ).isoformat()
        
        await self.db.omnibinder_schedules.update_one(
            {"schedule_id": schedule_id},
            {"$set": update_data}
        )
        
        return {"status": "updated", "schedule_id": schedule_id}
    
    async def delete_schedule(self, schedule_id: str) -> Dict:
        """Delete a schedule"""
        result = await self.db.omnibinder_schedules.delete_one({"schedule_id": schedule_id})
        
        if result.deleted_count == 0:
            raise ValueError("Schedule not found")
        
        # Also delete run history
        await self.db.omnibinder_runs.delete_many({"schedule_id": schedule_id})
        
        return {"status": "deleted", "schedule_id": schedule_id}
    
    async def pause_schedule(self, schedule_id: str) -> Dict:
        """Pause a schedule"""
        result = await self.db.omnibinder_schedules.update_one(
            {"schedule_id": schedule_id},
            {"$set": {
                "status": ScheduleStatus.PAUSED.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.matched_count == 0:
            raise ValueError("Schedule not found")
        
        return {"status": "paused", "schedule_id": schedule_id}
    
    async def resume_schedule(self, schedule_id: str) -> Dict:
        """Resume a paused schedule"""
        schedule = await self.get_schedule(schedule_id)
        if not schedule:
            raise ValueError("Schedule not found")
        
        # Recalculate next run
        next_run = self.calculate_next_run(
            ScheduleType(schedule["schedule_type"]),
            schedule.get("schedule_day"),
            schedule.get("schedule_time", "09:00")
        )
        
        await self.db.omnibinder_schedules.update_one(
            {"schedule_id": schedule_id},
            {"$set": {
                "status": ScheduleStatus.ACTIVE.value,
                "next_run_at": next_run.isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"status": "resumed", "schedule_id": schedule_id, "next_run_at": next_run.isoformat()}
    
    # ============ SCHEDULE EXECUTION ============
    
    async def trigger_schedule(
        self,
        schedule_id: str,
        triggered_by: str = "manual",
        user_id: Optional[str] = None
    ) -> Dict:
        """Manually trigger a schedule execution"""
        schedule = await self.get_schedule(schedule_id)
        if not schedule:
            raise ValueError("Schedule not found")
        
        # Create run record
        run = ScheduleRun(
            schedule_id=schedule_id,
            workspace_id=schedule["workspace_id"],
            portfolio_id=schedule["portfolio_id"],
            triggered_by=triggered_by,
            triggered_by_user=user_id,
            status=RunStatus.PENDING
        )
        
        await self.db.omnibinder_runs.insert_one(run.dict())
        
        # Execute the binder generation (async)
        # In production, this would be queued to a task worker
        result = await self._execute_scheduled_binder(schedule, run.run_id)
        
        return {
            "run_id": run.run_id,
            "status": result.get("status"),
            "binder_id": result.get("binder_id"),
            "message": "Schedule triggered"
        }
    
    async def _execute_scheduled_binder(
        self,
        schedule: Dict,
        run_id: str
    ) -> Dict:
        """Execute a scheduled binder generation"""
        now = datetime.now(timezone.utc)
        
        try:
            # Update run status to running
            await self.db.omnibinder_runs.update_one(
                {"run_id": run_id},
                {"$set": {"status": RunStatus.RUNNING.value}}
            )
            
            # Get the binder service
            from services.binder_service import create_binder_service
            binder_service = create_binder_service(self.db)
            
            # Get the profile
            profile = await binder_service.get_profile(schedule["profile_id"])
            if not profile:
                raise ValueError("Profile not found")
            
            # Generate the binder
            result = await binder_service.generate_binder(
                portfolio_id=schedule["portfolio_id"],
                profile_id=schedule["profile_id"],
                user_id=schedule["user_id"],
                rules=profile.get("rules", {})
            )
            
            # Calculate duration
            completed_at = datetime.now(timezone.utc)
            duration = (completed_at - now).total_seconds()
            
            # Update run record
            await self.db.omnibinder_runs.update_one(
                {"run_id": run_id},
                {"$set": {
                    "status": RunStatus.COMPLETED.value,
                    "completed_at": completed_at.isoformat(),
                    "duration_seconds": duration,
                    "binder_id": result.get("binder_id"),
                    "page_count": result.get("page_count"),
                    "document_count": result.get("document_count")
                }}
            )
            
            # Update schedule
            next_run = self.calculate_next_run(
                ScheduleType(schedule["schedule_type"]),
                schedule.get("schedule_day"),
                schedule.get("schedule_time", "09:00")
            )
            
            await self.db.omnibinder_schedules.update_one(
                {"schedule_id": schedule["schedule_id"]},
                {
                    "$set": {
                        "last_run_at": now.isoformat(),
                        "last_run_status": RunStatus.COMPLETED.value,
                        "next_run_at": next_run.isoformat()
                    },
                    "$inc": {
                        "run_count": 1,
                        "success_count": 1
                    }
                }
            )
            
            # Send notification if enabled
            if schedule.get("notify_on_success") and schedule.get("notify_emails"):
                await self._send_notification(schedule, run_id, "success", result)
            
            logger.info(f"Schedule {schedule['schedule_id']} completed successfully")
            
            return {
                "status": "completed",
                "binder_id": result.get("binder_id"),
                "duration_seconds": duration
            }
            
        except Exception as e:
            logger.error(f"Schedule {schedule['schedule_id']} failed: {e}")
            
            # Update run record with error
            await self.db.omnibinder_runs.update_one(
                {"run_id": run_id},
                {"$set": {
                    "status": RunStatus.FAILED.value,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "error_message": str(e)
                }}
            )
            
            # Update schedule failure count
            await self.db.omnibinder_schedules.update_one(
                {"schedule_id": schedule["schedule_id"]},
                {
                    "$set": {
                        "last_run_at": now.isoformat(),
                        "last_run_status": RunStatus.FAILED.value
                    },
                    "$inc": {
                        "run_count": 1,
                        "failure_count": 1
                    }
                }
            )
            
            # Send failure notification
            if schedule.get("notify_on_failure") and schedule.get("notify_emails"):
                await self._send_notification(schedule, run_id, "failure", {"error": str(e)})
            
            return {
                "status": "failed",
                "error": str(e)
            }
    
    async def _send_notification(
        self,
        schedule: Dict,
        run_id: str,
        status: str,
        result: Dict
    ):
        """Send email notification about schedule run"""
        try:
            from services.email_service import get_email_service
            email_service = get_email_service()
            
            if status == "success":
                subject = f"✅ Scheduled Binder Generated: {schedule['name']}"
                body = f"""
Your scheduled binder has been generated successfully.

Schedule: {schedule['name']}
Run ID: {run_id}
Binder ID: {result.get('binder_id', 'N/A')}
Pages: {result.get('page_count', 'N/A')}
Documents: {result.get('document_count', 'N/A')}

This binder was generated automatically by OmniBinder.
"""
            else:
                subject = f"❌ Scheduled Binder Failed: {schedule['name']}"
                body = f"""
Your scheduled binder generation has failed.

Schedule: {schedule['name']}
Run ID: {run_id}
Error: {result.get('error', 'Unknown error')}

Please check the schedule configuration and try again.
"""
            
            for email in schedule.get("notify_emails", []):
                await email_service.send_email(
                    to_email=email,
                    subject=subject,
                    body=body
                )
            
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
    
    # ============ RUN HISTORY ============
    
    async def get_run_history(
        self,
        schedule_id: str,
        skip: int = 0,
        limit: int = 20
    ) -> Dict:
        """Get run history for a schedule"""
        runs = await self.db.omnibinder_runs.find(
            {"schedule_id": schedule_id},
            {"_id": 0}
        ).sort("started_at", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await self.db.omnibinder_runs.count_documents({"schedule_id": schedule_id})
        
        return {
            "runs": runs,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    
    async def get_run(self, run_id: str) -> Optional[Dict]:
        """Get a specific run"""
        run = await self.db.omnibinder_runs.find_one(
            {"run_id": run_id},
            {"_id": 0}
        )
        return run
    
    # ============ NEXT RUN CALCULATION ============
    
    def calculate_next_run(
        self,
        schedule_type: ScheduleType,
        schedule_day: Optional[int],
        schedule_time: str
    ) -> datetime:
        """Calculate the next run time for a schedule"""
        now = datetime.now(timezone.utc)
        
        # Parse time
        try:
            hour, minute = map(int, schedule_time.split(":"))
        except (ValueError, AttributeError):
            hour, minute = 9, 0
        
        if schedule_type == ScheduleType.DAILY:
            # Next occurrence of the time
            next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)
        
        elif schedule_type == ScheduleType.WEEKLY:
            # schedule_day is 0-6 (Monday-Sunday)
            day = schedule_day if schedule_day is not None else 0
            days_ahead = day - now.weekday()
            if days_ahead < 0 or (days_ahead == 0 and now.hour >= hour):
                days_ahead += 7
            next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            next_run += timedelta(days=days_ahead)
        
        elif schedule_type == ScheduleType.BIWEEKLY:
            # Every two weeks on the specified day
            day = schedule_day if schedule_day is not None else 0
            days_ahead = day - now.weekday()
            if days_ahead < 0 or (days_ahead == 0 and now.hour >= hour):
                days_ahead += 14
            next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            next_run += timedelta(days=days_ahead)
        
        elif schedule_type == ScheduleType.MONTHLY:
            # schedule_day is 1-28
            day = schedule_day if schedule_day is not None else 1
            day = min(day, 28)  # Ensure valid day
            
            if now.day < day or (now.day == day and now.hour < hour):
                # This month
                next_run = now.replace(day=day, hour=hour, minute=minute, second=0, microsecond=0)
            else:
                # Next month
                if now.month == 12:
                    next_run = now.replace(year=now.year + 1, month=1, day=day, hour=hour, minute=minute, second=0, microsecond=0)
                else:
                    next_run = now.replace(month=now.month + 1, day=day, hour=hour, minute=minute, second=0, microsecond=0)
        
        elif schedule_type == ScheduleType.QUARTERLY:
            # Every 3 months
            quarters = [(1, 1), (4, 1), (7, 1), (10, 1)]
            day = schedule_day if schedule_day is not None else 1
            day = min(day, 28)
            
            for q_month, _ in quarters:
                if now.month < q_month or (now.month == q_month and now.day < day):
                    next_run = now.replace(month=q_month, day=day, hour=hour, minute=minute, second=0, microsecond=0)
                    break
            else:
                # Next year Q1
                next_run = now.replace(year=now.year + 1, month=1, day=day, hour=hour, minute=minute, second=0, microsecond=0)
        
        else:
            # Default to daily
            next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)
        
        return next_run
    
    # ============ SCHEDULER LOOP ============
    
    async def get_due_schedules(self) -> List[Dict]:
        """Get all schedules that are due to run"""
        now = datetime.now(timezone.utc)
        
        schedules = await self.db.omnibinder_schedules.find({
            "status": ScheduleStatus.ACTIVE.value,
            "next_run_at": {"$lte": now.isoformat()}
        }, {"_id": 0}).to_list(100)
        
        return schedules
    
    async def run_scheduler_tick(self) -> Dict:
        """
        Execute one tick of the scheduler.
        Call this periodically (e.g., every minute) to process due schedules.
        """
        due_schedules = await self.get_due_schedules()
        
        results = []
        for schedule in due_schedules:
            try:
                result = await self.trigger_schedule(
                    schedule["schedule_id"],
                    triggered_by="scheduler"
                )
                results.append({
                    "schedule_id": schedule["schedule_id"],
                    "status": "triggered",
                    **result
                })
            except Exception as e:
                logger.error(f"Failed to trigger schedule {schedule['schedule_id']}: {e}")
                results.append({
                    "schedule_id": schedule["schedule_id"],
                    "status": "error",
                    "error": str(e)
                })
        
        return {
            "processed": len(due_schedules),
            "results": results,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    
    # ============ STATISTICS ============
    
    async def get_schedule_stats(self, workspace_id: str) -> Dict:
        """Get statistics for all schedules in a workspace"""
        pipeline = [
            {"$match": {"workspace_id": workspace_id}},
            {"$group": {
                "_id": None,
                "total_schedules": {"$sum": 1},
                "active_schedules": {"$sum": {"$cond": [{"$eq": ["$status", "active"]}, 1, 0]}},
                "total_runs": {"$sum": "$run_count"},
                "total_successes": {"$sum": "$success_count"},
                "total_failures": {"$sum": "$failure_count"}
            }}
        ]
        
        result = await self.db.omnibinder_schedules.aggregate(pipeline).to_list(1)
        
        if result:
            stats = result[0]
            stats.pop("_id", None)
            stats["success_rate"] = (
                stats["total_successes"] / stats["total_runs"] * 100
                if stats["total_runs"] > 0 else 0
            )
        else:
            stats = {
                "total_schedules": 0,
                "active_schedules": 0,
                "total_runs": 0,
                "total_successes": 0,
                "total_failures": 0,
                "success_rate": 0
            }
        
        return stats


# ============ SINGLETON ============

_scheduled_binder_service: Optional[ScheduledBinderService] = None


def get_scheduled_binder_service() -> ScheduledBinderService:
    if _scheduled_binder_service is None:
        raise RuntimeError("ScheduledBinderService not initialized")
    return _scheduled_binder_service


def init_scheduled_binder_service(db: AsyncIOMotorDatabase) -> ScheduledBinderService:
    global _scheduled_binder_service
    _scheduled_binder_service = ScheduledBinderService(db)
    return _scheduled_binder_service
