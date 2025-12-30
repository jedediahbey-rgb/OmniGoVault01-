"""
Data Integrity Checker & Repair Utilities

Provides tools for:
1. Orphan detection (records referenced but not found)
2. Consistency validation (FK integrity, required fields)
3. RM-ID integrity (threads, sub-numbers, duplicates)
4. Repair actions (re-link, reconcile, reindex)
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from dataclasses import dataclass, field
from enum import Enum


class IssueSeverity(str, Enum):
    """Severity levels for integrity issues"""
    CRITICAL = "critical"  # Data loss or corruption risk
    HIGH = "high"  # Functionality broken
    MEDIUM = "medium"  # Inconsistency, may cause issues
    LOW = "low"  # Minor issue, cosmetic


class IssueType(str, Enum):
    """Types of integrity issues"""
    ORPHAN_RECORD = "orphan_record"  # Record referenced but not found
    ORPHAN_REVISION = "orphan_revision"  # Revision without parent record
    MISSING_FK = "missing_fk"  # Foreign key points to non-existent record
    DUPLICATE_RMID = "duplicate_rmid"  # Same RM-ID used multiple times
    INVALID_STATUS = "invalid_status"  # Status doesn't match expected state
    MISSING_REQUIRED = "missing_required"  # Required field is empty
    BROKEN_HASH_CHAIN = "broken_hash_chain"  # Content hash doesn't match
    INCONSISTENT_VERSION = "inconsistent_version"  # Version numbers out of sync
    STALE_REFERENCE = "stale_reference"  # Reference to voided/deleted record
    MISSING_PORTFOLIO = "missing_portfolio"  # Record without portfolio_id
    INVALID_THREAD_LINK = "invalid_thread_link"  # Thread link broken


@dataclass
class IntegrityIssue:
    """Represents a single integrity issue found"""
    issue_type: IssueType
    severity: IssueSeverity
    record_id: str
    record_type: str  # governance_record, revision, etc.
    description: str
    details: Dict[str, Any] = field(default_factory=dict)
    suggested_fix: str = ""
    auto_fixable: bool = False
    fixed: bool = False
    fixed_at: Optional[str] = None


@dataclass
class IntegrityScanResult:
    """Result of an integrity scan"""
    scan_id: str
    started_at: str
    completed_at: Optional[str] = None
    total_records_scanned: int = 0
    total_issues_found: int = 0
    issues_by_severity: Dict[str, int] = field(default_factory=dict)
    issues_by_type: Dict[str, int] = field(default_factory=dict)
    issues: List[IntegrityIssue] = field(default_factory=list)
    auto_fixable_count: int = 0
    errors: List[str] = field(default_factory=list)


class IntegrityChecker:
    """
    Scans database for integrity issues and provides repair utilities.
    """
    
    def __init__(self, db):
        self.db = db
    
    async def run_full_scan(self, user_id: Optional[str] = None) -> IntegrityScanResult:
        """
        Run comprehensive integrity scan across all collections.
        """
        import uuid
        scan_id = f"scan_{uuid.uuid4().hex[:8]}"
        
        result = IntegrityScanResult(
            scan_id=scan_id,
            started_at=datetime.now(timezone.utc).isoformat(),
            issues_by_severity={s.value: 0 for s in IssueSeverity},
            issues_by_type={t.value: 0 for t in IssueType},
        )
        
        try:
            # Run all checks
            await self._check_governance_records(result, user_id)
            await self._check_revisions(result, user_id)
            await self._check_rm_threads(result, user_id)
            await self._check_portfolios(result, user_id)
            await self._check_hash_chains(result, user_id)
            
        except Exception as e:
            result.errors.append(f"Scan error: {str(e)}")
        
        result.completed_at = datetime.now(timezone.utc).isoformat()
        result.total_issues_found = len(result.issues)
        result.auto_fixable_count = sum(1 for i in result.issues if i.auto_fixable)
        
        return result
    
    async def _check_governance_records(self, result: IntegrityScanResult, user_id: Optional[str]):
        """Check governance_records collection"""
        query = {"user_id": user_id} if user_id else {}
        
        async for record in self.db.governance_records.find(query, {"_id": 0}):
            result.total_records_scanned += 1
            record_id = record.get("id", "unknown")
            
            # Check 1: Missing portfolio_id
            if not record.get("portfolio_id"):
                issue = IntegrityIssue(
                    issue_type=IssueType.MISSING_PORTFOLIO,
                    severity=IssueSeverity.HIGH,
                    record_id=record_id,
                    record_type="governance_record",
                    description="Record missing portfolio_id",
                    details={"title": record.get("title", "")},
                    suggested_fix="Assign to a portfolio or void the record",
                    auto_fixable=False
                )
                self._add_issue(result, issue)
            
            # Check 2: Missing current_revision_id
            if not record.get("current_revision_id") and record.get("status") != "voided":
                issue = IntegrityIssue(
                    issue_type=IssueType.ORPHAN_RECORD,
                    severity=IssueSeverity.CRITICAL,
                    record_id=record_id,
                    record_type="governance_record",
                    description="Record has no current revision",
                    details={"status": record.get("status")},
                    suggested_fix="Create initial revision or void the record",
                    auto_fixable=True
                )
                self._add_issue(result, issue)
            
            # Check 3: Verify current_revision exists
            elif record.get("current_revision_id"):
                revision = await self.db.governance_revisions.find_one(
                    {"id": record["current_revision_id"]}
                )
                if not revision:
                    issue = IntegrityIssue(
                        issue_type=IssueType.MISSING_FK,
                        severity=IssueSeverity.CRITICAL,
                        record_id=record_id,
                        record_type="governance_record",
                        description=f"Current revision not found: {record['current_revision_id']}",
                        details={"missing_revision_id": record["current_revision_id"]},
                        suggested_fix="Find or recreate the revision",
                        auto_fixable=False
                    )
                    self._add_issue(result, issue)
            
            # Check 4: Invalid status
            valid_statuses = ["draft", "pending_approval", "approved", "executed", "finalized", "amended", "voided"]
            if record.get("status") not in valid_statuses:
                issue = IntegrityIssue(
                    issue_type=IssueType.INVALID_STATUS,
                    severity=IssueSeverity.MEDIUM,
                    record_id=record_id,
                    record_type="governance_record",
                    description=f"Invalid status: {record.get('status')}",
                    details={"current_status": record.get("status")},
                    suggested_fix="Set to 'draft' or appropriate status",
                    auto_fixable=True
                )
                self._add_issue(result, issue)
            
            # Check 5: RM Subject link validity
            if record.get("rm_subject_id"):
                subject = await self.db.rm_subjects.find_one(
                    {"id": record["rm_subject_id"]}
                )
                if not subject:
                    issue = IntegrityIssue(
                        issue_type=IssueType.INVALID_THREAD_LINK,
                        severity=IssueSeverity.HIGH,
                        record_id=record_id,
                        record_type="governance_record",
                        description=f"RM Subject not found: {record['rm_subject_id']}",
                        details={"rm_subject_id": record["rm_subject_id"]},
                        suggested_fix="Re-link to valid thread or create new thread",
                        auto_fixable=False
                    )
                    self._add_issue(result, issue)
    
    async def _check_revisions(self, result: IntegrityScanResult, user_id: Optional[str]):
        """Check governance_revisions collection"""
        async for revision in self.db.governance_revisions.find({}, {"_id": 0}):
            result.total_records_scanned += 1
            revision_id = revision.get("id", "unknown")
            
            # Check 1: Orphan revision (no parent record)
            record_id = revision.get("record_id")
            if record_id:
                record = await self.db.governance_records.find_one({"id": record_id})
                if not record:
                    issue = IntegrityIssue(
                        issue_type=IssueType.ORPHAN_REVISION,
                        severity=IssueSeverity.HIGH,
                        record_id=revision_id,
                        record_type="governance_revision",
                        description=f"Revision's parent record not found: {record_id}",
                        details={"parent_record_id": record_id},
                        suggested_fix="Delete orphan revision or restore parent record",
                        auto_fixable=True
                    )
                    self._add_issue(result, issue)
            
            # Check 2: Version consistency
            if revision.get("version", 0) < 1:
                issue = IntegrityIssue(
                    issue_type=IssueType.INCONSISTENT_VERSION,
                    severity=IssueSeverity.MEDIUM,
                    record_id=revision_id,
                    record_type="governance_revision",
                    description=f"Invalid version number: {revision.get('version')}",
                    details={"version": revision.get("version")},
                    suggested_fix="Set version to 1",
                    auto_fixable=True
                )
                self._add_issue(result, issue)
    
    async def _check_rm_threads(self, result: IntegrityScanResult, user_id: Optional[str]):
        """Check RM-ID threads for duplicates and consistency"""
        query = {"user_id": user_id, "deleted_at": None} if user_id else {"deleted_at": None}
        
        # Check for duplicate RM-IDs
        rm_ids_seen: Dict[str, List[str]] = {}
        
        async for subject in self.db.rm_subjects.find(query, {"_id": 0}):
            result.total_records_scanned += 1
            subject_id = subject.get("id", "unknown")
            
            rm_id = subject.get("rm_id", "")
            if rm_id:
                if rm_id not in rm_ids_seen:
                    rm_ids_seen[rm_id] = []
                rm_ids_seen[rm_id].append(subject_id)
        
        # Report duplicates
        for rm_id, subject_ids in rm_ids_seen.items():
            if len(subject_ids) > 1:
                issue = IntegrityIssue(
                    issue_type=IssueType.DUPLICATE_RMID,
                    severity=IssueSeverity.HIGH,
                    record_id=subject_ids[0],
                    record_type="rm_subject",
                    description=f"Duplicate RM-ID found: {rm_id}",
                    details={"rm_id": rm_id, "duplicate_ids": subject_ids},
                    suggested_fix="Merge duplicate threads or reassign RM-IDs",
                    auto_fixable=False
                )
                self._add_issue(result, issue)
    
    async def _check_portfolios(self, result: IntegrityScanResult, user_id: Optional[str]):
        """Check portfolio references are valid"""
        query = {"user_id": user_id} if user_id else {}
        
        # Get all portfolio IDs
        portfolio_ids = set()
        async for portfolio in self.db.portfolios.find(query, {"portfolio_id": 1, "_id": 0}):
            portfolio_ids.add(portfolio.get("portfolio_id"))
        
        # Check governance records reference valid portfolios
        async for record in self.db.governance_records.find(query, {"_id": 0}):
            portfolio_id = record.get("portfolio_id")
            if portfolio_id and portfolio_id not in portfolio_ids:
                issue = IntegrityIssue(
                    issue_type=IssueType.MISSING_FK,
                    severity=IssueSeverity.HIGH,
                    record_id=record.get("id", "unknown"),
                    record_type="governance_record",
                    description=f"Portfolio not found: {portfolio_id}",
                    details={"portfolio_id": portfolio_id},
                    suggested_fix="Reassign to valid portfolio or restore portfolio",
                    auto_fixable=False
                )
                self._add_issue(result, issue)
    
    async def _check_hash_chains(self, result: IntegrityScanResult, user_id: Optional[str]):
        """Verify content hash chain integrity for finalized records"""
        # This is a more expensive check, only run on finalized records
        query = {"status": "finalized"}
        if user_id:
            query["user_id"] = user_id
        
        async for record in self.db.governance_records.find(query, {"_id": 0}):
            result.total_records_scanned += 1
            
            # Get all revisions for this record
            revisions = await self.db.governance_revisions.find(
                {"record_id": record["id"]},
                {"_id": 0}
            ).sort("version", 1).to_list(100)
            
            prev_hash = None
            for rev in revisions:
                # Check parent_hash matches previous revision's content_hash
                if prev_hash and rev.get("parent_hash") != prev_hash:
                    issue = IntegrityIssue(
                        issue_type=IssueType.BROKEN_HASH_CHAIN,
                        severity=IssueSeverity.CRITICAL,
                        record_id=rev.get("id", "unknown"),
                        record_type="governance_revision",
                        description="Hash chain broken - parent_hash mismatch",
                        details={
                            "expected_parent_hash": prev_hash,
                            "actual_parent_hash": rev.get("parent_hash"),
                            "version": rev.get("version")
                        },
                        suggested_fix="Investigate tampering or data corruption",
                        auto_fixable=False
                    )
                    self._add_issue(result, issue)
                
                prev_hash = rev.get("content_hash")
    
    def _add_issue(self, result: IntegrityScanResult, issue: IntegrityIssue):
        """Add issue to result and update counters"""
        result.issues.append(issue)
        result.issues_by_severity[issue.severity.value] = \
            result.issues_by_severity.get(issue.severity.value, 0) + 1
        result.issues_by_type[issue.issue_type.value] = \
            result.issues_by_type.get(issue.issue_type.value, 0) + 1
    
    # ============ REPAIR UTILITIES ============
    
    async def repair_missing_revision(self, record_id: str, user_id: str) -> Dict[str, Any]:
        """
        Create initial revision for a record that has none.
        """
        record = await self.db.governance_records.find_one(
            {"id": record_id, "user_id": user_id},
            {"_id": 0}
        )
        
        if not record:
            return {"success": False, "error": "Record not found"}
        
        if record.get("current_revision_id"):
            return {"success": False, "error": "Record already has a revision"}
        
        import uuid
        from datetime import datetime, timezone
        
        # Create initial revision
        revision_id = f"rev_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        
        revision = {
            "id": revision_id,
            "record_id": record_id,
            "version": 1,
            "change_type": "initial",
            "payload_json": {"title": record.get("title", "Untitled")},
            "created_at": now,
            "created_by": user_id,
            "content_hash": "",
            "parent_hash": None,
        }
        
        # Insert revision and update record
        await self.db.governance_revisions.insert_one(revision)
        await self.db.governance_records.update_one(
            {"id": record_id},
            {"$set": {"current_revision_id": revision_id}}
        )
        
        return {
            "success": True,
            "revision_id": revision_id,
            "message": f"Created initial revision for record {record_id}"
        }
    
    async def repair_invalid_status(self, record_id: str, user_id: str, new_status: str = "draft") -> Dict[str, Any]:
        """
        Fix invalid status by setting to a valid value.
        """
        valid_statuses = ["draft", "pending_approval", "approved", "executed", "finalized", "amended", "voided"]
        
        if new_status not in valid_statuses:
            return {"success": False, "error": f"Invalid target status: {new_status}"}
        
        result = await self.db.governance_records.update_one(
            {"id": record_id, "user_id": user_id},
            {"$set": {"status": new_status}}
        )
        
        if result.modified_count == 0:
            return {"success": False, "error": "Record not found or not modified"}
        
        return {
            "success": True,
            "message": f"Updated record {record_id} status to {new_status}"
        }
    
    async def delete_orphan_revision(self, revision_id: str) -> Dict[str, Any]:
        """
        Delete a revision that has no parent record.
        """
        revision = await self.db.governance_revisions.find_one({"id": revision_id})
        
        if not revision:
            return {"success": False, "error": "Revision not found"}
        
        # Verify it's actually orphaned
        record = await self.db.governance_records.find_one({"id": revision.get("record_id")})
        if record:
            return {"success": False, "error": "Revision has a parent record - not orphaned"}
        
        await self.db.governance_revisions.delete_one({"id": revision_id})
        
        return {
            "success": True,
            "message": f"Deleted orphan revision {revision_id}"
        }
    
    async def merge_duplicate_threads(
        self,
        primary_thread_id: str,
        duplicate_thread_ids: List[str],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Merge duplicate RM-ID threads into a primary thread.
        All records linked to duplicates will be re-linked to primary.
        """
        # Verify primary exists
        primary = await self.db.rm_subjects.find_one(
            {"id": primary_thread_id, "user_id": user_id}
        )
        if not primary:
            return {"success": False, "error": "Primary thread not found"}
        
        records_moved = 0
        
        for dup_id in duplicate_thread_ids:
            if dup_id == primary_thread_id:
                continue
            
            # Move all records from duplicate to primary
            result = await self.db.governance_records.update_many(
                {"rm_subject_id": dup_id},
                {"$set": {"rm_subject_id": primary_thread_id}}
            )
            records_moved += result.modified_count
            
            # Mark duplicate as deleted
            await self.db.rm_subjects.update_one(
                {"id": dup_id},
                {"$set": {
                    "deleted_at": datetime.now(timezone.utc).isoformat(),
                    "merged_into": primary_thread_id
                }}
            )
        
        return {
            "success": True,
            "message": f"Merged {len(duplicate_thread_ids)} threads into {primary_thread_id}",
            "records_moved": records_moved
        }


# Factory function to create checker with database
def create_integrity_checker(db) -> IntegrityChecker:
    return IntegrityChecker(db)
