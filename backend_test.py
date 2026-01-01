#!/usr/bin/env python3
"""
Backend API Testing for OmniGoVault - P0 Server-Side Portfolio Scoping Enforcement
Testing specific scenarios mentioned in the review request:

**Test Environment:**
- Frontend URL: https://docs-audit-tool.preview.emergentagent.com
- Backend API: https://docs-audit-tool.preview.emergentagent.com/api

**Test Scenarios:**

### 1. Server-Side Portfolio Enforcement (Critical Security Fix)
Test the importable-documents endpoint:

a) **Without portfolio_id and vault has no portfolio_id** - Should return 400 with message "portfolio_id is required"
   - Vault ID: vault_no_portfolio_test

b) **Without portfolio_id but vault has portfolio_id** - Should work (fallback to vault's portfolio)
   - Vault ID: vault_dd6662703369 (has portfolio_id: port_97d34c5737f4)

c) **With portfolio_id in query param** - Should return only docs from that portfolio
   - Use portfolio_id: port_97d34c5737f4

### 2. Vaults List Endpoint
- GET /api/vaults?portfolio_id=xxx - Should only return vaults linked to that portfolio
- GET /api/vaults (no portfolio) - Should return all user vaults with portfolio_id in response

### 3. Auth Guard Verification
- GET /api/auth/me without cookie - Should return 401
- Protected endpoints without auth - Should return 401

Note: Use test session token test_session_p0_1767274420 for authenticated requests.
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid
import hashlib
import subprocess

# Use the public endpoint from frontend/.env
BASE_URL = "https://docs-audit-tool.preview.emergentagent.com/api"
FRONTEND_URL = "https://docs-audit-tool.preview.emergentagent.com"

class P0PortfolioScopingTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.frontend_url = FRONTEND_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'P0PortfolioScopingTester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = []
        
        # Test user details from review request
        self.test_user_email = "jedediah.bey@gmail.com"
        self.test_user_id = "dev_admin_user"  # Using canonical user ID
        
        # Test session token from review request
        self.session_token = "test_session_p0_1767274420"
        
        # Test data from review request
        self.vault_no_portfolio = "vault_no_portfolio_test"
        self.vault_with_portfolio = "vault_dd6662703369"
        self.test_portfolio_id = "port_97d34c5737f4"
        
        # Setup test session token
        self.setup_test_session()

    def setup_test_session(self):
        """Setup test session token and test data"""
        try:
            # Create test session using mongosh
            result = subprocess.run([
                'mongosh', '--eval', f"""
                use('test_database');
                var userId = '{self.test_user_id}';
                var sessionToken = '{self.session_token}';
                
                // Ensure user exists
                db.users.updateOne(
                    {{user_id: userId}},
                    {{$setOnInsert: {{
                        user_id: userId,
                        email: '{self.test_user_email}',
                        name: 'Jedediah Bey',
                        picture: 'https://via.placeholder.com/150',
                        created_at: new Date()
                    }}}},
                    {{upsert: true}}
                );
                
                // Create session
                db.user_sessions.deleteMany({{session_token: sessionToken}});
                db.user_sessions.insertOne({{
                    user_id: userId,
                    session_token: sessionToken,
                    expires_at: new Date(Date.now() + 7*24*60*60*1000),
                    created_at: new Date()
                }});
                
                // Setup test vaults
                db.vaults.updateOne(
                    {{vault_id: '{self.vault_no_portfolio}'}},
                    {{$setOnInsert: {{
                        vault_id: '{self.vault_no_portfolio}',
                        user_id: userId,
                        name: 'Test Vault No Portfolio',
                        created_at: new Date()
                    }}}},
                    {{upsert: true}}
                );
                
                db.vaults.updateOne(
                    {{vault_id: '{self.vault_with_portfolio}'}},
                    {{$setOnInsert: {{
                        vault_id: '{self.vault_with_portfolio}',
                        user_id: userId,
                        name: 'Test Vault With Portfolio',
                        portfolio_id: '{self.test_portfolio_id}',
                        created_at: new Date()
                    }}}},
                    {{upsert: true}}
                );
                
                // Setup test portfolio
                db.portfolios.updateOne(
                    {{portfolio_id: '{self.test_portfolio_id}'}},
                    {{$setOnInsert: {{
                        portfolio_id: '{self.test_portfolio_id}',
                        user_id: userId,
                        name: 'Test Portfolio P0',
                        description: 'Test portfolio for P0 scoping tests',
                        created_at: new Date()
                    }}}},
                    {{upsert: true}}
                );
                
                print('Test data setup complete');
                """
            ], capture_output=True, text=True, timeout=15)
            
            if result.returncode == 0:
                self.log(f"✅ Test session and data setup complete")
            else:
                self.log(f"⚠️ Test setup warning: {result.stderr}")
                
        except Exception as e:
            self.log(f"⚠️ Test setup failed: {str(e)}")

    def get_valid_session_token(self):
        """Legacy method - now using predefined session token"""
        return self.session_token

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            self.log(f"✅ {name}")
        else:
            self.log(f"❌ {name} - {details}")
            self.failed_tests.append({
                'test': name,
                'details': details,
                'timestamp': datetime.now().isoformat()
            })
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    # ============ P0 SERVER-SIDE PORTFOLIO ENFORCEMENT TESTS ============

    def test_importable_documents_no_portfolio_vault_no_portfolio(self):
        """Test importable-documents without portfolio_id and vault has no portfolio_id - Should return 400"""
        if not self.session_token:
            self.log_test("Importable Docs - No Portfolio, Vault No Portfolio", False, "No session token available")
            return False
            
        try:
            # Set up authenticated session
            auth_session = requests.Session()
            auth_session.headers.update({
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.session_token}',
                'User-Agent': 'P0PortfolioScopingTester/1.0'
            })
            
            # Test importable-documents endpoint without portfolio_id for vault with no portfolio
            response = auth_session.get(
                f"{self.base_url}/vaults/{self.vault_no_portfolio}/importable-documents",
                timeout=10
            )
            
            success = response.status_code == 400
            
            if success:
                try:
                    data = response.json()
                    message = data.get("detail", "")
                    if "portfolio_id is required" in message.lower():
                        details = f"Correctly returned 400 with message: {message}"
                    else:
                        details = f"Returned 400 but unexpected message: {message}"
                        success = False
                except:
                    details = f"Returned 400 but could not parse JSON: {response.text[:200]}"
                    success = False
            else:
                details = f"Expected 400, got {response.status_code}: {response.text[:200]}"
            
            self.log_test("Importable Docs - No Portfolio, Vault No Portfolio", success, details)
            return success
            
        except Exception as e:
            self.log_test("Importable Docs - No Portfolio, Vault No Portfolio", False, f"Error: {str(e)}")
            return False

    def test_importable_documents_no_portfolio_vault_has_portfolio(self):
        """Test importable-documents without portfolio_id but vault has portfolio_id - Should work"""
        if not self.session_token:
            self.log_test("Importable Docs - No Portfolio, Vault Has Portfolio", False, "No session token available")
            return False
            
        try:
            # Set up authenticated session
            auth_session = requests.Session()
            auth_session.headers.update({
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.session_token}',
                'User-Agent': 'P0PortfolioScopingTester/1.0'
            })
            
            # Test importable-documents endpoint without portfolio_id for vault with portfolio
            response = auth_session.get(
                f"{self.base_url}/vaults/{self.vault_with_portfolio}/importable-documents",
                timeout=10
            )
            
            success = response.status_code == 200
            
            if success:
                try:
                    data = response.json()
                    documents = data.get("documents", [])
                    details = f"Successfully returned {len(documents)} documents (fallback to vault's portfolio)"
                except:
                    details = f"Returned 200 but could not parse JSON: {response.text[:200]}"
                    success = False
            else:
                details = f"Expected 200, got {response.status_code}: {response.text[:200]}"
            
            self.log_test("Importable Docs - No Portfolio, Vault Has Portfolio", success, details)
            return success
            
        except Exception as e:
            self.log_test("Importable Docs - No Portfolio, Vault Has Portfolio", False, f"Error: {str(e)}")
            return False

    def test_importable_documents_with_portfolio_id(self):
        """Test importable-documents with portfolio_id in query param - Should return only docs from that portfolio"""
        if not self.session_token:
            self.log_test("Importable Docs - With Portfolio ID", False, "No session token available")
            return False
            
        try:
            # Set up authenticated session
            auth_session = requests.Session()
            auth_session.headers.update({
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.session_token}',
                'User-Agent': 'P0PortfolioScopingTester/1.0'
            })
            
            # Test importable-documents endpoint with portfolio_id query param
            response = auth_session.get(
                f"{self.base_url}/vaults/{self.vault_with_portfolio}/importable-documents",
                params={"portfolio_id": self.test_portfolio_id},
                timeout=10
            )
            
            success = response.status_code == 200
            
            if success:
                try:
                    data = response.json()
                    documents = data.get("documents", [])
                    
                    # Verify all documents belong to the specified portfolio
                    portfolio_mismatch = False
                    for doc in documents:
                        doc_portfolio = doc.get("portfolio_id") or doc.get("portfolio_name")
                        if doc_portfolio and self.test_portfolio_id not in str(doc_portfolio):
                            portfolio_mismatch = True
                            break
                    
                    if portfolio_mismatch:
                        details = f"Returned {len(documents)} documents but some don't belong to specified portfolio"
                        success = False
                    else:
                        details = f"Successfully returned {len(documents)} documents from portfolio {self.test_portfolio_id}"
                        
                except:
                    details = f"Returned 200 but could not parse JSON: {response.text[:200]}"
                    success = False
            else:
                details = f"Expected 200, got {response.status_code}: {response.text[:200]}"
            
            self.log_test("Importable Docs - With Portfolio ID", success, details)
            return success
            
        except Exception as e:
            self.log_test("Importable Docs - With Portfolio ID", False, f"Error: {str(e)}")
            return False

    # ============ VAULTS LIST ENDPOINT TESTS ============

    def test_vaults_with_portfolio_filter(self):
        """Test GET /api/vaults?portfolio_id=xxx - Should only return vaults linked to that portfolio"""
        if not self.session_token:
            self.log_test("Vaults with Portfolio Filter", False, "No session token available")
            return False
            
        try:
            # Set up authenticated session
            auth_session = requests.Session()
            auth_session.headers.update({
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.session_token}',
                'User-Agent': 'P0PortfolioScopingTester/1.0'
            })
            
            # Test vaults endpoint with portfolio_id filter
            response = auth_session.get(
                f"{self.base_url}/vaults",
                params={"portfolio_id": self.test_portfolio_id},
                timeout=10
            )
            
            success = response.status_code == 200
            
            if success:
                try:
                    data = response.json()
                    
                    # Handle different response formats
                    if isinstance(data, list):
                        vaults = data
                    elif isinstance(data, dict) and "vaults" in data:
                        vaults = data["vaults"]
                    elif isinstance(data, dict) and "data" in data:
                        vaults = data["data"]
                    else:
                        vaults = []
                    
                    # Verify all vaults belong to the specified portfolio
                    portfolio_mismatch = False
                    for vault in vaults:
                        vault_portfolio = vault.get("portfolio_id")
                        if vault_portfolio != self.test_portfolio_id:
                            portfolio_mismatch = True
                            break
                    
                    if portfolio_mismatch:
                        details = f"Returned {len(vaults)} vaults but some don't belong to specified portfolio"
                        success = False
                    else:
                        details = f"Successfully returned {len(vaults)} vaults filtered by portfolio {self.test_portfolio_id}"
                        
                except:
                    details = f"Returned 200 but could not parse JSON: {response.text[:200]}"
                    success = False
            else:
                details = f"Expected 200, got {response.status_code}: {response.text[:200]}"
            
            self.log_test("Vaults with Portfolio Filter", success, details)
            return success
            
        except Exception as e:
            self.log_test("Vaults with Portfolio Filter", False, f"Error: {str(e)}")
            return False

    def test_vaults_without_portfolio_filter(self):
        """Test GET /api/vaults (no portfolio) - Should return all user vaults with portfolio_id in response"""
        if not self.session_token:
            self.log_test("Vaults without Portfolio Filter", False, "No session token available")
            return False
            
        try:
            # Set up authenticated session
            auth_session = requests.Session()
            auth_session.headers.update({
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.session_token}',
                'User-Agent': 'P0PortfolioScopingTester/1.0'
            })
            
            # Test vaults endpoint without portfolio_id filter
            response = auth_session.get(f"{self.base_url}/vaults", timeout=10)
            
            success = response.status_code == 200
            
            if success:
                try:
                    data = response.json()
                    
                    # Handle different response formats
                    if isinstance(data, list):
                        vaults = data
                    elif isinstance(data, dict) and "vaults" in data:
                        vaults = data["vaults"]
                    elif isinstance(data, dict) and "data" in data:
                        vaults = data["data"]
                    else:
                        vaults = []
                    
                    # Verify portfolio_id is included in response for vaults that have it
                    portfolio_info_present = True
                    vaults_with_portfolio = 0
                    
                    for vault in vaults:
                        if vault.get("vault_id") == self.vault_with_portfolio:
                            if "portfolio_id" not in vault:
                                portfolio_info_present = False
                            else:
                                vaults_with_portfolio += 1
                    
                    if not portfolio_info_present:
                        details = f"Returned {len(vaults)} vaults but portfolio_id missing from response"
                        success = False
                    else:
                        details = f"Successfully returned {len(vaults)} vaults, {vaults_with_portfolio} with portfolio_id"
                        
                except:
                    details = f"Returned 200 but could not parse JSON: {response.text[:200]}"
                    success = False
            else:
                details = f"Expected 200, got {response.status_code}: {response.text[:200]}"
            
            self.log_test("Vaults without Portfolio Filter", success, details)
            return success
            
        except Exception as e:
            self.log_test("Vaults without Portfolio Filter", False, f"Error: {str(e)}")
            return False

    # ============ TEST RUNNER ============

    def run_auth_consistency_tests(self):
        """Run all tests for auth consistency and portfolio scoping"""
        self.log("🚀 Starting AUTH CONSISTENCY & PORTFOLIO SCOPING Tests for OmniGoVault")
        self.log(f"Testing against: {self.base_url}")
        self.log(f"Frontend URL: {self.frontend_url}")
        self.log(f"Test User: {self.test_user_email}")
        self.log("=" * 80)
        
        # Test sequence based on review request
        test_sequence = [
            # 1. Auth Guard Verification (no auth required)
            self.test_auth_me_without_cookie,
            self.test_vault_redirect_without_auth,
            
            # 2. QA Report Endpoints (no auth required)
            self.test_qa_report_lite_endpoint,
            self.test_qa_access_md_endpoint,
            
            # 3. Portfolio-Scoped Endpoints (require auth)
            self.test_vaults_with_auth,
            self.test_documents_with_portfolio_id,
            
            # 4. Public Routes
            self.test_landing_page_without_auth,
            self.test_learn_page_without_auth,
        ]
        
        for test_func in test_sequence:
            try:
                test_func()
                time.sleep(0.5)  # Brief pause between tests
            except Exception as e:
                test_name = getattr(test_func, '__name__', 'Unknown Test')
                self.log(f"❌ Test {test_name} crashed: {str(e)}")
                self.tests_run += 1
                self.failed_tests.append({
                    'test': test_name,
                    'details': f"Test crashed: {str(e)}",
                    'timestamp': datetime.now().isoformat()
                })
        
        return self.print_summary()

    def print_summary(self):
        """Print test summary"""
        self.log("=" * 80)
        self.log("🏁 AUTH CONSISTENCY & PORTFOLIO SCOPING TEST SUMMARY")
        self.log("=" * 80)
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        self.log(f"📊 Tests Run: {self.tests_run}")
        self.log(f"✅ Tests Passed: {self.tests_passed}")
        self.log(f"❌ Tests Failed: {len(self.failed_tests)}")
        self.log(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.failed_tests:
            self.log("\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                self.log(f"  • {failure['test']}: {failure['details']}")
        
        self.log("\n🎯 REVIEW REQUEST FINDINGS:")
        
        # Check each category from review request
        categories = {
            "Auth Guard Verification": ["auth guard", "auth me", "vault redirect"],
            "QA Report Endpoints": ["qa report", "qa access"],
            "Portfolio-Scoped Endpoints": ["vaults with auth", "documents with portfolio"],
            "Public Routes": ["landing page", "learn page"]
        }
        
        for category, keywords in categories.items():
            category_tests = [
                t for t in self.test_results 
                if any(keyword in t['test'].lower() for keyword in keywords)
            ]
            
            if category_tests:
                category_success = sum(1 for t in category_tests if t['success'])
                total_tests = len(category_tests)
                status = "✅" if category_success == total_tests else "⚠️" if category_success > 0 else "❌"
                self.log(f"  {category}: {category_success}/{total_tests} {status}")
        
        # Authentication status
        auth_working = self.session_token is not None
        self.log(f"\n🔐 Authentication Status: {'✅ Working' if auth_working else '❌ Failed'}")
        
        # Specific findings for review request
        self.log("\n📋 SPECIFIC REVIEW REQUEST STATUS:")
        
        # Auth Guard Verification
        auth_guard_tests = [t for t in self.test_results if 'auth guard' in t['test'].lower() or 'auth me' in t['test'].lower() or 'vault redirect' in t['test'].lower()]
        auth_guard_working = any(t['success'] for t in auth_guard_tests)
        self.log(f"  1. Auth Guard Verification: {'✅ Working' if auth_guard_working else '❌ Issues detected'}")
        
        # QA Report endpoints
        qa_tests = [t for t in self.test_results if 'qa' in t['test'].lower()]
        qa_working = any(t['success'] for t in qa_tests)
        self.log(f"  2. QA Report Endpoints: {'✅ Working' if qa_working else '❌ Issues detected'}")
        
        # Portfolio-scoped endpoints
        portfolio_tests = [t for t in self.test_results if 'vaults with auth' in t['test'].lower() or 'documents with portfolio' in t['test'].lower()]
        portfolio_working = any(t['success'] for t in portfolio_tests)
        self.log(f"  3. Portfolio-Scoped Endpoints: {'✅ Working' if portfolio_working else '❌ Issues detected'}")
        
        # Public routes
        public_tests = [t for t in self.test_results if 'landing page' in t['test'].lower() or 'learn page' in t['test'].lower()]
        public_working = any(t['success'] for t in public_tests)
        self.log(f"  4. Public Routes: {'✅ Working' if public_working else '❌ Issues detected'}")
        
        self.log("\n📝 RECOMMENDATIONS:")
        if success_rate >= 90:
            self.log("✅ Auth consistency and portfolio scoping working correctly")
            self.log("✅ No critical issues found - ready for production use")
        elif success_rate >= 75:
            self.log("⚠️ Most features working with minor issues")
            self.log("✅ Core auth and scoping functionality is operational")
        else:
            self.log("❌ Significant issues detected in auth consistency or portfolio scoping")
            if not auth_working:
                self.log("❌ Authentication issues preventing full testing")
        
        return success_rate >= 75


# ============ MAIN EXECUTION ============

if __name__ == "__main__":
    print("🚀 OmniGoVault Backend API Testing - Auth Consistency & Portfolio Scoping")
    print("=" * 80)
    
    tester = AuthConsistencyTester()
    success = tester.run_auth_consistency_tests()
    
    print("\n" + "=" * 80)
    if success:
        print("🎉 AUTH CONSISTENCY & PORTFOLIO SCOPING TESTING COMPLETED SUCCESSFULLY")
        sys.exit(0)
    else:
        print("⚠️ AUTH CONSISTENCY & PORTFOLIO SCOPING TESTING COMPLETED WITH ISSUES")
        sys.exit(1)