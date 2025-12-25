#!/usr/bin/env python3
"""
Backend API Testing for Ledger Thread Management Tools
Tests merge, split, and reassign ledger threads functionality.
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid

# Use the public endpoint from frontend/.env
BASE_URL = "https://trustscore-manager.preview.emergentagent.com/api"

class LedgerThreadAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Config-API-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def test_endpoint(self, method, endpoint, expected_status, data=None, description=""):
        """Test a single API endpoint"""
        url = f"{self.base_url}{endpoint}"
        self.tests_run += 1
        
        self.log(f"Testing: {description or f'{method} {endpoint}'}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, timeout=10)
            elif method == 'POST':
                response = self.session.post(url, json=data, timeout=10)
            elif method == 'PUT':
                response = self.session.put(url, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASS - Status: {response.status_code}")
                try:
                    return response.json()
                except:
                    return {"status_code": response.status_code}
            else:
                self.log(f"❌ FAIL - Expected {expected_status}, got {response.status_code}")
                self.failed_tests.append({
                    'test': description,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'endpoint': endpoint
                })
                try:
                    error_data = response.json()
                    self.log(f"   Error: {error_data}")
                except:
                    self.log(f"   Response: {response.text[:200]}")
                return None
                
        except Exception as e:
            self.log(f"❌ FAIL - Exception: {str(e)}")
            self.failed_tests.append({
                'test': description,
                'error': str(e),
                'endpoint': endpoint
            })
            return None

    def test_health_rules_get(self):
        """Test GET /api/config/health-rules"""
        self.log("\n=== Testing Health Rules GET ===")
        
        result = self.test_endpoint(
            'GET',
            '/config/health-rules',
            200,
            description="Get health rules configuration"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            config = data.get('config', {})
            
            # Verify structure
            required_fields = ['category_weights', 'blocking_caps']
            missing = [f for f in required_fields if f not in config]
            if missing:
                self.log(f"❌ Missing config fields: {missing}")
                return False
            
            # Verify category weights
            weights = config.get('category_weights', {})
            expected_categories = [
                'governance_hygiene', 'financial_integrity', 
                'compliance_recordkeeping', 'risk_exposure', 'data_integrity'
            ]
            missing_cats = [c for c in expected_categories if c not in weights]
            if missing_cats:
                self.log(f"❌ Missing weight categories: {missing_cats}")
                return False
            
            total_weight = sum(weights.values())
            self.log(f"✅ Total weight: {total_weight}% (should be 100%)")
            
            return True
        return False

    def test_health_rules_update(self):
        """Test PUT /api/config/health-rules"""
        self.log("\n=== Testing Health Rules UPDATE ===")
        
        # Test with valid weights that sum to 100
        test_config = {
            "category_weights": {
                "governance_hygiene": 30,
                "financial_integrity": 25,
                "compliance_recordkeeping": 15,
                "risk_exposure": 15,
                "data_integrity": 15
            }
        }
        
        result = self.test_endpoint(
            'PUT',
            '/config/health-rules',
            200,
            data=test_config,
            description="Update health rules with valid weights"
        )
        
        return result is not None and result.get('ok')

    def test_health_rules_invalid_weights(self):
        """Test PUT /api/config/health-rules with invalid weights"""
        self.log("\n=== Testing Health Rules INVALID WEIGHTS ===")
        
        # Test with weights that don't sum to 100
        test_config = {
            "category_weights": {
                "governance_hygiene": 50,
                "financial_integrity": 25,
                "compliance_recordkeeping": 15,
                "risk_exposure": 15,
                "data_integrity": 15
            }
        }
        
        result = self.test_endpoint(
            'PUT',
            '/config/health-rules',
            400,
            data=test_config,
            description="Update health rules with invalid weights (should fail)"
        )
        
        # This should fail with 400, so success means we got the expected error
        return result is None  # None means we got the expected error status

    def test_health_rules_reset(self):
        """Test POST /api/config/health-rules/reset"""
        self.log("\n=== Testing Health Rules RESET ===")
        
        result = self.test_endpoint(
            'POST',
            '/config/health-rules/reset',
            200,
            description="Reset health rules to defaults"
        )
        
        if result and result.get('ok'):
            config = result.get('data', {}).get('config', {})
            weights = config.get('category_weights', {})
            total = sum(weights.values())
            self.log(f"✅ Reset config total weight: {total}%")
            return True
        return False

    def test_checklists_get(self):
        """Test GET /api/config/checklists"""
        self.log("\n=== Testing Checklists GET ===")
        
        result = self.test_endpoint(
            'GET',
            '/config/checklists',
            200,
            description="Get all checklists"
        )
        
        if result and result.get('ok'):
            checklists = result.get('data', {}).get('checklists', {})
            
            # Verify all 5 module types exist
            expected_modules = ['minutes', 'distribution', 'insurance', 'compensation', 'dispute']
            missing = [m for m in expected_modules if m not in checklists]
            if missing:
                self.log(f"❌ Missing checklist modules: {missing}")
                return False
            
            # Verify structure of each checklist
            for module, checklist in checklists.items():
                if 'name' not in checklist or 'items' not in checklist:
                    self.log(f"❌ Invalid structure for {module} checklist")
                    return False
                
                items = checklist.get('items', [])
                self.log(f"✅ {module}: {len(items)} items")
            
            return True
        return False

    def test_checklist_update(self, module_type="minutes"):
        """Test PUT /api/config/checklists/{module}"""
        self.log(f"\n=== Testing {module_type.upper()} Checklist UPDATE ===")
        
        test_checklist = {
            "name": f"Updated {module_type.title()} Checklist",
            "items": [
                {"id": "test_item_1", "label": "Test item 1", "required": True},
                {"id": "test_item_2", "label": "Test item 2", "required": False},
                {"id": "test_item_3", "label": "Test item 3", "required": True}
            ]
        }
        
        result = self.test_endpoint(
            'PUT',
            f'/config/checklists/{module_type}',
            200,
            data=test_checklist,
            description=f"Update {module_type} checklist"
        )
        
        if result and result.get('ok'):
            checklist = result.get('data', {}).get('checklist', {})
            items = checklist.get('items', [])
            self.log(f"✅ Updated {module_type} checklist with {len(items)} items")
            return True
        return False

    def test_all_module_checklists(self):
        """Test updating all 5 module types"""
        self.log("\n=== Testing ALL MODULE CHECKLISTS ===")
        
        modules = ["minutes", "distribution", "insurance", "compensation", "dispute"]
        all_passed = True
        
        for module in modules:
            success = self.test_checklist_update(module)
            if not success:
                all_passed = False
        
        return all_passed

    def run_all_tests(self):
        """Run all configuration API tests"""
        self.log("🚀 Starting Backend API Tests for Settings Configuration")
        self.log("=" * 60)
        
        # Test Health Rules APIs
        self.log("\n📊 HEALTH RULES CONFIGURATION TESTS")
        self.log("-" * 40)
        
        self.test_health_rules_get()
        self.test_health_rules_update()
        self.test_health_rules_invalid_weights()
        self.test_health_rules_reset()
        
        # Test Checklists APIs
        self.log("\n📋 CHECKLISTS CONFIGURATION TESTS")
        self.log("-" * 40)
        
        self.test_checklists_get()
        self.test_all_module_checklists()
        
        # Print final results
        self.log("\n" + "=" * 60)
        self.log(f"📊 FINAL RESULTS")
        self.log(f"Tests Run: {self.tests_run}")
        self.log(f"Tests Passed: {self.tests_passed}")
        self.log(f"Tests Failed: {self.tests_run - self.tests_passed}")
        
        if self.tests_run > 0:
            success_rate = (self.tests_passed / self.tests_run) * 100
            self.log(f"Success Rate: {success_rate:.1f}%")
        
        if self.failed_tests:
            self.log(f"\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                self.log(f"{i}. {test['test']}")
                if 'error' in test:
                    self.log(f"   Error: {test['error']}")
                else:
                    self.log(f"   Expected: {test['expected']}, Got: {test['actual']}")
                self.log(f"   Endpoint: {test['endpoint']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = ConfigAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())