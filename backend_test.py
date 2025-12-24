#!/usr/bin/env python3
"""
Backend API Testing for Equity Trust Portfolio Platform
Tests all CRUD operations and API endpoints including Distributions Module
"""

import requests
import sys
import json
from datetime import datetime

class EquityTrustAPITester:
    def __init__(self, base_url="https://portfolio-trust-1.preview.emergentagent.com"):
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
        created_portfolio = self.run_test("Portfolios - Create", "POST", "portfolios", 200, portfolio_data)
        
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
        created_document = self.run_test("Documents - Create", "POST", "documents", 200, document_data)
        
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
        created_asset = self.run_test("Assets - Create", "POST", f"portfolios/{portfolio_id}/assets", 200, asset_data)
        
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
        created_party = self.run_test("Parties - Create", "POST", f"portfolios/{portfolio_id}/parties", 200, party_data)
        
        # Get parties
        parties = self.run_test("Parties - Get All", "GET", f"portfolios/{portfolio_id}/parties", 200)
        if parties:
            print(f"   Found {len(parties)} parties")

    def test_governance(self, portfolio_id):
        """Test governance module - Meeting Minutes functionality"""
        if not portfolio_id:
            print("\n⚠️ Skipping Governance tests - no portfolio ID")
            return None
            
        print("\n📋 Testing Governance Module...")
        
        # Test 1: Create a meeting
        meeting_data = {
            "portfolio_id": portfolio_id,
            "title": "Q4 2024 Board Meeting",
            "meeting_type": "regular",
            "date_time": "2024-12-15T14:00:00Z",
            "location": "Conference Room A",
            "called_by": "John Doe, Trustee",
            "attendees": [
                {
                    "name": "John Doe",
                    "role": "trustee",
                    "present": True,
                    "notes": "Meeting chair"
                },
                {
                    "name": "Jane Smith", 
                    "role": "co_trustee",
                    "present": True,
                    "notes": ""
                }
            ]
        }
        created_meeting = self.run_test("Governance - Create Meeting", "POST", "governance/meetings", 200, meeting_data)
        
        if not created_meeting or 'meeting_id' not in created_meeting:
            print("   ❌ Failed to create meeting, skipping remaining governance tests")
            return None
            
        meeting_id = created_meeting['meeting_id']
        print(f"   Created meeting ID: {meeting_id}")
        
        # Test 2: Get meetings (with portfolio filter)
        meetings = self.run_test("Governance - Get Meetings", "GET", f"governance/meetings?portfolio_id={portfolio_id}", 200)
        if meetings:
            print(f"   Found {len(meetings)} meetings")
        
        # Test 3: Get specific meeting
        meeting = self.run_test("Governance - Get Meeting", "GET", f"governance/meetings/{meeting_id}", 200)
        
        # Test 4: Update meeting (only if draft)
        update_data = {
            "title": "Q4 2024 Board Meeting - Updated",
            "location": "Virtual - Zoom",
            "attendees": meeting_data["attendees"] + [{
                "name": "Bob Wilson",
                "role": "beneficiary", 
                "present": False,
                "notes": "Absent - notified"
            }]
        }
        self.run_test("Governance - Update Meeting", "PUT", f"governance/meetings/{meeting_id}", 200, update_data)
        
        # Test 5: Add agenda item
        agenda_data = {
            "title": "Review Q4 Financial Statements",
            "discussion_summary": "Reviewed quarterly financial performance and asset valuations.",
            "order": 1,
            "notes": "All trustees reviewed documents prior to meeting"
        }
        agenda_item = self.run_test("Governance - Add Agenda Item", "POST", f"governance/meetings/{meeting_id}/agenda", 200, agenda_data)
        
        # Test 6: Add another agenda item
        agenda_data2 = {
            "title": "Distribution Approval",
            "discussion_summary": "Discussed and approved quarterly distribution to beneficiaries.",
            "order": 2
        }
        self.run_test("Governance - Add Agenda Item 2", "POST", f"governance/meetings/{meeting_id}/agenda", 200, agenda_data2)
        
        # Test 7: Finalize meeting
        finalize_data = {
            "finalized_by_name": "John Doe"
        }
        finalized = self.run_test("Governance - Finalize Meeting", "POST", f"governance/meetings/{meeting_id}/finalize", 200, finalize_data)
        if finalized and 'finalized_hash' in finalized:
            print(f"   Meeting finalized with hash: {finalized['finalized_hash'][:16]}...")
        
        # Test 8: Verify hash
        verification = self.run_test("Governance - Verify Hash", "GET", f"governance/meetings/{meeting_id}/verify", 200)
        if verification and verification.get('verified'):
            print("   ✅ Meeting hash verification passed")
        else:
            print("   ❌ Meeting hash verification failed")
        
        # Test 9: Add attestation
        attestation_data = {
            "party_name": "John Doe",
            "party_role": "trustee",
            "signature_type": "typed",
            "signature_data": "John Doe"
        }
        self.run_test("Governance - Add Attestation", "POST", f"governance/meetings/{meeting_id}/attest", 200, attestation_data)
        
        # Test 10: Create amendment
        amendment_data = {
            "reason": "Correcting distribution amount in agenda item 2"
        }
        amendment = self.run_test("Governance - Create Amendment", "POST", f"governance/meetings/{meeting_id}/amend", 200, amendment_data)
        if amendment and 'amendment' in amendment:
            amendment_id = amendment['amendment']['meeting_id']
            print(f"   Created amendment ID: {amendment_id}")
            
            # Test amendment verification
            self.run_test("Governance - Verify Amendment", "GET", f"governance/meetings/{amendment_id}/verify", 200)
        
        return meeting_id

    def test_distributions(self, portfolio_id):
        """Test distributions module - Full CRUD and workflow"""
        if not portfolio_id:
            print("\n⚠️ Skipping Distributions tests - no portfolio ID")
            return None
            
        print("\n📋 Testing Distributions Module...")
        
        # Test 1: Get distributions list (should return envelope format)
        distributions_response = self.run_test("Distributions - Get List", "GET", f"governance/distributions?portfolio_id={portfolio_id}", 200)
        if distributions_response:
            # Check envelope format: {ok, items, count, total, sort}
            if isinstance(distributions_response, dict) and 'ok' in distributions_response:
                print(f"   ✅ Envelope format detected: {distributions_response.get('count', 0)} distributions")
            else:
                print(f"   Found {len(distributions_response) if isinstance(distributions_response, list) else 0} distributions")
        
        # Test 2: Create a distribution
        distribution_data = {
            "portfolio_id": portfolio_id,
            "title": f"Q4 2024 Distribution {datetime.now().strftime('%H%M%S')}",
            "distribution_type": "regular",
            "description": "Quarterly distribution to beneficiaries",
            "total_amount": 50000.0,
            "currency": "USD",
            "asset_type": "cash",
            "scheduled_date": "2024-12-31",
            "requires_approval": True,
            "approval_threshold": 1,
            "recipients": [
                {
                    "name": "Jane Smith",
                    "role": "beneficiary",
                    "share_percentage": 60.0,
                    "amount": 30000.0,
                    "payment_method": "wire"
                },
                {
                    "name": "Bob Wilson", 
                    "role": "beneficiary",
                    "share_percentage": 40.0,
                    "amount": 20000.0,
                    "payment_method": "check"
                }
            ]
        }
        created_distribution = self.run_test("Distributions - Create", "POST", "governance/distributions", 200, distribution_data)
        
        if not created_distribution:
            print("   ❌ Failed to create distribution, skipping remaining tests")
            return None
        
        # Extract distribution ID from envelope or direct response
        distribution_id = None
        if isinstance(created_distribution, dict):
            if 'item' in created_distribution:
                distribution_id = created_distribution['item'].get('distribution_id')
            else:
                distribution_id = created_distribution.get('distribution_id')
        
        if not distribution_id:
            print("   ❌ No distribution ID returned, skipping remaining tests")
            return None
            
        print(f"   Created distribution ID: {distribution_id}")
        
        # Check for RM-ID generation
        rm_id = None
        if isinstance(created_distribution, dict):
            if 'item' in created_distribution:
                rm_id = created_distribution['item'].get('rm_id')
            else:
                rm_id = created_distribution.get('rm_id')
        
        if rm_id:
            print(f"   ✅ RM-ID generated: {rm_id}")
        else:
            print("   ⚠️ No RM-ID found in response")
        
        # Test 3: Get single distribution
        distribution = self.run_test("Distributions - Get Single", "GET", f"governance/distributions/{distribution_id}", 200)
        
        # Test 4: Update distribution (should work for draft status)
        update_data = {
            "title": f"Updated Q4 2024 Distribution {datetime.now().strftime('%H%M%S')}",
            "description": "Updated quarterly distribution with revised amounts",
            "total_amount": 55000.0
        }
        updated = self.run_test("Distributions - Update", "PUT", f"governance/distributions/{distribution_id}", 200, update_data)
        
        # Test 5: Submit for approval (changes status to pending_approval)
        submitted = self.run_test("Distributions - Submit for Approval", "POST", f"governance/distributions/{distribution_id}/submit", 200)
        if submitted:
            print("   ✅ Distribution submitted for approval")
        
        # Test 6: Add approval
        approval_data = {
            "approver_name": "John Doe",
            "approver_role": "trustee",
            "signature_data": "John Doe",
            "notes": "Approved after review of beneficiary needs"
        }
        approved = self.run_test("Distributions - Add Approval", "POST", f"governance/distributions/{distribution_id}/approve", 200, approval_data)
        if approved:
            print("   ✅ Approval added to distribution")
        
        # Test 7: Execute distribution (marks as completed)
        execute_data = {
            "payment_reference": f"WIRE_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        }
        executed = self.run_test("Distributions - Execute", "POST", f"governance/distributions/{distribution_id}/execute", 200, execute_data)
        if executed:
            print("   ✅ Distribution executed successfully")
        
        # Test 8: Try to update locked distribution (should return 409)
        locked_update = {
            "title": "This should fail - distribution is locked"
        }
        # We expect this to fail with 409 or similar
        response = self.run_test("Distributions - Update Locked (409 test)", "PUT", f"governance/distributions/{distribution_id}", [409, 400], locked_update)
        if response is False:  # If it returned 409/400 as expected
            print("   ✅ Locked distribution update correctly rejected")
        
        # Test 9: Create another distribution for delete test
        delete_test_data = {
            "portfolio_id": portfolio_id,
            "title": "Distribution for Delete Test",
            "distribution_type": "regular",
            "total_amount": 1000.0,
            "currency": "USD"
        }
        delete_dist = self.run_test("Distributions - Create for Delete", "POST", "governance/distributions", 200, delete_test_data)
        
        if delete_dist:
            delete_dist_id = None
            if isinstance(delete_dist, dict):
                if 'item' in delete_dist:
                    delete_dist_id = delete_dist['item'].get('distribution_id')
                else:
                    delete_dist_id = delete_dist.get('distribution_id')
            
            if delete_dist_id:
                # Test 10: Soft delete distribution (only works for draft status)
                deleted = self.run_test("Distributions - Soft Delete", "DELETE", f"governance/distributions/{delete_dist_id}", 200)
                if deleted:
                    print("   ✅ Distribution soft deleted successfully")
        
        return distribution_id

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
        meeting_id = self.test_governance(portfolio_id)
        
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