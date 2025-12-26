#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime
import uuid

class EquityTrustPortfolioTester:
    def __init__(self, base_url="https://designsystem-4.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.portfolio_id = None
        self.trust_profile_id = None
        self.asset_id = None
        self.ledger_entry_id = None
        self.subject_category_id = None

    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    try:
                        error_data = response.json()
                        self.log(f"   Error: {error_data}")
                    except:
                        self.log(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            return False, {}

    def create_test_user_session(self):
        """Create test user and session using MongoDB directly"""
        self.log("Creating test user and session...")
        
        # Use the session token created via mongosh
        self.session_token = "test_session_1766517109655"
        self.user_id = "test-user-1766517109655"
        
        self.log(f"Test User ID: {self.user_id}")
        self.log(f"Test Session Token: {self.session_token}")
        
        return True

    def test_auth_endpoint(self):
        """Test authentication endpoint"""
        success, response = self.run_test(
            "Authentication Check",
            "GET",
            "auth/me",
            200  # Expecting success with valid session
        )
        # Note: This might fail if session isn't in DB, but we'll continue testing
        return success

    def test_create_portfolio(self):
        """Test portfolio creation"""
        success, response = self.run_test(
            "Create Portfolio",
            "POST",
            "portfolios",
            200,
            data={
                "name": "Test RM-ID Portfolio",
                "description": "Testing subject-based RM-ID system"
            }
        )
        if success and response.get('portfolio_id'):
            self.portfolio_id = response['portfolio_id']
            self.log(f"   Portfolio ID: {self.portfolio_id}")
        return success

    def test_create_trust_profile(self):
        """Test trust profile creation"""
        if not self.portfolio_id:
            self.log("❌ No portfolio ID available for trust profile test")
            return False
            
        success, response = self.run_test(
            "Create Trust Profile",
            "POST",
            "trust-profiles",
            200,
            data={
                "portfolio_id": self.portfolio_id,
                "trust_name": "Test Trust for RM-ID"
            }
        )
        if success and response.get('profile_id'):
            self.trust_profile_id = response['profile_id']
            self.log(f"   Trust Profile ID: {self.trust_profile_id}")
        return success

    def test_generate_placeholder_rm_id(self):
        """Test placeholder RM-ID generation"""
        if not self.trust_profile_id:
            self.log("❌ No trust profile ID available for placeholder RM-ID test")
            return False
            
        success, response = self.run_test(
            "Generate Placeholder RM-ID",
            "POST",
            f"trust-profiles/{self.trust_profile_id}/generate-placeholder-rm-id",
            200
        )
        if success:
            self.log(f"   Generated RM-ID: {response.get('rm_id_raw', 'N/A')}")
            self.log(f"   Normalized: {response.get('rm_id_normalized', 'N/A')}")
            self.log(f"   Is Placeholder: {response.get('is_placeholder', 'N/A')}")
        return success

    def test_update_trust_profile_rm_id(self):
        """Test trust profile RM-ID update with normalization"""
        if not self.trust_profile_id:
            self.log("❌ No trust profile ID available for RM-ID update test")
            return False
            
        success, response = self.run_test(
            "Update Trust Profile RM-ID",
            "PUT",
            f"trust-profiles/{self.trust_profile_id}",
            200,
            data={
                "rm_id_raw": "RF 123 456 789 US",  # Raw input with spaces
                "trust_name": "Updated Test Trust"
            }
        )
        if success:
            normalized = response.get('rm_id_normalized', '')
            if normalized == "RF123456789US":
                self.log(f"   ✅ RM-ID normalization working: '{response.get('rm_id_raw')}' -> '{normalized}'")
            else:
                self.log(f"   ⚠️ RM-ID normalization issue: expected 'RF123456789US', got '{normalized}'")
        return success

    def test_get_subject_categories(self):
        """Test getting default subject categories"""
        if not self.portfolio_id:
            self.log("❌ No portfolio ID available for subject categories test")
            return False
            
        success, response = self.run_test(
            "Get Subject Categories (Default Seed)",
            "GET",
            f"portfolios/{self.portfolio_id}/subject-categories",
            200
        )
        if success:
            categories = response if isinstance(response, list) else []
            self.log(f"   Found {len(categories)} subject categories")
            
            # Check for default categories
            expected_codes = ["00", "01", "02", "03", "04", "05", "06", "07"]
            found_codes = [cat.get('code') for cat in categories]
            
            for code in expected_codes:
                if code in found_codes:
                    cat = next(c for c in categories if c.get('code') == code)
                    self.log(f"   ✅ {code} - {cat.get('name', 'N/A')}")
                else:
                    self.log(f"   ❌ Missing default category: {code}")
                    
        return success

    def test_create_subject_category(self):
        """Test creating new subject category"""
        if not self.portfolio_id:
            self.log("❌ No portfolio ID available for subject category creation test")
            return False
            
        success, response = self.run_test(
            "Create New Subject Category",
            "POST",
            f"portfolios/{self.portfolio_id}/subject-categories",
            200,
            data={
                "code": "08",
                "name": "Test Category",
                "description": "Test category for RM-ID system"
            }
        )
        if success and response.get('category_id'):
            self.subject_category_id = response['category_id']
            self.log(f"   Category ID: {self.subject_category_id}")
            self.log(f"   Code: {response.get('code')}")
            self.log(f"   Name: {response.get('name')}")
        return success

    def test_create_asset_with_subject_rm_id(self):
        """Test asset creation with subject-based RM-ID"""
        if not self.portfolio_id:
            self.log("❌ No portfolio ID available for asset creation test")
            return False
            
        success, response = self.run_test(
            "Create Asset with Subject-based RM-ID",
            "POST",
            f"portfolios/{self.portfolio_id}/assets",
            200,
            data={
                "description": "Test Real Estate Property",
                "asset_type": "real_property",
                "subject_code": "01",  # Real Estate category
                "value": 250000.00,
                "transaction_type": "deposit",
                "notes": "Test asset for RM-ID system"
            }
        )
        if success and response.get('asset_id'):
            self.asset_id = response['asset_id']
            rm_id = response.get('rm_id', '')
            self.log(f"   Asset ID: {self.asset_id}")
            self.log(f"   Generated RM-ID: {rm_id}")
            self.log(f"   Subject Code: {response.get('subject_code')}")
            self.log(f"   Subject Name: {response.get('subject_name')}")
            
            # Verify RM-ID format: MAIN-CODE.SEQUENCE
            if '-' in rm_id and '.' in rm_id:
                parts = rm_id.split('-')
                if len(parts) == 2 and '.' in parts[1]:
                    code_seq = parts[1].split('.')
                    if len(code_seq) == 2:
                        self.log(f"   ✅ RM-ID format correct: {parts[0]}-{code_seq[0]}.{code_seq[1]}")
                    else:
                        self.log(f"   ⚠️ RM-ID sequence format issue: {parts[1]}")
                else:
                    self.log(f"   ⚠️ RM-ID format issue: {rm_id}")
            else:
                self.log(f"   ⚠️ RM-ID format doesn't match expected pattern: {rm_id}")
                
        return success

    def test_update_asset(self):
        """Test asset update"""
        if not self.asset_id:
            self.log("❌ No asset ID available for update test")
            return False
            
        success, response = self.run_test(
            "Update Asset",
            "PUT",
            f"assets/{self.asset_id}",
            200,
            data={
                "description": "Updated Test Real Estate Property",
                "value": 275000.00,
                "notes": "Updated notes for test asset"
            }
        )
        if success:
            self.log(f"   Updated description: {response.get('description')}")
            self.log(f"   Updated value: {response.get('value')}")
        return success

    def test_create_ledger_entry(self):
        """Test ledger entry creation with subject-based RM-ID"""
        if not self.portfolio_id:
            self.log("❌ No portfolio ID available for ledger entry test")
            return False
            
        success, response = self.run_test(
            "Create Ledger Entry with Subject-based RM-ID",
            "POST",
            f"portfolios/{self.portfolio_id}/ledger",
            200,
            data={
                "entry_type": "deposit",
                "subject_code": "03",  # Financial Account category
                "description": "Test manual ledger entry",
                "value": 10000.00,
                "balance_effect": "credit",
                "notes": "Test ledger entry for RM-ID system"
            }
        )
        if success and response.get('entry_id'):
            self.ledger_entry_id = response['entry_id']
            rm_id = response.get('rm_id', '')
            self.log(f"   Ledger Entry ID: {self.ledger_entry_id}")
            self.log(f"   Generated RM-ID: {rm_id}")
            self.log(f"   Subject Code: {response.get('subject_code')}")
            self.log(f"   Subject Name: {response.get('subject_name')}")
        return success

    def test_update_ledger_entry(self):
        """Test ledger entry update"""
        if not self.ledger_entry_id:
            self.log("❌ No ledger entry ID available for update test")
            return False
            
        success, response = self.run_test(
            "Update Ledger Entry",
            "PUT",
            f"ledger/{self.ledger_entry_id}",
            200,
            data={
                "description": "Updated test manual ledger entry",
                "value": 12000.00,
                "notes": "Updated notes for test ledger entry"
            }
        )
        if success:
            self.log(f"   Updated description: {response.get('description')}")
            self.log(f"   Updated value: {response.get('value')}")
        return success

    def test_get_trust_ledger(self):
        """Test getting trust ledger with balance summary"""
        if not self.portfolio_id:
            self.log("❌ No portfolio ID available for trust ledger test")
            return False
            
        success, response = self.run_test(
            "Get Trust Ledger with Balance Summary",
            "GET",
            f"portfolios/{self.portfolio_id}/ledger",
            200
        )
        if success:
            entries = response.get('entries', [])
            summary = response.get('summary', {})
            self.log(f"   Ledger entries: {len(entries)}")
            self.log(f"   Total deposits: ${summary.get('total_deposits', 0)}")
            self.log(f"   Total withdrawals: ${summary.get('total_withdrawals', 0)}")
            self.log(f"   Balance: ${summary.get('balance', 0)}")
        return success

    def test_delete_asset(self):
        """Test asset deletion (should create ledger entry)"""
        if not self.asset_id:
            self.log("❌ No asset ID available for deletion test")
            return False
            
        success, response = self.run_test(
            "Delete Asset (Creates Ledger Entry)",
            "DELETE",
            f"assets/{self.asset_id}",
            200
        )
        if success:
            self.log(f"   Asset deleted, RM-ID: {response.get('rm_id', 'N/A')}")
        return success

    def test_delete_ledger_entry(self):
        """Test ledger entry deletion (non-asset-linked only)"""
        if not self.ledger_entry_id:
            self.log("❌ No ledger entry ID available for deletion test")
            return False
            
        success, response = self.run_test(
            "Delete Ledger Entry (Non-Asset-Linked)",
            "DELETE",
            f"ledger/{self.ledger_entry_id}",
            200
        )
        if success:
            self.log(f"   Ledger entry deleted, RM-ID: {response.get('rm_id', 'N/A')}")
        return success

    def run_all_tests(self):
        """Run comprehensive test suite for RM-ID system overhaul"""
        self.log("🚀 Starting Equity Trust Portfolio RM-ID System Tests")
        self.log("=" * 60)
        
        # Setup
        if not self.create_test_user_session():
            self.log("❌ Failed to create test user session")
            return False
            
        # Test sequence for P0 RM-ID system features
        tests = [
            # Basic setup
            ("Portfolio Creation", self.test_create_portfolio),
            ("Trust Profile Creation", self.test_create_trust_profile),
            
            # RM-ID System Tests
            ("Placeholder RM-ID Generation", self.test_generate_placeholder_rm_id),
            ("RM-ID Normalization", self.test_update_trust_profile_rm_id),
            
            # Subject Categories Tests
            ("Default Subject Categories", self.test_get_subject_categories),
            ("Create Subject Category", self.test_create_subject_category),
            
            # Assets with Subject-based RM-ID
            ("Create Asset with Subject RM-ID", self.test_create_asset_with_subject_rm_id),
            ("Update Asset", self.test_update_asset),
            
            # Ledger with Subject-based RM-ID
            ("Create Ledger Entry with Subject RM-ID", self.test_create_ledger_entry),
            ("Update Ledger Entry", self.test_update_ledger_entry),
            ("Get Trust Ledger Summary", self.test_get_trust_ledger),
            
            # Cleanup tests
            ("Delete Asset (Creates Ledger Entry)", self.test_delete_asset),
            ("Delete Ledger Entry", self.test_delete_ledger_entry),
        ]
        
        for test_name, test_func in tests:
            try:
                test_func()
            except Exception as e:
                self.log(f"❌ {test_name} failed with exception: {str(e)}")
                
        # Summary
        self.log("=" * 60)
        self.log(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            self.log("🎉 All RM-ID system tests passed!")
            return True
        else:
            self.log(f"⚠️ {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = EquityTrustPortfolioTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())