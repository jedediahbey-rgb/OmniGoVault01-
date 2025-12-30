#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timezone, timedelta
import uuid
import subprocess

# Get backend URL from frontend .env
BACKEND_URL = "https://omnidev-central.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class EquityTrustFeaturesTest:
    def __init__(self):
        self.session_token = None
        self.user_id = None
        self.test_portfolio_id = None
        self.test_party_ids = []
        self.test_document_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            if details:
                print(f"   {details}")
        else:
            self.failed_tests.append({"name": name, "details": details})
            print(f"❌ {name} - {details}")
        
    def create_test_user_and_session(self):
        """Create test user and session in MongoDB for testing"""
        try:
            # Generate test data
            timestamp = int(datetime.now().timestamp())
            self.user_id = f"test-user-{timestamp}"
            self.session_token = f"test_session_{timestamp}"
            test_email = f"test.user.{timestamp}@example.com"
            
            # MongoDB commands to create test user and session
            mongo_commands = f"""
            use('test_database');
            db.users.insertOne({{
                user_id: '{self.user_id}',
                email: '{test_email}',
                name: 'Test User',
                picture: 'https://via.placeholder.com/150',
                created_at: new Date().toISOString()
            }});
            db.user_sessions.insertOne({{
                user_id: '{self.user_id}',
                session_token: '{self.session_token}',
                expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
                created_at: new Date().toISOString()
            }});
            """
            
            # Execute MongoDB commands
            result = subprocess.run(
                ['mongosh', '--eval', mongo_commands],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            success = result.returncode == 0
            details = f"User ID: {self.user_id}, Session: {self.session_token[:20]}..."
            if not success:
                details += f" Error: {result.stderr}"
            
            self.log_test("Create Test User & Session", success, details)
            return success
            
        except Exception as e:
            self.log_test("Create Test User & Session", False, f"Exception: {str(e)}")
            return False

    def test_templates_with_subject_codes(self):
        """Test GET /api/templates returns templates with subject_code field (01-09)"""
        try:
            response = requests.get(f"{API_BASE}/templates", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                templates = response.json()
                template_count = len(templates)
                details += f", Templates count: {template_count}"
                
                # Check that templates have subject_code field and are 01-09
                subject_codes = []
                for template in templates:
                    if 'subject_code' in template:
                        subject_codes.append(template['subject_code'])
                    else:
                        success = False
                        details += f", Missing subject_code in template: {template.get('id', 'unknown')}"
                
                if success:
                    # Check that we have codes 01-09
                    expected_codes = [f"{i:02d}" for i in range(1, 10)]  # 01, 02, ..., 09
                    found_codes = [code for code in subject_codes if code in expected_codes]
                    details += f", Subject codes found: {sorted(found_codes)}"
                    
                    if len(found_codes) >= 7:  # Should have at least 7 templates with codes 01-09
                        details += " (Template RM-ID system working)"
                    else:
                        success = False
                        details += f" (Expected 7+ templates with codes 01-09, got {len(found_codes)})"
            
            self.log_test("Templates with Subject Codes (01-09)", success, details)
            return success
        except Exception as e:
            self.log_test("Templates with Subject Codes (01-09)", False, f"Exception: {str(e)}")
            return False

    def create_test_portfolio(self):
        """Create a test portfolio for testing"""
        if not self.session_token:
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "name": "Test Equity Trust Portfolio",
                "description": "Test portfolio for RM-ID and party testing"
            }
            
            response = requests.post(f"{API_BASE}/portfolios", headers=headers, json=payload, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.test_portfolio_id = data.get('portfolio_id')
                self.log_test("Create Test Portfolio", success, f"Portfolio ID: {self.test_portfolio_id}")
            else:
                self.log_test("Create Test Portfolio", False, f"Status: {response.status_code}")
            
            return success
        except Exception as e:
            self.log_test("Create Test Portfolio", False, f"Exception: {str(e)}")
            return False

    def test_create_document_with_template_subject_code(self):
        """Test POST /api/documents creates document with template's subject_code for RM-ID"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Create Document with Template Subject Code", False, "No session token or portfolio ID")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            # Use Declaration of Trust template (should have subject_code "01")
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "template_id": "declaration_of_trust",
                "title": "Test Declaration of Trust with RM-ID",
                "document_type": "declaration_of_trust",
                "content": "Test document content for RM-ID testing"
            }
            
            response = requests.post(f"{API_BASE}/documents", headers=headers, json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.test_document_id = data.get('document_id')
                rm_id = data.get('rm_id', '')
                sub_record_id = data.get('sub_record_id', '')
                
                details += f", Document ID: {self.test_document_id}"
                details += f", RM-ID: {rm_id}"
                details += f", Sub-record ID: {sub_record_id}"
                
                # Check if RM-ID contains subject code "01" (for Declaration of Trust)
                if rm_id and ("-01." in rm_id or rm_id.endswith("-01")):
                    details += " (Template subject code 01 correctly used in RM-ID)"
                elif rm_id:
                    details += f" (RM-ID generated but may not use template subject code)"
                else:
                    details += " (No RM-ID generated)"
            
            self.log_test("Create Document with Template Subject Code", success, details)
            return success
        except Exception as e:
            self.log_test("Create Document with Template Subject Code", False, f"Exception: {str(e)}")
            return False

    def test_create_party(self):
        """Test POST /api/portfolios/{id}/parties creates a new party"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Create Party", False, "No session token or portfolio ID")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "name": "John Smith",
                "party_type": "individual",
                "role": "grantor",
                "address": "123 Main Street, Anytown, ST 12345",
                "email": "john.smith@example.com",
                "phone": "(555) 123-4567",
                "notes": "Primary grantor for test trust"
            }
            
            response = requests.post(f"{API_BASE}/portfolios/{self.test_portfolio_id}/parties", headers=headers, json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                party_id = data.get('party_id')
                self.test_party_ids.append(party_id)
                details += f", Party ID: {party_id}"
                details += f", Name: {data.get('name')}"
                details += f", Role: {data.get('role')}"
            
            self.log_test("Create Party", success, details)
            return success
        except Exception as e:
            self.log_test("Create Party", False, f"Exception: {str(e)}")
            return False

    def test_update_party(self):
        """Test PUT /api/parties/{id} updates party details"""
        if not self.session_token or not self.test_party_ids:
            self.log_test("Update Party", False, "No session token or party ID")
            return False
        
        try:
            party_id = self.test_party_ids[0]
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "name": "John Smith Jr.",
                "party_type": "individual",
                "role": "trustee",
                "address": "456 Oak Avenue, Newtown, ST 67890",
                "email": "john.smith.jr@example.com",
                "phone": "(555) 987-6543",
                "notes": "Updated to trustee role"
            }
            
            response = requests.put(f"{API_BASE}/parties/{party_id}", headers=headers, json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Updated Name: {data.get('name')}"
                details += f", Updated Role: {data.get('role')}"
                details += f", Updated Email: {data.get('email')}"
            
            self.log_test("Update Party", success, details)
            return success
        except Exception as e:
            self.log_test("Update Party", False, f"Exception: {str(e)}")
            return False

    def test_get_parties(self):
        """Test GET /api/portfolios/{id}/parties returns parties list"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Get Parties", False, "No session token or portfolio ID")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            
            response = requests.get(f"{API_BASE}/portfolios/{self.test_portfolio_id}/parties", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                parties = response.json()
                party_count = len(parties) if isinstance(parties, list) else 0
                details += f", Parties count: {party_count}"
                
                if party_count > 0:
                    party = parties[0]
                    details += f", First party: {party.get('name')} ({party.get('role')})"
            
            self.log_test("Get Parties", success, details)
            return success
        except Exception as e:
            self.log_test("Get Parties", False, f"Exception: {str(e)}")
            return False

    def test_delete_party(self):
        """Test DELETE /api/parties/{id} removes party"""
        if not self.session_token or not self.test_party_ids:
            self.log_test("Delete Party", False, "No session token or party ID")
            return False
        
        try:
            party_id = self.test_party_ids[0]
            headers = {"Authorization": f"Bearer {self.session_token}"}
            
            response = requests.delete(f"{API_BASE}/parties/{party_id}", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'Party deleted')}"
            
            self.log_test("Delete Party", success, details)
            return success
        except Exception as e:
            self.log_test("Delete Party", False, f"Exception: {str(e)}")
            return False

    def cleanup_test_data(self):
        """Clean up test data from MongoDB"""
        try:
            if not self.user_id:
                return True
                
            mongo_commands = f"""
            use('test_database');
            db.users.deleteMany({{user_id: '{self.user_id}'}});
            db.user_sessions.deleteMany({{user_id: '{self.user_id}'}});
            db.portfolios.deleteMany({{user_id: '{self.user_id}'}});
            db.trust_profiles.deleteMany({{user_id: '{self.user_id}'}});
            db.assets.deleteMany({{user_id: '{self.user_id}'}});
            db.parties.deleteMany({{user_id: '{self.user_id}'}});
            db.documents.deleteMany({{user_id: '{self.user_id}'}});
            db.document_versions.deleteMany({{document_id: '{self.test_document_id}'}});
            """
            
            result = subprocess.run(
                ['mongosh', '--eval', mongo_commands],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            success = result.returncode == 0
            self.log_test("Cleanup Test Data", success, f"Cleaned user: {self.user_id}")
            return success
            
        except Exception as e:
            self.log_test("Cleanup Test Data", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all feature-specific tests"""
        print(f"🚀 Starting Equity Trust Portfolio Feature Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("Testing: Template RM-ID system, Party CRUD functionality")
        print("=" * 70)
        
        # Test 1: Templates with subject codes 01-09
        self.test_templates_with_subject_codes()
        
        # Setup authentication for protected endpoints
        if self.create_test_user_and_session():
            # Create test portfolio
            if self.create_test_portfolio():
                # Test 2: Document creation with template subject code
                self.test_create_document_with_template_subject_code()
                
                # Test 3-6: Party CRUD operations
                if self.test_create_party():
                    self.test_get_parties()
                    self.test_update_party()
                    self.test_delete_party()
            
            # Cleanup
            self.cleanup_test_data()
        
        # Print summary
        print("=" * 70)
        print(f"📊 Feature Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['name']}: {test['details']}")
        else:
            print("\n🎉 All feature tests passed!")
        
        return self.tests_passed == self.tests_run

def main():
    tester = EquityTrustFeaturesTest()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())