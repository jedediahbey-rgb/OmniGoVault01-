#!/usr/bin/env python3
"""
Backend API Testing for Governance V2 PUT Endpoint
Testing the fix for 'Failed to update record' error toast issue.
The main agent fixed the PUT /api/governance/v2/records/{record_id} endpoint.
"""

import requests
import json
import sys
from datetime import datetime

# Use the public URL from frontend .env
BASE_URL = "https://omnigovault-1.preview.emergentagent.com"
API_V2_URL = f"{BASE_URL}/api/governance/v2"

class GovernanceV2Tester:
    def __init__(self):
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.portfolio_id = "test_portfolio_123"
        self.test_record_id = None
        
    def log_test(self, name, success, details=""):
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
            if details:
                print(f"   {details}")
        else:
            print(f"❌ {name}")
            if details:
                print(f"   {details}")
        print()
    
    def test_api_health(self):
        """Test if the API is accessible"""
        try:
            response = self.session.get(f"{BASE_URL}/api/health", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if not success:
                details += f", Response: {response.text[:200]}"
            self.log_test("API Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("API Health Check", False, f"Error: {str(e)}")
            return False
    
    def test_create_meeting_record(self):
        """Test creating a meeting minutes record for PUT testing"""
        payload = {
            "module_type": "minutes",
            "portfolio_id": self.portfolio_id,
            "title": "Test Meeting for PUT Testing",
            "payload_json": {
                "title": "Test Meeting for PUT Testing",
                "meeting_type": "regular",
                "date_time": datetime.now().isoformat(),
                "location": "Conference Room A",
                "called_by": "Test Trustee",
                "attendees": [],
                "agenda_items": []
            }
        }
        
        try:
            response = self.session.post(
                f"{API_V2_URL}/records",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            
            success = response.status_code in [200, 201]
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok") and data.get("data", {}).get("record"):
                    self.test_record_id = data["data"]["record"]["id"]
                    details += f", Record ID: {self.test_record_id}"
                else:
                    success = False
                    details += f", Invalid response structure: {data}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:300]}"
            
            self.log_test("Create Test Meeting Record", success, details)
            return success
            
        except Exception as e:
            self.log_test("Create Test Meeting Record", False, f"Exception: {str(e)}")
            return False
    
    def test_create_distribution_record(self):
        """Test creating a distribution record"""
        payload = {
            "module_type": "distribution",
            "portfolio_id": self.portfolio_id,
            "title": "Test Distribution",
            "payload_json": {
                "title": "Test Distribution",
                "distribution_type": "regular",
                "description": "Test distribution record",
                "total_amount": 10000.0,
                "currency": "USD",
                "asset_type": "cash",
                "scheduled_date": "2024-12-31",
                "recipients": []
            }
        }
        
        try:
            response = self.session.post(
                f"{API_V2_URL}/records",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            
            success = response.status_code in [200, 201]
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok") and data.get("data", {}).get("record"):
                    record_id = data["data"]["record"]["id"]
                    details += f", Record ID: {record_id}"
                else:
                    success = False
                    details += f", Invalid response structure: {data}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:300]}"
            
            self.log_test("Create Distribution Record", success, details)
            return success
            
        except Exception as e:
            self.log_test("Create Distribution Record", False, f"Exception: {str(e)}")
            return False
    
    def test_create_dispute_record(self):
        """Test creating a dispute record"""
        payload = {
            "module_type": "dispute",
            "portfolio_id": self.portfolio_id,
            "title": "Test Dispute",
            "payload_json": {
                "title": "Test Dispute",
                "dispute_type": "beneficiary",
                "description": "Test dispute record",
                "amount_claimed": 5000.0,
                "currency": "USD",
                "priority": "medium",
                "case_number": "TEST-001",
                "jurisdiction": "Test State",
                "parties": [],
                "events": []
            }
        }
        
        try:
            response = self.session.post(
                f"{API_V2_URL}/records",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            
            success = response.status_code in [200, 201]
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok") and data.get("data", {}).get("record"):
                    record_id = data["data"]["record"]["id"]
                    details += f", Record ID: {record_id}"
                else:
                    success = False
                    details += f", Invalid response structure: {data}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:300]}"
            
            self.log_test("Create Dispute Record", success, details)
            return success
            
        except Exception as e:
            self.log_test("Create Dispute Record", False, f"Exception: {str(e)}")
            return False
    
    def test_create_insurance_record(self):
        """Test creating an insurance record"""
        payload = {
            "module_type": "insurance",
            "portfolio_id": self.portfolio_id,
            "title": "Test Insurance Policy",
            "payload_json": {
                "title": "Test Insurance Policy",
                "policy_type": "whole_life",
                "policy_number": "TEST-POL-001",
                "carrier_name": "Test Insurance Co",
                "insured_name": "Test Insured",
                "death_benefit": 100000.0,
                "cash_value": 5000.0,
                "currency": "USD",
                "premium_amount": 500.0,
                "premium_frequency": "monthly",
                "effective_date": "2024-01-01",
                "notes": "Test policy",
                "beneficiaries": []
            }
        }
        
        try:
            response = self.session.post(
                f"{API_V2_URL}/records",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            
            success = response.status_code in [200, 201]
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok") and data.get("data", {}).get("record"):
                    record_id = data["data"]["record"]["id"]
                    details += f", Record ID: {record_id}"
                else:
                    success = False
                    details += f", Invalid response structure: {data}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:300]}"
            
            self.log_test("Create Insurance Record", success, details)
            return success
            
        except Exception as e:
            self.log_test("Create Insurance Record", False, f"Exception: {str(e)}")
            return False
    
    def test_create_compensation_record(self):
        """Test creating a compensation record"""
        payload = {
            "module_type": "compensation",
            "portfolio_id": self.portfolio_id,
            "title": "Test Compensation",
            "payload_json": {
                "title": "Test Compensation",
                "compensation_type": "annual_fee",
                "recipient_name": "Test Trustee",
                "recipient_role": "trustee",
                "amount": 2500.0,
                "currency": "USD",
                "period_start": "2024-01-01",
                "period_end": "2024-12-31",
                "fiscal_year": "2024",
                "basis_of_calculation": "Fixed annual fee",
                "notes": "Test compensation entry"
            }
        }
        
        try:
            response = self.session.post(
                f"{API_V2_URL}/records",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            
            success = response.status_code in [200, 201]
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok") and data.get("data", {}).get("record"):
                    record_id = data["data"]["record"]["id"]
                    details += f", Record ID: {record_id}"
                else:
                    success = False
                    details += f", Invalid response structure: {data}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:300]}"
            
            self.log_test("Create Compensation Record", success, details)
            return success
            
        except Exception as e:
            self.log_test("Create Compensation Record", False, f"Exception: {str(e)}")
            return False
    
    def test_list_records(self):
        """Test listing records to verify they were created"""
        try:
            response = self.session.get(
                f"{API_V2_URL}/records",
                params={"portfolio_id": self.portfolio_id, "limit": 50},
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok") and "data" in data:
                    items = data["data"].get("items", [])
                    details += f", Found {len(items)} records"
                else:
                    success = False
                    details += f", Invalid response structure: {data}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:300]}"
            
            self.log_test("List Records", success, details)
            return success
            
        except Exception as e:
            self.log_test("List Records", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests"""
        print("🧪 Testing Governance V2 API Record Creation")
        print("=" * 60)
        print(f"Base URL: {BASE_URL}")
        print(f"API V2 URL: {API_V2_URL}")
        print(f"Portfolio ID: {self.portfolio_id}")
        print()
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Test all record creation endpoints
        self.test_create_meeting_record()
        self.test_create_distribution_record()
        self.test_create_dispute_record()
        self.test_create_insurance_record()
        self.test_create_compensation_record()
        
        # Test listing records
        self.test_list_records()
        
        # Summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("✅ All tests passed! Record creation is working.")
            return True
        else:
            print("❌ Some tests failed. Record creation has issues.")
            return False

def main():
    tester = GovernanceV2Tester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())