#!/usr/bin/env python3
"""
Trustee Compensation Module Testing
Tests all CRUD operations for the newly implemented Compensation module
Verifies RM-ID generation with code '24' and all compensation workflows
"""

import requests
import sys
import json
from datetime import datetime

class CompensationTester:
    def __init__(self, base_url="https://animation-cleanup.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.portfolio_id = None

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
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}")
                return {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return {}

    def setup_test_session(self):
        """Create test user and session"""
        print("🔧 Setting up test session...")
        
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

    def setup_test_portfolio(self):
        """Create a test portfolio for compensation testing"""
        print("🏠 Setting up test portfolio...")
        
        portfolio_data = {
            "name": f"Compensation Test Portfolio {datetime.now().strftime('%H%M%S')}",
            "description": "Test portfolio for compensation module testing"
        }
        
        created_portfolio = self.run_test("Setup - Create Portfolio", "POST", "portfolios", 200, portfolio_data)
        
        if created_portfolio and 'portfolio_id' in created_portfolio:
            self.portfolio_id = created_portfolio['portfolio_id']
            print(f"   Created portfolio ID: {self.portfolio_id}")
            return True
        
        return False

    def test_compensation_crud(self):
        """Test Compensation CRUD operations"""
        print("\n📋 Testing Compensation CRUD Operations...")
        
        if not self.portfolio_id:
            print("❌ No portfolio ID available for testing")
            return None
        
        # Test 1: Get compensation entries (should return envelope format)
        compensation_response = self.run_test(
            "Compensation - Get List", 
            "GET", 
            f"governance/compensation?portfolio_id={self.portfolio_id}", 
            200
        )
        
        if compensation_response:
            if isinstance(compensation_response, dict) and 'ok' in compensation_response:
                print(f"   ✅ Envelope format detected: {compensation_response.get('count', 0)} entries")
            else:
                print(f"   Found {len(compensation_response) if isinstance(compensation_response, list) else 0} entries")
        
        # Test 2: Create a compensation entry
        compensation_data = {
            "portfolio_id": self.portfolio_id,
            "title": f"Annual Trustee Fee {datetime.now().strftime('%Y')}",
            "compensation_type": "annual_fee",
            "recipient_name": "John Doe",
            "recipient_role": "trustee",
            "amount": 25000.0,
            "currency": "USD",
            "period_start": "2024-01-01",
            "period_end": "2024-12-31",
            "fiscal_year": "2024",
            "basis_of_calculation": "1% of trust assets under management",
            "notes": "Annual trustee compensation for 2024"
        }
        
        created_compensation = self.run_test(
            "Compensation - Create Entry", 
            "POST", 
            "governance/compensation", 
            200, 
            compensation_data
        )
        
        if not created_compensation:
            print("   ❌ Failed to create compensation entry, skipping remaining tests")
            return None
        
        # Extract compensation ID from envelope or direct response
        compensation_id = None
        rm_id = None
        
        if isinstance(created_compensation, dict):
            if 'item' in created_compensation:
                compensation_id = created_compensation['item'].get('compensation_id')
                rm_id = created_compensation['item'].get('rm_id')
            else:
                compensation_id = created_compensation.get('compensation_id')
                rm_id = created_compensation.get('rm_id')
        
        if not compensation_id:
            print("   ❌ No compensation ID returned, skipping remaining tests")
            return None
            
        print(f"   Created compensation ID: {compensation_id}")
        
        # Test 3: Verify RM-ID generation with code '24'
        if rm_id:
            print(f"   ✅ RM-ID generated: {rm_id}")
            if '-24.' in rm_id:
                self.log_test("Compensation - RM-ID Code 24 Verification", True, f"RM-ID contains code 24: {rm_id}")
            else:
                self.log_test("Compensation - RM-ID Code 24 Verification", False, f"RM-ID does not contain code 24: {rm_id}")
        else:
            self.log_test("Compensation - RM-ID Generation", False, "No RM-ID found in response")
        
        # Test 4: Get single compensation entry
        compensation = self.run_test(
            "Compensation - Get Single Entry", 
            "GET", 
            f"governance/compensation/{compensation_id}", 
            200
        )
        
        # Test 5: Update compensation entry
        update_data = {
            "title": f"Updated Annual Trustee Fee {datetime.now().strftime('%Y')}",
            "amount": 27500.0,
            "notes": "Updated compensation amount after board review"
        }
        
        updated = self.run_test(
            "Compensation - Update Entry", 
            "PUT", 
            f"governance/compensation/{compensation_id}", 
            200, 
            update_data
        )
        
        # Test 6: Create another compensation entry for different type
        hourly_compensation_data = {
            "portfolio_id": self.portfolio_id,
            "title": "Special Project Compensation",
            "compensation_type": "hourly",
            "recipient_name": "Jane Smith",
            "recipient_role": "co_trustee",
            "amount": 7500.0,
            "currency": "USD",
            "hours_worked": 50.0,
            "hourly_rate": 150.0,
            "basis_of_calculation": "50 hours at $150/hour for estate planning project",
            "notes": "Special project compensation for estate restructuring"
        }
        
        hourly_compensation = self.run_test(
            "Compensation - Create Hourly Entry", 
            "POST", 
            "governance/compensation", 
            200, 
            hourly_compensation_data
        )
        
        hourly_compensation_id = None
        if hourly_compensation:
            if isinstance(hourly_compensation, dict):
                if 'item' in hourly_compensation:
                    hourly_compensation_id = hourly_compensation['item'].get('compensation_id')
                    hourly_rm_id = hourly_compensation['item'].get('rm_id')
                else:
                    hourly_compensation_id = hourly_compensation.get('compensation_id')
                    hourly_rm_id = hourly_compensation.get('rm_id')
            
            if hourly_rm_id:
                print(f"   ✅ Second RM-ID generated: {hourly_rm_id}")
                if '-24.' in hourly_rm_id:
                    self.log_test("Compensation - Second RM-ID Code 24 Verification", True, f"Second RM-ID contains code 24: {hourly_rm_id}")
                else:
                    self.log_test("Compensation - Second RM-ID Code 24 Verification", False, f"Second RM-ID does not contain code 24: {hourly_rm_id}")
        
        # Test 7: Get compensation list with portfolio filter (should show both entries)
        filtered_compensation = self.run_test(
            "Compensation - Get List with Portfolio Filter", 
            "GET", 
            f"governance/compensation?portfolio_id={self.portfolio_id}", 
            200
        )
        
        if filtered_compensation:
            if isinstance(filtered_compensation, dict) and 'items' in filtered_compensation:
                items_count = len(filtered_compensation['items'])
                if items_count >= 2:
                    self.log_test("Compensation - Portfolio Filter Test", True, f"Found {items_count} compensation entries")
                else:
                    self.log_test("Compensation - Portfolio Filter Test", False, f"Expected at least 2 entries, found {items_count}")
            elif isinstance(filtered_compensation, list):
                if len(filtered_compensation) >= 2:
                    self.log_test("Compensation - Portfolio Filter Test", True, f"Found {len(filtered_compensation)} compensation entries")
                else:
                    self.log_test("Compensation - Portfolio Filter Test", False, f"Expected at least 2 entries, found {len(filtered_compensation)}")
        
        # Test 8: Test soft delete (only works for draft status)
        if hourly_compensation_id:
            deleted = self.run_test(
                "Compensation - Soft Delete", 
                "DELETE", 
                f"governance/compensation/{hourly_compensation_id}", 
                200
            )
            if deleted:
                print("   ✅ Compensation entry soft deleted successfully")
        
        return compensation_id

    def test_compensation_summary(self):
        """Test compensation summary endpoint"""
        print("\n📋 Testing Compensation Summary...")
        
        if not self.portfolio_id:
            print("❌ No portfolio ID available for summary testing")
            return
        
        # Test compensation summary endpoint
        summary = self.run_test(
            "Compensation - Get Summary", 
            "GET", 
            f"governance/compensation/summary?portfolio_id={self.portfolio_id}", 
            200
        )
        
        if summary:
            if isinstance(summary, dict):
                if 'item' in summary:
                    summary_data = summary['item']
                else:
                    summary_data = summary
                
                # Check for expected summary fields
                expected_fields = ['total_compensation', 'compensation_count']
                for field in expected_fields:
                    if field in summary_data:
                        print(f"   ✅ Summary contains {field}: {summary_data[field]}")
                    else:
                        print(f"   ⚠️ Summary missing {field}")
                
                # Log the summary test result
                if any(field in summary_data for field in expected_fields):
                    self.log_test("Compensation - Summary Endpoint", True, "Summary data returned successfully")
                else:
                    self.log_test("Compensation - Summary Endpoint", False, "Summary data incomplete")
            else:
                self.log_test("Compensation - Summary Endpoint", False, "Unexpected summary response format")

    def test_compensation_workflow(self):
        """Test compensation approval workflow"""
        print("\n📋 Testing Compensation Workflow...")
        
        if not self.portfolio_id:
            print("❌ No portfolio ID available for workflow testing")
            return
        
        # Create a compensation entry that requires approval
        workflow_data = {
            "portfolio_id": self.portfolio_id,
            "title": "Quarterly Trustee Fee Q4 2024",
            "compensation_type": "transaction_fee",
            "recipient_name": "Robert Johnson",
            "recipient_role": "trustee",
            "amount": 5000.0,
            "currency": "USD",
            "requires_approval": True,
            "approval_threshold": 1,
            "basis_of_calculation": "Transaction fee for Q4 distributions",
            "notes": "Quarterly compensation requiring board approval"
        }
        
        workflow_compensation = self.run_test(
            "Compensation - Create with Approval Workflow", 
            "POST", 
            "governance/compensation", 
            200, 
            workflow_data
        )
        
        if workflow_compensation:
            workflow_id = None
            if isinstance(workflow_compensation, dict):
                if 'item' in workflow_compensation:
                    workflow_id = workflow_compensation['item'].get('compensation_id')
                    workflow_rm_id = workflow_compensation['item'].get('rm_id')
                else:
                    workflow_id = workflow_compensation.get('compensation_id')
                    workflow_rm_id = workflow_compensation.get('rm_id')
            
            if workflow_id:
                print(f"   Created workflow compensation ID: {workflow_id}")
                
                if workflow_rm_id and '-24.' in workflow_rm_id:
                    self.log_test("Compensation - Workflow RM-ID Code 24", True, f"Workflow RM-ID contains code 24: {workflow_rm_id}")
                
                # Test approval process (if endpoints exist)
                approval_data = {
                    "approver_name": "Board Chair",
                    "approver_role": "trustee",
                    "status": "approved",
                    "notes": "Approved by board resolution"
                }
                
                # Note: This endpoint might not exist yet, so we'll test it but not fail if it doesn't work
                try:
                    url = f"{self.base_url}/api/governance/compensation/{workflow_id}/approve"
                    headers = {'Content-Type': 'application/json'}
                    if self.session_token:
                        headers['Authorization'] = f'Bearer {self.session_token}'
                    
                    response = requests.post(url, json=approval_data, headers=headers, timeout=10)
                    if response.status_code == 200:
                        self.log_test("Compensation - Approval Process", True, "Approval added successfully")
                    elif response.status_code == 404:
                        self.log_test("Compensation - Approval Process", False, "Approval endpoint not implemented yet")
                    else:
                        self.log_test("Compensation - Approval Process", False, f"Approval failed with status {response.status_code}")
                except Exception as e:
                    self.log_test("Compensation - Approval Process", False, f"Approval test error: {str(e)}")

    def run_all_tests(self):
        """Run all compensation tests"""
        print("🚀 Starting Trustee Compensation Module Tests")
        print("=" * 60)
        
        # Setup test session
        if not self.setup_test_session():
            print("❌ Failed to setup test session, aborting tests")
            return False
        
        # Setup test portfolio
        if not self.setup_test_portfolio():
            print("❌ Failed to setup test portfolio, aborting tests")
            return False
        
        # Run compensation tests
        compensation_id = self.test_compensation_crud()
        self.test_compensation_summary()
        self.test_compensation_workflow()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Compensation Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All compensation tests passed!")
            return True
        else:
            print("⚠️ Some compensation tests failed")
            failed_tests = [t for t in self.test_results if not t['success']]
            for test in failed_tests:
                print(f"   ❌ {test['test']}: {test['details']}")
            return False

def main():
    tester = CompensationTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())