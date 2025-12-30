"""
Comprehensive Audit Log Service

Provides a unified audit trail across all system activities:
- Governance record events (create, update, finalize, void)
- Binder generation events
- Thread operations (merge, split, reassign)
- Integrity seal events
- User authentication events
- System configuration changes

Supports filtering, search, export, and compliance reporting.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
from uuid import uuid4
from enum import Enum
from dataclasses import dataclass, asdict


class AuditCategory(str, Enum):
    """Categories for audit log entries."""
    GOVERNANCE = "governance"       # Record lifecycle events
    BINDER = "binder"              # Binder generation events
    THREAD = "thread"              # Ledger thread operations
    INTEGRITY = "integrity"        # Seal and verification events
    AUTH = "auth"                  # Authentication events
    SYSTEM = "system"              # System configuration changes
    EXPORT = "export"              # Data export events
    COMPLIANCE = "compliance"      # Compliance-related actions


class AuditSeverity(str, Enum):
    """Severity levels for audit entries."""
    INFO = "info"           # Routine operations
    NOTICE = "notice"       # Notable but expected events
    WARNING = "warning"     # Unusual but not problematic
    CRITICAL = "critical"   # Important compliance events


@dataclass
class AuditEntry:
    """Unified audit log entry."""
    id: str
    timestamp: str
    category: str
    event_type: str
    severity: str
    actor_id: str
    actor_name: str
    portfolio_id: Optional[str]
    resource_type: Optional[str]  # e.g., "record", "binder", "thread"
    resource_id: Optional[str]
    action: str                   # Human-readable action description
    details: Dict[str, Any]
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class AuditLogService:
    """Service for comprehensive audit logging and retrieval."""
    
    def __init__(self, db):
        self.db = db
        self.collection_name = "audit_log"
    
    # ============ LOG ENTRY CREATION ============
    
    async def log(
        self,
        category: AuditCategory,
        event_type: str,
        actor_id: str,
        action: str,
        portfolio_id: str = None,
        resource_type: str = None,
        resource_id: str = None,
        details: Dict = None,
        severity: AuditSeverity = AuditSeverity.INFO,
        actor_name: str = "",
        ip_address: str = None,
        user_agent: str = None
    ) -> str:
        """
        Create a new audit log entry.
        Returns the entry ID.
        """
        entry_id = f"audit_{uuid4().hex[:12]}"
        
        entry = AuditEntry(
            id=entry_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            category=category.value if isinstance(category, AuditCategory) else category,
            event_type=event_type,
            severity=severity.value if isinstance(severity, AuditSeverity) else severity,
            actor_id=actor_id,
            actor_name=actor_name or actor_id,
            portfolio_id=portfolio_id,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        doc = asdict(entry)
        await self.db[self.collection_name].insert_one(doc)
        
        return entry_id
    
    # ============ SPECIFIC EVENT LOGGERS ============
    
    async def log_governance_event(
        self,
        event_type: str,
        record_id: str,
        actor_id: str,
        portfolio_id: str,
        action: str,
        details: Dict = None,
        actor_name: str = ""
    ):
        """Log a governance record event."""
        return await self.log(
            category=AuditCategory.GOVERNANCE,
            event_type=event_type,
            actor_id=actor_id,
            action=action,
            portfolio_id=portfolio_id,
            resource_type="record",
            resource_id=record_id,
            details=details,
            severity=AuditSeverity.INFO if event_type != "voided" else AuditSeverity.NOTICE,
            actor_name=actor_name
        )
    
    async def log_binder_event(
        self,
        event_type: str,
        run_id: str,
        actor_id: str,
        portfolio_id: str,
        profile_name: str,
        details: Dict = None
    ):
        """Log a binder generation event."""
        action_map = {
            "generation_started": f"Started generating {profile_name}",
            "generation_complete": f"Successfully generated {profile_name}",
            "generation_failed": f"Failed to generate {profile_name}",
            "downloaded": f"Downloaded {profile_name}",
            "viewed": f"Viewed {profile_name}"
        }
        
        return await self.log(
            category=AuditCategory.BINDER,
            event_type=event_type,
            actor_id=actor_id,
            action=action_map.get(event_type, f"Binder {event_type}"),
            portfolio_id=portfolio_id,
            resource_type="binder_run",
            resource_id=run_id,
            details={
                "profile_name": profile_name,
                **(details or {})
            },
            severity=AuditSeverity.NOTICE if "complete" in event_type else AuditSeverity.INFO
        )
    
    async def log_thread_event(
        self,
        event_type: str,
        thread_id: str,
        actor_id: str,
        portfolio_id: str,
        details: Dict = None
    ):
        """Log a ledger thread operation."""
        action_map = {
            "created": "Created new ledger thread",
            "merged": "Merged ledger threads",
            "split": "Split ledger thread",
            "reassigned": "Reassigned records between threads",
            "deleted": "Deleted ledger thread"
        }
        
        return await self.log(
            category=AuditCategory.THREAD,
            event_type=event_type,
            actor_id=actor_id,
            action=action_map.get(event_type, f"Thread {event_type}"),
            portfolio_id=portfolio_id,
            resource_type="thread",
            resource_id=thread_id,
            details=details,
            severity=AuditSeverity.NOTICE
        )
    
    async def log_integrity_event(
        self,
        event_type: str,
        resource_id: str,
        actor_id: str,
        portfolio_id: str = None,
        details: Dict = None
    ):
        """Log an integrity/verification event."""
        action_map = {
            "seal_created": "Created integrity seal",
            "seal_verified": "Verified integrity seal",
            "seal_failed": "Integrity seal verification failed",
            "binder_verified": "Verified binder integrity",
            "hash_mismatch": "Hash mismatch detected"
        }
        
        severity = AuditSeverity.CRITICAL if "failed" in event_type or "mismatch" in event_type else AuditSeverity.INFO
        
        return await self.log(
            category=AuditCategory.INTEGRITY,
            event_type=event_type,
            actor_id=actor_id,
            action=action_map.get(event_type, f"Integrity {event_type}"),
            portfolio_id=portfolio_id,
            resource_type="seal",
            resource_id=resource_id,
            details=details,
            severity=severity
        )
    
    async def log_auth_event(
        self,
        event_type: str,
        actor_id: str,
        ip_address: str = None,
        user_agent: str = None,
        details: Dict = None
    ):
        """Log an authentication event."""
        action_map = {
            "login": "User logged in",
            "logout": "User logged out",
            "login_failed": "Failed login attempt",
            "password_changed": "Password changed",
            "session_expired": "Session expired"
        }
        
        severity = AuditSeverity.WARNING if "failed" in event_type else AuditSeverity.INFO
        
        return await self.log(
            category=AuditCategory.AUTH,
            event_type=event_type,
            actor_id=actor_id,
            action=action_map.get(event_type, f"Auth {event_type}"),
            details=details,
            severity=severity,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def log_export_event(
        self,
        export_type: str,
        actor_id: str,
        portfolio_id: str = None,
        details: Dict = None
    ):
        """Log a data export event."""
        return await self.log(
            category=AuditCategory.EXPORT,
            event_type="export",
            actor_id=actor_id,
            action=f"Exported {export_type}",
            portfolio_id=portfolio_id,
            details={
                "export_type": export_type,
                **(details or {})
            },
            severity=AuditSeverity.NOTICE
        )
    
    # ============ QUERY AND RETRIEVAL ============
    
    async def get_entries(
        self,
        user_id: str,
        portfolio_id: str = None,
        category: str = None,
        severity: str = None,
        resource_type: str = None,
        resource_id: str = None,
        start_date: str = None,
        end_date: str = None,
        search: str = None,
        limit: int = 100,
        offset: int = 0,
        sort_order: str = "desc"
    ) -> Dict:
        """
        Retrieve audit log entries with filtering.
        """
        query = {"actor_id": user_id}
        
        if portfolio_id:
            query["portfolio_id"] = portfolio_id
        
        if category:
            query["category"] = category
        
        if severity:
            query["severity"] = severity
        
        if resource_type:
            query["resource_type"] = resource_type
        
        if resource_id:
            query["resource_id"] = resource_id
        
        if start_date:
            query["timestamp"] = {"$gte": start_date}
        
        if end_date:
            if "timestamp" in query:
                query["timestamp"]["$lte"] = end_date
            else:
                query["timestamp"] = {"$lte": end_date}
        
        if search:
            query["$or"] = [
                {"action": {"$regex": search, "$options": "i"}},
                {"event_type": {"$regex": search, "$options": "i"}},
                {"resource_id": {"$regex": search, "$options": "i"}}
            ]
        
        # Get total count
        total = await self.db[self.collection_name].count_documents(query)
        
        # Get entries with pagination
        sort_dir = -1 if sort_order == "desc" else 1
        cursor = self.db[self.collection_name].find(
            query, {"_id": 0}
        ).sort("timestamp", sort_dir).skip(offset).limit(limit)
        
        entries = await cursor.to_list(limit)
        
        return {
            "entries": entries,
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": (offset + len(entries)) < total
        }
    
    async def get_entry(self, entry_id: str, user_id: str) -> Optional[Dict]:
        """Get a single audit log entry."""
        return await self.db[self.collection_name].find_one(
            {"id": entry_id, "actor_id": user_id},
            {"_id": 0}
        )
    
    async def get_resource_history(
        self,
        resource_type: str,
        resource_id: str,
        user_id: str,
        limit: int = 100
    ) -> List[Dict]:
        """Get all audit entries for a specific resource."""
        cursor = self.db[self.collection_name].find(
            {
                "resource_type": resource_type,
                "resource_id": resource_id,
                "actor_id": user_id
            },
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit)
        
        return await cursor.to_list(limit)
    
    # ============ ANALYTICS AND SUMMARY ============
    
    async def get_summary(
        self,
        user_id: str,
        portfolio_id: str = None,
        days: int = 30
    ) -> Dict:
        """Get audit log summary statistics."""
        start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        base_query = {
            "actor_id": user_id,
            "timestamp": {"$gte": start_date}
        }
        
        if portfolio_id:
            base_query["portfolio_id"] = portfolio_id
        
        # Get total entries
        total = await self.db[self.collection_name].count_documents(base_query)
        
        # Get counts by category
        by_category = {}
        for cat in AuditCategory:
            count = await self.db[self.collection_name].count_documents({
                **base_query,
                "category": cat.value
            })
            by_category[cat.value] = count
        
        # Get counts by severity
        by_severity = {}
        for sev in AuditSeverity:
            count = await self.db[self.collection_name].count_documents({
                **base_query,
                "severity": sev.value
            })
            by_severity[sev.value] = count
        
        # Get recent critical events
        critical_cursor = self.db[self.collection_name].find(
            {**base_query, "severity": "critical"},
            {"_id": 0}
        ).sort("timestamp", -1).limit(5)
        critical_events = await critical_cursor.to_list(5)
        
        return {
            "period_days": days,
            "total_entries": total,
            "by_category": by_category,
            "by_severity": by_severity,
            "critical_events": critical_events,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def get_activity_timeline(
        self,
        user_id: str,
        portfolio_id: str = None,
        days: int = 7
    ) -> List[Dict]:
        """Get daily activity counts for timeline visualization."""
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        timeline = []
        for i in range(days + 1):
            day = start_date + timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
            
            query = {
                "actor_id": user_id,
                "timestamp": {"$gte": day_start, "$lte": day_end}
            }
            
            if portfolio_id:
                query["portfolio_id"] = portfolio_id
            
            count = await self.db[self.collection_name].count_documents(query)
            
            timeline.append({
                "date": day.strftime("%Y-%m-%d"),
                "count": count
            })
        
        return timeline
    
    # ============ EXPORT ============
    
    async def export_entries(
        self,
        user_id: str,
        portfolio_id: str = None,
        start_date: str = None,
        end_date: str = None,
        format: str = "json"
    ) -> Dict:
        """
        Export audit log entries for compliance reporting.
        Returns data in specified format (json or csv-compatible).
        """
        query = {"actor_id": user_id}
        
        if portfolio_id:
            query["portfolio_id"] = portfolio_id
        
        if start_date:
            query["timestamp"] = {"$gte": start_date}
        
        if end_date:
            if "timestamp" in query:
                query["timestamp"]["$lte"] = end_date
            else:
                query["timestamp"] = {"$lte": end_date}
        
        cursor = self.db[self.collection_name].find(
            query, {"_id": 0}
        ).sort("timestamp", -1)
        
        entries = await cursor.to_list(10000)  # Max 10k entries per export
        
        # Log the export action
        await self.log_export_event(
            export_type="audit_log",
            actor_id=user_id,
            portfolio_id=portfolio_id,
            details={
                "entries_exported": len(entries),
                "start_date": start_date,
                "end_date": end_date,
                "format": format
            }
        )
        
        if format == "csv":
            # Return CSV-compatible structure
            headers = [
                "timestamp", "category", "event_type", "severity",
                "actor_id", "portfolio_id", "resource_type", "resource_id",
                "action"
            ]
            rows = []
            for e in entries:
                rows.append([
                    e.get("timestamp", ""),
                    e.get("category", ""),
                    e.get("event_type", ""),
                    e.get("severity", ""),
                    e.get("actor_id", ""),
                    e.get("portfolio_id", ""),
                    e.get("resource_type", ""),
                    e.get("resource_id", ""),
                    e.get("action", "")
                ])
            return {
                "format": "csv",
                "headers": headers,
                "rows": rows,
                "total": len(rows)
            }
        
        return {
            "format": "json",
            "entries": entries,
            "total": len(entries),
            "exported_at": datetime.now(timezone.utc).isoformat()
        }
    
    # ============ COMPLIANCE HELPERS ============
    
    async def get_compliance_report(
        self,
        user_id: str,
        portfolio_id: str,
        start_date: str = None,
        end_date: str = None
    ) -> Dict:
        """
        Generate a compliance-focused audit report.
        Highlights key events for regulatory review.
        """
        # Default to last 12 months
        if not start_date:
            start_date = (datetime.now(timezone.utc) - timedelta(days=365)).isoformat()
        if not end_date:
            end_date = datetime.now(timezone.utc).isoformat()
        
        base_query = {
            "actor_id": user_id,
            "portfolio_id": portfolio_id,
            "timestamp": {"$gte": start_date, "$lte": end_date}
        }
        
        # Get key compliance metrics
        total_events = await self.db[self.collection_name].count_documents(base_query)
        
        # Finalized records
        finalized = await self.db[self.collection_name].count_documents({
            **base_query,
            "category": "governance",
            "event_type": "finalized"
        })
        
        # Voided records
        voided = await self.db[self.collection_name].count_documents({
            **base_query,
            "category": "governance",
            "event_type": "voided"
        })
        
        # Binders generated
        binders = await self.db[self.collection_name].count_documents({
            **base_query,
            "category": "binder",
            "event_type": "generation_complete"
        })
        
        # Integrity verifications
        verifications = await self.db[self.collection_name].count_documents({
            **base_query,
            "category": "integrity"
        })
        
        # Critical events
        critical = await self.db[self.collection_name].count_documents({
            **base_query,
            "severity": "critical"
        })
        
        # Get all critical events for review
        critical_cursor = self.db[self.collection_name].find(
            {**base_query, "severity": "critical"},
            {"_id": 0}
        ).sort("timestamp", -1)
        critical_events = await critical_cursor.to_list(100)
        
        return {
            "portfolio_id": portfolio_id,
            "period": {
                "start": start_date,
                "end": end_date
            },
            "metrics": {
                "total_events": total_events,
                "records_finalized": finalized,
                "records_voided": voided,
                "binders_generated": binders,
                "integrity_verifications": verifications,
                "critical_events_count": critical
            },
            "critical_events": critical_events,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "report_type": "compliance_audit"
        }


# Factory function
def create_audit_log_service(db):
    return AuditLogService(db)
