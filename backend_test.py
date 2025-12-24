#!/usr/bin/env python3
"""
Backend API Testing for Equity Trust Portfolio Platform
Tests all CRUD operations and API endpoints
"""

import requests
import sys
import json
from datetime import datetime

class EquityTrustAPITester:
    def __init__(self, base_url="https://equity-trust-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return response.json() if response.content else {}
                except:
                    return {}
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}")
                return {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return {}

    def setup_test_session(self):
        """Create test user and session"""
        print("🔧 Setting up test session...")
        
        # Create test user and session via MongoDB
        import subprocess
        
        timestamp = int(datetime.now().timestamp() * 1000)
        self.user_id = f"test-user-{timestamp}"
        self.session_token = f"test_session_{timestamp}"
        
        mongo_script = f'''
        use('test_database');
        db.users.insertOne({{
          user_id: "{self.user_id}",
          email: "test.user.{timestamp}@example.com",
          name: "Test User",
          picture: "https://via.placeholder.com/150",
          created_at: new Date()
        }});
        db.user_sessions.insertOne({{
          user_id: "{self.user_id}",
          session_token: "{self.session_token}",
          expires_at: new Date(Date.now() + 7*24*60*60*1000),
          created_at: new Date()
        }});
        '''
        
        try:
            result = subprocess.run(['mongosh', '--eval', mongo_script], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                print(f"✅ Test session created: {self.session_token}")
                return True
            else:
                print(f"❌ Failed to create test session: {result.stderr}")
                return False
        except Exception as e:
            print(f"❌ Error creating test session: {e}")
            return False

    def test_auth(self):
        """Test authentication endpoints"""
        print("\n📋 Testing Authentication...")
        
        # Test auth/me endpoint
        response = self.run_test("Auth - Get User Info", "GET", "auth/me", 200)
        if response and 'user_id' in response:
            print(f"   User ID: {response['user_id']}")
            print(f"   Email: {response['email']}")

    def test_templates(self):
        """Test template endpoints"""
        print("\n📋 Testing Templates...")
        
        # Test get templates (public endpoint)
        templates = self.run_test("Templates - Get All", "GET", "templates", 200)
        if templates:
            print(f"   Found {len(templates)} templates")
            for template in templates[:3]:  # Show first 3
                print(f"   - {template.get('name', 'Unknown')}")

    def test_portfolios(self):
        """Test portfolio CRUD operations"""
        print("\n📋 Testing Portfolios...")
        
        # Get portfolios (should be empty initially)
        portfolios = self.run_test("Portfolios - Get All", "GET", "portfolios", 200)
        
        # Create a portfolio
        portfolio_data = {
            "name": "Test Portfolio",
            "description": "Test portfolio for API testing"
        }
        created_portfolio = self.run_test("Portfolios - Create", "POST", "portfolios", 201, portfolio_data)
        
        if created_portfolio and 'portfolio_id' in created_portfolio:
            portfolio_id = created_portfolio['portfolio_id']
            print(f"   Created portfolio ID: {portfolio_id}")
            
            # Get specific portfolio
            self.run_test("Portfolios - Get Specific", "GET", f"portfolios/{portfolio_id}", 200)
            
            # Update portfolio
            update_data = {
                "name": "Updated Test Portfolio",
                "description": "Updated description"
            }
            self.run_test("Portfolios - Update", "PUT", f"portfolios/{portfolio_id}", 200, update_data)
            
            return portfolio_id
        
        return None

    def test_documents(self, portfolio_id=None):
        """Test document CRUD operations"""
        print("\n📋 Testing Documents...")
        
        # Get documents (should be empty initially)
        documents = self.run_test("Documents - Get All", "GET", "documents", 200)
        
        # Create a document
        document_data = {
            "title": "Test Document",
            "document_type": "declaration_of_trust",
            "portfolio_id": portfolio_id,
            "content": "<h1>Test Document</h1><p>This is a test document.</p>",
            "tags": ["test"],
            "folder": "/"
        }
        created_document = self.run_test("Documents - Create", "POST", "documents", 201, document_data)
        
        if created_document and 'document_id' in created_document:
            document_id = created_document['document_id']
            print(f"   Created document ID: {document_id}")
            
            # Get specific document
            self.run_test("Documents - Get Specific", "GET", f"documents/{document_id}", 200)
            
            # Update document
            update_data = {
                "title": "Updated Test Document",
                "content": "<h1>Updated Test Document</h1><p>This is an updated test document.</p>"
            }
            self.run_test("Documents - Update", "PUT", f"documents/{document_id}", 200, update_data)
            
            # Test trash functionality
            self.run_test("Documents - Move to Trash", "POST", f"documents/{document_id}/trash", 200)
            
            # Test get trashed documents
            trashed = self.run_test("Documents - Get Trash", "GET", "documents/trash", 200)
            if trashed:
                print(f"   Found {len(trashed)} trashed documents")
            
            # Test restore document
            self.run_test("Documents - Restore", "POST", f"documents/{document_id}/restore", 200)
            
            return document_id
        
        return None

    def test_assets_and_ledger(self, portfolio_id):
        """Test assets and ledger functionality"""
        if not portfolio_id:
            print("\n⚠️ Skipping Assets/Ledger tests - no portfolio ID")
            return
            
        print("\n📋 Testing Assets & Ledger...")
        
        # Create an asset
        asset_data = {
            "description": "Test Real Property",
            "asset_type": "real_property",
            "subject_code": "01",
            "value": 250000,
            "transaction_type": "deposit",
            "notes": "Test asset for API testing"
        }
        created_asset = self.run_test("Assets - Create", "POST", f"portfolios/{portfolio_id}/assets", 201, asset_data)
        
        # Get assets
        assets = self.run_test("Assets - Get All", "GET", f"portfolios/{portfolio_id}/assets", 200)
        if assets:
            print(f"   Found {len(assets)} assets")
        
        # Get ledger
        ledger = self.run_test("Ledger - Get", "GET", f"portfolios/{portfolio_id}/ledger", 200)
        if ledger and 'entries' in ledger:
            print(f"   Found {len(ledger['entries'])} ledger entries")
            if 'summary' in ledger:
                balance = ledger['summary'].get('balance', 0)
                print(f"   Current balance: ${balance:,.2f}")

    def test_parties(self, portfolio_id):
        """Test parties functionality"""
        if not portfolio_id:
            print("\n⚠️ Skipping Parties tests - no portfolio ID")
            return
            
        print("\n📋 Testing Parties...")
        
        # Create a party
        party_data = {
            "name": "John Doe",
            "role": "grantor",
            "address": "123 Test Street, Test City, TS 12345",
            "email": "john.doe@example.com",
            "phone": "555-123-4567",
            "notes": "Test grantor for API testing"
        }
        created_party = self.run_test("Parties - Create", "POST", f"portfolios/{portfolio_id}/parties", 201, party_data)
        
        # Get parties
        parties = self.run_test("Parties - Get All", "GET", f"parties?portfolio_id={portfolio_id}", 200)
        if parties:
            print(f"   Found {len(parties)} parties")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Equity Trust API Tests")
        print("=" * 50)
        
        # Setup test session
        if not self.setup_test_session():
            print("❌ Failed to setup test session, aborting tests")
            return False
        
        # Run tests
        self.test_auth()
        self.test_templates()
        portfolio_id = self.test_portfolios()
        document_id = self.test_documents(portfolio_id)
        self.test_assets_and_ledger(portfolio_id)
        self.test_parties(portfolio_id)
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️ Some tests failed")
            failed_tests = [t for t in self.test_results if not t['success']]
            for test in failed_tests:
                print(f"   ❌ {test['test']}: {test['details']}")
            return False

def main():
    tester = EquityTrustAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())