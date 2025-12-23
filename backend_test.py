#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timezone, timedelta
import uuid
import os

# Get backend URL from frontend .env
BACKEND_URL = "https://trustvault-1.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class TrustVaultAPITester:
    def __init__(self):
        self.session_token = None
        self.user_id = None
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
        else:
            self.failed_tests.append({"name": name, "details": details})
            print(f"❌ {name} - {details}")
        
    def test_health_check(self):
        """Test health endpoint"""
        try:
            response = requests.get(f"{API_BASE}/health", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Response: {data}"
            self.log_test("Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            return False
    
    def test_root_endpoint(self):
        """Test root API endpoint"""
        try:
            response = requests.get(f"{API_BASE}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'N/A')}"
            self.log_test("Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_templates_endpoint(self):
        """Test templates endpoint (public)"""
        try:
            response = requests.get(f"{API_BASE}/templates", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                template_count = len(data) if isinstance(data, list) else 0
                details += f", Templates count: {template_count}"
                # Check if we have the expected 4 templates
                expected_templates = ['declaration_of_trust', 'trust_transfer_grant_deed', 'notice_of_intent', 'affidavit_of_fact']
                if template_count == 4:
                    template_ids = [t.get('id') for t in data]
                    if all(tid in template_ids for tid in expected_templates):
                        details += " (All expected templates present)"
                    else:
                        details += f" (Missing templates: {set(expected_templates) - set(template_ids)})"
            self.log_test("Templates Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Templates Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_protected_endpoints_without_auth(self):
        """Test that protected endpoints return 401 without authentication"""
        endpoints = [
            "/auth/me",
            "/trusts",
        ]
        
        all_success = True
        for endpoint in endpoints:
            try:
                response = requests.get(f"{API_BASE}{endpoint}", timeout=10)
                success = response.status_code == 401
                details = f"Status: {response.status_code} (Expected: 401)"
                self.log_test(f"Protected endpoint {endpoint} without auth", success, details)
                if not success:
                    all_success = False
            except Exception as e:
                self.log_test(f"Protected endpoint {endpoint} without auth", False, f"Exception: {str(e)}")
                all_success = False
        
        return all_success
    
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
            import subprocess
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
    
    def test_auth_me_endpoint(self):
        """Test /auth/me endpoint with valid session"""
        if not self.session_token:
            self.log_test("Auth Me Endpoint", False, "No session token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", User ID: {data.get('user_id', 'N/A')}"
                # Verify the returned user_id matches our test user
                if data.get('user_id') == self.user_id:
                    details += " (Correct user)"
                else:
                    success = False
                    details += " (Wrong user returned)"
            
            self.log_test("Auth Me Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Auth Me Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_get_trusts_empty(self):
        """Test GET /trusts returns empty array for new user"""
        if not self.session_token:
            self.log_test("Get Trusts (Empty)", False, "No session token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{API_BASE}/trusts", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if isinstance(data, list) and len(data) == 0:
                    details += ", Empty array returned (correct)"
                else:
                    details += f", Unexpected data: {data}"
            
            self.log_test("Get Trusts (Empty)", success, details)
            return success
        except Exception as e:
            self.log_test("Get Trusts (Empty)", False, f"Exception: {str(e)}")
            return False
    
    def test_create_trust_document(self):
        """Test POST /trusts creates a new trust document"""
        if not self.session_token:
            self.log_test("Create Trust Document", False, "No session token available")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "document_type": "declaration_of_trust",
                "title": "Test Trust Document"
            }
            
            response = requests.post(f"{API_BASE}/trusts", headers=headers, json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.test_document_id = data.get('document_id')
                details += f", Document ID: {self.test_document_id}"
            
            self.log_test("Create Trust Document", success, details)
            return success
        except Exception as e:
            self.log_test("Create Trust Document", False, f"Exception: {str(e)}")
            return False
    
    def test_get_specific_trust(self):
        """Test GET /trusts/:id returns specific trust document"""
        if not self.session_token or not self.test_document_id:
            self.log_test("Get Specific Trust", False, "No session token or document ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{API_BASE}/trusts/{self.test_document_id}", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Title: {data.get('title', 'N/A')}"
                details += f", Type: {data.get('document_type', 'N/A')}"
            
            self.log_test("Get Specific Trust", success, details)
            return success
        except Exception as e:
            self.log_test("Get Specific Trust", False, f"Exception: {str(e)}")
            return False
    
    def test_update_trust_document(self):
        """Test PUT /trusts/:id updates a trust document"""
        if not self.session_token or not self.test_document_id:
            self.log_test("Update Trust Document", False, "No session token or document ID available")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "title": "Updated Test Trust Document",
                "status": "completed",
                "grantor_name": "John Doe",
                "trust_name": "Test Family Trust"
            }
            
            response = requests.put(f"{API_BASE}/trusts/{self.test_document_id}", headers=headers, json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Updated Title: {data.get('title', 'N/A')}"
                details += f", Status: {data.get('status', 'N/A')}"
            
            self.log_test("Update Trust Document", success, details)
            return success
        except Exception as e:
            self.log_test("Update Trust Document", False, f"Exception: {str(e)}")
            return False
    
    def test_download_pdf(self):
        """Test GET /trusts/:id/pdf generates and downloads PDF"""
        if not self.session_token or not self.test_document_id:
            self.log_test("Download PDF", False, "No session token or document ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{API_BASE}/trusts/{self.test_document_id}/pdf", headers=headers, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                details += f", Content-Type: {content_type}, Size: {content_length} bytes"
                
                # Check if it's actually a PDF
                if content_type == 'application/pdf' and content_length > 1000:
                    details += " (Valid PDF)"
                else:
                    success = False
                    details += " (Invalid PDF)"
            
            self.log_test("Download PDF", success, details)
            return success
        except Exception as e:
            self.log_test("Download PDF", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_trust_document(self):
        """Test DELETE /trusts/:id deletes a document"""
        if not self.session_token or not self.test_document_id:
            self.log_test("Delete Trust Document", False, "No session token or document ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.delete(f"{API_BASE}/trusts/{self.test_document_id}", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'N/A')}"
            
            self.log_test("Delete Trust Document", success, details)
            return success
        except Exception as e:
            self.log_test("Delete Trust Document", False, f"Exception: {str(e)}")
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
            db.trust_documents.deleteMany({{user_id: '{self.user_id}'}});
            """
            
            import subprocess
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
        """Run all backend API tests"""
        print(f"🚀 Starting Trust Vault API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Basic connectivity tests
        self.test_health_check()
        self.test_root_endpoint()
        self.test_templates_endpoint()
        self.test_protected_endpoints_without_auth()
        
        # Authentication setup
        if self.create_test_user_and_session():
            # Authenticated tests
            self.test_auth_me_endpoint()
            self.test_get_trusts_empty()
            
            # CRUD operations
            if self.test_create_trust_document():
                self.test_get_specific_trust()
                self.test_update_trust_document()
                self.test_download_pdf()
                self.test_delete_trust_document()
            
            # Cleanup
            self.cleanup_test_data()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['name']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = TrustVaultAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())