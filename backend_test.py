#!/usr/bin/env python3
"""
Backend API Testing for Trust Management Application
Testing Comprehensive Audit Log Feature
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

class AuditLogAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'AuditLog-API-Tester/1.0'
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

    # ============ AUDIT LOG CATEGORIES AND METADATA TESTS ============

    def test_audit_categories(self):
        """Test GET /api/audit-log/categories"""
        try:
            response = self.session.get(f"{self.base_url}/audit-log/categories", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    categories = result.get('categories', [])
                    severities = result.get('severities', [])
                    resource_types = result.get('resource_types', [])
                    
                    # Expected categories
                    expected_categories = ['governance', 'binder', 'thread', 'integrity', 'auth', 'system', 'export', 'compliance']
                    expected_severities = ['info', 'notice', 'warning', 'critical']
                    
                    category_ids = [c.get('id') for c in categories]
                    severity_ids = [s.get('id') for s in severities]
                    
                    missing_categories = [c for c in expected_categories if c not in category_ids]
                    missing_severities = [s for s in expected_severities if s not in severity_ids]
                    
                    if missing_categories:
                        success = False
                        details += f", Missing categories: {missing_categories}"
                    elif missing_severities:
                        success = False
                        details += f", Missing severities: {missing_severities}"
                    else:
                        details += f", Returns categories array ({len(categories)}), severities array ({len(severities)}), resource_types array ({len(resource_types)})"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/audit-log/categories", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/audit-log/categories", False, f"Error: {str(e)}")
            return False

    # ============ AUDIT LOG CRUD TESTS ============

    def test_audit_log_basic(self):
        """Test GET /api/audit-log?limit=10"""
        try:
            params = {"limit": 10}
            response = self.session.get(f"{self.base_url}/audit-log", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    entries = result.get('entries', [])
                    total = result.get('total', 0)
                    
                    details += f", Returns entries array with {len(entries)} items (total: {total})"
                    
                    # Verify entry structure if entries exist
                    if entries:
                        first_entry = entries[0]
                        required_fields = ['id', 'timestamp', 'category', 'event_type', 'severity', 'actor_id', 'action', 'details']
                        missing_fields = [field for field in required_fields if field not in first_entry]
                        
                        if missing_fields:
                            success = False
                            details += f", Missing fields in entry: {missing_fields}"
                        else:
                            details += f", Entry structure verified"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/audit-log?limit=10", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/audit-log?limit=10", False, f"Error: {str(e)}")
            return False

    def test_audit_log_category_filter(self):
        """Test GET /api/audit-log?category=binder"""
        try:
            params = {"category": "binder"}
            response = self.session.get(f"{self.base_url}/audit-log", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    entries = result.get('entries', [])
                    
                    # Verify all entries are binder category
                    non_binder_entries = [e for e in entries if e.get('category') != 'binder']
                    
                    if non_binder_entries:
                        success = False
                        details += f", Found {len(non_binder_entries)} non-binder entries"
                    else:
                        details += f", Returns only binder category entries ({len(entries)} entries)"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/audit-log?category=binder", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/audit-log?category=binder", False, f"Error: {str(e)}")
            return False

    def test_audit_log_severity_filter(self):
        """Test GET /api/audit-log?severity=notice"""
        try:
            params = {"severity": "notice"}
            response = self.session.get(f"{self.base_url}/audit-log", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    entries = result.get('entries', [])
                    
                    # Verify all entries are notice severity
                    non_notice_entries = [e for e in entries if e.get('severity') != 'notice']
                    
                    if non_notice_entries:
                        success = False
                        details += f", Found {len(non_notice_entries)} non-notice entries"
                    else:
                        details += f", Returns only notice severity entries ({len(entries)} entries)"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/audit-log?severity=notice", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/audit-log?severity=notice", False, f"Error: {str(e)}")
            return False

    def test_audit_log_search(self):
        """Test GET /api/audit-log?search=Audit"""
        try:
            params = {"search": "Audit"}
            response = self.session.get(f"{self.base_url}/audit-log", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    entries = result.get('entries', [])
                    
                    details += f", Returns entries matching search term 'Audit' ({len(entries)} entries)"
                    
                    # Verify search results contain the search term
                    if entries:
                        matching_entries = []
                        for entry in entries:
                            action = entry.get('action', '').lower()
                            event_type = entry.get('event_type', '').lower()
                            resource_id = entry.get('resource_id', '').lower()
                            if 'audit' in action or 'audit' in event_type or 'audit' in resource_id:
                                matching_entries.append(entry)
                        
                        if len(matching_entries) < len(entries):
                            details += f", Note: {len(entries) - len(matching_entries)} entries don't contain 'audit' in action/event_type/resource_id"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/audit-log?search=Audit", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/audit-log?search=Audit", False, f"Error: {str(e)}")
            return False

    # ============ ANALYTICS TESTS ============

    def test_audit_summary(self):
        """Test GET /api/audit-log/summary?days=30"""
        try:
            params = {"days": 30}
            response = self.session.get(f"{self.base_url}/audit-log/summary", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    
                    # Check required fields
                    required_fields = ['total_entries', 'by_category', 'by_severity', 'critical_events']
                    missing_fields = [field for field in required_fields if field not in result]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields: {missing_fields}"
                    else:
                        total_entries = result.get('total_entries', 0)
                        by_category = result.get('by_category', {})
                        by_severity = result.get('by_severity', {})
                        critical_events = result.get('critical_events', [])
                        
                        # Verify by_category has counts for all 8 categories
                        expected_categories = ['governance', 'binder', 'thread', 'integrity', 'auth', 'system', 'export', 'compliance']
                        category_counts = len([cat for cat in expected_categories if cat in by_category])
                        
                        details += f", Returns total_entries: {total_entries}, by_category: {category_counts}/8 categories, by_severity: {len(by_severity)} severities, critical_events: {len(critical_events)}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/audit-log/summary?days=30", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/audit-log/summary?days=30", False, f"Error: {str(e)}")
            return False

    def test_audit_timeline(self):
        """Test GET /api/audit-log/timeline?days=7"""
        try:
            params = {"days": 7}
            response = self.session.get(f"{self.base_url}/audit-log/timeline", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    timeline = result.get('timeline', [])
                    days = result.get('days', 0)
                    
                    # Verify timeline structure
                    if timeline:
                        first_day = timeline[0]
                        required_fields = ['date', 'count']
                        missing_fields = [field for field in required_fields if field not in first_day]
                        
                        if missing_fields:
                            success = False
                            details += f", Missing fields in timeline entry: {missing_fields}"
                        else:
                            details += f", Returns timeline array with {len(timeline)} days, each with date and count"
                    else:
                        details += f", Returns empty timeline array"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/audit-log/timeline?days=7", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/audit-log/timeline?days=7", False, f"Error: {str(e)}")
            return False

    # ============ EXPORT TESTS ============

    def test_audit_export_json(self):
        """Test GET /api/audit-log/export?format=json"""
        try:
            params = {"format": "json"}
            response = self.session.get(f"{self.base_url}/audit-log/export", params=params, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    
                    # Check required fields for JSON export
                    required_fields = ['entries', 'total', 'exported_at']
                    missing_fields = [field for field in required_fields if field not in result]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields: {missing_fields}"
                    else:
                        entries = result.get('entries', [])
                        total = result.get('total', 0)
                        exported_at = result.get('exported_at', '')
                        
                        details += f", Returns entries array ({len(entries)} entries), total count ({total}), exported_at timestamp"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/audit-log/export?format=json", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/audit-log/export?format=json", False, f"Error: {str(e)}")
            return False

    def test_audit_export_csv(self):
        """Test GET /api/audit-log/export?format=csv"""
        try:
            params = {"format": "csv"}
            response = self.session.get(f"{self.base_url}/audit-log/export", params=params, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    
                    # Check required fields for CSV export
                    required_fields = ['headers', 'rows']
                    missing_fields = [field for field in required_fields if field not in result]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields: {missing_fields}"
                    else:
                        headers = result.get('headers', [])
                        rows = result.get('rows', [])
                        
                        details += f", Returns headers array ({len(headers)} columns) and rows array ({len(rows)} rows)"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/audit-log/export?format=csv", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/audit-log/export?format=csv", False, f"Error: {str(e)}")
            return False

    # ============ COMPLIANCE REPORT TEST ============

    def test_compliance_report(self):
        """Test GET /api/audit-log/compliance-report?portfolio_id=port_0e9a783c1a71"""
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/audit-log/compliance-report", params=params, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    
                    # Check required fields
                    required_fields = ['metrics', 'critical_events', 'period']
                    missing_fields = [field for field in required_fields if field not in result]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields: {missing_fields}"
                    else:
                        metrics = result.get('metrics', {})
                        critical_events = result.get('critical_events', [])
                        period = result.get('period', {})
                        
                        # Check metrics structure
                        expected_metrics = ['total_events', 'records_finalized', 'binders_generated']
                        metrics_found = [m for m in expected_metrics if m in metrics]
                        
                        details += f", Returns metrics ({len(metrics_found)}/{len(expected_metrics)} expected), critical_events ({len(critical_events)}), period (start/end)"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/audit-log/compliance-report", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/audit-log/compliance-report", False, f"Error: {str(e)}")
            return False

    # ============ RESOURCE HISTORY TEST ============

    def test_resource_history(self):
        """Test GET /api/audit-log/resource/binder_run/{run_id}"""
        # First, get a valid run_id from binder runs
        try:
            params = {"portfolio_id": self.test_portfolio_id, "limit": 1}
            response = self.session.get(f"{self.base_url}/binder/runs", params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    runs = data['data'].get('runs', [])
                    if runs:
                        self.test_run_id = runs[0].get('id')
            
            if not self.test_run_id:
                self.log_test("GET /api/audit-log/resource/binder_run/{run_id}", False, "No valid run_id found")
                return False
            
            # Now test the resource history endpoint
            response = self.session.get(f"{self.base_url}/audit-log/resource/binder_run/{self.test_run_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    entries = result.get('entries', [])
                    resource_type = result.get('resource_type', '')
                    resource_id = result.get('resource_id', '')
                    
                    details += f", Returns entries for binder_run {self.test_run_id} ({len(entries)} entries)"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/audit-log/resource/binder_run/{run_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/audit-log/resource/binder_run/{run_id}", False, f"Error: {str(e)}")
            return False

    # ============ INTEGRATION TEST ============

    def test_generate_binder_and_check_audit(self):
        """Test POST /api/binder/generate and then check audit log"""
        # First, get a profile ID
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/binder/profiles", params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    profiles = data['data'].get('profiles', [])
                    if profiles:
                        self.test_profile_id = profiles[0].get('id')
            
            if not self.test_profile_id:
                self.log_test("Integration Test - Generate Binder and Check Audit", False, "No profile ID available")
                return False
            
            # Generate a binder
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "profile_id": self.test_profile_id
            }
            
            response = self.session.post(f"{self.base_url}/binder/generate", json=payload, timeout=30)
            
            if response.status_code != 200:
                self.log_test("Integration Test - Generate Binder and Check Audit", False, f"Binder generation failed: {response.status_code}")
                return False
            
            # Wait a moment for audit log to be created
            time.sleep(2)
            
            # Check audit log for the latest entry
            params = {"limit": 1}
            response = self.session.get(f"{self.base_url}/audit-log", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    entries = result.get('entries', [])
                    
                    if entries:
                        latest_entry = entries[0]
                        category = latest_entry.get('category', '')
                        event_type = latest_entry.get('event_type', '')
                        
                        if category == 'binder' and event_type == 'generation_complete':
                            details += f", Latest entry is binder generation event (category={category}, event_type={event_type})"
                        else:
                            success = False
                            details += f", Latest entry is not binder generation (category={category}, event_type={event_type})"
                    else:
                        success = False
                        details += f", No audit entries found"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("Integration Test - Generate Binder and Check Audit", success, details)
            return success
            
        except Exception as e:
            self.log_test("Integration Test - Generate Binder and Check Audit", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all Phase 5 backend tests"""
        self.log("🧪 Starting Phase 5 Features Backend API Tests")
        self.log("=" * 60)
        self.log(f"Using Portfolio ID: {self.test_portfolio_id}")
        
        # Get profile ID first
        self.log("\n📁 Getting Binder Profile ID")
        self.log("-" * 30)
        if not self.test_get_profiles():
            self.log("❌ Cannot proceed without profile ID")
            return False
        
        self.log(f"\n🔍 Testing Gaps Analysis APIs")
        self.log("-" * 40)
        
        # Test gaps analysis endpoints
        self.test_gaps_checklist()
        self.test_gaps_analyze()
        self.test_gaps_summary()
        self.test_gaps_override()
        
        self.log(f"\n📋 Testing Binder Generation with Phase 5")
        self.log("-" * 50)
        
        # Test binder generation with Phase 5 features
        self.test_binder_generation_with_phase5()
        
        self.log(f"\n🔐 Testing Integrity Verification APIs")
        self.log("-" * 45)
        
        # Test integrity verification endpoints
        self.test_verify_by_run_id()
        self.test_verify_by_hash()
        self.test_verify_invalid_hash()
        
        self.log(f"\n📊 Testing Run Metadata Verification")
        self.log("-" * 45)
        
        # Test run metadata
        self.test_run_metadata()
        
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
    tester = Phase5APITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/tmp/phase5_test_results.json', 'w') as f:
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