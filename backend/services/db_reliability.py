"""
Database Transaction & Reliability Utilities

Provides:
1. Transaction-like operations for multi-document updates
2. Retry logic for transient failures
3. Validation helpers for data consistency
4. ID generation with collision detection
"""

import asyncio
from typing import List, Dict, Any, Callable, Tuple
from datetime import datetime, timezone
import uuid


# ============ ID GENERATION ============

def generate_record_id(prefix: str = "rec") -> str:
    """Generate unique record ID with collision resistance"""
    timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
    random_part = uuid.uuid4().hex[:8]
    return f"{prefix}_{random_part}{timestamp % 10000:04d}"


def generate_revision_id() -> str:
    """Generate unique revision ID"""
    return f"rev_{uuid.uuid4().hex[:12]}"


def generate_event_id() -> str:
    """Generate unique event ID"""
    return f"evt_{uuid.uuid4().hex[:12]}"


async def ensure_unique_id(db, collection_name: str, id_field: str, id_value: str, max_retries: int = 3) -> str:
    """
    Ensure ID is unique, regenerate if collision detected.
    Returns the final unique ID.
    """
    for attempt in range(max_retries):
        existing = await db[collection_name].find_one({id_field: id_value})
        if not existing:
            return id_value
        
        # Collision detected - regenerate
        prefix = id_value.split("_")[0]
        id_value = generate_record_id(prefix)
    
    raise ValueError(f"Could not generate unique ID after {max_retries} attempts")


# ============ VALIDATION HELPERS ============

class ValidationResult:
    """Result of a validation check"""
    def __init__(self):
        self.valid = True
        self.errors: List[str] = []
        self.warnings: List[str] = []
    
    def add_error(self, msg: str):
        self.valid = False
        self.errors.append(msg)
    
    def add_warning(self, msg: str):
        self.warnings.append(msg)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "valid": self.valid,
            "errors": self.errors,
            "warnings": self.warnings
        }


def validate_required_fields(data: Dict[str, Any], required: List[str]) -> ValidationResult:
    """
    Validate that all required fields are present and non-empty.
    """
    result = ValidationResult()
    
    for field in required:
        value = data.get(field)
        if value is None or value == "":
            result.add_error(f"Missing required field: {field}")
        elif isinstance(value, str) and not value.strip():
            result.add_error(f"Field '{field}' cannot be empty")
    
    return result


def validate_foreign_key(value: str, valid_pattern: str = None) -> bool:
    """
    Basic FK validation - check if value looks like a valid ID.
    """
    if not value:
        return False
    if valid_pattern and not value.startswith(valid_pattern):
        return False
    return len(value) >= 8  # Minimum ID length


async def validate_fk_exists(db, collection: str, id_field: str, id_value: str) -> Tuple[bool, str]:
    """
    Verify that a foreign key reference actually exists.
    Returns (exists, error_message).
    """
    if not id_value:
        return True, ""  # Null FK is valid
    
    doc = await db[collection].find_one({id_field: id_value})
    if not doc:
        return False, f"Referenced {collection} not found: {id_value}"
    return True, ""


# ============ TRANSACTION-LIKE OPERATIONS ============

class OperationRollback:
    """
    Tracks operations for manual rollback on failure.
    MongoDB doesn't support multi-document transactions in all scenarios,
    so we track operations and can undo them if needed.
    """
    
    def __init__(self, db):
        self.db = db
        self.operations: List[Dict[str, Any]] = []
    
    async def insert(self, collection: str, document: Dict[str, Any], id_field: str = "id"):
        """Insert a document with rollback tracking"""
        await self.db[collection].insert_one(document)
        self.operations.append({
            "type": "insert",
            "collection": collection,
            "id_field": id_field,
            "id_value": document.get(id_field)
        })
    
    async def update(self, collection: str, filter_dict: Dict, update_dict: Dict, original: Dict = None):
        """Update a document with rollback tracking"""
        if original is None:
            # Fetch original for rollback
            original = await self.db[collection].find_one(filter_dict)
        
        await self.db[collection].update_one(filter_dict, update_dict)
        self.operations.append({
            "type": "update",
            "collection": collection,
            "filter": filter_dict,
            "original": original
        })
    
    async def rollback(self):
        """Undo all tracked operations in reverse order"""
        for op in reversed(self.operations):
            try:
                if op["type"] == "insert":
                    await self.db[op["collection"]].delete_one(
                        {op["id_field"]: op["id_value"]}
                    )
                elif op["type"] == "update":
                    if op["original"]:
                        await self.db[op["collection"]].replace_one(
                            op["filter"],
                            op["original"]
                        )
            except Exception as e:
                print(f"Rollback error: {e}")
    
    def clear(self):
        """Clear tracked operations (call after successful commit)"""
        self.operations = []


# ============ RETRY LOGIC ============

async def retry_operation(
    operation: Callable,
    max_retries: int = 3,
    base_delay: float = 0.1,
    exceptions: tuple = (Exception,)
) -> Any:
    """
    Retry an async operation with exponential backoff.
    """
    last_error = None
    
    for attempt in range(max_retries):
        try:
            return await operation()
        except exceptions as e:
            last_error = e
            if attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)
                await asyncio.sleep(delay)
    
    raise last_error


# ============ CONSISTENCY CHECKS ============

async def verify_record_integrity(db, record_id: str) -> ValidationResult:
    """
    Verify that a record and its related documents are consistent.
    """
    result = ValidationResult()
    
    # Check record exists
    record = await db.governance_records.find_one({"id": record_id}, {"_id": 0})
    if not record:
        result.add_error(f"Record not found: {record_id}")
        return result
    
    # Check current revision exists
    if record.get("current_revision_id"):
        revision = await db.governance_revisions.find_one(
            {"id": record["current_revision_id"]}
        )
        if not revision:
            result.add_error(f"Current revision not found: {record['current_revision_id']}")
    else:
        result.add_warning("Record has no current revision")
    
    # Check portfolio exists
    if record.get("portfolio_id"):
        portfolio = await db.portfolios.find_one(
            {"portfolio_id": record["portfolio_id"]}
        )
        if not portfolio:
            result.add_warning(f"Portfolio not found: {record['portfolio_id']}")
    
    # Check RM subject exists
    if record.get("rm_subject_id"):
        subject = await db.rm_subjects.find_one(
            {"id": record["rm_subject_id"]}
        )
        if not subject:
            result.add_warning(f"RM Subject not found: {record['rm_subject_id']}")
    
    return result


async def ensure_revision_chain_integrity(db, record_id: str) -> ValidationResult:
    """
    Verify the hash chain of revisions for a record.
    """
    result = ValidationResult()
    
    revisions = await db.governance_revisions.find(
        {"record_id": record_id}, {"_id": 0}
    ).sort("version", 1).to_list(100)
    
    if not revisions:
        result.add_warning("No revisions found for record")
        return result
    
    prev_hash = None
    for rev in revisions:
        version = rev.get("version", 0)
        
        # Check version sequence
        if version < 1:
            result.add_error(f"Invalid version number: {version}")
        
        # Check hash chain for finalized revisions
        if rev.get("finalized_at"):
            if prev_hash and rev.get("parent_hash") != prev_hash:
                result.add_error(
                    f"Hash chain broken at version {version}: "
                    f"expected parent_hash {prev_hash}, got {rev.get('parent_hash')}"
                )
            prev_hash = rev.get("content_hash")
    
    return result
