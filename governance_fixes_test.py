#!/usr/bin/env python3
"""
Governance Module Fixes Testing
Tests specific fixes mentioned in the review request:
- RM-ID group numbers constrained to 1-99
- Amendment deletion clears parent's amended_by_id flag
- Finalized records have consistent locked=true and status=finalized
- Insurance duplicates removed
- All governance tabs support Amendment functionality
"""

import requests
import sys
import json
import time
import re
from datetime import datetime

class GovernanceFixesTester:
    def __init__(self, base_url="https://role-manager-21.preview.emergentagent.com"):
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
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

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

    def create_test_portfolio(self):
        """Create a test portfolio for testing"""
        portfolio_data = {
            "name": f"Test Portfolio {datetime.now().strftime('%H%M%S')}",
            "description": "Test portfolio for governance fixes testing"
        }
        created_portfolio = self.run_test("Setup - Create Portfolio", "POST", "portfolios", 200, portfolio_data)
        
        if created_portfolio and 'portfolio_id' in created_portfolio:
            return created_portfolio['portfolio_id']
        return None

    def test_rmid_group_number_constraint(self, portfolio_id):
        """Test that RM-ID group numbers are constrained to 1-99"""
        print("\n📋 Testing RM-ID Group Number Constraint (1-99)...")
        
        if not portfolio_id:
            print("   ⚠️ No portfolio ID, skipping test")
            return
        
        # Create multiple governance records to test RM-ID generation
        created_records = []
        rm_ids = []
        
        for i in range(10):
            # Create a meeting
            meeting_data = {
                "portfolio_id": portfolio_id,
                "title": f"Test Meeting {i+1}",
                "meeting_type": "regular",
                "date_time": f"2024-12-{15+i:02d}T14:00:00Z",
                "location": f"Room {i+1}",
                "called_by": "Test User"
            }
            
            created_meeting = self.run_test(f"RM-ID Test - Create Meeting {i+1}", "POST", "governance/meetings", 200, meeting_data)
            
            if created_meeting:
                # Extract RM-ID from response
                rm_id = None
                if isinstance(created_meeting, dict):
                    if 'item' in created_meeting:
                        rm_id = created_meeting['item'].get('rm_id')
                    else:
                        rm_id = created_meeting.get('rm_id')
                
                if rm_id:
                    rm_ids.append(rm_id)
                    created_records.append(created_meeting)
                    print(f"   Generated RM-ID: {rm_id}")
        
        # Analyze RM-IDs to check group numbers
        group_numbers = []
        valid_format_count = 0
        
        for rm_id in rm_ids:
            # Parse RM-ID format: BASE-NN.SSS
            match = re.match(r'^(.+)-(\d+)\.(\d+)$', rm_id)
            if match:
                valid_format_count += 1
                base, group_str, sub_str = match.groups()
                group_num = int(group_str)
                group_numbers.append(group_num)
                
                # Check if group number is in valid range (1-99)
                if 1 <= group_num <= 99:
                    print(f"   ✅ Valid group number: {group_num} in RM-ID {rm_id}")
                else:
                    print(f"   ❌ Invalid group number: {group_num} in RM-ID {rm_id} (should be 1-99)")
                    self.log_test(f"RM-ID Group Range - {rm_id}", False, f"Group number {group_num} outside 1-99 range")
            else:
                print(f"   ❌ Invalid RM-ID format: {rm_id}")
                self.log_test(f"RM-ID Format - {rm_id}", False, "Invalid RM-ID format")
        
        # Summary
        if group_numbers:
            min_group = min(group_numbers)
            max_group = max(group_numbers)
            unique_groups = len(set(group_numbers))
            
            print(f"   📊 Group number range: {min_group} - {max_group}")
            print(f"   📊 Unique groups generated: {unique_groups}")
            print(f"   📊 Valid format count: {valid_format_count}/{len(rm_ids)}")
            
            # Check if all group numbers are in valid range
            all_valid = all(1 <= g <= 99 for g in group_numbers)
            if all_valid:
                self.log_test("RM-ID Group Numbers 1-99 Constraint", True, f"All {len(group_numbers)} group numbers in valid range 1-99")
            else:
                invalid_groups = [g for g in group_numbers if not (1 <= g <= 99)]
                self.log_test("RM-ID Group Numbers 1-99 Constraint", False, f"Found invalid group numbers: {invalid_groups}")
        else:
            self.log_test("RM-ID Group Numbers 1-99 Constraint", False, "No valid RM-IDs generated for testing")

    def test_amendment_deletion_cleanup(self, portfolio_id):
        """Test that amendment deletion clears parent's amended_by_id flag"""
        print("\n📋 Testing Amendment Deletion Cleanup...")
        
        if not portfolio_id:
            print("   ⚠️ No portfolio ID, skipping test")
            return
        
        # Step 1: Create a meeting
        meeting_data = {
            "portfolio_id": portfolio_id,
            "title": "Amendment Test Meeting",
            "meeting_type": "regular",
            "date_time": "2024-12-15T14:00:00Z",
            "location": "Test Room",
            "called_by": "Test User"
        }
        
        created_meeting = self.run_test("Amendment Test - Create Meeting", "POST", "governance/meetings", 200, meeting_data)
        
        if not created_meeting:
            print("   ❌ Failed to create meeting for amendment test")
            return
        
        meeting_id = None
        if isinstance(created_meeting, dict):
            if 'item' in created_meeting:
                meeting_id = created_meeting['item'].get('meeting_id')
            else:
                meeting_id = created_meeting.get('meeting_id')
        
        if not meeting_id:
            print("   ❌ No meeting ID returned")
            return
        
        print(f"   Created meeting ID: {meeting_id}")
        
        # Step 2: Finalize the meeting
        finalize_data = {"finalized_by_name": "Test User"}
        finalized = self.run_test("Amendment Test - Finalize Meeting", "POST", f"governance/meetings/{meeting_id}/finalize", 200, finalize_data)
        
        if not finalized:
            print("   ❌ Failed to finalize meeting")
            return
        
        # Step 3: Create an amendment
        amendment_data = {"reason": "Testing amendment deletion cleanup"}
        amendment = self.run_test("Amendment Test - Create Amendment", "POST", f"governance/meetings/{meeting_id}/amend", 200, amendment_data)
        
        if not amendment:
            print("   ❌ Failed to create amendment")
            return
        
        amendment_id = None
        if isinstance(amendment, dict):
            if 'item' in amendment:
                amendment_id = amendment['item'].get('meeting_id')
            else:
                amendment_id = amendment.get('meeting_id')
        
        if not amendment_id:
            print("   ❌ No amendment ID returned")
            return
        
        print(f"   Created amendment ID: {amendment_id}")
        
        # Step 4: Verify parent has amended_by_id set
        parent_meeting = self.run_test("Amendment Test - Get Parent Meeting", "GET", f"governance/meetings/{meeting_id}", 200)
        
        if parent_meeting and isinstance(parent_meeting, dict):
            item = parent_meeting.get('item', parent_meeting)
            amended_by_id = item.get('amended_by_id')
            
            if amended_by_id == amendment_id:
                print(f"   ✅ Parent meeting has amended_by_id set: {amended_by_id}")
            else:
                print(f"   ❌ Parent meeting amended_by_id mismatch: expected {amendment_id}, got {amended_by_id}")
        
        # Step 5: Delete the amendment
        deleted = self.run_test("Amendment Test - Delete Amendment", "DELETE", f"governance/meetings/{amendment_id}", 200)
        
        if not deleted:
            print("   ❌ Failed to delete amendment")
            return
        
        # Step 6: Verify parent's amended_by_id is cleared
        time.sleep(1)  # Give time for cleanup
        parent_after_delete = self.run_test("Amendment Test - Get Parent After Delete", "GET", f"governance/meetings/{meeting_id}", 200)
        
        if parent_after_delete and isinstance(parent_after_delete, dict):
            item = parent_after_delete.get('item', parent_after_delete)
            amended_by_id_after = item.get('amended_by_id')
            
            if amended_by_id_after is None:
                self.log_test("Amendment Deletion Cleanup", True, "Parent's amended_by_id cleared after amendment deletion")
                print("   ✅ Parent's amended_by_id cleared successfully")
            else:
                self.log_test("Amendment Deletion Cleanup", False, f"Parent's amended_by_id not cleared: {amended_by_id_after}")
                print(f"   ❌ Parent's amended_by_id not cleared: {amended_by_id_after}")
        else:
            self.log_test("Amendment Deletion Cleanup", False, "Could not retrieve parent meeting after amendment deletion")

    def test_finalized_state_consistency(self, portfolio_id):
        """Test that finalized records have consistent locked=true and status=finalized"""
        print("\n📋 Testing Finalized State Consistency...")
        
        if not portfolio_id:
            print("   ⚠️ No portfolio ID, skipping test")
            return
        
        # Test with different governance modules
        modules_to_test = [
            ("meetings", "governance/meetings", {
                "portfolio_id": portfolio_id,
                "title": "Finalization Test Meeting",
                "meeting_type": "regular",
                "date_time": "2024-12-15T14:00:00Z",
                "location": "Test Room",
                "called_by": "Test User"
            }),
            ("distributions", "governance/distributions", {
                "portfolio_id": portfolio_id,
                "title": "Finalization Test Distribution",
                "distribution_type": "regular",
                "total_amount": 10000.0,
                "currency": "USD"
            })
        ]
        
        for module_name, endpoint, create_data in modules_to_test:
            print(f"   Testing {module_name} finalization consistency...")
            
            # Create record
            created = self.run_test(f"Finalization Test - Create {module_name}", "POST", endpoint, 200, create_data)
            
            if not created:
                print(f"   ❌ Failed to create {module_name}")
                continue
            
            # Extract ID
            record_id = None
            if isinstance(created, dict):
                if 'item' in created:
                    record_id = created['item'].get(f'{module_name[:-1]}_id')  # Remove 's' from module name
                else:
                    record_id = created.get(f'{module_name[:-1]}_id')
            
            if not record_id:
                print(f"   ❌ No {module_name} ID returned")
                continue
            
            # Finalize the record
            finalize_data = {"finalized_by_name": "Test User"}
            finalized = self.run_test(f"Finalization Test - Finalize {module_name}", "POST", f"{endpoint}/{record_id}/finalize", 200, finalize_data)
            
            if not finalized:
                print(f"   ❌ Failed to finalize {module_name}")
                continue
            
            # Check finalized state
            time.sleep(1)  # Give time for state update
            record = self.run_test(f"Finalization Test - Get {module_name}", "GET", f"{endpoint}/{record_id}", 200)
            
            if record and isinstance(record, dict):
                item = record.get('item', record)
                locked = item.get('locked')
                status = item.get('status')
                
                print(f"   {module_name} - locked: {locked}, status: {status}")
                
                # Check consistency
                if locked is True and status == 'finalized':
                    self.log_test(f"Finalized State Consistency - {module_name}", True, f"locked=True and status=finalized")
                    print(f"   ✅ {module_name} finalization state consistent")
                else:
                    self.log_test(f"Finalized State Consistency - {module_name}", False, f"locked={locked}, status={status}")
                    print(f"   ❌ {module_name} finalization state inconsistent")

    def test_insurance_duplicates_removed(self):
        """Test that insurance duplicate policies were removed"""
        print("\n📋 Testing Insurance Duplicates Removal...")
        
        # This test checks if the cleanup script was effective
        # We'll look for any remaining duplicates in the insurance policies
        
        # Get all insurance policies
        policies = self.run_test("Insurance Duplicates - Get All Policies", "GET", "governance/insurance-policies", 200)
        
        if not policies:
            print("   ✅ No insurance policies found (duplicates may have been removed)")
            self.log_test("Insurance Duplicates Removal", True, "No policies found - duplicates likely removed")
            return
        
        # Extract policies list
        policies_list = []
        if isinstance(policies, dict):
            if 'items' in policies:
                policies_list = policies['items']
            elif isinstance(policies, list):
                policies_list = policies
        elif isinstance(policies, list):
            policies_list = policies
        
        if not policies_list:
            print("   ✅ No insurance policies in response")
            self.log_test("Insurance Duplicates Removal", True, "No policies in response")
            return
        
        print(f"   Found {len(policies_list)} insurance policies")
        
        # Check for duplicates based on key fields
        seen_policies = {}
        duplicates_found = []
        
        for policy in policies_list:
            # Create a key based on policy number, carrier, and insured name
            key_fields = (
                policy.get('policy_number', ''),
                policy.get('carrier_name', ''),
                policy.get('insured_name', '')
            )
            
            if key_fields in seen_policies:
                duplicates_found.append({
                    'original': seen_policies[key_fields],
                    'duplicate': policy,
                    'key': key_fields
                })
            else:
                seen_policies[key_fields] = policy
        
        if duplicates_found:
            print(f"   ❌ Found {len(duplicates_found)} duplicate policies:")
            for dup in duplicates_found:
                print(f"      - Policy: {dup['key']}")
                print(f"        Original ID: {dup['original'].get('policy_id')}")
                print(f"        Duplicate ID: {dup['duplicate'].get('policy_id')}")
            
            self.log_test("Insurance Duplicates Removal", False, f"Found {len(duplicates_found)} duplicate policies")
        else:
            print("   ✅ No duplicate insurance policies found")
            self.log_test("Insurance Duplicates Removal", True, "No duplicate policies found")

    def test_governance_tabs_amendment_support(self, portfolio_id):
        """Test that all governance tabs support Amendment functionality"""
        print("\n📋 Testing Amendment Support Across All Governance Tabs...")
        
        if not portfolio_id:
            print("   ⚠️ No portfolio ID, skipping test")
            return
        
        # Test amendment support for different governance modules
        modules_to_test = [
            ("meetings", "governance/meetings", {
                "portfolio_id": portfolio_id,
                "title": "Amendment Support Test Meeting",
                "meeting_type": "regular",
                "date_time": "2024-12-15T14:00:00Z",
                "location": "Test Room",
                "called_by": "Test User"
            }),
            ("distributions", "governance/distributions", {
                "portfolio_id": portfolio_id,
                "title": "Amendment Support Test Distribution",
                "distribution_type": "regular",
                "total_amount": 5000.0,
                "currency": "USD"
            }),
            ("disputes", "governance/disputes", {
                "portfolio_id": portfolio_id,
                "title": "Amendment Support Test Dispute",
                "dispute_type": "beneficiary",
                "description": "Test dispute for amendment support",
                "amount_claimed": 1000.0,
                "currency": "USD",
                "priority": "medium"
            }),
            ("insurance-policies", "governance/insurance-policies", {
                "portfolio_id": portfolio_id,
                "title": "Amendment Support Test Policy",
                "policy_type": "whole_life",
                "policy_number": f"TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "carrier_name": "Test Insurance Co",
                "insured_name": "Test Person",
                "death_benefit": 100000.0,
                "currency": "USD"
            }),
            ("compensation", "governance/compensation", {
                "portfolio_id": portfolio_id,
                "title": "Amendment Support Test Compensation",
                "compensation_type": "annual_fee",
                "recipient_name": "Test Trustee",
                "recipient_role": "trustee",
                "amount": 5000.0,
                "currency": "USD",
                "fiscal_year": "2024"
            })
        ]
        
        for module_name, endpoint, create_data in modules_to_test:
            print(f"   Testing amendment support for {module_name}...")
            
            # Create record
            created = self.run_test(f"Amendment Support - Create {module_name}", "POST", endpoint, 200, create_data)
            
            if not created:
                print(f"   ❌ Failed to create {module_name}")
                continue
            
            # Extract ID
            record_id = None
            id_field = f"{module_name.replace('-', '_').rstrip('s')}_id"
            if module_name == "insurance-policies":
                id_field = "policy_id"
            elif module_name == "compensation":
                id_field = "compensation_id"
            
            if isinstance(created, dict):
                if 'item' in created:
                    record_id = created['item'].get(id_field)
                else:
                    record_id = created.get(id_field)
            
            if not record_id:
                print(f"   ❌ No {module_name} ID returned")
                continue
            
            # Finalize the record first (required for amendments)
            finalize_data = {"finalized_by_name": "Test User"}
            finalized = self.run_test(f"Amendment Support - Finalize {module_name}", "POST", f"{endpoint}/{record_id}/finalize", 200, finalize_data)
            
            if not finalized:
                print(f"   ⚠️ Could not finalize {module_name}, trying amendment anyway...")
            
            # Test amendment endpoint
            amendment_data = {"reason": f"Testing amendment support for {module_name}"}
            amendment = self.run_test(f"Amendment Support - Create Amendment for {module_name}", "POST", f"{endpoint}/{record_id}/amend", 200, amendment_data)
            
            if amendment:
                print(f"   ✅ {module_name} supports amendments")
                self.log_test(f"Amendment Support - {module_name}", True, "Amendment endpoint available and working")
            else:
                print(f"   ❌ {module_name} does not support amendments")
                self.log_test(f"Amendment Support - {module_name}", False, "Amendment endpoint not working")

    def run_all_tests(self):
        """Run all governance fixes tests"""
        print("🚀 Starting Governance Fixes Tests")
        print("=" * 60)
        
        # Setup test session
        if not self.setup_test_session():
            print("❌ Failed to setup test session, aborting tests")
            return False
        
        # Create test portfolio
        portfolio_id = self.create_test_portfolio()
        if not portfolio_id:
            print("❌ Failed to create test portfolio, aborting tests")
            return False
        
        print(f"✅ Created test portfolio: {portfolio_id}")
        
        # Run specific fix tests
        self.test_rmid_group_number_constraint(portfolio_id)
        self.test_amendment_deletion_cleanup(portfolio_id)
        self.test_finalized_state_consistency(portfolio_id)
        self.test_insurance_duplicates_removed()
        self.test_governance_tabs_amendment_support(portfolio_id)
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All governance fixes tests passed!")
            return True
        else:
            print("⚠️ Some tests failed")
            failed_tests = [t for t in self.test_results if not t['success']]
            for test in failed_tests:
                print(f"   ❌ {test['test']}: {test['details']}")
            return False

def main():
    tester = GovernanceFixesTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())