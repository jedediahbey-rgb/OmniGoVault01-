#!/usr/bin/env python3
"""
Backend API Testing for Equity Trust Portfolio - Bug Fix Verification
Testing specific bugs mentioned in review request:
- P0-1: Verify new ledger entries get subject codes 10+ not 01-09
- P0-2: Test document trash/permanent delete/restore endpoints
"""

import requests
import sys
import json
from datetime import datetime

class EquityTrustBugFixTester:
    def __init__(self, base_url="https://portfolio-sync-10.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_portfolio_id = None
        self.test_document_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
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
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test if API is accessible"""
        print("🏥 Testing API Health Check...")
        try:
            response = requests.get(f"{self.base_url.replace('/api', '')}/health", timeout=5)
            if response.status_code == 200:
                print("✅ API is accessible")
                return True
            else:
                print(f"⚠️  API returned status {response.status_code}")
                return True  # Continue testing even if health endpoint doesn't exist
        except Exception as e:
            print(f"⚠️  Health check failed: {e}")
            return True  # Continue testing

    def setup_test_data(self):
        """Create test portfolio and document for testing"""
        print("\n📋 Setting up test data...")
        
        # Create test portfolio
        success, portfolio = self.run_test(
            "Create test portfolio",
            "POST",
            "portfolios",
            201,
            data={"name": "Bug Fix Test Portfolio", "description": "Testing P0 bugs"}
        )
        
        if success and portfolio:
            self.test_portfolio_id = portfolio.get('portfolio_id')
            print(f"   Created portfolio: {self.test_portfolio_id}")
        
        # Create test document
        if self.test_portfolio_id:
            success, document = self.run_test(
                "Create test document",
                "POST",
                "documents",
                201,
                data={
                    "portfolio_id": self.test_portfolio_id,
                    "title": "Test Document for Trash Testing",
                    "document_type": "custom",
                    "content": "This is a test document for trash/restore testing"
                }
            )
            
            if success and document:
                self.test_document_id = document.get('document_id')
                print(f"   Created document: {self.test_document_id}")

    def test_p0_1_ledger_subject_codes(self):
        """P0-1: Verify new ledger entries get subject codes 10+ not 01-09"""
        print("\n🎯 Testing P0-1: Ledger entries should use subject codes 10+ (not 01-09)")
        
        if not self.test_portfolio_id:
            print("❌ No test portfolio available")
            return False
        
        # Test creating ledger entry - should get subject code 10+
        success, ledger_entry = self.run_test(
            "Create ledger entry (should get code 10+)",
            "POST",
            f"portfolios/{self.test_portfolio_id}/ledger",
            201,
            data={
                "entry_type": "deposit",
                "description": "Test ledger entry for subject code verification",
                "subject_code": "00",  # Default, should be assigned 10+
                "value": 1000,
                "balance_effect": "credit"
            }
        )
        
        if success and ledger_entry:
            subject_code = ledger_entry.get('subject_code', '00')
            rm_id = ledger_entry.get('rm_id', '')
            
            print(f"   Generated subject code: {subject_code}")
            print(f"   Generated RM-ID: {rm_id}")
            
            # Verify subject code is 10 or higher (not 01-09 which are reserved for templates)
            try:
                code_num = int(subject_code)
                if code_num >= 10:
                    print(f"✅ Subject code {subject_code} is >= 10 (correct - not using reserved template codes 01-09)")
                    return True
                else:
                    print(f"❌ Subject code {subject_code} is < 10 (incorrect - using reserved template codes)")
                    return False
            except ValueError:
                print(f"❌ Invalid subject code format: {subject_code}")
                return False
        
        return False

    def test_p0_2_document_trash_endpoints(self):
        """P0-2: Test document trash, permanent delete, and restore endpoints"""
        print("\n🗑️  Testing P0-2: Document trash/restore/permanent delete endpoints")
        
        if not self.test_document_id:
            print("❌ No test document available")
            return False
        
        # Test 1: Move document to trash
        success, _ = self.run_test(
            "POST /documents/{id}/trash - Move to trash",
            "POST",
            f"documents/{self.test_document_id}/trash",
            200
        )
        
        if not success:
            print("❌ Failed to move document to trash")
            return False
        
        # Test 2: Verify document is in trash
        success, trash_docs = self.run_test(
            "GET /documents/trash - Check trash",
            "GET",
            "documents/trash",
            200
        )
        
        if success:
            doc_in_trash = any(doc.get('document_id') == self.test_document_id for doc in trash_docs)
            if doc_in_trash:
                print("✅ Document found in trash")
            else:
                print("❌ Document not found in trash")
                return False
        
        # Test 3: Restore document from trash
        success, _ = self.run_test(
            "POST /documents/{id}/restore - Restore from trash",
            "POST",
            f"documents/{self.test_document_id}/restore",
            200
        )
        
        if not success:
            print("❌ Failed to restore document from trash")
            return False
        
        # Test 4: Move to trash again for permanent delete test
        success, _ = self.run_test(
            "POST /documents/{id}/trash - Move to trash again",
            "POST",
            f"documents/{self.test_document_id}/trash",
            200
        )
        
        # Test 5: Permanently delete document
        success, _ = self.run_test(
            "DELETE /documents/{id}/permanent - Permanent delete",
            "DELETE",
            f"documents/{self.test_document_id}/permanent",
            200
        )
        
        if success:
            print("✅ All document trash/restore/permanent delete endpoints working")
            return True
        else:
            print("❌ Permanent delete endpoint failed")
            return False

    def test_subject_categories_api(self):
        """Test subject categories to understand the 01-09 vs 10+ system"""
        print("\n📂 Testing subject categories system...")
        
        if not self.test_portfolio_id:
            print("❌ No test portfolio available")
            return False
        
        success, categories = self.run_test(
            "GET subject categories",
            "GET",
            f"portfolios/{self.test_portfolio_id}/subject-categories",
            200
        )
        
        if success and categories:
            print(f"   Found {len(categories)} subject categories:")
            template_codes = []
            user_codes = []
            
            for cat in categories[:10]:  # Show first 10
                code = cat.get('code', '00')
                name = cat.get('name', 'Unknown')
                print(f"   {code}: {name}")
                
                try:
                    code_num = int(code)
                    if 1 <= code_num <= 9:
                        template_codes.append(code)
                    elif code_num >= 10:
                        user_codes.append(code)
                except ValueError:
                    pass
            
            print(f"\n   Template codes (01-09): {template_codes}")
            print(f"   User codes (10+): {user_codes}")
            
            return True
        
        return False

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        if self.test_portfolio_id:
            success, _ = self.run_test(
                "Delete test portfolio",
                "DELETE",
                f"portfolios/{self.test_portfolio_id}",
                200
            )
            if success:
                print("✅ Test portfolio cleaned up")

def main():
    print("🚀 Starting Equity Trust Portfolio Bug Fix Testing")
    print("=" * 60)
    
    tester = EquityTrustBugFixTester()
    
    # Health check
    if not tester.test_health_check():
        print("❌ API not accessible, stopping tests")
        return 1
    
    # Setup test data
    tester.setup_test_data()
    
    # Run bug fix tests
    p0_1_passed = tester.test_p0_1_ledger_subject_codes()
    p0_2_passed = tester.test_p0_2_document_trash_endpoints()
    
    # Additional context tests
    tester.test_subject_categories_api()
    
    # Cleanup
    tester.cleanup_test_data()
    
    # Results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    print("\n🎯 BUG FIX VERIFICATION:")
    print(f"P0-1 (Ledger subject codes 10+): {'✅ PASSED' if p0_1_passed else '❌ FAILED'}")
    print(f"P0-2 (Document trash endpoints): {'✅ PASSED' if p0_2_passed else '❌ FAILED'}")
    
    return 0 if (p0_1_passed and p0_2_passed) else 1

if __name__ == "__main__":
    sys.exit(main())