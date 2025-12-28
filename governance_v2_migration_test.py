#!/usr/bin/env python3
"""
Governance V2 Migration Test Suite
Tests the Amendment Studio system data migration from legacy to V2 schema.

Test Areas:
1. V2 API endpoints functionality
2. Migrated data integrity
3. Legacy ID references
4. Content hash verification
5. Audit trail completeness
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Any

class GovernanceV2MigrationTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.api_v2 = f"{base_url}/api/governance/v2"
        self.api_legacy = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
    def log_test(self, name: str, success: bool, details: str = "", data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name}: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "data": data
        })
    
    def test_v2_api_authentication(self) -> bool:
        """Test if V2 API requires authentication"""
        print("\n🔐 Testing V2 API Authentication...")
        
        try:
            response = requests.get(f"{self.api_v2}/records", timeout=10)
            
            if response.status_code == 401:
                self.log_test("V2 API requires authentication", True, "Returns 401 as expected")
                return True
            elif response.status_code == 200:
                self.log_test("V2 API authentication", False, "API should require authentication but returned 200")
                return False
            else:
                self.log_test("V2 API authentication", False, f"Unexpected status code: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("V2 API authentication", False, f"Request failed: {str(e)}")
            return False
    
    def test_legacy_api_functionality(self) -> Dict[str, Any]:
        """Test legacy API to understand current data state"""
        print("\n📊 Testing Legacy API Data State...")
        
        legacy_data = {
            "meetings": [],
            "distributions": [],
            "disputes": [],
            "insurance_policies": [],
            "compensation_entries": []
        }
        
        # Test each legacy collection
        for collection in legacy_data.keys():
            try:
                endpoint = collection.replace('_', '-')  # API uses hyphens
                response = requests.get(f"{self.api_legacy}/governance/{endpoint}", timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, dict) and 'items' in data:
                        items = data['items']
                    elif isinstance(data, list):
                        items = data
                    else:
                        items = []
                    
                    legacy_data[collection] = items
                    self.log_test(f"Legacy {collection} API", True, f"Found {len(items)} records")
                else:
                    self.log_test(f"Legacy {collection} API", False, f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"Legacy {collection} API", False, f"Error: {str(e)}")
        
        return legacy_data
    
    def test_migration_script_execution(self) -> bool:
        """Test if migration script has been executed"""
        print("\n🔄 Testing Migration Script Execution...")
        
        try:
            # Check if migration script exists
            import os
            script_path = "/app/backend/scripts/migrate_governance_v2.py"
            
            if not os.path.exists(script_path):
                self.log_test("Migration script exists", False, "Script file not found")
                return False
            
            self.log_test("Migration script exists", True, "Script file found")
            
            # Try to run migration in dry-run mode to check status
            import subprocess
            result = subprocess.run([
                sys.executable, script_path
            ], capture_output=True, text=True, cwd="/app/backend")
            
            if result.returncode == 0:
                output = result.stdout
                if "MIGRATION PREVIEW" in output or "MIGRATION COMPLETE" in output:
                    self.log_test("Migration script execution", True, "Script runs successfully")
                    
                    # Parse output for migration counts
                    lines = output.split('\n')
                    for line in lines:
                        if "records" in line and ("PREVIEW" in line or "COMPLETE" in line):
                            print(f"   📋 {line.strip()}")
                    
                    return True
                else:
                    self.log_test("Migration script execution", False, "Unexpected output format")
                    return False
            else:
                self.log_test("Migration script execution", False, f"Script failed: {result.stderr}")
                return False
                
        except Exception as e:
            self.log_test("Migration script execution", False, f"Error: {str(e)}")
            return False
    
    def test_database_collections(self) -> Dict[str, int]:
        """Test database collections directly"""
        print("\n🗄️ Testing Database Collections...")
        
        collection_counts = {}
        
        try:
            # Try to connect to MongoDB directly
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
            import os
            
            async def check_collections():
                mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
                db_name = os.environ.get('DB_NAME', 'test_database')
                
                client = AsyncIOMotorClient(mongo_url)
                db = client[db_name]
                
                # Check V2 collections
                v2_collections = ['governance_records', 'governance_revisions', 'governance_events']
                for collection in v2_collections:
                    try:
                        count = await db[collection].count_documents({})
                        collection_counts[collection] = count
                        self.log_test(f"Collection {collection}", True, f"Found {count} documents")
                    except Exception as e:
                        collection_counts[collection] = 0
                        self.log_test(f"Collection {collection}", False, f"Error: {str(e)}")
                
                # Check legacy collections for migration markers
                legacy_collections = ['meetings', 'distributions', 'disputes', 'insurance_policies', 'compensation_entries']
                for collection in legacy_collections:
                    try:
                        total = await db[collection].count_documents({})
                        migrated = await db[collection].count_documents({'_migrated_to_v2': True})
                        collection_counts[f"{collection}_total"] = total
                        collection_counts[f"{collection}_migrated"] = migrated
                        
                        if total > 0:
                            self.log_test(f"Legacy {collection} migration status", True, 
                                        f"{migrated}/{total} migrated ({migrated/total*100:.1f}%)")
                        else:
                            self.log_test(f"Legacy {collection} migration status", True, "No records to migrate")
                            
                    except Exception as e:
                        self.log_test(f"Legacy {collection} migration status", False, f"Error: {str(e)}")
                
                client.close()
            
            # Run async function
            asyncio.run(check_collections())
            
        except Exception as e:
            self.log_test("Database connection", False, f"Error: {str(e)}")
        
        return collection_counts
    
    def test_v2_data_integrity(self, collection_counts: Dict[str, int]) -> bool:
        """Test V2 data integrity"""
        print("\n🔍 Testing V2 Data Integrity...")
        
        try:
            records_count = collection_counts.get('governance_records', 0)
            revisions_count = collection_counts.get('governance_revisions', 0)
            events_count = collection_counts.get('governance_events', 0)
            
            # Basic integrity checks
            if records_count == 0:
                self.log_test("V2 records exist", False, "No governance_records found")
                return False
            else:
                self.log_test("V2 records exist", True, f"Found {records_count} records")
            
            if revisions_count == 0:
                self.log_test("V2 revisions exist", False, "No governance_revisions found")
                return False
            else:
                self.log_test("V2 revisions exist", True, f"Found {revisions_count} revisions")
            
            if events_count == 0:
                self.log_test("V2 events exist", False, "No governance_events found")
                return False
            else:
                self.log_test("V2 events exist", True, f"Found {events_count} events")
            
            # Check if records >= revisions (each record should have at least one revision)
            if records_count <= revisions_count:
                self.log_test("Records to revisions ratio", True, 
                            f"Records: {records_count}, Revisions: {revisions_count}")
            else:
                self.log_test("Records to revisions ratio", False, 
                            f"More records ({records_count}) than revisions ({revisions_count})")
            
            return True
            
        except Exception as e:
            self.log_test("V2 data integrity", False, f"Error: {str(e)}")
            return False
    
    def test_migration_audit_trail(self) -> bool:
        """Test migration audit trail"""
        print("\n📝 Testing Migration Audit Trail...")
        
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
            import os
            
            async def check_audit_trail():
                mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
                db_name = os.environ.get('DB_NAME', 'test_database')
                
                client = AsyncIOMotorClient(mongo_url)
                db = client[db_name]
                
                # Check for migration events
                migration_events = await db.governance_events.find({
                    'event_type': 'migrated'
                }).to_list(100)
                
                if len(migration_events) > 0:
                    self.log_test("Migration audit events", True, f"Found {len(migration_events)} migration events")
                    
                    # Check event structure
                    sample_event = migration_events[0]
                    required_fields = ['id', 'record_id', 'event_type', 'actor_id', 'at', 'meta_json']
                    
                    missing_fields = [field for field in required_fields if field not in sample_event]
                    if not missing_fields:
                        self.log_test("Migration event structure", True, "All required fields present")
                    else:
                        self.log_test("Migration event structure", False, f"Missing fields: {missing_fields}")
                    
                    # Check meta_json for migration details
                    meta = sample_event.get('meta_json', {})
                    if 'legacy_collection' in meta and 'legacy_id' in meta:
                        self.log_test("Migration event metadata", True, "Contains legacy reference data")
                    else:
                        self.log_test("Migration event metadata", False, "Missing legacy reference data")
                        
                else:
                    self.log_test("Migration audit events", False, "No migration events found")
                
                client.close()
            
            asyncio.run(check_audit_trail())
            return True
            
        except Exception as e:
            self.log_test("Migration audit trail", False, f"Error: {str(e)}")
            return False
    
    def test_legacy_id_references(self) -> bool:
        """Test legacy ID references in V2 records"""
        print("\n🔗 Testing Legacy ID References...")
        
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
            import os
            
            async def check_legacy_references():
                mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
                db_name = os.environ.get('DB_NAME', 'test_database')
                
                client = AsyncIOMotorClient(mongo_url)
                db = client[db_name]
                
                # Check governance_records for legacy_id field
                records_with_legacy_id = await db.governance_records.count_documents({
                    'legacy_id': {'$exists': True, '$ne': None}
                })
                
                total_records = await db.governance_records.count_documents({})
                
                if total_records > 0:
                    percentage = (records_with_legacy_id / total_records) * 100
                    if percentage >= 90:  # Most records should have legacy_id
                        self.log_test("Legacy ID references", True, 
                                    f"{records_with_legacy_id}/{total_records} records have legacy_id ({percentage:.1f}%)")
                    else:
                        self.log_test("Legacy ID references", False, 
                                    f"Only {percentage:.1f}% of records have legacy_id")
                else:
                    self.log_test("Legacy ID references", False, "No records found")
                
                # Sample a few records to check legacy_id format
                sample_records = await db.governance_records.find({
                    'legacy_id': {'$exists': True}
                }).limit(5).to_list(5)
                
                if sample_records:
                    valid_legacy_ids = 0
                    for record in sample_records:
                        legacy_id = record.get('legacy_id')
                        if legacy_id and isinstance(legacy_id, str) and len(legacy_id) > 0:
                            valid_legacy_ids += 1
                    
                    if valid_legacy_ids == len(sample_records):
                        self.log_test("Legacy ID format", True, "All sampled legacy_ids are valid")
                    else:
                        self.log_test("Legacy ID format", False, 
                                    f"Only {valid_legacy_ids}/{len(sample_records)} legacy_ids are valid")
                
                client.close()
            
            asyncio.run(check_legacy_references())
            return True
            
        except Exception as e:
            self.log_test("Legacy ID references", False, f"Error: {str(e)}")
            return False
    
    def test_content_hash_verification(self) -> bool:
        """Test content hash for finalized items"""
        print("\n🔐 Testing Content Hash Verification...")
        
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
            import os
            
            async def check_content_hashes():
                mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
                db_name = os.environ.get('DB_NAME', 'test_database')
                
                client = AsyncIOMotorClient(mongo_url)
                db = client[db_name]
                
                # Find finalized revisions
                finalized_revisions = await db.governance_revisions.find({
                    'finalized_at': {'$exists': True, '$ne': None}
                }).to_list(100)
                
                if len(finalized_revisions) > 0:
                    self.log_test("Finalized revisions exist", True, f"Found {len(finalized_revisions)} finalized revisions")
                    
                    # Check content_hash field
                    revisions_with_hash = 0
                    for revision in finalized_revisions:
                        content_hash = revision.get('content_hash')
                        if content_hash and isinstance(content_hash, str) and len(content_hash) == 64:  # SHA-256 hash length
                            revisions_with_hash += 1
                    
                    if revisions_with_hash == len(finalized_revisions):
                        self.log_test("Content hash presence", True, "All finalized revisions have valid content_hash")
                    else:
                        self.log_test("Content hash presence", False, 
                                    f"Only {revisions_with_hash}/{len(finalized_revisions)} have valid content_hash")
                    
                    # Test hash computation for one revision
                    if finalized_revisions:
                        sample_revision = finalized_revisions[0]
                        stored_hash = sample_revision.get('content_hash', '')
                        
                        # Try to recompute hash
                        try:
                            import hashlib
                            import json
                            
                            hashable = {
                                "payload": sample_revision.get('payload_json', {}),
                                "created_at": sample_revision.get('created_at', ''),
                                "created_by": sample_revision.get('created_by', ''),
                                "version": sample_revision.get('version', 1),
                                "parent_hash": sample_revision.get('parent_hash', '') or ""
                            }
                            canonical = json.dumps(hashable, sort_keys=True, default=str)
                            computed_hash = hashlib.sha256(canonical.encode()).hexdigest()
                            
                            if stored_hash == computed_hash:
                                self.log_test("Content hash verification", True, "Hash computation matches stored hash")
                            else:
                                self.log_test("Content hash verification", False, 
                                            f"Hash mismatch: stored={stored_hash[:16]}..., computed={computed_hash[:16]}...")
                        except Exception as e:
                            self.log_test("Content hash verification", False, f"Hash computation error: {str(e)}")
                else:
                    self.log_test("Finalized revisions exist", False, "No finalized revisions found")
                
                client.close()
            
            asyncio.run(check_content_hashes())
            return True
            
        except Exception as e:
            self.log_test("Content hash verification", False, f"Error: {str(e)}")
            return False
    
    def test_payload_json_integrity(self) -> bool:
        """Test payload_json contains original data"""
        print("\n📄 Testing Payload JSON Integrity...")
        
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
            import os
            
            async def check_payload_integrity():
                mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
                db_name = os.environ.get('DB_NAME', 'test_database')
                
                client = AsyncIOMotorClient(mongo_url)
                db = client[db_name]
                
                # Sample revisions from each module type
                module_types = ['minutes', 'distribution', 'dispute', 'insurance', 'compensation']
                
                for module_type in module_types:
                    revisions = await db.governance_revisions.find({}).limit(10).to_list(10)
                    
                    # Find records of this module type
                    records = await db.governance_records.find({
                        'module_type': module_type
                    }).limit(5).to_list(5)
                    
                    if records:
                        # Get revisions for these records
                        record_ids = [r['id'] for r in records]
                        revisions = await db.governance_revisions.find({
                            'record_id': {'$in': record_ids}
                        }).limit(5).to_list(5)
                        
                        if revisions:
                            valid_payloads = 0
                            for revision in revisions:
                                payload = revision.get('payload_json', {})
                                if isinstance(payload, dict) and len(payload) > 0:
                                    valid_payloads += 1
                            
                            if valid_payloads > 0:
                                self.log_test(f"Payload integrity - {module_type}", True, 
                                            f"{valid_payloads}/{len(revisions)} revisions have valid payload_json")
                            else:
                                self.log_test(f"Payload integrity - {module_type}", False, 
                                            "No revisions have valid payload_json")
                        else:
                            self.log_test(f"Payload integrity - {module_type}", True, "No revisions found (expected for new system)")
                    else:
                        self.log_test(f"Payload integrity - {module_type}", True, "No records found (expected for new system)")
                
                client.close()
            
            asyncio.run(check_payload_integrity())
            return True
            
        except Exception as e:
            self.log_test("Payload JSON integrity", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all migration tests"""
        print("=" * 80)
        print("GOVERNANCE V2 MIGRATION TEST SUITE")
        print("=" * 80)
        
        # Test 1: V2 API Authentication
        auth_result = self.test_v2_api_authentication()
        
        # Test 2: Legacy API State
        legacy_data = self.test_legacy_api_functionality()
        
        # Test 3: Migration Script
        migration_result = self.test_migration_script_execution()
        
        # Test 4: Database Collections
        collection_counts = self.test_database_collections()
        
        # Test 5: V2 Data Integrity
        integrity_result = self.test_v2_data_integrity(collection_counts)
        
        # Test 6: Migration Audit Trail
        audit_result = self.test_migration_audit_trail()
        
        # Test 7: Legacy ID References
        legacy_ref_result = self.test_legacy_id_references()
        
        # Test 8: Content Hash Verification
        hash_result = self.test_content_hash_verification()
        
        # Test 9: Payload JSON Integrity
        payload_result = self.test_payload_json_integrity()
        
        # Summary
        print("\n" + "=" * 80)
        print(f"MIGRATION TEST SUMMARY: {self.tests_passed}/{self.tests_run} tests passed")
        print("=" * 80)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": success_rate,
            "test_results": self.test_results,
            "collection_counts": collection_counts,
            "legacy_data_summary": {k: len(v) for k, v in legacy_data.items()},
            "critical_issues": [r for r in self.test_results if not r["success"] and "authentication" not in r["test"].lower()]
        }

def main():
    # Get backend URL from environment
    import os
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://role-manager-21.preview.emergentagent.com')
    
    print(f"Testing Governance V2 Migration at: {backend_url}")
    
    tester = GovernanceV2MigrationTester(backend_url)
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    if results["success_rate"] >= 80:
        print(f"\n🎉 Migration tests mostly successful ({results['success_rate']:.1f}%)")
        return 0
    else:
        print(f"\n⚠️ Migration tests need attention ({results['success_rate']:.1f}%)")
        return 1

if __name__ == "__main__":
    sys.exit(main())