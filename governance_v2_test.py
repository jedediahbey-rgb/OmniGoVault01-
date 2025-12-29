#!/usr/bin/env python3
"""
Governance V2 API Testing - Focused on Create Record Bug Fix
Tests the fixed payload models that now accept frontend field names
"""

import requests
import sys
import json
from datetime import datetime

class GovernanceV2Tester:
    def __init__(self, base_url="https://trustworkspace.preview.emergentagent.com"):
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
        """Create a test portfolio"""
        print("🔧 Creating test portfolio...")
        
        portfolio_data = {
            "name": f"Test Portfolio {datetime.now().strftime('%H%M%S')}",
            "description": "Test portfolio for governance V2 testing"
        }
        
        try:
            url = f"{self.base_url}/api/portfolios"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.session_token}'
            }
            response = requests.post(url, json=portfolio_data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                portfolio_id = data.get('portfolio_id')
                if portfolio_id:
                    print(f"✅ Test portfolio created: {portfolio_id}")
                    return portfolio_id
            
            print(f"❌ Failed to create portfolio: {response.status_code}")
            return None
        except Exception as e:
            print(f"❌ Error creating portfolio: {e}")
            return None

    def test_governance_v2_create_records(self, portfolio_id):
        """Test POST /api/governance/v2/records for all 5 module types with frontend field names"""
        print("\n📋 Testing Governance V2 Create Records - Bug Fix Verification...")
        print("   🎯 Testing payload models accept frontend field names")
        
        created_records = {}
        
        # Test 1: Create Meeting Minutes with frontend field names
        print("   📋 Testing Meeting Minutes creation...")
        minutes_data = {
            "portfolio_id": portfolio_id,
            "module_type": "minutes",
            "title": f"Test Meeting Minutes {datetime.now().strftime('%H%M%S')}",
            "payload_json": {
                "title": f"Test Meeting Minutes {datetime.now().strftime('%H%M%S')}",
                "meeting_type": "regular",
                "date_time": "2024-12-15T14:00:00Z",  # Frontend field name
                "meeting_datetime": "2024-12-15T14:00:00Z",  # Alternative field name
                "location": "Conference Room A",
                "called_by": "John Doe",
                "attendees": [
                    {
                        "name": "John Doe",
                        "role": "trustee",
                        "present": True,
                        "notes": "Meeting chair"
                    }
                ],
                "agenda_items": [
                    {
                        "title": "Review Q4 Financial Statements",
                        "discussion_summary": "Reviewed quarterly performance",
                        "order": 1
                    }
                ],
                "general_notes": "Meeting conducted successfully"
            }
        }
        
        minutes_result = self.create_record("Meeting Minutes", minutes_data)
        if minutes_result:
            created_records['minutes'] = minutes_result
        
        # Test 2: Create Distribution with frontend field names
        print("   📋 Testing Distribution creation...")
        distribution_data = {
            "portfolio_id": portfolio_id,
            "module_type": "distribution",
            "title": f"Test Distribution {datetime.now().strftime('%H%M%S')}",
            "payload_json": {
                "title": f"Test Distribution {datetime.now().strftime('%H%M%S')}",
                "distribution_type": "regular",
                "description": "Quarterly distribution to beneficiaries",
                "total_amount": 50000.0,
                "currency": "USD",
                "asset_type": "cash",
                "scheduled_date": "2024-12-31",  # Frontend field name
                "distribution_date": "2024-12-31",  # Alternative field name
                "recipients": [  # Frontend field name
                    {
                        "beneficiary_name": "Jane Smith",
                        "amount": 30000.0,
                        "percent": 60.0,
                        "category": "education"
                    }
                ],
                "allocations": [  # Backend field name
                    {
                        "beneficiary_name": "Bob Wilson",
                        "amount": 20000.0,
                        "percent": 40.0,
                        "category": "maintenance"
                    }
                ],
                "notes": "Q4 2024 distribution",
                "approval_notes": "Approved by trustees"
            }
        }
        
        distribution_result = self.create_record("Distribution", distribution_data)
        if distribution_result:
            created_records['distribution'] = distribution_result
        
        # Test 3: Create Dispute with frontend field names
        print("   📋 Testing Dispute creation...")
        dispute_data = {
            "portfolio_id": portfolio_id,
            "module_type": "dispute",
            "title": f"Test Dispute {datetime.now().strftime('%H%M%S')}",
            "payload_json": {
                "title": f"Test Dispute {datetime.now().strftime('%H%M%S')}",
                "dispute_type": "beneficiary",
                "description": "Test dispute for API testing",
                "amount_claimed": 25000.0,
                "currency": "USD",
                "priority": "medium",
                "case_number": f"CASE-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
                "jurisdiction": "Delaware",
                "parties": [  # Frontend field name
                    {
                        "name": "Jane Smith",
                        "role": "beneficiary",
                        "contact": "jane@example.com"
                    }
                ],
                "parties_involved": ["Jane Smith", "John Doe"],  # Alternative field name
                "events": [  # Frontend field name
                    {
                        "date": "2024-12-01",
                        "description": "Initial complaint filed",
                        "type": "filing"
                    }
                ],
                "status": "open",
                "outcome": "",
                "resolution_summary": "",
                "permissions_scope": "trustee_only",
                "notes": "Test dispute for V2 API"
            }
        }
        
        dispute_result = self.create_record("Dispute", dispute_data)
        if dispute_result:
            created_records['dispute'] = dispute_result
        
        # Test 4: Create Insurance Policy with frontend field names
        print("   📋 Testing Insurance Policy creation...")
        insurance_data = {
            "portfolio_id": portfolio_id,
            "module_type": "insurance",
            "title": f"Test Insurance Policy {datetime.now().strftime('%H%M%S')}",
            "payload_json": {
                "title": f"Test Insurance Policy {datetime.now().strftime('%H%M%S')}",
                "policy_type": "whole_life",
                "policy_number": f"POL-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "carrier_name": "Test Insurance Company",  # Frontend field name
                "insurer": "Test Insurance Company",  # Alternative field name
                "insured_name": "John Doe",
                "face_value": 1000000.0,
                "death_benefit": 1000000.0,  # Frontend field name
                "cash_value": 50000.0,
                "currency": "USD",
                "premium": 2500.0,
                "premium_amount": 2500.0,  # Frontend field name
                "premium_frequency": "monthly",
                "effective_date": "2024-01-01",
                "beneficiaries": [
                    {
                        "name": "Jane Doe",
                        "percent": 100.0,
                        "relationship": "spouse"
                    }
                ],
                "premium_due_date": "2024-12-01",
                "lapse_risk": False,
                "notes": "Test policy for V2 API"
            }
        }
        
        insurance_result = self.create_record("Insurance Policy", insurance_data)
        if insurance_result:
            created_records['insurance'] = insurance_result
        
        # Test 5: Create Compensation Entry with frontend field names
        print("   📋 Testing Compensation Entry creation...")
        compensation_data = {
            "portfolio_id": portfolio_id,
            "module_type": "compensation",
            "title": f"Test Compensation {datetime.now().strftime('%H%M%S')}",
            "payload_json": {
                "title": f"Test Compensation {datetime.now().strftime('%H%M%S')}",
                "compensation_type": "hourly",
                "trustee_name": "John Doe",
                "recipient_name": "John Doe",  # Frontend field name
                "recipient_role": "trustee",  # Frontend field name
                "period": "Q4 2024",
                "period_start": "2024-10-01",
                "period_end": "2024-12-31",
                "fiscal_year": "2024",
                "basis_of_calculation": "Hourly rate for trust administration",
                "amount": 15000.0,
                "total_amount": 15000.0,
                "currency": "USD",
                "entries": [
                    {
                        "date": "2024-12-01",
                        "hours": 10.0,
                        "rate": 150.0,
                        "description": "Trust administration",
                        "category": "administration"
                    }
                ],
                "approval_status": "pending",
                "notes": "Q4 2024 trustee compensation"
            }
        }
        
        compensation_result = self.create_record("Compensation Entry", compensation_data)
        if compensation_result:
            created_records['compensation'] = compensation_result
        
        # Test 6: Verify all created records appear in lists
        print("   📋 Testing created records appear in filtered lists...")
        
        for module_type, record_id in created_records.items():
            self.verify_record_in_list(module_type, record_id, portfolio_id)
        
        # Test 7: Test individual record retrieval
        print("   📋 Testing individual record retrieval...")
        
        for module_type, record_id in created_records.items():
            self.get_individual_record(module_type, record_id)
        
        # Test 8: Test payload field preservation
        print("   📋 Testing payload field preservation...")
        
        for module_type, record_id in created_records.items():
            self.verify_payload_fields(module_type, record_id)
        
        return created_records

    def create_record(self, record_type, data):
        """Create a governance record and return the record ID if successful"""
        try:
            url = f"{self.base_url}/api/governance/v2/records"
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.session_token}'
            }
            response = requests.post(url, json=data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('ok') and result.get('data', {}).get('record', {}).get('id'):
                    record_id = result['data']['record']['id']
                    rm_id = result['data']['record'].get('rm_id', 'N/A')
                    self.log_test(f"Create {record_type}", True, f"ID: {record_id}, RM-ID: {rm_id}")
                    return record_id
                else:
                    self.log_test(f"Create {record_type}", False, f"Invalid response format: {result}")
                    return None
            else:
                error_msg = f"HTTP {response.status_code}"
                try:
                    error_data = response.json()
                    if error_data.get('error', {}).get('message'):
                        error_msg += f": {error_data['error']['message']}"
                except:
                    pass
                self.log_test(f"Create {record_type}", False, error_msg)
                return None
        except Exception as e:
            self.log_test(f"Create {record_type}", False, f"Exception: {str(e)}")
            return None

    def verify_record_in_list(self, module_type, record_id, portfolio_id):
        """Verify record appears in filtered list"""
        try:
            url = f"{self.base_url}/api/governance/v2/records"
            params = {
                'portfolio_id': portfolio_id,
                'module_type': module_type
            }
            headers = {
                'Authorization': f'Bearer {self.session_token}'
            }
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('ok'):
                    items = result.get('data', {}).get('items', [])
                    found = any(item['id'] == record_id for item in items)
                    if found:
                        self.log_test(f"List contains {module_type} record", True)
                    else:
                        self.log_test(f"List contains {module_type} record", False, "Record not found in list")
                else:
                    self.log_test(f"List contains {module_type} record", False, "Invalid response format")
            else:
                self.log_test(f"List contains {module_type} record", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test(f"List contains {module_type} record", False, f"Exception: {str(e)}")

    def get_individual_record(self, module_type, record_id):
        """Get individual record and verify it can be opened"""
        try:
            url = f"{self.base_url}/api/governance/v2/records/{record_id}"
            headers = {
                'Authorization': f'Bearer {self.session_token}'
            }
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('ok') and result.get('data', {}).get('record'):
                    record = result['data']['record']
                    title = record.get('title', 'Unknown')
                    status = record.get('status', 'Unknown')
                    self.log_test(f"Get {module_type} record", True, f"Title: {title}, Status: {status}")
                else:
                    self.log_test(f"Get {module_type} record", False, "Invalid response format")
            else:
                self.log_test(f"Get {module_type} record", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test(f"Get {module_type} record", False, f"Exception: {str(e)}")

    def verify_payload_fields(self, module_type, record_id):
        """Verify that all payload fields are preserved in the created record"""
        try:
            url = f"{self.base_url}/api/governance/v2/records/{record_id}"
            headers = {
                'Authorization': f'Bearer {self.session_token}'
            }
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('ok') and result.get('data', {}).get('current_revision'):
                    payload = result['data']['current_revision'].get('payload_json', {})
                    
                    # Check for key fields based on module type
                    preserved_fields = []
                    missing_fields = []
                    
                    if module_type == 'minutes':
                        expected_fields = ['title', 'meeting_type', 'date_time', 'location', 'attendees', 'agenda_items']
                    elif module_type == 'distribution':
                        expected_fields = ['title', 'distribution_type', 'total_amount', 'scheduled_date', 'recipients']
                    elif module_type == 'dispute':
                        expected_fields = ['title', 'dispute_type', 'amount_claimed', 'priority', 'parties', 'events']
                    elif module_type == 'insurance':
                        expected_fields = ['title', 'policy_type', 'carrier_name', 'death_benefit', 'premium_amount']
                    elif module_type == 'compensation':
                        expected_fields = ['title', 'compensation_type', 'recipient_name', 'amount', 'entries']
                    else:
                        expected_fields = ['title']
                    
                    for field in expected_fields:
                        if field in payload:
                            preserved_fields.append(field)
                        else:
                            missing_fields.append(field)
                    
                    if missing_fields:
                        self.log_test(f"Payload fields preserved - {module_type}", False, 
                                    f"Missing: {missing_fields}, Present: {preserved_fields}")
                    else:
                        self.log_test(f"Payload fields preserved - {module_type}", True, 
                                    f"All expected fields present: {preserved_fields}")
                else:
                    self.log_test(f"Payload fields preserved - {module_type}", False, "No current revision found")
            else:
                self.log_test(f"Payload fields preserved - {module_type}", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test(f"Payload fields preserved - {module_type}", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all governance V2 tests"""
        print("🚀 Starting Governance V2 API Testing...")
        print("   🎯 Focus: Testing payload model fixes for frontend field names")
        
        # Setup
        if not self.setup_test_session():
            print("❌ Failed to setup test session")
            return False
        
        portfolio_id = self.create_test_portfolio()
        if not portfolio_id:
            print("❌ Failed to create test portfolio")
            return False
        
        # Run tests
        created_records = self.test_governance_v2_create_records(portfolio_id)
        
        # Summary
        print(f"\n📊 Test Summary:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Tests passed: {self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if created_records:
            print(f"\n📋 Created Records:")
            for module_type, record_id in created_records.items():
                print(f"   {module_type}: {record_id}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = GovernanceV2Tester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())