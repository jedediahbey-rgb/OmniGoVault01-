"""
Governance Data Cleanup Script
- Fix invalid RM-IDs (group numbers > 99)
- Remove duplicate insurance policies
- Clean up amendment chain inconsistencies

Run with: python scripts/cleanup_governance_data.py
"""

import asyncio
import random
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
import re

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')


async def fix_invalid_rm_ids(db):
    """Fix RM-IDs with group numbers > 99 (should be 1-99 only)"""
    print("\n=== Fixing Invalid RM-IDs (group > 99) ===")
    
    collections = ['meetings', 'distributions', 'disputes', 'insurance_policies', 
                   'compensation_entries', 'governance_records']
    
    fixed_count = 0
    
    for col_name in collections:
        col = db[col_name]
        
        # Find documents with rm_id containing group numbers > 99
        cursor = col.find({"rm_id": {"$regex": r"-\d{3,}\.\d{3}$"}})
        
        async for doc in cursor:
            rm_id = doc.get("rm_id", "")
            if not rm_id:
                continue
                
            # Parse the RM-ID
            match = re.match(r'^(.+)-(\d+)\.(\d+)$', rm_id)
            if not match:
                continue
                
            base, group_str, sub_str = match.groups()
            group = int(group_str)
            
            if group > 99:
                # Generate new valid group number (1-99)
                new_group = random.randint(1, 99)
                
                # Check for uniqueness
                while True:
                    new_rm_id = f"{base}-{new_group}.{sub_str}"
                    exists = await col.find_one({"rm_id": new_rm_id})
                    if not exists:
                        break
                    new_group = random.randint(1, 99)
                
                # Get the ID field
                id_field = "id" if "id" in doc else list(k for k in doc.keys() if k.endswith("_id") and k != "_id")[0] if any(k.endswith("_id") and k != "_id" for k in doc.keys()) else None
                
                if id_field:
                    await col.update_one(
                        {id_field: doc[id_field]},
                        {"$set": {"rm_id": new_rm_id, "rm_group": new_group}}
                    )
                    print(f"  Fixed {col_name}: {rm_id} -> {new_rm_id}")
                    fixed_count += 1
    
    print(f"  Total fixed: {fixed_count}")
    return fixed_count


async def find_and_remove_insurance_duplicates(db):
    """Find and remove duplicate insurance policies"""
    print("\n=== Finding and Removing Insurance Duplicates ===")
    
    # Find duplicates by key fields
    pipeline = [
        {"$match": {"deleted_at": None}},
        {"$group": {
            "_id": {
                "user_id": "$user_id",
                "policy_number": "$policy_number",
                "carrier_name": "$carrier_name",
                "insured_name": "$insured_name"
            },
            "count": {"$sum": 1},
            "policy_ids": {"$push": "$policy_id"},
            "created_dates": {"$push": "$created_at"},
            "finalized_states": {"$push": "$locked"}
        }},
        {"$match": {"count": {"$gt": 1}}}
    ]
    
    duplicates = await db.insurance_policies.aggregate(pipeline).to_list(100)
    
    if not duplicates:
        print("  No duplicate insurance policies found!")
        return 0
    
    removed_count = 0
    
    for dup in duplicates:
        policy_ids = dup["policy_ids"]
        finalized_states = dup["finalized_states"]
        created_dates = dup["created_dates"]
        
        print(f"  Found duplicate: {dup['_id']}")
        print(f"    Policy IDs: {policy_ids}")
        
        # Keep the finalized one, or the earliest one if none finalized
        keep_idx = None
        for i, is_finalized in enumerate(finalized_states):
            if is_finalized:
                keep_idx = i
                break
        
        if keep_idx is None:
            # Keep the earliest created
            keep_idx = 0
            earliest_date = created_dates[0]
            for i, date in enumerate(created_dates):
                if date and (not earliest_date or date < earliest_date):
                    earliest_date = date
                    keep_idx = i
        
        keep_id = policy_ids[keep_idx]
        remove_ids = [pid for i, pid in enumerate(policy_ids) if i != keep_idx]
        
        print(f"    Keeping: {keep_id}")
        print(f"    Removing: {remove_ids}")
        
        # Soft-delete the duplicates
        for remove_id in remove_ids:
            await db.insurance_policies.update_one(
                {"policy_id": remove_id},
                {"$set": {"deleted_at": datetime.now(timezone.utc).isoformat(), "deleted_reason": "duplicate_cleanup"}}
            )
            removed_count += 1
    
    print(f"  Total removed: {removed_count}")
    return removed_count


async def fix_amendment_chain_inconsistencies(db):
    """Fix records where amended_by_id points to deleted/non-existent records"""
    print("\n=== Fixing Amendment Chain Inconsistencies ===")
    
    collections = {
        'meetings': 'meeting_id',
        'distributions': 'distribution_id',
        'disputes': 'dispute_id',
        'insurance_policies': 'policy_id',
        'compensation_entries': 'compensation_id'
    }
    
    fixed_count = 0
    
    for col_name, id_field in collections.items():
        col = db[col_name]
        
        # Find records with amended_by_id set
        cursor = col.find({"amended_by_id": {"$ne": None}})
        
        async for doc in cursor:
            amended_by_id = doc.get("amended_by_id")
            
            # Check if the amendment still exists and is not deleted
            amendment = await col.find_one({
                id_field: amended_by_id,
                "deleted_at": None
            })
            
            if not amendment:
                # Amendment doesn't exist or is deleted - clear the flag
                await col.update_one(
                    {id_field: doc[id_field]},
                    {"$set": {"amended_by_id": None}}
                )
                print(f"  Cleared orphan amended_by_id in {col_name}: {doc[id_field]}")
                fixed_count += 1
    
    print(f"  Total fixed: {fixed_count}")
    return fixed_count


async def ensure_finalized_consistency(db):
    """Ensure finalized records have proper flags set"""
    print("\n=== Ensuring Finalized State Consistency ===")
    
    collections = ['meetings', 'distributions', 'disputes', 'insurance_policies', 'compensation_entries']
    fixed_count = 0
    
    for col_name in collections:
        col = db[col_name]
        
        # Find records with locked=true but status != 'finalized'
        cursor = col.find({
            "locked": True,
            "status": {"$nin": ["finalized", "executed", "resolved", "paid", "approved"]}
        })
        
        async for doc in cursor:
            await col.update_one(
                {"_id": doc["_id"]},
                {"$set": {"status": "finalized"}}
            )
            fixed_count += 1
        
        # Find records with finalized_at but locked != true
        cursor = col.find({
            "finalized_at": {"$ne": None},
            "locked": {"$ne": True}
        })
        
        async for doc in cursor:
            await col.update_one(
                {"_id": doc["_id"]},
                {"$set": {"locked": True, "status": "finalized"}}
            )
            fixed_count += 1
    
    print(f"  Total fixed: {fixed_count}")
    return fixed_count


async def run_cleanup():
    """Run all cleanup tasks"""
    print("=" * 60)
    print("GOVERNANCE DATA CLEANUP")
    print(f"Database: {DB_NAME}")
    print("=" * 60)
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Run cleanup tasks
        await fix_invalid_rm_ids(db)
        await find_and_remove_insurance_duplicates(db)
        await fix_amendment_chain_inconsistencies(db)
        await ensure_finalized_consistency(db)
        
        print("\n" + "=" * 60)
        print("CLEANUP COMPLETE")
        print("=" * 60)
        
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(run_cleanup())
