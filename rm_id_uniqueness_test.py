#!/usr/bin/env python3
"""
RM-ID Uniqueness Testing for Governance Modules
Tests that each governance module gets its designated RM-ID code:
- Meetings: 20
- Distributions: 21  
- Disputes: 22
- Insurance: 23
"""

import requests
import sys
import json
import subprocess
from datetime import datetime

class RMIDUniquenessTest:
    def __init__(self, base_url="https://recordhealth.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.portfolio_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")

    def setup_test_session(self):
        """Create test user and session"""
        print("🔧 Setting up test session...")
        
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

    def create_portfolio(self):
        """Create a test portfolio"""
        print("🏠 Creating test portfolio...")
        
        url = f"{self.base_url}/api/portfolios"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }
        data = {
            "name": "RM-ID Test Portfolio",
            "description": "Portfolio for testing RM-ID uniqueness"
        }
        
        try:
            response = requests.post(url, json=data, headers=headers, timeout=10)
            if response.status_code == 200:
                result = response.json()
                self.portfolio_id = result['portfolio_id']
                print(f"✅ Portfolio created: {self.portfolio_id}")
                return True
            else:
                print(f"❌ Failed to create portfolio: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error creating portfolio: {e}")
            return False

    def test_meeting_rm_id(self):
        """Test that meetings get RM-ID with code 20"""
        print("\n📋 Testing Meeting RM-ID (should be XX-20.001)...")
        
        url = f"{self.base_url}/api/governance/meetings"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }
        data = {
            "portfolio_id": self.portfolio_id,
            "title": "Test Meeting for RM-ID",
            "meeting_type": "regular",
            "date_time": datetime.now().isoformat(),
            "location": "Test Location",
            "called_by": "Test Trustee"
        }
        
        try:
            response = requests.post(url, json=data, headers=headers, timeout=10)
            if response.status_code == 200:
                result = response.json()
                meeting_data = result.get('item', result)
                rm_id = meeting_data.get('rm_id', '')
                
                if rm_id and '-20.' in rm_id:
                    self.log_test("Meeting RM-ID has code 20", True, f"RM-ID: {rm_id}")
                    return rm_id
                else:
                    self.log_test("Meeting RM-ID has code 20", False, f"Expected code 20, got RM-ID: {rm_id}")
                    return None
            else:
                self.log_test("Meeting RM-ID has code 20", False, f"HTTP {response.status_code}")
                return None
        except Exception as e:
            self.log_test("Meeting RM-ID has code 20", False, f"Error: {e}")
            return None

    def test_distribution_rm_id(self):
        """Test that distributions get RM-ID with code 21"""
        print("\n💰 Testing Distribution RM-ID (should be XX-21.001)...")
        
        url = f"{self.base_url}/api/governance/distributions"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }
        data = {
            "portfolio_id": self.portfolio_id,
            "title": "Test Distribution for RM-ID",
            "distribution_type": "regular",
            "description": "Test distribution",
            "total_amount": 10000,
            "currency": "USD",
            "asset_type": "cash",
            "scheduled_date": datetime.now().strftime('%Y-%m-%d')
        }
        
        try:
            response = requests.post(url, json=data, headers=headers, timeout=10)
            if response.status_code == 200:
                result = response.json()
                dist_data = result.get('item', result)
                rm_id = dist_data.get('rm_id', '')
                
                if rm_id and '-21.' in rm_id:
                    self.log_test("Distribution RM-ID has code 21", True, f"RM-ID: {rm_id}")
                    return rm_id
                else:
                    self.log_test("Distribution RM-ID has code 21", False, f"Expected code 21, got RM-ID: {rm_id}")
                    return None
            else:
                self.log_test("Distribution RM-ID has code 21", False, f"HTTP {response.status_code}")
                return None
        except Exception as e:
            self.log_test("Distribution RM-ID has code 21", False, f"Error: {e}")
            return None

    def test_dispute_rm_id(self):
        """Test that disputes get RM-ID with code 22"""
        print("\n⚖️ Testing Dispute RM-ID (should be XX-22.001)...")
        
        url = f"{self.base_url}/api/governance/disputes"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }
        data = {
            "portfolio_id": self.portfolio_id,
            "title": "Test Dispute for RM-ID",
            "dispute_type": "beneficiary",
            "description": "Test dispute case",
            "amount_claimed": 5000,
            "currency": "USD",
            "priority": "medium",
            "case_number": "TEST-001",
            "jurisdiction": "Test County"
        }
        
        try:
            response = requests.post(url, json=data, headers=headers, timeout=10)
            if response.status_code == 200:
                result = response.json()
                dispute_data = result.get('item', result)
                rm_id = dispute_data.get('rm_id', '')
                
                if rm_id and '-22.' in rm_id:
                    self.log_test("Dispute RM-ID has code 22", True, f"RM-ID: {rm_id}")
                    return rm_id
                else:
                    self.log_test("Dispute RM-ID has code 22", False, f"Expected code 22, got RM-ID: {rm_id}")
                    return None
            else:
                self.log_test("Dispute RM-ID has code 22", False, f"HTTP {response.status_code}")
                return None
        except Exception as e:
            self.log_test("Dispute RM-ID has code 22", False, f"Error: {e}")
            return None

    def test_insurance_rm_id(self):
        """Test that insurance policies get RM-ID with code 23"""
        print("\n🛡️ Testing Insurance RM-ID (should be XX-23.001)...")
        
        url = f"{self.base_url}/api/governance/insurance-policies"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }
        data = {
            "portfolio_id": self.portfolio_id,
            "title": "Test Insurance Policy for RM-ID",
            "policy_type": "whole_life",
            "policy_number": "TEST-POL-001",
            "carrier_name": "Test Insurance Co",
            "insured_name": "Test Insured",
            "death_benefit": 100000,
            "cash_value": 5000,
            "currency": "USD",
            "premium_amount": 200,
            "premium_frequency": "monthly",
            "effective_date": datetime.now().strftime('%Y-%m-%d'),
            "notes": "Test policy for RM-ID verification"
        }
        
        try:
            response = requests.post(url, json=data, headers=headers, timeout=10)
            if response.status_code == 200:
                result = response.json()
                policy_data = result.get('item', result)
                rm_id = policy_data.get('rm_id', '')
                
                if rm_id and '-23.' in rm_id:
                    self.log_test("Insurance RM-ID has code 23", True, f"RM-ID: {rm_id}")
                    return rm_id
                else:
                    self.log_test("Insurance RM-ID has code 23", False, f"Expected code 23, got RM-ID: {rm_id}")
                    return None
            else:
                self.log_test("Insurance RM-ID has code 23", False, f"HTTP {response.status_code}")
                return None
        except Exception as e:
            self.log_test("Insurance RM-ID has code 23", False, f"Error: {e}")
            return None

    def test_rm_id_uniqueness(self):
        """Test that all RM-IDs are unique and have correct codes"""
        print("\n🔍 Testing RM-ID Uniqueness Across Modules...")
        
        rm_ids = []
        
        # Test each module
        meeting_rm_id = self.test_meeting_rm_id()
        if meeting_rm_id:
            rm_ids.append(("Meeting", meeting_rm_id))
        
        distribution_rm_id = self.test_distribution_rm_id()
        if distribution_rm_id:
            rm_ids.append(("Distribution", distribution_rm_id))
        
        dispute_rm_id = self.test_dispute_rm_id()
        if dispute_rm_id:
            rm_ids.append(("Dispute", dispute_rm_id))
        
        insurance_rm_id = self.test_insurance_rm_id()
        if insurance_rm_id:
            rm_ids.append(("Insurance", insurance_rm_id))
        
        # Check uniqueness
        print(f"\n📊 Generated RM-IDs:")
        for module, rm_id in rm_ids:
            print(f"   {module}: {rm_id}")
        
        # Verify all RM-IDs are unique
        rm_id_values = [rm_id for _, rm_id in rm_ids]
        if len(rm_id_values) == len(set(rm_id_values)):
            self.log_test("All RM-IDs are unique", True)
        else:
            self.log_test("All RM-IDs are unique", False, "Duplicate RM-IDs found")
        
        # Verify correct codes
        expected_codes = {
            "Meeting": "20",
            "Distribution": "21", 
            "Dispute": "22",
            "Insurance": "23"
        }
        
        for module, rm_id in rm_ids:
            expected_code = expected_codes[module]
            if f"-{expected_code}." in rm_id:
                self.log_test(f"{module} has correct code {expected_code}", True)
            else:
                self.log_test(f"{module} has correct code {expected_code}", False, f"RM-ID: {rm_id}")

    def run_all_tests(self):
        """Run all RM-ID uniqueness tests"""
        print("🚀 Starting RM-ID Uniqueness Tests")
        print("=" * 50)
        
        if not self.setup_test_session():
            return False
        
        if not self.create_portfolio():
            return False
        
        self.test_rm_id_uniqueness()
        
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All RM-ID uniqueness tests passed!")
            return True
        else:
            print("❌ Some tests failed!")
            return False

def main():
    tester = RMIDUniquenessTest()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())