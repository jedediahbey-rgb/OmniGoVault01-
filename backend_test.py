#!/usr/bin/env python3
"""
Backend API Testing for Trust Management Application
Testing Phase 5 Features: Gaps Analysis & Integrity Stamping
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid
import hashlib

# Use the public endpoint from frontend/.env
BASE_URL = "https://uipolish-2.preview.emergentagent.com/api"

class Phase5APITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Phase5-API-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        # Use the specific portfolio ID from the review request
        self.test_portfolio_id = "port_0e9a783c1a71"
        self.test_profile_id = None
        self.test_run_id = None
        self.test_hash = None
        self.test_results = []

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            self.log(f"✅ {name}")
        else:
            self.log(f"❌ {name} - {details}")
            self.failed_tests.append({
                'test': name,
                'details': details,
                'timestamp': datetime.now().isoformat()
            })
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def test_get_profiles(self):
        """Test GET /api/binder/profiles?portfolio_id={portfolio_id} to get profile IDs"""
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/binder/profiles", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    profiles = data['data'].get('profiles', [])
                    if profiles:
                        self.test_profile_id = profiles[0].get('id')
                        profile_names = [p.get('name') for p in profiles]
                        details += f", Found {len(profiles)} profiles: {', '.join(profile_names)}"
                    else:
                        details += ", No profiles found"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/profiles", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/profiles", False, f"Error: {str(e)}")
            return False

    # ============ GAPS ANALYSIS TESTS ============

    def test_gaps_checklist(self):
        """Test GET /api/binder/gaps/checklist?portfolio_id={portfolio_id}"""
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/binder/gaps/checklist", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    checklist = data['data'].get('checklist', [])
                    total_items = data['data'].get('total_items', 0)
                    details += f", Found {len(checklist)} checklist items (total: {total_items})"
                    
                    # Verify structure of first item
                    if checklist:
                        first_item = checklist[0]
                        required_fields = ['id', 'category', 'name', 'description', 'tier', 'required', 'validation_rules']
                        missing_fields = [field for field in required_fields if field not in first_item]
                        if missing_fields:
                            success = False
                            details += f", Missing fields in checklist item: {missing_fields}"
                        else:
                            details += f", Checklist structure verified"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/gaps/checklist", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/gaps/checklist", False, f"Error: {str(e)}")
            return False

    def test_gaps_analyze(self):
        """Test GET /api/binder/gaps/analyze?portfolio_id={portfolio_id}"""
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/binder/gaps/analyze", params=params, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    analysis = data['data']
                    
                    # Verify summary structure
                    summary = analysis.get('summary', {})
                    required_summary_fields = ['complete', 'partial', 'missing', 'not_applicable', 'high_risk', 'medium_risk', 'low_risk']
                    missing_summary_fields = [field for field in required_summary_fields if field not in summary]
                    
                    # Verify results array
                    results = analysis.get('results', [])
                    by_category = analysis.get('by_category', {})
                    
                    if missing_summary_fields:
                        success = False
                        details += f", Missing summary fields: {missing_summary_fields}"
                    elif not results:
                        success = False
                        details += f", No results array found"
                    else:
                        # Check first result structure
                        if results:
                            first_result = results[0]
                            if 'status' not in first_result or 'risk_level' not in first_result:
                                success = False
                                details += f", Results missing status or risk_level"
                            else:
                                details += f", Analysis complete: {len(results)} items analyzed, {len(by_category)} categories"
                        else:
                            details += f", Analysis complete: 0 items"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/gaps/analyze", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/gaps/analyze", False, f"Error: {str(e)}")
            return False

    def test_gaps_summary(self):
        """Test GET /api/binder/gaps/summary?portfolio_id={portfolio_id}"""
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/binder/gaps/summary", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    summary = data['data']
                    required_fields = ['checklist_items', 'tier1_items', 'required_items', 'documents_in_portfolio']
                    missing_fields = [field for field in required_fields if field not in summary]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields: {missing_fields}"
                    else:
                        details += f", Summary: {summary.get('checklist_items')} checklist items, {summary.get('tier1_items')} tier1, {summary.get('required_items')} required, {summary.get('documents_in_portfolio')} documents"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/gaps/summary", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/gaps/summary", False, f"Error: {str(e)}")
            return False

    def test_gaps_override(self):
        """Test POST /api/binder/gaps/override"""
        try:
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "item_id": "power_of_attorney",
                "not_applicable": True,
                "required": False
            }
            
            response = self.session.post(f"{self.base_url}/binder/gaps/override", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    override = data['data'].get('override', {})
                    details += f", Override saved for item: {payload['item_id']}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/binder/gaps/override", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/binder/gaps/override", False, f"Error: {str(e)}")
            return False

    # ============ BINDER GENERATION WITH PHASE 5 ============

    def test_binder_generation_with_phase5(self):
        """Test POST /api/binder/generate with Phase 5 features"""
        if not self.test_profile_id:
            self.log_test("POST /api/binder/generate (Phase 5)", False, "No profile ID available")
            return False
            
        try:
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "profile_id": self.test_profile_id
            }
            
            response = self.session.post(f"{self.base_url}/binder/generate", json=payload, timeout=30)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    self.test_run_id = result.get('run_id')
                    
                    # Check for Phase 5 features
                    gaps_analysis = result.get('gaps_analysis')
                    integrity = result.get('integrity')
                    
                    if gaps_analysis:
                        summary = gaps_analysis.get('summary', {})
                        high_risk_count = gaps_analysis.get('high_risk_count', 0)
                        details += f", Gaps analysis included: {high_risk_count} high risk items"
                    else:
                        details += f", No gaps analysis in response"
                    
                    if integrity:
                        hash_value = integrity.get('hash')
                        total_pages = integrity.get('total_pages')
                        seal_coverage = integrity.get('seal_coverage')
                        if hash_value:
                            self.test_hash = hash_value
                        details += f", Integrity stamp: hash={hash_value[:16] if hash_value else 'None'}..., pages={total_pages}, seal_coverage={seal_coverage}%"
                    else:
                        details += f", No integrity stamp in response"
                    
                    details += f", Run ID: {self.test_run_id}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/binder/generate (Phase 5)", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/binder/generate (Phase 5)", False, f"Error: {str(e)}")
            return False

    # ============ INTEGRITY VERIFICATION TESTS ============

    def test_verify_by_run_id(self):
        """Test GET /api/binder/verify?run={run_id}"""
        if not self.test_run_id:
            self.log_test("GET /api/binder/verify (by run_id)", False, "No run ID available")
            return False
            
        try:
            params = {"run": self.test_run_id}
            response = self.session.get(f"{self.base_url}/binder/verify", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    verified = result.get('verified')
                    integrity_stamp = result.get('integrity_stamp', {})
                    
                    if verified:
                        details += f", Verified: {verified}, Run ID: {result.get('run_id')}"
                        if integrity_stamp:
                            details += f", Integrity stamp fields: {list(integrity_stamp.keys())}"
                    else:
                        success = False
                        details += f", Verification failed"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/verify (by run_id)", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/verify (by run_id)", False, f"Error: {str(e)}")
            return False

    def test_verify_by_hash(self):
        """Test GET /api/binder/verify?hash={sha256_hash}"""
        if not self.test_hash:
            self.log_test("GET /api/binder/verify (by hash)", False, "No hash available")
            return False
            
        try:
            params = {"hash": self.test_hash}
            response = self.session.get(f"{self.base_url}/binder/verify", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    verified = result.get('verified')
                    
                    if verified:
                        details += f", Verified: {verified}, Hash: {self.test_hash[:16]}..."
                        run_details = result.get('run_id')
                        if run_details:
                            details += f", Run details found"
                    else:
                        success = False
                        details += f", Verification failed"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/verify (by hash)", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/verify (by hash)", False, f"Error: {str(e)}")
            return False

    def test_verify_invalid_hash(self):
        """Test GET /api/binder/verify with invalid hash"""
        try:
            invalid_hash = "0000000000000000000000000000000000000000000000000000000000000000"
            params = {"hash": invalid_hash}
            response = self.session.get(f"{self.base_url}/binder/verify", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    verified = result.get('verified')
                    
                    if verified == False:
                        details += f", Correctly returned verified=false for invalid hash"
                    else:
                        success = False
                        details += f", Should have returned verified=false, got: {verified}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/verify (invalid hash)", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/verify (invalid hash)", False, f"Error: {str(e)}")
            return False

    # ============ RUN METADATA VERIFICATION ============

    def test_run_metadata(self):
        """Test GET /api/binder/runs/{run_id}"""
        if not self.test_run_id:
            self.log_test("GET /api/binder/runs/{run_id}", False, "No run ID available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/binder/runs/{self.test_run_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    run_data = data['data']
                    
                    # Check for gap_analysis and integrity_stamp in metadata
                    gap_analysis = run_data.get('gap_analysis')
                    integrity_stamp = run_data.get('integrity_stamp')
                    
                    if gap_analysis:
                        details += f", Gap analysis found in metadata"
                    else:
                        details += f", No gap analysis in metadata"
                    
                    if integrity_stamp:
                        required_fields = ['binder_pdf_sha256', 'manifest_sha256', 'run_id', 'portfolio_id', 'generated_at', 'generated_by', 'generator_version', 'total_items', 'total_pages', 'seal_coverage_percent', 'verification_url']
                        missing_fields = [field for field in required_fields if field not in integrity_stamp]
                        
                        if missing_fields:
                            details += f", Integrity stamp missing fields: {missing_fields}"
                        else:
                            details += f", Integrity stamp complete with all required fields"
                    else:
                        details += f", No integrity stamp in metadata"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/runs/{run_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/runs/{run_id}", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all P2 backend tests"""
        self.log("🧪 Starting P2 Features Backend API Tests")
        self.log("=" * 60)
        
        # Get portfolio ID first
        self.log("\n📁 Getting Portfolio ID")
        self.log("-" * 30)
        if not self.test_get_portfolios():
            self.log("❌ Cannot proceed without portfolio ID")
            return False
        
        self.log(f"\n🧵 Testing Ledger Thread Management APIs")
        self.log("-" * 50)
        
        # Test thread CRUD operations
        self.test_create_thread()
        self.test_list_threads()
        self.test_get_thread_details()
        self.test_update_thread()
        
        # Test thread operations (may depend on existing records)
        self.test_thread_operations()
        
        # Test delete thread (should be last as it removes the thread)
        self.test_delete_thread()
        
        self.log(f"\n📋 Testing Binder Schedule Management APIs")
        self.log("-" * 50)
        
        # Test binder schedule CRUD operations
        self.test_get_binder_profiles()
        self.test_list_schedules()
        self.test_create_schedule()
        self.test_update_schedule()
        self.test_delete_schedule()
        
        self.log("\n📊 Test Summary")
        self.log("=" * 60)
        self.log(f"Tests run: {self.tests_run}")
        self.log(f"Tests passed: {self.tests_passed}")
        self.log(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            self.log("\n❌ Failed Tests:")
            for test in self.failed_tests:
                self.log(f"  - {test['test']}: {test.get('details', 'Unknown error')}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = TrustManagementAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/tmp/backend_test_results.json', 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "success_rate": tester.tests_passed/tester.tests_run if tester.tests_run > 0 else 0,
            "results": tester.test_results,
            "failed_tests": tester.failed_tests
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())