#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timezone, timedelta
import uuid
import subprocess

# Get backend URL from frontend .env
BACKEND_URL = "https://asset-governance.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class NewFeaturesTester:
    def __init__(self):
        self.session_token = None
        self.user_id = None
        self.test_portfolio_id = None
        self.test_trust_profile_id = None
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
    
    def test_create_portfolio(self):
        """Test POST /portfolios creates a new portfolio"""
        if not self.session_token:
            self.log_test("Create Portfolio", False, "No session token available")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "name": "Test Enhanced Portfolio",
                "description": "Test portfolio for new features testing"
            }
            
            response = requests.post(f"{API_BASE}/portfolios", headers=headers, json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.test_portfolio_id = data.get('portfolio_id')
                details += f", Portfolio ID: {self.test_portfolio_id}"
            
            self.log_test("Create Portfolio", success, details)
            return success
        except Exception as e:
            self.log_test("Create Portfolio", False, f"Exception: {str(e)}")
            return False
    
    def test_create_trust_profile_with_rm_id(self):
        """Test creating trust profile with RM-ID generation"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Create Trust Profile with RM-ID", False, "No session token or portfolio ID available")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "trust_name": "Test Enhanced Trust"
            }
            
            response = requests.post(f"{API_BASE}/trust-profiles", headers=headers, json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.test_trust_profile_id = data.get('profile_id')
                details += f", Profile ID: {self.test_trust_profile_id}"
                
                # Update with RM-ID details
                update_payload = {
                    "rm_record_id": "RF123456789US",
                    "rm_series_start": "01.001",
                    "rm_series_end": "99.999"
                }
                
                update_response = requests.put(
                    f"{API_BASE}/trust-profiles/{self.test_trust_profile_id}", 
                    headers=headers, 
                    json=update_payload, 
                    timeout=10
                )
                
                if update_response.status_code == 200:
                    details += ", RM-ID configured"
                else:
                    details += f", RM-ID config failed: {update_response.status_code}"
            
            self.log_test("Create Trust Profile with RM-ID", success, details)
            return success
        except Exception as e:
            self.log_test("Create Trust Profile with RM-ID", False, f"Exception: {str(e)}")
            return False
    
    def test_asset_creation_with_rm_id(self):
        """Test asset creation with RM-ID generation"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Asset Creation with RM-ID", False, "No session token or portfolio ID available")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "description": "Test Real Property Asset",
                "asset_type": "real_property",
                "value": 250000,
                "transaction_type": "deposit",
                "notes": "Test asset for RM-ID verification"
            }
            
            response = requests.post(
                f"{API_BASE}/portfolios/{self.test_portfolio_id}/assets", 
                headers=headers, 
                json=payload, 
                timeout=10
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                rm_id = data.get('rm_id', '')
                asset_id = data.get('asset_id', '')
                details += f", Asset ID: {asset_id}, RM-ID: {rm_id}"
                
                # Verify RM-ID format (should be like RF123456789US-01.001)
                if rm_id and '-' in rm_id:
                    details += " (RM-ID generated correctly)"
                else:
                    details += " (RM-ID format may be incorrect)"
            
            self.log_test("Asset Creation with RM-ID", success, details)
            return success
        except Exception as e:
            self.log_test("Asset Creation with RM-ID", False, f"Exception: {str(e)}")
            return False
    
    def test_trust_ledger_functionality(self):
        """Test trust ledger endpoints"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Trust Ledger Functionality", False, "No session token or portfolio ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            
            # Get ledger entries
            response = requests.get(
                f"{API_BASE}/portfolios/{self.test_portfolio_id}/ledger", 
                headers=headers, 
                timeout=10
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                entries = data.get('entries', [])
                summary = data.get('summary', {})
                details += f", Entries: {len(entries)}, Balance: {summary.get('balance', 0)}"
                
                # Test adding a manual ledger entry
                ledger_payload = {
                    "entry_type": "deposit",
                    "description": "Test manual ledger entry",
                    "value": 10000,
                    "balance_effect": "credit",
                    "notes": "Test entry for ledger functionality"
                }
                
                ledger_response = requests.post(
                    f"{API_BASE}/portfolios/{self.test_portfolio_id}/ledger",
                    headers={**headers, "Content-Type": "application/json"},
                    json=ledger_payload,
                    timeout=10
                )
                
                if ledger_response.status_code == 200:
                    details += ", Manual entry created"
                else:
                    details += f", Manual entry failed: {ledger_response.status_code}"
            
            self.log_test("Trust Ledger Functionality", success, details)
            return success
        except Exception as e:
            self.log_test("Trust Ledger Functionality", False, f"Exception: {str(e)}")
            return False
    
    def test_document_finalization_workflow(self):
        """Test document finalization (lock/unlock) workflow"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Document Finalization Workflow", False, "No session token or portfolio ID available")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            # Create a test document
            doc_payload = {
                "portfolio_id": self.test_portfolio_id,
                "title": "Test Document for Finalization",
                "document_type": "declaration_of_trust",
                "content": "<h1>Test Document</h1><p>This is a test document for finalization workflow.</p>"
            }
            
            doc_response = requests.post(f"{API_BASE}/documents", headers=headers, json=doc_payload, timeout=10)
            
            if doc_response.status_code != 200:
                self.log_test("Document Finalization Workflow", False, f"Document creation failed: {doc_response.status_code}")
                return False
            
            doc_data = doc_response.json()
            document_id = doc_data.get('document_id')
            details = f"Document created: {document_id}"
            
            # Test finalization
            finalize_response = requests.post(
                f"{API_BASE}/documents/{document_id}/finalize",
                headers=headers,
                timeout=10
            )
            
            if finalize_response.status_code == 200:
                details += ", Finalized successfully"
                
                # Test unlock
                unlock_response = requests.post(
                    f"{API_BASE}/documents/{document_id}/unlock",
                    headers=headers,
                    timeout=10
                )
                
                if unlock_response.status_code == 200:
                    details += ", Unlocked successfully"
                    success = True
                else:
                    details += f", Unlock failed: {unlock_response.status_code}"
                    success = False
            else:
                details += f", Finalization failed: {finalize_response.status_code}"
                success = False
            
            self.log_test("Document Finalization Workflow", success, details)
            return success
        except Exception as e:
            self.log_test("Document Finalization Workflow", False, f"Exception: {str(e)}")
            return False
    
    def test_parties_endpoint(self):
        """Test parties endpoint for portfolio"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Parties Endpoint", False, "No session token or portfolio ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            
            # Get parties for portfolio
            response = requests.get(
                f"{API_BASE}/portfolios/{self.test_portfolio_id}/parties", 
                headers=headers, 
                timeout=10
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                parties_count = len(data) if isinstance(data, list) else 0
                details += f", Parties count: {parties_count}"
            
            self.log_test("Parties Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Parties Endpoint", False, f"Exception: {str(e)}")
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
            db.trust_ledger.deleteMany({{user_id: '{self.user_id}'}});
            db.parties.deleteMany({{user_id: '{self.user_id}'}});
            db.documents.deleteMany({{user_id: '{self.user_id}'}});
            db.document_versions.deleteMany({{changed_by: '{self.user_id}'}});
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
    
    def run_new_features_tests(self):
        """Run tests for new features mentioned in review request"""
        print(f"🚀 Testing New Features: RM-ID, Trust Ledger, Document Finalization")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 70)
        
        # Setup authentication
        if self.create_test_user_and_session():
            # Test new features
            if self.test_create_portfolio():
                self.test_create_trust_profile_with_rm_id()
                self.test_asset_creation_with_rm_id()
                self.test_trust_ledger_functionality()
                self.test_document_finalization_workflow()
                self.test_parties_endpoint()
            
            # Cleanup
            self.cleanup_test_data()
        
        # Print summary
        print("=" * 70)
        print(f"📊 New Features Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['name']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = NewFeaturesTester()
    success = tester.run_new_features_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())