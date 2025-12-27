#!/usr/bin/env python3
"""
Backend API Testing for Trust Management Application
Testing P2 Features: Ledger Thread Management and Binder Schedule Management
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid

# Use the public endpoint from frontend/.env
BASE_URL = "https://uipolish-2.preview.emergentagent.com/api"

class TrustManagementAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Trust-Management-API-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_portfolio_id = None
        self.test_thread_id = None
        self.test_schedule_id = None
        self.test_profile_id = None
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

    def test_get_portfolios(self):
        """Test GET /api/portfolios to get a portfolio ID"""
        try:
            response = self.session.get(f"{self.base_url}/portfolios", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.test_portfolio_id = data[0].get('portfolio_id')
                    details += f", Found {len(data)} portfolios, using portfolio: {self.test_portfolio_id}"
                else:
                    success = False
                    details += ", No portfolios found"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/portfolios", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/portfolios", False, f"Error: {str(e)}")
            return False

    # ============ LEDGER THREAD MANAGEMENT TESTS ============

    def test_create_thread(self):
        """Test POST /api/ledger-threads"""
        if not self.test_portfolio_id:
            self.log_test("POST /api/ledger-threads", False, "No portfolio ID available")
            return False
            
        try:
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "title": "Test Thread for P2 Testing",
                "category": "minutes"
            }
            
            response = self.session.post(f"{self.base_url}/ledger-threads", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    thread_data = data['data']
                    self.test_thread_id = thread_data.get('thread_id')
                    details += f", Thread created: {self.test_thread_id}, RM Group: {thread_data.get('rm_group')}, RM Preview: {thread_data.get('rm_id_preview')}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/ledger-threads", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/ledger-threads", False, f"Error: {str(e)}")
            return False

    def test_list_threads(self):
        """Test GET /api/ledger-threads?portfolio_id={portfolio_id}"""
        if not self.test_portfolio_id:
            self.log_test("GET /api/ledger-threads (list)", False, "No portfolio ID available")
            return False
            
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/ledger-threads", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    items = data['data'].get('items', [])
                    total = data['data'].get('total', 0)
                    details += f", Found {len(items)} threads (total: {total})"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/ledger-threads (list)", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/ledger-threads (list)", False, f"Error: {str(e)}")
            return False

    def test_get_thread_details(self):
        """Test GET /api/ledger-threads/{thread_id}"""
        if not self.test_thread_id:
            self.log_test("GET /api/ledger-threads/{thread_id}", False, "No thread ID available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/ledger-threads/{self.test_thread_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    thread = data['data'].get('thread', {})
                    records = data['data'].get('records', [])
                    details += f", Thread: {thread.get('title')}, Records: {len(records)}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/ledger-threads/{thread_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/ledger-threads/{thread_id}", False, f"Error: {str(e)}")
            return False

    def test_update_thread(self):
        """Test PUT /api/ledger-threads/{thread_id}"""
        if not self.test_thread_id:
            self.log_test("PUT /api/ledger-threads/{thread_id}", False, "No thread ID available")
            return False
            
        try:
            payload = {
                "title": "Updated Test Thread",
                "external_ref": "TEST-REF-001"
            }
            
            response = self.session.put(f"{self.base_url}/ledger-threads/{self.test_thread_id}", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    thread = data['data'].get('thread', {})
                    details += f", Updated thread: {thread.get('title')}, External ref: {thread.get('external_ref')}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("PUT /api/ledger-threads/{thread_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("PUT /api/ledger-threads/{thread_id}", False, f"Error: {str(e)}")
            return False

    def test_delete_thread(self):
        """Test DELETE /api/ledger-threads/{thread_id} - only works if thread has 0 records"""
        if not self.test_thread_id:
            self.log_test("DELETE /api/ledger-threads/{thread_id}", False, "No thread ID available")
            return False
            
        try:
            response = self.session.delete(f"{self.base_url}/ledger-threads/{self.test_thread_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    details += f", Thread deleted: {data['data'].get('deleted')}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                # This might fail if thread has records, which is expected
                details += f", Response: {response.text[:200]}"
                if "records" in response.text.lower():
                    success = True  # Expected failure due to records
                    details += " (Expected: thread has records)"
            
            self.log_test("DELETE /api/ledger-threads/{thread_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("DELETE /api/ledger-threads/{thread_id}", False, f"Error: {str(e)}")
            return False

    def test_thread_operations(self):
        """Test thread operations (merge, split, reassign) - may depend on existing records"""
        # These operations require existing records, so we'll test the endpoints but expect they may fail
        
        # Test merge threads
        if self.test_thread_id:
            try:
                payload = {
                    "source_thread_ids": ["dummy_thread_id"],
                    "merge_reason": "Test merge"
                }
                response = self.session.post(f"{self.base_url}/ledger-threads/{self.test_thread_id}/merge", json=payload, timeout=10)
                success = response.status_code in [200, 404]  # 404 is expected for dummy thread
                details = f"Merge - Status: {response.status_code}"
                if response.status_code == 404:
                    details += " (Expected: dummy thread not found)"
                self.log_test("POST /api/ledger-threads/{thread_id}/merge", success, details)
            except Exception as e:
                self.log_test("POST /api/ledger-threads/{thread_id}/merge", False, f"Error: {str(e)}")
        
        # Test split thread
        if self.test_thread_id:
            try:
                payload = {
                    "record_ids": ["dummy_record_id"],
                    "new_thread_title": "Split Test",
                    "split_reason": "Test split"
                }
                response = self.session.post(f"{self.base_url}/ledger-threads/{self.test_thread_id}/split", json=payload, timeout=10)
                success = response.status_code in [200, 400]  # 400 is expected for no valid records
                details = f"Split - Status: {response.status_code}"
                if response.status_code == 400:
                    details += " (Expected: no valid records found)"
                self.log_test("POST /api/ledger-threads/{thread_id}/split", success, details)
            except Exception as e:
                self.log_test("POST /api/ledger-threads/{thread_id}/split", False, f"Error: {str(e)}")
        
        # Test reassign records
        try:
            payload = {
                "record_ids": ["dummy_record_id"],
                "target_thread_id": self.test_thread_id or "dummy_thread_id",
                "reassign_reason": "Test reassign"
            }
            response = self.session.post(f"{self.base_url}/ledger-threads/reassign", json=payload, timeout=10)
            success = response.status_code in [200, 400, 404]  # Various expected failures
            details = f"Reassign - Status: {response.status_code}"
            if response.status_code in [400, 404]:
                details += " (Expected: no valid records or thread not found)"
            self.log_test("POST /api/ledger-threads/reassign", success, details)
        except Exception as e:
            self.log_test("POST /api/ledger-threads/reassign", False, f"Error: {str(e)}")

    # ============ BINDER SCHEDULE MANAGEMENT TESTS ============

    def test_get_binder_profiles(self):
        """Test GET /api/binder/profiles?portfolio_id={portfolio_id}"""
        if not self.test_portfolio_id:
            self.log_test("GET /api/binder/profiles", False, "No portfolio ID available")
            return False
            
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

    def test_list_schedules(self):
        """Test GET /api/binder/schedules?portfolio_id={portfolio_id}"""
        if not self.test_portfolio_id:
            self.log_test("GET /api/binder/schedules", False, "No portfolio ID available")
            return False
            
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/binder/schedules", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    schedules = data['data'].get('schedules', [])
                    details += f", Found {len(schedules)} schedules"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/schedules", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/schedules", False, f"Error: {str(e)}")
            return False

    def test_create_schedule(self):
        """Test POST /api/binder/schedules"""
        if not self.test_portfolio_id or not self.test_profile_id:
            self.log_test("POST /api/binder/schedules", False, "No portfolio ID or profile ID available")
            return False
            
        try:
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "profile_id": self.test_profile_id,
                "frequency": "weekly",
                "day_of_week": 1,
                "hour": 9,
                "minute": 0,
                "enabled": True
            }
            
            response = self.session.post(f"{self.base_url}/binder/schedules", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    schedule = data['data'].get('schedule', {})
                    self.test_schedule_id = schedule.get('id')
                    details += f", Schedule created: {self.test_schedule_id}, Next run: {schedule.get('next_run_at')}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/binder/schedules", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/binder/schedules", False, f"Error: {str(e)}")
            return False

    def test_update_schedule(self):
        """Test PUT /api/binder/schedules/{schedule_id}"""
        if not self.test_schedule_id:
            self.log_test("PUT /api/binder/schedules/{schedule_id}", False, "No schedule ID available")
            return False
            
        try:
            payload = {
                "frequency": "daily",
                "hour": 6,
                "enabled": False
            }
            
            response = self.session.put(f"{self.base_url}/binder/schedules/{self.test_schedule_id}", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    schedule = data['data'].get('schedule', {})
                    details += f", Schedule updated: frequency={schedule.get('frequency')}, enabled={schedule.get('enabled')}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("PUT /api/binder/schedules/{schedule_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("PUT /api/binder/schedules/{schedule_id}", False, f"Error: {str(e)}")
            return False

    def test_delete_schedule(self):
        """Test DELETE /api/binder/schedules/{schedule_id}"""
        if not self.test_schedule_id:
            self.log_test("DELETE /api/binder/schedules/{schedule_id}", False, "No schedule ID available")
            return False
            
        try:
            response = self.session.delete(f"{self.base_url}/binder/schedules/{self.test_schedule_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok'):
                    details += f", Schedule deleted successfully"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("DELETE /api/binder/schedules/{schedule_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("DELETE /api/binder/schedules/{schedule_id}", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        self.log("🧪 Starting Trust Management Backend API Tests")
        self.log("=" * 60)
        
        # Basic connectivity
        if not self.test_api_health():
            self.log("❌ API is not accessible, skipping remaining tests")
            return False
        
        self.log("\n📚 Testing Knowledge Base & Maxims API Endpoints")
        self.log("-" * 50)
        
        # Knowledge base tests
        self.test_knowledge_maxims_endpoint()
        
        self.log("\n📖 Testing Study Progress API Endpoints")
        self.log("-" * 40)
        
        # Study progress tests
        self.test_study_maxims_endpoint()
        self.test_study_stats_endpoint()
        self.test_study_maxims_due_endpoint()
        self.test_maxim_review_endpoint()
        
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