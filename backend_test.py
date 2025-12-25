#!/usr/bin/env python3
"""
Backend API Testing for Smart Trust Score Rules Editor & Governance Compliance Checklists
Tests all configuration APIs for health rules and checklists.
"""

import requests
import json
import sys
from datetime import datetime
import time

# Use the public endpoint from frontend/.env
BASE_URL = "https://trustscore-manager.preview.emergentagent.com/api"

class ConfigAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'DataIntegrity-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.scan_result = None  # Store scan result for testing

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
                if data:
                    response = self.session.delete(url, json=data)
                else:
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

    def test_integrity_scan(self):
        """Test POST /api/integrity/scan endpoint"""
        self.log("\n=== Testing Integrity Scan Endpoint ===")
        
        result = self.test_endpoint(
            'POST',
            '/integrity/scan',
            200,
            {},
            "Run integrity scan"
        )
        
        if result and result.get('ok'):
            self.scan_result = result.get('data', {})
            
            # Verify scan result structure
            required_fields = [
                'scan_id', 'started_at', 'completed_at', 
                'total_records_scanned', 'total_issues_found',
                'issues_by_severity', 'issues'
            ]
            
            missing_fields = [field for field in required_fields if field not in self.scan_result]
            if missing_fields:
                self.log(f"❌ Scan result missing fields: {missing_fields}")
                return False
            
            self.log(f"✅ Scan completed - {self.scan_result['total_records_scanned']} records scanned")
            self.log(f"✅ Found {self.scan_result['total_issues_found']} issues")
            
            # Log issues by severity
            for severity, count in self.scan_result.get('issues_by_severity', {}).items():
                if count > 0:
                    self.log(f"   {severity}: {count} issues")
            
            return True
        
        return False

    def test_delete_single_record(self):
        """Test DELETE /api/integrity/records/{record_id} endpoint"""
        self.log("\n=== Testing Single Record Deletion ===")
        
        if not self.scan_result or not self.scan_result.get('issues'):
            self.log("❌ No scan result or issues available for testing deletion")
            return False
        
        # Find a fixable issue (missing_fk type)
        fixable_issue = None
        for issue in self.scan_result['issues']:
            if issue.get('issue_type') == 'missing_fk':
                fixable_issue = issue
                break
        
        if not fixable_issue:
            self.log("ℹ️  No fixable issues found for deletion test")
            return True  # Not a failure, just no data to test with
        
        record_id = fixable_issue['record_id']
        
        result = self.test_endpoint(
            'DELETE',
            f'/integrity/records/{record_id}',
            200,
            None,
            f"Delete orphaned record {record_id}"
        )
        
        if result and result.get('ok'):
            self.log(f"✅ Successfully deleted record {record_id}")
            return True
        
        return False

    def test_bulk_delete_records(self):
        """Test DELETE /api/integrity/records/bulk endpoint"""
        self.log("\n=== Testing Bulk Record Deletion ===")
        
        if not self.scan_result or not self.scan_result.get('issues'):
            self.log("❌ No scan result or issues available for testing bulk deletion")
            return False
        
        # Find fixable issues for bulk deletion
        fixable_record_ids = []
        for issue in self.scan_result['issues']:
            if issue.get('issue_type') == 'missing_fk' and len(fixable_record_ids) < 3:
                fixable_record_ids.append(issue['record_id'])
        
        if not fixable_record_ids:
            self.log("ℹ️  No fixable issues found for bulk deletion test")
            return True  # Not a failure, just no data to test with
        
        bulk_data = {
            "record_ids": fixable_record_ids
        }
        
        result = self.test_endpoint(
            'DELETE',
            '/integrity/records/bulk',
            200,
            bulk_data,
            f"Bulk delete {len(fixable_record_ids)} orphaned records"
        )
        
        if result and result.get('ok'):
            deleted_count = result.get('data', {}).get('deleted_count', 0)
            self.log(f"✅ Successfully deleted {deleted_count} records")
            return True
        
        return False

    def test_scan_history(self):
        """Test GET /api/integrity/scans endpoint"""
        self.log("\n=== Testing Scan History Endpoint ===")
        
        result = self.test_endpoint(
            'GET',
            '/integrity/scans',
            200,
            None,
            "Get scan history"
        )
        
        if result and result.get('ok'):
            scans = result.get('data', {}).get('scans', [])
            self.log(f"✅ Found {len(scans)} previous scans")
            
            # Verify scan summary structure
            if scans:
                scan = scans[0]
                required_fields = ['scan_id', 'started_at', 'total_records_scanned', 'total_issues_found']
                missing_fields = [field for field in required_fields if field not in scan]
                if missing_fields:
                    self.log(f"❌ Scan summary missing fields: {missing_fields}")
                    return False
            
            return True
        
        return False

    def test_specific_scan_result(self):
        """Test GET /api/integrity/scans/{scan_id} endpoint"""
        self.log("\n=== Testing Specific Scan Result Endpoint ===")
        
        if not self.scan_result or not self.scan_result.get('scan_id'):
            self.log("❌ No scan result available for testing specific scan endpoint")
            return False
        
        scan_id = self.scan_result['scan_id']
        
        result = self.test_endpoint(
            'GET',
            f'/integrity/scans/{scan_id}',
            200,
            None,
            f"Get specific scan result {scan_id}"
        )
        
        if result and result.get('ok'):
            scan_data = result.get('data', {})
            if scan_data.get('scan_id') == scan_id:
                self.log(f"✅ Successfully retrieved scan {scan_id}")
                return True
            else:
                self.log(f"❌ Scan ID mismatch: expected {scan_id}, got {scan_data.get('scan_id')}")
        
        return False

    def test_lifecycle_validation(self):
        """Test lifecycle validation endpoints"""
        self.log("\n=== Testing Lifecycle Validation Endpoints ===")
        
        # Test derive operational status endpoint
        result = self.test_endpoint(
            'GET',
            '/integrity/lifecycle/derive-status?module_type=minutes&lifecycle_status=draft',
            200,
            None,
            "Test derive operational status"
        )
        
        if result and result.get('ok'):
            derived_status = result.get('data', {}).get('derived_operational_status')
            self.log(f"✅ Derived status: {derived_status}")
            return True
        
        return False

    def run_all_tests(self):
        """Run all data integrity system tests"""
        self.log("🚀 Starting Data Integrity & Diagnostics System Tests")
        self.log(f"Testing against: {self.base_url}")
        
        # Test core integrity endpoints
        tests = [
            self.test_integrity_scan,
            self.test_scan_history,
            self.test_specific_scan_result,
            self.test_delete_single_record,
            self.test_bulk_delete_records,
            self.test_lifecycle_validation
        ]
        
        for test in tests:
            try:
                success = test()
                if not success:
                    self.log(f"❌ Test failed: {test.__name__}")
            except Exception as e:
                self.log(f"❌ Test error in {test.__name__}: {str(e)}")
        
        # Summary
        self.log(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = DataIntegrityTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())