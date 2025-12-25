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
    
    def test_put_update_record(self):
        """Test the PUT /api/governance/v2/records/{record_id} endpoint - the main fix"""
        if not self.test_record_id:
            self.log_test("PUT Update Record", False, "No test record ID available")
            return False
            
        update_payload = {
            "title": "Updated Meeting Title via PUT",
            "payload_json": {
                "title": "Updated Meeting Title via PUT",
                "meeting_type": "special",
                "date_time": "2024-01-15T14:00:00Z",
                "location": "Updated Conference Room B",
                "called_by": "Updated Test Trustee",
                "attendees": [
                    {
                        "name": "Test Attendee",
                        "role": "trustee",
                        "present": True
                    }
                ],
                "agenda_items": [
                    {
                        "item_id": "item_1",
                        "title": "Test Agenda Item",
                        "discussion_summary": "Test discussion summary"
                    }
                ],
                "notes": "Updated via PUT endpoint test"
            }
        }
        
        try:
            response = self.session.put(
                f"{API_V2_URL}/records/{self.test_record_id}",
                json=update_payload,
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok") == True:
                    details += ", Response: ok=true (SUCCESS!)"
                    # Check if updated record is returned
                    if data.get("data", {}).get("record"):
                        updated_record = data["data"]["record"]
                        if updated_record.get("title") == update_payload["title"]:
                            details += ", Title updated correctly"
                        else:
                            details += f", Title mismatch: expected '{update_payload['title']}', got '{updated_record.get('title')}'"
                else:
                    success = False
                    details += f", Response: ok=false, error={data.get('error', {}).get('message', 'Unknown')}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:300]}"
            
            self.log_test("PUT Update Record (Main Fix)", success, details)
            return success
            
        except Exception as e:
            self.log_test("PUT Update Record (Main Fix)", False, f"Exception: {str(e)}")
            return False

    def test_get_updated_record(self):
        """Verify the record was actually updated by fetching it"""
        if not self.test_record_id:
            return False
            
        try:
            response = self.session.get(
                f"{API_V2_URL}/records/{self.test_record_id}",
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    record = data.get("data", {}).get("record", {})
                    revision = data.get("data", {}).get("current_revision", {})
                    
                    if record.get("title") == "Updated Meeting Title via PUT":
                        details += ", Title persisted correctly"
                    else:
                        success = False
                        details += f", Title not persisted: {record.get('title')}"
                        
                    if revision.get("payload_json", {}).get("meeting_type") == "special":
                        details += ", Payload updated correctly"
                    else:
                        success = False
                        details += f", Payload not updated correctly"
                else:
                    success = False
                    details += f", Response: ok=false"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:300]}"
            
            self.log_test("Verify Record Updated", success, details)
            return success
            
        except Exception as e:
            self.log_test("Verify Record Updated", False, f"Exception: {str(e)}")
            return False

    def test_put_nonexistent_record(self):
        """Test PUT on non-existent record (should return 404)"""
        update_payload = {
            "title": "Should Not Work",
            "payload_json": {"test": "data"}
        }
        
        try:
            response = self.session.put(
                f"{API_V2_URL}/records/nonexistent_record_id",
                json=update_payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            success = response.status_code == 404
            details = f"Status: {response.status_code} (Expected 404)"
            
            if not success:
                try:
                    error_data = response.json()
                    details += f", Unexpected response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test("PUT Non-existent Record", success, details)
            return success
            
        except Exception as e:
            self.log_test("PUT Non-existent Record", False, f"Exception: {str(e)}")
            return False

    def test_create_insurance_record(self):
        """Test creating an insurance record for PUT testing"""
        payload = {
            "module_type": "insurance",
            "portfolio_id": self.portfolio_id,
            "title": "Test Insurance Policy for PUT",
            "payload_json": {
                "title": "Test Insurance Policy for PUT",
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
                "policy_state": "pending",
                "notes": "Test policy for PUT testing",
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
                    details += f", Insurance Record ID: {record_id}"
                    # Store for PUT test
                    self.insurance_record_id = record_id
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

    def test_put_insurance_record(self):
        """Test PUT update on insurance record"""
        if not hasattr(self, 'insurance_record_id') or not self.insurance_record_id:
            self.log_test("PUT Update Insurance Record", False, "No insurance record ID available")
            return False
            
        update_payload = {
            "title": "Updated Insurance Policy via PUT",
            "payload_json": {
                "title": "Updated Insurance Policy via PUT",
                "policy_type": "term",
                "policy_number": "TEST-POL-001-UPDATED",
                "carrier_name": "Updated Insurance Co",
                "insured_name": "Updated Test Insured",
                "death_benefit": 150000.0,
                "cash_value": 7500.0,
                "currency": "USD",
                "premium_amount": 750.0,
                "premium_frequency": "quarterly",
                "effective_date": "2024-01-01",
                "policy_state": "pending",
                "notes": "Updated test policy via PUT",
                "beneficiaries": [
                    {
                        "name": "Test Beneficiary",
                        "relationship": "spouse",
                        "percentage": 100,
                        "beneficiary_type": "primary"
                    }
                ]
            }
        }
        
        try:
            response = self.session.put(
                f"{API_V2_URL}/records/{self.insurance_record_id}",
                json=update_payload,
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok") == True:
                    details += ", Response: ok=true (SUCCESS!)"
                else:
                    success = False
                    details += f", Response: ok=false, error={data.get('error', {}).get('message', 'Unknown')}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:300]}"
            
            self.log_test("PUT Update Insurance Record", success, details)
            return success
            
        except Exception as e:
            self.log_test("PUT Update Insurance Record", False, f"Exception: {str(e)}")
            return False

    def test_create_dispute_record(self):
        """Test creating a dispute record for PUT testing"""
        payload = {
            "module_type": "dispute",
            "portfolio_id": self.portfolio_id,
            "title": "Test Dispute for PUT",
            "payload_json": {
                "title": "Test Dispute for PUT",
                "dispute_type": "beneficiary",
                "description": "Test dispute record for PUT testing",
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
                    details += f", Dispute Record ID: {record_id}"
                    # Store for PUT test
                    self.dispute_record_id = record_id
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

    def test_put_dispute_record(self):
        """Test PUT update on dispute record"""
        if not hasattr(self, 'dispute_record_id') or not self.dispute_record_id:
            self.log_test("PUT Update Dispute Record", False, "No dispute record ID available")
            return False
            
        update_payload = {
            "title": "Updated Dispute via PUT",
            "payload_json": {
                "title": "Updated Dispute via PUT",
                "dispute_type": "trustee",
                "description": "Updated dispute record via PUT testing",
                "amount_claimed": 7500.0,
                "currency": "USD",
                "priority": "high",
                "case_number": "TEST-001-UPDATED",
                "jurisdiction": "Updated Test State",
                "parties": [
                    {
                        "name": "Test Claimant",
                        "role": "claimant",
                        "contact_info": "test@example.com"
                    }
                ],
                "events": [
                    {
                        "event_type": "filing",
                        "title": "Initial Filing",
                        "description": "Test event added via PUT",
                        "event_date": "2024-01-15"
                    }
                ]
            }
        }
        
        try:
            response = self.session.put(
                f"{API_V2_URL}/records/{self.dispute_record_id}",
                json=update_payload,
                headers={"Content-Type": "application/json"},
                timeout=15
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok") == True:
                    details += ", Response: ok=true (SUCCESS!)"
                else:
                    success = False
                    details += f", Response: ok=false, error={data.get('error', {}).get('message', 'Unknown')}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data}"
                except:
                    details += f", Response: {response.text[:300]}"
            
            self.log_test("PUT Update Dispute Record", success, details)
            return success
            
        except Exception as e:
            self.log_test("PUT Update Dispute Record", False, f"Exception: {str(e)}")
            return False

    def cleanup_test_records(self):
        """Clean up test records by voiding them"""
        records_to_cleanup = []
        if self.test_record_id:
            records_to_cleanup.append(("Meeting", self.test_record_id))
        if hasattr(self, 'insurance_record_id') and self.insurance_record_id:
            records_to_cleanup.append(("Insurance", self.insurance_record_id))
        if hasattr(self, 'dispute_record_id') and self.dispute_record_id:
            records_to_cleanup.append(("Dispute", self.dispute_record_id))
            
        for record_type, record_id in records_to_cleanup:
            try:
                response = self.session.post(
                    f"{API_V2_URL}/records/{record_id}/void",
                    json={"void_reason": "Test cleanup"},
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
                if response.status_code == 200:
                    print(f"🧹 Cleaned up {record_type} record: {record_id}")
                else:
                    print(f"⚠️  Failed to cleanup {record_type} record: {record_id}")
            except Exception as e:
                print(f"⚠️  Error cleaning up {record_type} record {record_id}: {str(e)}")
    
    def run_all_tests(self):
        """Run all PUT endpoint tests"""
        print("🧪 Testing Governance V2 PUT Endpoint Fix")
        print("=" * 60)
        print(f"Base URL: {BASE_URL}")
        print(f"API V2 URL: {API_V2_URL}")
        print(f"Portfolio ID: {self.portfolio_id}")
        print()
        print("🎯 Focus: Testing PUT /api/governance/v2/records/{record_id} endpoint")
        print("   Issue: 'Failed to update record' error toast despite successful save")
        print("   Fix: Backend now returns 'ok: true' with updated record")
        print()
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        try:
            # Create test records
            print("📝 Creating test records...")
            self.test_create_meeting_record()
            self.test_create_insurance_record()
            self.test_create_dispute_record()
            
            print("\n🔄 Testing PUT endpoint updates...")
            # Test PUT updates - the main focus
            self.test_put_update_record()
            self.test_get_updated_record()
            self.test_put_insurance_record()
            self.test_put_dispute_record()
            
            print("\n🚫 Testing error cases...")
            # Test error cases
            self.test_put_nonexistent_record()
            
        finally:
            # Always cleanup
            print("\n🧹 Cleaning up test records...")
            self.cleanup_test_records()
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("✅ All tests passed! PUT endpoint is working correctly.")
            print("✅ Frontend should now show 'Changes saved' instead of 'Failed to update record'")
            return True
        else:
            print("❌ Some tests failed. PUT endpoint may still have issues.")
            return False

def main():
    tester = GovernanceV2Tester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())