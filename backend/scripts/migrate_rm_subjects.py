"""
RM Subject Migration Script
Migrates existing governance data to the new RM Subject (Ledger Thread) system.

Operations:
1. Create RMSubject entries from existing rm_groups
2. Backfill governance_records with rm_subject_id and rm_sub
3. Handle orphaned records gracefully

Run: python scripts/migrate_rm_subjects.py
"""

import asyncio
import re
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.rm_subject import SubjectCategory, MODULE_TO_CATEGORY, generate_subject_id

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')


# Map collection names to categories
COLLECTION_TO_CATEGORY = {
    "meetings": SubjectCategory.MINUTES,
    "distributions": SubjectCategory.DISTRIBUTION,
    "disputes": SubjectCategory.DISPUTE,
    "insurance_policies": SubjectCategory.INSURANCE,
    "compensation_entries": SubjectCategory.TRUSTEE_COMPENSATION,
}

# Map module types to categories
MODULE_TYPE_TO_CATEGORY = {
    "minutes": SubjectCategory.MINUTES,
    "distribution": SubjectCategory.DISTRIBUTION,
    "dispute": SubjectCategory.DISPUTE,
    "insurance": SubjectCategory.INSURANCE,
    "compensation": SubjectCategory.TRUSTEE_COMPENSATION,
}


def parse_rm_id(rm_id: str) -> tuple:
    """
    Parse RM-ID into components.
    Format: BASE-GROUP.SUB (e.g., RF743916765US-33.001)
    Returns: (base, group, sub) or (None, None, None) if invalid
    """
    if not rm_id:
        return (None, None, None)
    
    match = re.match(r'^(.+)-(\d+)\.(\d+)$', rm_id)
    if match:
        base, group_str, sub_str = match.groups()
        return (base, int(group_str), int(sub_str))
    
    # Try format without subnumber: BASE-GROUP
    match = re.match(r'^(.+)-(\d+)$', rm_id)
    if match:
        base, group_str = match.groups()
        return (base, int(group_str), 1)  # Default sub to 1
    
    return (None, None, None)


async def run_migration():
    """Run the RM Subject migration"""
    print("=" * 70)
    print("RM SUBJECT MIGRATION")
    print("=" * 70)
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    try:
        # Statistics
        stats = {
            "subjects_created": 0,
            "records_updated": 0,
            "records_skipped": 0,
            "errors": 0
        }
        
        # ============ PHASE 1: Process Legacy Collections ============
        print("\n=== Phase 1: Processing Legacy Collections ===")
        
        for collection_name, category in COLLECTION_TO_CATEGORY.items():
            print(f"\n--- Processing {collection_name} ---")
            
            # Get all records with rm_id
            cursor = db[collection_name].find(
                {"rm_id": {"$ne": None, "$exists": True}},
                {"_id": 0, "rm_id": 1, "portfolio_id": 1, "user_id": 1, "title": 1,
                 "meeting_id": 1, "distribution_id": 1, "dispute_id": 1, 
                 "policy_id": 1, "compensation_id": 1}
            )
            
            async for doc in cursor:
                rm_id = doc.get("rm_id", "")
                rm_base, rm_group, rm_sub = parse_rm_id(rm_id)
                
                if not rm_base or not rm_group:
                    stats["records_skipped"] += 1
                    continue
                
                portfolio_id = doc.get("portfolio_id", "")
                user_id = doc.get("user_id", "")
                
                if not portfolio_id or not user_id:
                    stats["records_skipped"] += 1
                    continue
                
                # Check if subject already exists
                existing_subject = await db.rm_subjects.find_one({
                    "portfolio_id": portfolio_id,
                    "rm_base": rm_base,
                    "rm_group": rm_group,
                    "deleted_at": None
                })
                
                if not existing_subject:
                    # Create new subject
                    title = doc.get("title", f"{category.value} Records (Group {rm_group})")
                    
                    # Find max subnumber for this group
                    max_sub = rm_sub
                    group_cursor = db[collection_name].find(
                        {"rm_id": {"$regex": f"^{re.escape(rm_base)}-{rm_group}\\."}},
                        {"rm_id": 1}
                    )
                    async for group_doc in group_cursor:
                        _, _, doc_sub = parse_rm_id(group_doc.get("rm_id", ""))
                        if doc_sub and doc_sub > max_sub:
                            max_sub = doc_sub
                    
                    subject_doc = {
                        "id": generate_subject_id(),
                        "trust_id": None,
                        "portfolio_id": portfolio_id,
                        "user_id": user_id,
                        "rm_base": rm_base,
                        "rm_group": rm_group,
                        "title": title,
                        "category": category.value,
                        "primary_party_id": None,
                        "primary_party_name": None,
                        "external_ref": None,
                        "next_sub": max_sub + 1,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "created_by": "migration_script",
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                        "deleted_at": None
                    }
                    
                    try:
                        await db.rm_subjects.insert_one(subject_doc)
                        existing_subject = subject_doc
                        stats["subjects_created"] += 1
                        print(f"  Created subject: {rm_base}-{rm_group} ({title})")
                    except Exception as e:
                        if "duplicate key" in str(e).lower():
                            # Race condition, fetch existing
                            existing_subject = await db.rm_subjects.find_one({
                                "portfolio_id": portfolio_id,
                                "rm_base": rm_base,
                                "rm_group": rm_group
                            })
                        else:
                            stats["errors"] += 1
                            print(f"  Error creating subject: {e}")
                            continue
                
                # Update record with subject reference
                # Get the record ID field name
                id_field = None
                for field in ["meeting_id", "distribution_id", "dispute_id", "policy_id", "compensation_id"]:
                    if doc.get(field):
                        id_field = field
                        break
                
                if id_field and existing_subject:
                    await db[collection_name].update_one(
                        {id_field: doc[id_field]},
                        {"$set": {
                            "rm_subject_id": existing_subject["id"],
                            "rm_sub": rm_sub
                        }}
                    )
                    stats["records_updated"] += 1
        
        # ============ PHASE 2: Process V2 Governance Records ============
        print("\n=== Phase 2: Processing V2 Governance Records ===")
        
        cursor = db.governance_records.find(
            {
                "rm_id": {"$ne": None, "$ne": ""},
                "$or": [
                    {"rm_subject_id": None},
                    {"rm_subject_id": {"$exists": False}}
                ]
            },
            {"_id": 0}
        )
        
        async for doc in cursor:
            rm_id = doc.get("rm_id", "")
            rm_base, rm_group, rm_sub = parse_rm_id(rm_id)
            
            if not rm_base or not rm_group:
                stats["records_skipped"] += 1
                continue
            
            portfolio_id = doc.get("portfolio_id", "")
            user_id = doc.get("user_id", "")
            module_type = doc.get("module_type", "misc")
            
            if not portfolio_id or not user_id:
                stats["records_skipped"] += 1
                continue
            
            category = MODULE_TYPE_TO_CATEGORY.get(module_type, SubjectCategory.MISC)
            
            # Check if subject already exists
            existing_subject = await db.rm_subjects.find_one({
                "portfolio_id": portfolio_id,
                "rm_base": rm_base,
                "rm_group": rm_group,
                "deleted_at": None
            })
            
            if not existing_subject:
                # Create new subject
                title = doc.get("title", f"{category.value} Records (Group {rm_group})")
                
                # Find max subnumber
                max_sub_cursor = db.governance_records.find(
                    {
                        "portfolio_id": portfolio_id,
                        "rm_id": {"$regex": f"^{re.escape(rm_base)}-{rm_group}\\."}
                    },
                    {"rm_id": 1}
                )
                max_sub = rm_sub
                async for sub_doc in max_sub_cursor:
                    _, _, doc_sub = parse_rm_id(sub_doc.get("rm_id", ""))
                    if doc_sub and doc_sub > max_sub:
                        max_sub = doc_sub
                
                subject_doc = {
                    "id": generate_subject_id(),
                    "trust_id": doc.get("trust_id"),
                    "portfolio_id": portfolio_id,
                    "user_id": user_id,
                    "rm_base": rm_base,
                    "rm_group": rm_group,
                    "title": title,
                    "category": category.value,
                    "primary_party_id": None,
                    "primary_party_name": None,
                    "external_ref": None,
                    "next_sub": max_sub + 1,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "created_by": "migration_script",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "deleted_at": None
                }
                
                try:
                    await db.rm_subjects.insert_one(subject_doc)
                    existing_subject = subject_doc
                    stats["subjects_created"] += 1
                    print(f"  Created subject for V2: {rm_base}-{rm_group}")
                except Exception as e:
                    if "duplicate key" not in str(e).lower():
                        stats["errors"] += 1
                        print(f"  Error: {e}")
                        continue
                    existing_subject = await db.rm_subjects.find_one({
                        "portfolio_id": portfolio_id,
                        "rm_base": rm_base,
                        "rm_group": rm_group
                    })
            
            # Update record
            if existing_subject:
                await db.governance_records.update_one(
                    {"id": doc["id"]},
                    {"$set": {
                        "rm_subject_id": existing_subject["id"],
                        "rm_sub": rm_sub
                    }}
                )
                stats["records_updated"] += 1
        
        # ============ PHASE 3: Verify and Report ============
        print("\n" + "=" * 70)
        print("MIGRATION COMPLETE")
        print("=" * 70)
        print(f"\nStatistics:")
        print(f"  Subjects created: {stats['subjects_created']}")
        print(f"  Records updated: {stats['records_updated']}")
        print(f"  Records skipped: {stats['records_skipped']}")
        print(f"  Errors: {stats['errors']}")
        
        # Count totals
        total_subjects = await db.rm_subjects.count_documents({"deleted_at": None})
        print(f"\nTotal RM Subjects: {total_subjects}")
        
        # Show subject breakdown by category
        print("\nSubjects by category:")
        pipeline = [
            {"$match": {"deleted_at": None}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        async for cat in db.rm_subjects.aggregate(pipeline):
            print(f"  {cat['_id']}: {cat['count']}")
        
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(run_migration())
