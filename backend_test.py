#!/usr/bin/env python3
"""
Backend API Testing for Equity Trust Portfolio Application
Comprehensive Regression Testing for Multiple Feature Updates
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid
import hashlib

# Use the public endpoint from frontend/.env
BASE_URL = "https://gaps-analyzer.preview.emergentagent.com/api"

class EquityTrustAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'EvidenceBinder-API-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        # Use the specific portfolio ID from the review request
        self.test_portfolio_id = "port_0e9a783c1a71"
        self.test_dispute_id = None
        self.test_run_id = None
        self.test_link_id = None
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

    # ============ EVIDENCE BINDER CONFIGURATION TESTS ============

    def test_evidence_config(self):
        """Test GET /api/evidence-binder/config"""
        try:
            response = self.session.get(f"{self.base_url}/evidence-binder/config", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    exhibit_formats = result.get('exhibit_formats', [])
                    categories = result.get('categories', [])
                    default_rules = result.get('default_rules', {})
                    
                    # Expected exhibit formats
                    expected_formats = ['letters', 'numbers']
                    format_values = [f.get('value') for f in exhibit_formats]
                    
                    # Expected categories
                    expected_categories = ['documents', 'communications', 'financial', 'governance', 'photos']
                    category_values = [c.get('value') for c in categories]
                    
                    missing_formats = [f for f in expected_formats if f not in format_values]
                    missing_categories = [c for c in expected_categories if c not in category_values]
                    
                    if missing_formats:
                        success = False
                        details += f", Missing exhibit formats: {missing_formats}"
                    elif missing_categories:
                        success = False
                        details += f", Missing categories: {missing_categories}"
                    elif not default_rules:
                        success = False
                        details += f", Missing default_rules"
                    else:
                        details += f", Returns exhibit_formats ({len(exhibit_formats)}), categories ({len(categories)}), default_rules"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/config", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/config", False, f"Error: {str(e)}")
            return False

    # ============ DISPUTES LISTING TESTS ============

    def test_get_disputes(self):
        """Test GET /api/evidence-binder/disputes?portfolio_id={portfolio_id}"""
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/evidence-binder/disputes", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    disputes = result.get('disputes', [])
                    total = result.get('total', 0)
                    
                    details += f", Returns disputes array with {len(disputes)} items (total: {total})"
                    
                    # Store first dispute for later tests
                    if disputes:
                        self.test_dispute_id = disputes[0].get('id')
                        details += f", Found dispute: {self.test_dispute_id}"
                        
                        # Verify dispute structure
                        first_dispute = disputes[0]
                        required_fields = ['id', 'title', 'status', 'created_at']
                        missing_fields = [field for field in required_fields if field not in first_dispute]
                        
                        if missing_fields:
                            success = False
                            details += f", Missing fields in dispute: {missing_fields}"
                        else:
                            details += f", Dispute structure verified"
                    else:
                        details += f", No disputes found - will create test dispute"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/disputes", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/disputes", False, f"Error: {str(e)}")
            return False

    def test_create_test_dispute_if_needed(self):
        """Create a test dispute if none exist"""
        if self.test_dispute_id:
            self.log_test("Create test dispute (skipped - dispute exists)", True, f"Using existing dispute: {self.test_dispute_id}")
            return True
        
        try:
            # Create a test dispute via governance API
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "module_type": "dispute",
                "title": "Test Dispute for Evidence Binder",
                "payload_json": {
                    "dispute_type": "beneficiary_dispute",
                    "parties_involved": ["Test Party A", "Test Party B"],
                    "summary": "Test dispute created for Evidence Binder API testing",
                    "status": "active",
                    "filing_date": datetime.now().strftime("%Y-%m-%d"),
                    "description": "This is a test dispute record created specifically for testing the Evidence Binder functionality."
                }
            }
            
            response = self.session.post(f"{self.base_url}/governance/v2/records", json=payload, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    record = data['data'].get('record', {})
                    self.test_dispute_id = record.get('id')
                    details += f", Created test dispute: {self.test_dispute_id}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("Create test dispute", success, details)
            return success
            
        except Exception as e:
            self.log_test("Create test dispute", False, f"Error: {str(e)}")
            return False

    # ============ DISPUTE LINKS MANAGEMENT TESTS ============

    def test_add_dispute_link(self):
        """Test POST /api/evidence-binder/links"""
        if not self.test_dispute_id:
            self.log_test("POST /api/evidence-binder/links", False, "No dispute ID available")
            return False
        
        try:
            payload = {
                "dispute_id": self.test_dispute_id,
                "record_id": "test_record_001",
                "record_type": "governance_minutes",
                "category": "governance",
                "relevance_note": "Test link for Evidence Binder API testing"
            }
            
            response = self.session.post(f"{self.base_url}/evidence-binder/links", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    link = result.get('link', {})
                    message = result.get('message', '')
                    
                    self.test_link_id = link.get('id')
                    details += f", Created link: {self.test_link_id}, Message: {message}"
                    
                    # Verify link structure
                    required_fields = ['id', 'dispute_id', 'record_id', 'record_type', 'category']
                    missing_fields = [field for field in required_fields if field not in link]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields in link: {missing_fields}"
                    else:
                        details += f", Link structure verified"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/evidence-binder/links", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/evidence-binder/links", False, f"Error: {str(e)}")
            return False

    def test_get_dispute_links(self):
        """Test GET /api/evidence-binder/links?dispute_id={dispute_id}"""
        if not self.test_dispute_id:
            self.log_test("GET /api/evidence-binder/links", False, "No dispute ID available")
            return False
        
        try:
            params = {"dispute_id": self.test_dispute_id}
            response = self.session.get(f"{self.base_url}/evidence-binder/links", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    links = result.get('links', [])
                    total = result.get('total', 0)
                    
                    details += f", Returns links array with {len(links)} items (total: {total})"
                    
                    # Verify we can find our test link
                    if self.test_link_id:
                        found_link = next((l for l in links if l.get('id') == self.test_link_id), None)
                        if found_link:
                            details += f", Found test link: {self.test_link_id}"
                        else:
                            details += f", Test link not found in results"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/links", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/links", False, f"Error: {str(e)}")
            return False

    def test_auto_link_dispute_items(self):
        """Test POST /api/evidence-binder/links/auto"""
        if not self.test_dispute_id:
            self.log_test("POST /api/evidence-binder/links/auto", False, "No dispute ID available")
            return False
        
        try:
            payload = {
                "dispute_id": self.test_dispute_id,
                "portfolio_id": self.test_portfolio_id
            }
            
            response = self.session.post(f"{self.base_url}/evidence-binder/links/auto", json=payload, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    linked_count = result.get('linked_count', 0)
                    message = result.get('message', '')
                    
                    details += f", Auto-linked {linked_count} items, Message: {message}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/evidence-binder/links/auto", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/evidence-binder/links/auto", False, f"Error: {str(e)}")
            return False

    # ============ EVIDENCE PREVIEW TESTS ============

    def test_evidence_preview(self):
        """Test GET /api/evidence-binder/preview"""
        if not self.test_dispute_id:
            self.log_test("GET /api/evidence-binder/preview", False, "No dispute ID available")
            return False
        
        try:
            params = {
                "portfolio_id": self.test_portfolio_id,
                "dispute_id": self.test_dispute_id,
                "include_linked_only": "true"
            }
            
            response = self.session.get(f"{self.base_url}/evidence-binder/preview", params=params, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    total_items = result.get('total_items', 0)
                    by_category = result.get('by_category', {})
                    exhibits_preview = result.get('exhibits_preview', [])
                    
                    details += f", Preview: {total_items} total items, {len(by_category)} categories, {len(exhibits_preview)} preview items"
                    
                    # Verify preview structure
                    if exhibits_preview:
                        first_exhibit = exhibits_preview[0]
                        required_fields = ['exhibit_label', 'title', 'category', 'source']
                        missing_fields = [field for field in required_fields if field not in first_exhibit]
                        
                        if missing_fields:
                            success = False
                            details += f", Missing fields in exhibit preview: {missing_fields}"
                        else:
                            details += f", Exhibit preview structure verified"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/preview", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/preview", False, f"Error: {str(e)}")
            return False

    # ============ EVIDENCE BINDER GENERATION TESTS ============

    def test_generate_evidence_binder(self):
        """Test POST /api/evidence-binder/generate"""
        if not self.test_dispute_id:
            self.log_test("POST /api/evidence-binder/generate", False, "No dispute ID available")
            return False
        
        try:
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "dispute_id": self.test_dispute_id,
                "rules": {
                    "exhibit_format": "letters",
                    "include_timeline": True,
                    "categories_enabled": ["documents", "communications", "financial", "governance"]
                }
            }
            
            response = self.session.post(f"{self.base_url}/evidence-binder/generate", json=payload, timeout=30)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    binder_success = result.get('success', False)
                    self.test_run_id = result.get('run_id')
                    total_exhibits = result.get('total_exhibits', 0)
                    categories_summary = result.get('categories_summary', {})
                    timeline_entries = result.get('timeline_entries', 0)
                    
                    if binder_success and self.test_run_id:
                        details += f", Generated successfully: run_id={self.test_run_id}, exhibits={total_exhibits}, timeline={timeline_entries}"
                        details += f", Categories: {categories_summary}"
                    else:
                        success = False
                        error = result.get('error', 'Unknown error')
                        details += f", Generation failed: {error}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/evidence-binder/generate", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/evidence-binder/generate", False, f"Error: {str(e)}")
            return False

    # ============ EVIDENCE BINDER RUNS TESTS ============

    def test_get_evidence_runs(self):
        """Test GET /api/evidence-binder/runs?portfolio_id={portfolio_id}"""
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/evidence-binder/runs", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    runs = result.get('runs', [])
                    total = result.get('total', 0)
                    
                    details += f", Returns runs array with {len(runs)} items (total: {total})"
                    
                    # Verify we can find our test run
                    if self.test_run_id:
                        found_run = next((r for r in runs if r.get('id') == self.test_run_id), None)
                        if found_run:
                            details += f", Found test run: {self.test_run_id}"
                            details += f", Status: {found_run.get('status')}"
                        else:
                            details += f", Test run not found in results"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/runs", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/runs", False, f"Error: {str(e)}")
            return False

    def test_get_evidence_run_details(self):
        """Test GET /api/evidence-binder/runs/{run_id}"""
        if not self.test_run_id:
            self.log_test("GET /api/evidence-binder/runs/{run_id}", False, "No run ID available")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/evidence-binder/runs/{self.test_run_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    run = result.get('run', {})
                    
                    # Verify run structure
                    required_fields = ['id', 'portfolio_id', 'dispute_id', 'status', 'binder_type']
                    missing_fields = [field for field in required_fields if field not in run]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields in run: {missing_fields}"
                    else:
                        details += f", Run details: status={run.get('status')}, type={run.get('binder_type')}"
                        details += f", dispute_id={run.get('dispute_id')}, total_items={run.get('total_items', 0)}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/runs/{run_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/runs/{run_id}", False, f"Error: {str(e)}")
            return False

    def test_get_evidence_manifest(self):
        """Test GET /api/evidence-binder/runs/{run_id}/manifest"""
        if not self.test_run_id:
            self.log_test("GET /api/evidence-binder/runs/{run_id}/manifest", False, "No run ID available")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/evidence-binder/runs/{self.test_run_id}/manifest", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    manifest = result.get('manifest', {})
                    dispute_id = result.get('dispute_id')
                    profile_name = result.get('profile_name')
                    generated_at = result.get('generated_at')
                    
                    # Verify manifest structure
                    required_fields = ['run_id', 'dispute_id', 'total_exhibits', 'exhibits']
                    missing_fields = [field for field in required_fields if field not in manifest]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields in manifest: {missing_fields}"
                    else:
                        total_exhibits = manifest.get('total_exhibits', 0)
                        exhibits = manifest.get('exhibits', [])
                        timeline = manifest.get('timeline', [])
                        
                        details += f", Manifest: {total_exhibits} exhibits, {len(exhibits)} exhibit details, {len(timeline)} timeline entries"
                        details += f", Profile: {profile_name}, Generated: {generated_at}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/runs/{run_id}/manifest", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/runs/{run_id}/manifest", False, f"Error: {str(e)}")
            return False

    def test_download_evidence_binder(self):
        """Test GET /api/evidence-binder/runs/{run_id}/download"""
        if not self.test_run_id:
            self.log_test("GET /api/evidence-binder/runs/{run_id}/download", False, "No run ID available")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/evidence-binder/runs/{self.test_run_id}/download", timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                content_type = response.headers.get('content-type', '')
                content_length = response.headers.get('content-length', '0')
                content_disposition = response.headers.get('content-disposition', '')
                
                if content_type == 'application/pdf':
                    details += f", PDF download successful: {content_length} bytes"
                    if 'Evidence_Binder_' in content_disposition:
                        details += f", Correct filename format"
                    else:
                        details += f", Filename: {content_disposition}"
                else:
                    success = False
                    details += f", Unexpected content type: {content_type}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/runs/{run_id}/download", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/runs/{run_id}/download", False, f"Error: {str(e)}")
            return False

    # ============ CLEANUP TESTS ============

    def test_cleanup_test_link(self):
        """Test DELETE /api/evidence-binder/links/{link_id}"""
        if not self.test_link_id:
            self.log_test("DELETE /api/evidence-binder/links/{link_id} (cleanup)", True, "No test link to cleanup")
            return True
        
        try:
            response = self.session.delete(f"{self.base_url}/evidence-binder/links/{self.test_link_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    deleted = result.get('deleted', False)
                    message = result.get('message', '')
                    
                    if deleted:
                        details += f", Test link deleted successfully: {message}"
                    else:
                        success = False
                        details += f", Link not deleted: {message}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("DELETE /api/evidence-binder/links/{link_id} (cleanup)", success, details)
            return success
            
        except Exception as e:
            self.log_test("DELETE /api/evidence-binder/links/{link_id} (cleanup)", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all Evidence Binder backend tests"""
        self.log("🧪 Starting Evidence Binder Backend API Tests")
        self.log("=" * 60)
        self.log(f"Using Portfolio ID: {self.test_portfolio_id}")
        
        self.log("\n📋 Test 1: Evidence Binder Configuration")
        self.log("-" * 50)
        self.test_evidence_config()
        
        self.log(f"\n📊 Test 2: Disputes Listing")
        self.log("-" * 30)
        self.test_get_disputes()
        self.test_create_test_dispute_if_needed()
        
        self.log(f"\n🔗 Test 3: Dispute Links Management")
        self.log("-" * 40)
        self.test_add_dispute_link()
        self.test_get_dispute_links()
        self.test_auto_link_dispute_items()
        
        self.log(f"\n👁️ Test 4: Evidence Preview")
        self.log("-" * 30)
        self.test_evidence_preview()
        
        self.log(f"\n📄 Test 5: Evidence Binder Generation")
        self.log("-" * 45)
        self.test_generate_evidence_binder()
        
        self.log(f"\n📚 Test 6: Evidence Binder Runs")
        self.log("-" * 35)
        self.test_get_evidence_runs()
        self.test_get_evidence_run_details()
        self.test_get_evidence_manifest()
        self.test_download_evidence_binder()
        
        self.log(f"\n🧹 Test 7: Cleanup")
        self.log("-" * 20)
        self.test_cleanup_test_link()
        
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
    tester = EvidenceBinderAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/tmp/evidence_binder_test_results.json', 'w') as f:
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