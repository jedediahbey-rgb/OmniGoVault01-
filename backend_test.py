#!/usr/bin/env python3
"""
Backend API Testing for Data Integrity & Diagnostics System
Tests the integrity scan and repair endpoints for Phase 1 implementation.
"""

import requests
import json
import sys
from datetime import datetime
import time

# Use the public endpoint from frontend/.env
BASE_URL = "https://recordhealth.preview.emergentagent.com/api"

class GovernanceV2Tester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'GovernanceV2-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.created_records = []  # Track for cleanup

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def test_endpoint(self, method, endpoint, expected_status, data=None, description=""):
        """Test a single API endpoint"""
        url = f"{self.base_url}{endpoint}"
        self.tests_run += 1
        
        self.log(f"Testing: {description or f'{method} {endpoint}'}")
        
        try:
            if method == 'GET':
                response = self.session.get(url)
            elif method == 'POST':
                response = self.session.post(url, json=data)
            elif method == 'PUT':
                response = self.session.put(url, json=data)
            elif method == 'DELETE':
                response = self.session.delete(url)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASS - Status: {response.status_code}")
                try:
                    return response.json()
                except:
                    return {"status_code": response.status_code}
            else:
                self.log(f"❌ FAIL - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    self.log(f"   Error: {error_data}")
                except:
                    self.log(f"   Response: {response.text[:200]}")
                return None
                
        except Exception as e:
            self.log(f"❌ FAIL - Exception: {str(e)}")
            return None

    def create_test_record(self, module_type, title_suffix=""):
        """Create a test record for amendment testing"""
        test_data = {
            "trust_id": "test_trust_001",
            "portfolio_id": "test_portfolio_001", 
            "module_type": module_type,
            "title": f"Test {module_type.title()} Record{title_suffix}",
            "payload_json": self.get_test_payload(module_type)
        }
        
        result = self.test_endpoint(
            'POST', 
            '/governance/v2/records',
            200,
            test_data,
            f"Create {module_type} record"
        )
        
        if result and result.get('ok'):
            record_id = result['data']['record']['id']
            self.created_records.append(record_id)
            return record_id
        return None

    def get_test_payload(self, module_type):
        """Get appropriate test payload for each module type"""
        payloads = {
            "minutes": {
                "meeting_type": "regular",
                "date_time": "2024-01-15T10:00:00Z",
                "location": "Conference Room A",
                "called_by": "John Trustee",
                "agenda_items": [],
                "attendees": [],
                "notes": "Test meeting minutes"
            },
            "distribution": {
                "distribution_type": "regular",
                "description": "Test distribution",
                "total_amount": 10000.00,
                "currency": "USD",
                "asset_type": "cash",
                "scheduled_date": "2024-02-01",
                "recipients": []
            },
            "dispute": {
                "dispute_type": "beneficiary",
                "description": "Test dispute case",
                "case_number": "CASE-2024-001",
                "jurisdiction": "State Court",
                "amount_claimed": 5000.00,
                "currency": "USD",
                "priority": "medium",
                "parties": [],
                "events": []
            },
            "insurance": {
                "policy_type": "whole_life",
                "policy_number": "POL-2024-001",
                "carrier_name": "Test Insurance Co",
                "insured_name": "John Doe",
                "death_benefit": 100000.00,
                "cash_value": 5000.00,
                "currency": "USD",
                "premium_amount": 500.00,
                "premium_frequency": "monthly",
                "policy_state": "pending",
                "beneficiaries": []
            },
            "compensation": {
                "compensation_type": "annual_fee",
                "recipient_name": "Jane Trustee",
                "recipient_role": "trustee",
                "amount": 2500.00,
                "currency": "USD",
                "fiscal_year": "2024",
                "basis_of_calculation": "Fixed annual fee for trustee services"
            }
        }
        return payloads.get(module_type, {})

    def test_amendment_workflow(self, module_type):
        """Test complete amendment workflow for a module type"""
        self.log(f"\n=== Testing Amendment Workflow for {module_type.upper()} ===")
        
        # 1. Create a test record
        record_id = self.create_test_record(module_type, f" for Amendment Test")
        if not record_id:
            self.log(f"❌ Failed to create {module_type} record")
            return False
        
        # 2. Finalize the record (required for amendments)
        finalize_result = self.test_endpoint(
            'POST',
            f'/governance/v2/records/{record_id}/finalize',
            200,
            {},
            f"Finalize {module_type} record"
        )
        
        if not finalize_result or not finalize_result.get('ok'):
            self.log(f"❌ Failed to finalize {module_type} record")
            return False
        
        # 3. Create amendment
        amendment_data = {
            "change_reason": f"Test amendment for {module_type} record - updating for compliance",
            "change_type": "amendment",
            "effective_at": "2024-02-01T00:00:00Z"
        }
        
        amend_result = self.test_endpoint(
            'POST',
            f'/governance/v2/records/{record_id}/amend',
            200,
            amendment_data,
            f"Create amendment for {module_type} record"
        )
        
        if not amend_result or not amend_result.get('ok'):
            self.log(f"❌ Failed to create amendment for {module_type} record")
            return False
        
        # 4. Verify revision history
        revisions_result = self.test_endpoint(
            'GET',
            f'/governance/v2/records/{record_id}/revisions',
            200,
            None,
            f"Get revision history for {module_type} record"
        )
        
        if not revisions_result or not revisions_result.get('ok'):
            self.log(f"❌ Failed to get revision history for {module_type} record")
            return False
        
        revisions = revisions_result.get('data', {}).get('revisions', [])
        if len(revisions) < 2:
            self.log(f"❌ Expected at least 2 revisions, got {len(revisions)}")
            return False
        
        self.log(f"✅ Amendment workflow completed for {module_type} - {len(revisions)} revisions found")
        return True

    def test_revision_history_endpoint(self):
        """Test the revision history endpoint specifically"""
        self.log("\n=== Testing Revision History Endpoint ===")
        
        # Create and amend a record
        record_id = self.create_test_record("minutes", " for Revision History Test")
        if not record_id:
            return False
        
        # Finalize
        self.test_endpoint('POST', f'/governance/v2/records/{record_id}/finalize', 200, {})
        
        # Create amendment
        self.test_endpoint(
            'POST', 
            f'/governance/v2/records/{record_id}/amend',
            200,
            {"change_reason": "Test revision history", "change_type": "amendment"}
        )
        
        # Test revision history endpoint
        result = self.test_endpoint(
            'GET',
            f'/governance/v2/records/{record_id}/revisions',
            200,
            None,
            "Get detailed revision history"
        )
        
        if result and result.get('ok'):
            revisions = result.get('data', {}).get('revisions', [])
            self.log(f"✅ Found {len(revisions)} revisions in history")
            
            # Verify revision structure
            for rev in revisions:
                required_fields = ['id', 'version', 'change_type', 'created_at']
                missing_fields = [field for field in required_fields if field not in rev]
                if missing_fields:
                    self.log(f"❌ Revision missing fields: {missing_fields}")
                    return False
            
            self.log("✅ All revisions have required fields")
            return True
        
        return False

    def test_amendment_stays_on_page(self):
        """Test that amendment creation doesn't navigate away (API behavior)"""
        self.log("\n=== Testing Amendment API Response ===")
        
        record_id = self.create_test_record("distribution", " for Navigation Test")
        if not record_id:
            return False
        
        # Finalize
        self.test_endpoint('POST', f'/governance/v2/records/{record_id}/finalize', 200, {})
        
        # Create amendment and verify response structure
        amendment_data = {
            "change_reason": "Testing API response structure",
            "change_type": "amendment"
        }
        
        result = self.test_endpoint(
            'POST',
            f'/governance/v2/records/{record_id}/amend',
            200,
            amendment_data,
            "Test amendment API response"
        )
        
        if result and result.get('ok'):
            # Verify response contains necessary data for staying on page
            data = result.get('data', {})
            required_fields = ['record_id', 'revision_id', 'version']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log(f"❌ Amendment response missing fields: {missing_fields}")
                return False
            
            self.log("✅ Amendment response contains all required fields for page refresh")
            return True
        
        return False

    def cleanup_test_records(self):
        """Clean up created test records"""
        self.log(f"\n=== Cleaning up {len(self.created_records)} test records ===")
        
        for record_id in self.created_records:
            try:
                self.test_endpoint(
                    'POST',
                    f'/governance/v2/records/{record_id}/void',
                    200,
                    {"void_reason": "Test cleanup"},
                    f"Cleanup record {record_id}"
                )
            except Exception as e:
                self.log(f"Warning: Failed to cleanup record {record_id}: {e}")

    def run_all_tests(self):
        """Run all amendment system tests"""
        self.log("🚀 Starting Governance V2 Amendment System Tests")
        self.log(f"Testing against: {self.base_url}")
        
        # Test amendment workflow for all 5 editor pages
        module_types = ["minutes", "distribution", "dispute", "insurance", "compensation"]
        
        for module_type in module_types:
            success = self.test_amendment_workflow(module_type)
            if not success:
                self.log(f"❌ Amendment workflow failed for {module_type}")
        
        # Test specific endpoints
        self.test_revision_history_endpoint()
        self.test_amendment_stays_on_page()
        
        # Cleanup
        self.cleanup_test_records()
        
        # Summary
        self.log(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = GovernanceV2Tester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())