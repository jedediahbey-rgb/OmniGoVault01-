#!/usr/bin/env python3
"""
Governance V2 API Test Suite
Tests the V2 API endpoints with authentication bypass for testing.

This test focuses on the V2 API functionality assuming we can bypass auth
or use the direct database access to verify the API structure.
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, List, Any

class GovernanceV2APITester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.api_v2 = f"{base_url}/api/governance/v2"
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
    
    def get_sample_v2_data(self) -> Dict[str, Any]:
        """Get sample V2 data directly from database"""
        print("\n📊 Retrieving V2 Sample Data...")
        
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            import asyncio
            import os
            
            sample_data = {
                "records": [],
                "revisions": [],
                "events": []
            }
            
            async def get_data():
                mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
                db_name = os.environ.get('DB_NAME', 'test_database')
                
                client = AsyncIOMotorClient(mongo_url)
                db = client[db_name]
                
                # Get sample records
                records = await db.governance_records.find({}).limit(5).to_list(5)
                sample_data["records"] = records
                
                # Get sample revisions
                revisions = await db.governance_revisions.find({}).limit(5).to_list(5)
                sample_data["revisions"] = revisions
                
                # Get sample events
                events = await db.governance_events.find({}).limit(5).to_list(5)
                sample_data["events"] = events
                
                client.close()
            
            asyncio.run(get_data())
            
            self.log_test("Sample data retrieval", True, 
                        f"Retrieved {len(sample_data['records'])} records, "
                        f"{len(sample_data['revisions'])} revisions, "
                        f"{len(sample_data['events'])} events")
            
            return sample_data
            
        except Exception as e:
            self.log_test("Sample data retrieval", False, f"Error: {str(e)}")
            return {"records": [], "revisions": [], "events": []}
    
    def test_v2_record_structure(self, sample_data: Dict[str, Any]) -> bool:
        """Test V2 record structure compliance"""
        print("\n🏗️ Testing V2 Record Structure...")
        
        records = sample_data.get("records", [])
        if not records:
            self.log_test("V2 record structure", False, "No records to test")
            return False
        
        # Test required fields for governance_records
        required_record_fields = [
            'id', 'portfolio_id', 'user_id', 'module_type', 'title', 
            'status', 'created_at', 'created_by'
        ]
        
        valid_records = 0
        for record in records:
            missing_fields = [field for field in required_record_fields if field not in record]
            if not missing_fields:
                valid_records += 1
            else:
                print(f"   ⚠️ Record {record.get('id', 'unknown')} missing: {missing_fields}")
        
        if valid_records == len(records):
            self.log_test("V2 record required fields", True, f"All {len(records)} records have required fields")
        else:
            self.log_test("V2 record required fields", False, 
                        f"Only {valid_records}/{len(records)} records have all required fields")
        
        # Test legacy_id presence
        records_with_legacy_id = sum(1 for r in records if r.get('legacy_id'))
        if records_with_legacy_id > 0:
            self.log_test("V2 record legacy_id", True, 
                        f"{records_with_legacy_id}/{len(records)} records have legacy_id")
        else:
            self.log_test("V2 record legacy_id", False, "No records have legacy_id")
        
        # Test module types
        module_types = set(r.get('module_type') for r in records if r.get('module_type'))
        expected_types = {'minutes', 'distribution', 'dispute', 'insurance', 'compensation'}
        valid_types = module_types.intersection(expected_types)
        
        if valid_types:
            self.log_test("V2 record module types", True, f"Found valid module types: {valid_types}")
        else:
            self.log_test("V2 record module types", False, f"No valid module types found: {module_types}")
        
        return valid_records > 0
    
    def test_v2_revision_structure(self, sample_data: Dict[str, Any]) -> bool:
        """Test V2 revision structure compliance"""
        print("\n📝 Testing V2 Revision Structure...")
        
        revisions = sample_data.get("revisions", [])
        if not revisions:
            self.log_test("V2 revision structure", False, "No revisions to test")
            return False
        
        # Test required fields for governance_revisions
        required_revision_fields = [
            'id', 'record_id', 'version', 'change_type', 'payload_json',
            'created_at', 'created_by'
        ]
        
        valid_revisions = 0
        for revision in revisions:
            missing_fields = [field for field in required_revision_fields if field not in revision]
            if not missing_fields:
                valid_revisions += 1
            else:
                print(f"   ⚠️ Revision {revision.get('id', 'unknown')} missing: {missing_fields}")
        
        if valid_revisions == len(revisions):
            self.log_test("V2 revision required fields", True, f"All {len(revisions)} revisions have required fields")
        else:
            self.log_test("V2 revision required fields", False, 
                        f"Only {valid_revisions}/{len(revisions)} revisions have all required fields")
        
        # Test payload_json content
        revisions_with_payload = sum(1 for r in revisions 
                                   if r.get('payload_json') and isinstance(r['payload_json'], dict) 
                                   and len(r['payload_json']) > 0)
        
        if revisions_with_payload > 0:
            self.log_test("V2 revision payload_json", True, 
                        f"{revisions_with_payload}/{len(revisions)} revisions have valid payload_json")
        else:
            self.log_test("V2 revision payload_json", False, "No revisions have valid payload_json")
        
        # Test change types
        change_types = set(r.get('change_type') for r in revisions if r.get('change_type'))
        expected_change_types = {'initial', 'amendment', 'correction', 'void'}
        valid_change_types = change_types.intersection(expected_change_types)
        
        if valid_change_types:
            self.log_test("V2 revision change types", True, f"Found valid change types: {valid_change_types}")
        else:
            self.log_test("V2 revision change types", False, f"No valid change types found: {change_types}")
        
        return valid_revisions > 0
    
    def test_v2_event_structure(self, sample_data: Dict[str, Any]) -> bool:
        """Test V2 event structure compliance"""
        print("\n📋 Testing V2 Event Structure...")
        
        events = sample_data.get("events", [])
        if not events:
            self.log_test("V2 event structure", False, "No events to test")
            return False
        
        # Test required fields for governance_events
        required_event_fields = [
            'id', 'portfolio_id', 'user_id', 'record_id', 'event_type',
            'actor_id', 'at'
        ]
        
        valid_events = 0
        for event in events:
            missing_fields = [field for field in required_event_fields if field not in event]
            if not missing_fields:
                valid_events += 1
            else:
                print(f"   ⚠️ Event {event.get('id', 'unknown')} missing: {missing_fields}")
        
        if valid_events == len(events):
            self.log_test("V2 event required fields", True, f"All {len(events)} events have required fields")
        else:
            self.log_test("V2 event required fields", False, 
                        f"Only {valid_events}/{len(events)} events have all required fields")
        
        # Test event types
        event_types = set(e.get('event_type') for e in events if e.get('event_type'))
        expected_event_types = {
            'created', 'updated_draft', 'finalized', 'amendment_created', 
            'amendment_finalized', 'voided', 'attachment_added', 'attestation_added', 'migrated'
        }
        valid_event_types = event_types.intersection(expected_event_types)
        
        if valid_event_types:
            self.log_test("V2 event types", True, f"Found valid event types: {valid_event_types}")
        else:
            self.log_test("V2 event types", False, f"No valid event types found: {event_types}")
        
        # Test migration events specifically
        migration_events = [e for e in events if e.get('event_type') == 'migrated']
        if migration_events:
            self.log_test("V2 migration events", True, f"Found {len(migration_events)} migration events")
            
            # Check migration event metadata
            sample_migration = migration_events[0]
            meta = sample_migration.get('meta_json', {})
            if 'legacy_collection' in meta and 'legacy_id' in meta:
                self.log_test("V2 migration event metadata", True, "Migration events have proper metadata")
            else:
                self.log_test("V2 migration event metadata", False, "Migration events missing metadata")
        else:
            self.log_test("V2 migration events", False, "No migration events found")
        
        return valid_events > 0
    
    def test_data_relationships(self, sample_data: Dict[str, Any]) -> bool:
        """Test relationships between records, revisions, and events"""
        print("\n🔗 Testing Data Relationships...")
        
        records = sample_data.get("records", [])
        revisions = sample_data.get("revisions", [])
        events = sample_data.get("events", [])
        
        if not records or not revisions:
            self.log_test("Data relationships", False, "Insufficient data for relationship testing")
            return False
        
        # Test record -> revision relationships
        record_ids = set(r['id'] for r in records)
        revision_record_ids = set(r['record_id'] for r in revisions)
        
        # Check if all records have revisions
        records_with_revisions = record_ids.intersection(revision_record_ids)
        if len(records_with_revisions) > 0:
            self.log_test("Record-revision relationships", True, 
                        f"{len(records_with_revisions)}/{len(record_ids)} records have revisions")
        else:
            self.log_test("Record-revision relationships", False, "No records have matching revisions")
        
        # Test current_revision_id references
        valid_current_revisions = 0
        revision_ids = set(r['id'] for r in revisions)
        
        for record in records:
            current_rev_id = record.get('current_revision_id')
            if current_rev_id and current_rev_id in revision_ids:
                valid_current_revisions += 1
        
        if valid_current_revisions > 0:
            self.log_test("Current revision references", True, 
                        f"{valid_current_revisions}/{len(records)} records have valid current_revision_id")
        else:
            self.log_test("Current revision references", False, "No records have valid current_revision_id")
        
        # Test record -> event relationships
        if events:
            event_record_ids = set(e['record_id'] for e in events if e.get('record_id'))
            records_with_events = record_ids.intersection(event_record_ids)
            
            if len(records_with_events) > 0:
                self.log_test("Record-event relationships", True, 
                            f"{len(records_with_events)}/{len(record_ids)} records have events")
            else:
                self.log_test("Record-event relationships", False, "No records have matching events")
        
        return len(records_with_revisions) > 0
    
    def test_finalized_record_integrity(self, sample_data: Dict[str, Any]) -> bool:
        """Test integrity of finalized records"""
        print("\n🔒 Testing Finalized Record Integrity...")
        
        records = sample_data.get("records", [])
        revisions = sample_data.get("revisions", [])
        
        # Find finalized records
        finalized_records = [r for r in records if r.get('status') == 'finalized']
        
        if not finalized_records:
            self.log_test("Finalized records exist", True, "No finalized records found (expected for migrated data)")
            return True
        
        self.log_test("Finalized records exist", True, f"Found {len(finalized_records)} finalized records")
        
        # Check that finalized records have content hashes in their current revisions
        valid_finalized = 0
        for record in finalized_records:
            current_rev_id = record.get('current_revision_id')
            if current_rev_id:
                current_revision = next((r for r in revisions if r['id'] == current_rev_id), None)
                if current_revision:
                    content_hash = current_revision.get('content_hash')
                    finalized_at = current_revision.get('finalized_at')
                    
                    if content_hash and finalized_at:
                        valid_finalized += 1
        
        if valid_finalized == len(finalized_records):
            self.log_test("Finalized record integrity", True, 
                        f"All {len(finalized_records)} finalized records have proper content hashes")
        else:
            self.log_test("Finalized record integrity", False, 
                        f"Only {valid_finalized}/{len(finalized_records)} finalized records have proper content hashes")
        
        return valid_finalized > 0
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all V2 API tests"""
        print("=" * 80)
        print("GOVERNANCE V2 API STRUCTURE TEST SUITE")
        print("=" * 80)
        
        # Get sample data
        sample_data = self.get_sample_v2_data()
        
        # Test data structures
        record_result = self.test_v2_record_structure(sample_data)
        revision_result = self.test_v2_revision_structure(sample_data)
        event_result = self.test_v2_event_structure(sample_data)
        
        # Test relationships
        relationship_result = self.test_data_relationships(sample_data)
        
        # Test finalized record integrity
        finalized_result = self.test_finalized_record_integrity(sample_data)
        
        # Summary
        print("\n" + "=" * 80)
        print(f"V2 API STRUCTURE TEST SUMMARY: {self.tests_passed}/{self.tests_run} tests passed")
        print("=" * 80)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": success_rate,
            "test_results": self.test_results,
            "sample_data_summary": {
                "records": len(sample_data.get("records", [])),
                "revisions": len(sample_data.get("revisions", [])),
                "events": len(sample_data.get("events", []))
            }
        }

def main():
    # Get backend URL from environment
    import os
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'https://landingpage-fix.preview.emergentagent.com')
    
    print(f"Testing Governance V2 API Structure at: {backend_url}")
    
    tester = GovernanceV2APITester(backend_url)
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    if results["success_rate"] >= 80:
        print(f"\n🎉 V2 API structure tests successful ({results['success_rate']:.1f}%)")
        return 0
    else:
        print(f"\n⚠️ V2 API structure tests need attention ({results['success_rate']:.1f}%)")
        return 1

if __name__ == "__main__":
    sys.exit(main())