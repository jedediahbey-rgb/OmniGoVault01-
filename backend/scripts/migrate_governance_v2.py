"""
Governance Data Migration Script
Migrates legacy governance collections to V2 schema with revisions.

Collections to migrate:
- meetings -> governance_records + governance_revisions
- distributions -> governance_records + governance_revisions
- disputes -> governance_records + governance_revisions
- insurance_policies -> governance_records + governance_revisions
- compensation_entries -> governance_records + governance_revisions
"""

import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import hashlib
import json
import os

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# Module type mappings
LEGACY_TO_V2_MODULE = {
    'meetings': 'minutes',
    'distributions': 'distribution',
    'disputes': 'dispute',
    'insurance_policies': 'insurance',
    'compensation_entries': 'compensation'
}

# ID field mappings
ID_FIELDS = {
    'meetings': 'meeting_id',
    'distributions': 'distribution_id',
    'disputes': 'dispute_id',
    'insurance_policies': 'policy_id',
    'compensation_entries': 'compensation_id'
}


def generate_id(prefix: str) -> str:
    """Generate unique ID with prefix"""
    import uuid
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def compute_content_hash(payload: dict, created_at: str, created_by: str, version: int, parent_hash: str = None) -> str:
    """Compute SHA-256 hash for tamper-evident chain"""
    hashable = {
        "payload": payload,
        "created_at": created_at,
        "created_by": created_by,
        "version": version,
        "parent_hash": parent_hash or ""
    }
    canonical = json.dumps(hashable, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


def extract_payload(doc: dict, collection: str) -> dict:
    """Extract module-specific payload from legacy document"""
    
    # Common fields to exclude from payload
    exclude_fields = {
        '_id', 'meeting_id', 'distribution_id', 'dispute_id', 'policy_id', 'compensation_id',
        'trust_id', 'portfolio_id', 'user_id', 'title', 'rm_id', 'status',
        'locked', 'finalized_at', 'finalized_by', 'finalized_hash',
        'is_amendment', 'amends_meeting_id', 'amendment_number', 'amended_by_id', 'prior_hash',
        'created_at', 'updated_at', 'attestations', 'revision'
    }
    
    # Extract payload (all other fields)
    payload = {k: v for k, v in doc.items() if k not in exclude_fields}
    
    return payload


async def migrate_collection(db, collection_name: str, dry_run: bool = True):
    """Migrate a single legacy collection to V2 schema"""
    
    module_type = LEGACY_TO_V2_MODULE.get(collection_name)
    id_field = ID_FIELDS.get(collection_name)
    
    if not module_type or not id_field:
        print(f"  ⚠️ Unknown collection: {collection_name}")
        return 0
    
    # Get all documents that haven't been migrated yet
    cursor = db[collection_name].find({'_migrated_to_v2': {'$ne': True}})
    docs = await cursor.to_list(1000)
    
    migrated_count = 0
    
    for doc in docs:
        legacy_id = doc.get(id_field)
        
        # Check if already exists in V2
        existing = await db.governance_records.find_one({
            'legacy_id': legacy_id,
            'module_type': module_type
        })
        
        if existing:
            print(f"  ⏭️ Already migrated: {legacy_id}")
            continue
        
        # Determine status
        is_finalized = doc.get('locked', False) or doc.get('finalized_at')
        status = 'finalized' if is_finalized else 'draft'
        
        # Extract payload
        payload = extract_payload(doc, collection_name)
        
        # Create record
        record_id = generate_id('rec')
        revision_id = generate_id('rev')
        
        created_at = doc.get('created_at') or datetime.now(timezone.utc).isoformat()
        finalized_at = doc.get('finalized_at')
        finalized_by = doc.get('finalized_by', '')
        created_by = finalized_by or 'System'
        
        # Compute hash if finalized
        content_hash = ''
        if is_finalized:
            content_hash = compute_content_hash(
                payload, created_at, created_by, 1, doc.get('prior_hash')
            )
        
        record = {
            'id': record_id,
            'legacy_id': legacy_id,  # Keep reference to original
            'trust_id': doc.get('trust_id'),
            'portfolio_id': doc.get('portfolio_id'),
            'user_id': doc.get('user_id'),
            'module_type': module_type,
            'title': doc.get('title', 'Untitled'),
            'rm_id': doc.get('rm_id', ''),
            'status': status,
            'current_revision_id': revision_id,
            'created_at': created_at,
            'created_by': created_by,
            'finalized_at': finalized_at,
            'finalized_by': finalized_by if is_finalized else None,
            'voided_at': None,
            'voided_by': None,
            'void_reason': None,
            'amended_by_id': doc.get('amended_by_id'),
        }
        
        revision = {
            'id': revision_id,
            'record_id': record_id,
            'version': doc.get('revision', 1) or 1,
            'parent_revision_id': None,
            'change_type': 'amendment' if doc.get('is_amendment') else 'initial',
            'change_reason': doc.get('amendment_reason', ''),
            'effective_at': None,
            'payload_json': payload,
            'created_at': created_at,
            'created_by': created_by,
            'finalized_at': finalized_at,
            'finalized_by': finalized_by if is_finalized else None,
            'content_hash': content_hash,
            'parent_hash': doc.get('prior_hash', ''),
        }
        
        if dry_run:
            print(f"  📋 Would migrate: {legacy_id} -> {record_id} ({module_type}, {status})")
        else:
            # Insert record and revision
            await db.governance_records.insert_one(record)
            await db.governance_revisions.insert_one(revision)
            
            # Mark original as migrated
            await db[collection_name].update_one(
                {id_field: legacy_id},
                {'$set': {'_migrated_to_v2': True, '_v2_record_id': record_id}}
            )
            
            # Create audit event
            event = {
                'id': generate_id('evt'),
                'trust_id': doc.get('trust_id'),
                'portfolio_id': doc.get('portfolio_id'),
                'user_id': doc.get('user_id'),
                'record_id': record_id,
                'revision_id': revision_id,
                'event_type': 'migrated',
                'actor_id': 'system',
                'actor_name': 'Migration Script',
                'at': datetime.now(timezone.utc).isoformat(),
                'meta_json': {
                    'legacy_collection': collection_name,
                    'legacy_id': legacy_id,
                    'source': 'migration_v1_to_v2'
                }
            }
            await db.governance_events.insert_one(event)
            
            print(f"  ✅ Migrated: {legacy_id} -> {record_id}")
        
        migrated_count += 1
    
    return migrated_count


async def run_migration(dry_run: bool = True):
    """Run full migration"""
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=" * 60)
    print("GOVERNANCE DATA MIGRATION V1 -> V2")
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE MIGRATION'}")
    print("=" * 60)
    
    total_migrated = 0
    
    for collection in ['meetings', 'distributions', 'disputes', 'insurance_policies', 'compensation_entries']:
        count = await db[collection].count_documents({})
        already_migrated = await db[collection].count_documents({'_migrated_to_v2': True})
        pending = count - already_migrated
        
        print(f"\n📁 {collection}: {count} total, {already_migrated} migrated, {pending} pending")
        
        if pending > 0:
            migrated = await migrate_collection(db, collection, dry_run)
            total_migrated += migrated
    
    print("\n" + "=" * 60)
    print(f"MIGRATION {'PREVIEW' if dry_run else 'COMPLETE'}: {total_migrated} records")
    print("=" * 60)
    
    # Show V2 collection counts
    records_count = await db.governance_records.count_documents({})
    revisions_count = await db.governance_revisions.count_documents({})
    events_count = await db.governance_events.count_documents({})
    
    print("\nV2 Collections:")
    print(f"  governance_records: {records_count}")
    print(f"  governance_revisions: {revisions_count}")
    print(f"  governance_events: {events_count}")
    
    client.close()


if __name__ == '__main__':
    import sys
    
    dry_run = '--execute' not in sys.argv
    
    if not dry_run:
        print("\n⚠️  WARNING: This will modify the database!")
        print("Press Ctrl+C within 5 seconds to cancel...\n")
        import time
        time.sleep(5)
    
    asyncio.run(run_migration(dry_run=dry_run))
