"""
RM-ID Allocator V2 - Atomic, Unique RM-ID Generation

Features:
- Database constraints prevent duplicate RM-IDs
- Atomic allocation using transactions/locks
- Random group number generation for new subjects
- Sequential subnumber allocation within groups
- Support for related items sharing same group number

RM-ID Format: RF#########US-NN.SSS
- RF#########US = Base RM-ID (from trust profile)
- NN = Group number (random, 10-999)
- SSS = Subnumber (sequential, 001-999)
"""

import random
import hashlib
import re
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase

# Constants - CONSTRAINED RANGES
GROUP_MIN = 1      # Minimum group number (was 10)
GROUP_MAX = 99     # Maximum group number (was 999) - ONLY 1-99 allowed
MAX_SUBNUMBER = 999
MAX_ALLOCATION_RETRIES = 50  # More retries since smaller range


def normalize_rm_base(rm_base: str) -> str:
    """Normalize RM base: uppercase, remove spaces"""
    if not rm_base:
        return ""
    return re.sub(r'\s+', '', rm_base.strip().upper())


def format_rm_id(rm_base: str, group: int, sub: int) -> str:
    """Format full RM-ID from components"""
    return f"{rm_base}-{group}.{sub:03d}"


def parse_rm_id(rm_id: str) -> Optional[Dict[str, Any]]:
    """Parse RM-ID into components"""
    if not rm_id:
        return None
    
    match = re.match(r'^(.+)-(\d+)\.(\d+)$', rm_id)
    if not match:
        return None
    
    return {
        "rm_base": match.group(1),
        "rm_group": int(match.group(2)),
        "rm_sub": int(match.group(3))
    }


def compute_relation_key(
    court_name: str = None,
    case_number: str = None,
    institution: str = None,
    reference_id: str = None,
    record_id: str = None,
    custom_key: str = None
) -> Optional[str]:
    """
    Compute a stable relation_key for grouping related items.
    Returns None if no relation specified.
    """
    if custom_key:
        return f"custom:{custom_key}"
    
    if record_id:
        return f"record:{record_id}"
    
    if court_name and case_number:
        # Normalize court case reference
        court = re.sub(r'\s+', '_', court_name.strip().lower())
        case = re.sub(r'\s+', '', case_number.strip().upper())
        return f"court:{court}|case:{case}"
    
    if institution and reference_id:
        # Normalize correspondence reference
        inst = re.sub(r'\s+', '_', institution.strip().lower())
        ref = re.sub(r'\s+', '', reference_id.strip().upper())
        return f"inst:{inst}|ref:{ref}"
    
    return None


class RMIDAllocator:
    """
    Atomic RM-ID allocator with database constraints.
    
    Collections required:
    - rm_groups: Tracks group numbers and next subnumber
    - rm_relation_map: Maps relation_keys to group numbers
    - rm_allocations: Audit log of all allocations
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def ensure_indexes(self):
        """Create required indexes and constraints"""
        # rm_groups: Unique constraint on (portfolio_id, rm_base, rm_group)
        await self.db.rm_groups.create_index(
            [("portfolio_id", 1), ("rm_base", 1), ("rm_group", 1)],
            unique=True,
            name="unique_rm_group"
        )
        
        # rm_relation_map: Unique constraint on (portfolio_id, rm_base, relation_key)
        await self.db.rm_relation_map.create_index(
            [("portfolio_id", 1), ("rm_base", 1), ("relation_key", 1)],
            unique=True,
            name="unique_relation_key"
        )
        
        # rm_allocations: Index for lookups
        await self.db.rm_allocations.create_index(
            [("portfolio_id", 1), ("rm_id", 1)],
            unique=True,
            name="unique_rm_id_allocation"
        )
        
        # Index on rm_id in governance_records for fast lookups
        await self.db.governance_records.create_index(
            [("rm_id", 1)],
            unique=True,
            sparse=True,
            name="unique_governance_rm_id"
        )
    
    async def get_rm_base(self, portfolio_id: str, user_id: str) -> str:
        """Get base RM-ID for a portfolio"""
        trust_profile = await self.db.trust_profiles.find_one(
            {"portfolio_id": portfolio_id, "user_id": user_id},
            {"rm_id_normalized": 1, "rm_id_raw": 1, "rm_record_id": 1}
        )
        
        if trust_profile:
            if trust_profile.get("rm_id_normalized"):
                return normalize_rm_base(trust_profile["rm_id_normalized"])
            if trust_profile.get("rm_record_id"):
                return normalize_rm_base(trust_profile["rm_record_id"])
        
        # Generate a random placeholder if no trust profile
        import uuid
        return f"RF{uuid.uuid4().hex[:9].upper()}US"
    
    async def _get_random_available_group(self, portfolio_id: str, rm_base: str) -> int:
        """Get a random group number that isn't already used"""
        # Get all used groups for this portfolio/base
        used_groups = await self.db.rm_groups.distinct(
            "rm_group",
            {"portfolio_id": portfolio_id, "rm_base": rm_base}
        )
        used_set = set(used_groups)
        
        # Generate random number not in use
        available = [g for g in range(GROUP_MIN, GROUP_MAX + 1) if g not in used_set]
        
        if not available:
            raise ValueError(f"No available group numbers for {rm_base}")
        
        return random.choice(available)
    
    async def _create_group(
        self,
        portfolio_id: str,
        user_id: str,
        rm_base: str,
        relation_key: Optional[str] = None
    ) -> Tuple[int, int]:
        """
        Create a new group with a random number.
        Returns (group_number, first_subnumber=1)
        
        Uses retry loop to handle race conditions.
        """
        for attempt in range(MAX_ALLOCATION_RETRIES):
            try:
                group_num = await self._get_random_available_group(portfolio_id, rm_base)
                
                # Try to insert the group (atomic)
                group_doc = {
                    "id": f"rmg_{hashlib.sha256(f'{portfolio_id}:{rm_base}:{group_num}'.encode()).hexdigest()[:12]}",
                    "portfolio_id": portfolio_id,
                    "user_id": user_id,
                    "rm_base": rm_base,
                    "rm_group": group_num,
                    "next_sub": 2,  # First allocation is 001, next will be 002
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                await self.db.rm_groups.insert_one(group_doc)
                
                # If relation_key provided, map it to this group
                if relation_key:
                    map_doc = {
                        "id": f"rmm_{hashlib.sha256(f'{portfolio_id}:{rm_base}:{relation_key}'.encode()).hexdigest()[:12]}",
                        "portfolio_id": portfolio_id,
                        "user_id": user_id,
                        "rm_base": rm_base,
                        "relation_key": relation_key,
                        "rm_group": group_num,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    try:
                        await self.db.rm_relation_map.insert_one(map_doc)
                    except Exception as e:
                        # If mapping fails, that's okay - group is still valid
                        print(f"Warning: Failed to create relation map: {e}")
                
                return group_num, 1
                
            except Exception as e:
                if "duplicate key" in str(e).lower() or "E11000" in str(e):
                    # Group already exists (race condition), retry
                    continue
                raise
        
        raise RuntimeError(f"Failed to allocate group after {MAX_ALLOCATION_RETRIES} attempts")
    
    async def _allocate_subnumber(
        self,
        portfolio_id: str,
        rm_base: str,
        group_num: int
    ) -> int:
        """
        Atomically allocate the next subnumber for an existing group.
        Returns the allocated subnumber.
        """
        # Use findOneAndUpdate for atomic increment
        result = await self.db.rm_groups.find_one_and_update(
            {"portfolio_id": portfolio_id, "rm_base": rm_base, "rm_group": group_num},
            {
                "$inc": {"next_sub": 1},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            return_document=True  # Return updated document
        )
        
        if not result:
            raise ValueError(f"Group {group_num} not found for {rm_base}")
        
        # The subnumber we allocated is (next_sub - 1) because we just incremented
        allocated_sub = result["next_sub"] - 1
        
        if allocated_sub > MAX_SUBNUMBER:
            raise ValueError(f"Group {group_num} has exceeded maximum subnumber ({MAX_SUBNUMBER})")
        
        return allocated_sub
    
    async def allocate(
        self,
        portfolio_id: str,
        user_id: str,
        module_type: str,
        relation_key: Optional[str] = None,
        related_to_record_id: Optional[str] = None,
        court_name: Optional[str] = None,
        case_number: Optional[str] = None,
        institution: Optional[str] = None,
        reference_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Allocate a new RM-ID.
        
        Args:
            portfolio_id: Portfolio ID
            user_id: User ID
            module_type: Type of record (minutes, distribution, dispute, etc.)
            relation_key: Direct relation key (if already computed)
            related_to_record_id: ID of related record (inherits its group)
            court_name: Court name for case grouping
            case_number: Case number for case grouping
            institution: Institution name for correspondence grouping
            reference_id: Reference ID for correspondence grouping
        
        Returns:
            {
                "rm_id": "RF123456789US-42.001",
                "rm_base": "RF123456789US",
                "rm_group": 42,
                "rm_sub": 1,
                "relation_key": "court:ny_supreme|case:2024-CV-1234",
                "is_new_group": True
            }
        """
        rm_base = await self.get_rm_base(portfolio_id, user_id)
        
        # Compute relation_key if not directly provided
        if not relation_key:
            # If related_to_record_id, look up that record's relation_key or rm_group
            if related_to_record_id:
                related_record = await self.db.governance_records.find_one(
                    {"id": related_to_record_id},
                    {"rm_base": 1, "rm_group": 1}
                )
                if related_record and related_record.get("rm_group"):
                    # Use the same group as the related record
                    group_num = related_record["rm_group"]
                    sub_num = await self._allocate_subnumber(portfolio_id, rm_base, group_num)
                    rm_id = format_rm_id(rm_base, group_num, sub_num)
                    
                    # Log allocation
                    await self._log_allocation(
                        portfolio_id, user_id, rm_id, rm_base, group_num, sub_num,
                        module_type, f"related:{related_to_record_id}", False
                    )
                    
                    return {
                        "rm_id": rm_id,
                        "rm_base": rm_base,
                        "rm_group": group_num,
                        "rm_sub": sub_num,
                        "relation_key": f"related:{related_to_record_id}",
                        "is_new_group": False
                    }
            
            # Compute relation_key from other params
            relation_key = compute_relation_key(
                court_name=court_name,
                case_number=case_number,
                institution=institution,
                reference_id=reference_id
            )
        
        # If we have a relation_key, check if it maps to an existing group
        if relation_key:
            existing_map = await self.db.rm_relation_map.find_one({
                "portfolio_id": portfolio_id,
                "rm_base": rm_base,
                "relation_key": relation_key
            })
            
            if existing_map:
                # Use existing group
                group_num = existing_map["rm_group"]
                sub_num = await self._allocate_subnumber(portfolio_id, rm_base, group_num)
                rm_id = format_rm_id(rm_base, group_num, sub_num)
                
                # Log allocation
                await self._log_allocation(
                    portfolio_id, user_id, rm_id, rm_base, group_num, sub_num,
                    module_type, relation_key, False
                )
                
                return {
                    "rm_id": rm_id,
                    "rm_base": rm_base,
                    "rm_group": group_num,
                    "rm_sub": sub_num,
                    "relation_key": relation_key,
                    "is_new_group": False
                }
        
        # Create new group
        group_num, sub_num = await self._create_group(
            portfolio_id, user_id, rm_base, relation_key
        )
        rm_id = format_rm_id(rm_base, group_num, sub_num)
        
        # Log allocation
        await self._log_allocation(
            portfolio_id, user_id, rm_id, rm_base, group_num, sub_num,
            module_type, relation_key, True
        )
        
        return {
            "rm_id": rm_id,
            "rm_base": rm_base,
            "rm_group": group_num,
            "rm_sub": sub_num,
            "relation_key": relation_key,
            "is_new_group": True
        }
    
    async def _log_allocation(
        self,
        portfolio_id: str,
        user_id: str,
        rm_id: str,
        rm_base: str,
        rm_group: int,
        rm_sub: int,
        module_type: str,
        relation_key: Optional[str],
        is_new_group: bool
    ):
        """Log RM-ID allocation for audit trail"""
        allocation_doc = {
            "id": f"rma_{hashlib.sha256(rm_id.encode()).hexdigest()[:12]}",
            "portfolio_id": portfolio_id,
            "user_id": user_id,
            "rm_id": rm_id,
            "rm_base": rm_base,
            "rm_group": rm_group,
            "rm_sub": rm_sub,
            "module_type": module_type,
            "relation_key": relation_key,
            "is_new_group": is_new_group,
            "allocated_at": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            await self.db.rm_allocations.insert_one(allocation_doc)
        except Exception as e:
            # Log but don't fail on audit log errors
            print(f"Warning: Failed to log RM-ID allocation: {e}")
    
    async def preview(
        self,
        portfolio_id: str,
        user_id: str,
        relation_key: Optional[str] = None,
        related_to_record_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Preview what RM-ID would be allocated (without actually allocating).
        Useful for UI preview.
        """
        rm_base = await self.get_rm_base(portfolio_id, user_id)
        
        # Check if related_to_record_id points to existing group
        if related_to_record_id:
            related_record = await self.db.governance_records.find_one(
                {"id": related_to_record_id},
                {"rm_base": 1, "rm_group": 1}
            )
            if related_record and related_record.get("rm_group"):
                group_num = related_record["rm_group"]
                # Get current next_sub
                group_doc = await self.db.rm_groups.find_one({
                    "portfolio_id": portfolio_id,
                    "rm_base": rm_base,
                    "rm_group": group_num
                })
                next_sub = group_doc.get("next_sub", 1) if group_doc else 1
                
                return {
                    "preview_rm_id": format_rm_id(rm_base, group_num, next_sub),
                    "rm_base": rm_base,
                    "rm_group": group_num,
                    "next_sub": next_sub,
                    "is_new_group": False
                }
        
        # Check if relation_key maps to existing group
        if relation_key:
            existing_map = await self.db.rm_relation_map.find_one({
                "portfolio_id": portfolio_id,
                "rm_base": rm_base,
                "relation_key": relation_key
            })
            
            if existing_map:
                group_num = existing_map["rm_group"]
                group_doc = await self.db.rm_groups.find_one({
                    "portfolio_id": portfolio_id,
                    "rm_base": rm_base,
                    "rm_group": group_num
                })
                next_sub = group_doc.get("next_sub", 1) if group_doc else 1
                
                return {
                    "preview_rm_id": format_rm_id(rm_base, group_num, next_sub),
                    "rm_base": rm_base,
                    "rm_group": group_num,
                    "next_sub": next_sub,
                    "is_new_group": False
                }
        
        # Would create new group
        return {
            "preview_rm_id": f"{rm_base}-[NEW].001",
            "rm_base": rm_base,
            "rm_group": None,
            "next_sub": 1,
            "is_new_group": True
        }


# Global allocator instance (initialized on startup)
_allocator: Optional[RMIDAllocator] = None


def get_allocator() -> RMIDAllocator:
    """Get the global allocator instance"""
    if _allocator is None:
        raise RuntimeError("RMIDAllocator not initialized. Call init_allocator() first.")
    return _allocator


async def init_allocator(db: AsyncIOMotorDatabase) -> RMIDAllocator:
    """Initialize the global allocator and create indexes"""
    global _allocator
    _allocator = RMIDAllocator(db)
    await _allocator.ensure_indexes()
    return _allocator


async def allocate_rm_id(
    portfolio_id: str,
    user_id: str,
    module_type: str,
    relation_key: Optional[str] = None,
    related_to_record_id: Optional[str] = None,
    court_name: Optional[str] = None,
    case_number: Optional[str] = None,
    institution: Optional[str] = None,
    reference_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Convenience function to allocate RM-ID using global allocator.
    """
    allocator = get_allocator()
    return await allocator.allocate(
        portfolio_id=portfolio_id,
        user_id=user_id,
        module_type=module_type,
        relation_key=relation_key,
        related_to_record_id=related_to_record_id,
        court_name=court_name,
        case_number=case_number,
        institution=institution,
        reference_id=reference_id
    )
