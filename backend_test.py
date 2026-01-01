#!/usr/bin/env python3
"""
Backend API Testing for OmniGoVault - Auth Consistency & Portfolio Scoping Testing
Testing specific scenarios mentioned in the review request:

**Test Environment:**
- Frontend URL: https://docs-audit-tool.preview.emergentagent.com
- Backend API: https://docs-audit-tool.preview.emergentagent.com/api

**Test Scenarios:**

1. **Auth Guard Verification** (no auth required):
   - GET /api/auth/me without cookie - Should return 401
   - Direct navigation to /vault should redirect to landing page

2. **QA Report Endpoints** (no auth required):
   - GET /api/qa/report-lite - Should return HTML report
   - GET /api/qa/access.md - Should return markdown

3. **Portfolio-Scoped Endpoints** (require auth):
   - GET /api/vaults - Should work with valid auth
   - GET /api/documents - Should work with portfolio_id param
   
4. **Public Routes**:
   - GET / (landing page) - Should load without auth
   - GET /learn - Should show educational content even without auth
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

class AuthConsistencyTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.frontend_url = FRONTEND_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'AuthConsistencyTester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = []
        
        # Test user details from review request
        self.test_user_email = "jedediah.bey@gmail.com"
        self.test_user_id = "dev_admin_user"  # Using canonical user ID
        
        # Test data for authenticated endpoints
        self.test_portfolio_id = None
        self.test_vault_id = None
        
        # Try to get a valid session token
        self.session_token = self.get_valid_session_token()

    def get_valid_session_token(self):
        """Get a valid session token for testing"""
        try:
            # Create test session using mongosh
            result = subprocess.run([
                'mongosh', '--eval', f"""
                use('test_database');
                var userId = '{self.test_user_id}';
                var sessionToken = 'test_session_auth_' + Date.now();
                
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
                db.user_sessions.insertOne({{
                    user_id: userId,
                    session_token: sessionToken,
                    expires_at: new Date(Date.now() + 7*24*60*60*1000),
                    created_at: new Date()
                }});
                
                print(sessionToken);
                """
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                session_token = result.stdout.strip().split('\n')[-1]
                if session_token and session_token.startswith('test_session_auth_'):
                    self.log(f"✅ Created test session: {session_token[:25]}...")
                    return session_token
            
            self.log("⚠️ Could not create test session - testing without authentication")
            return None
            
        except Exception as e:
            self.log(f"⚠️ Session creation failed: {str(e)} - testing without authentication")
            return None

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

    # ============ AUTH GUARD VERIFICATION TESTS ============

    def test_auth_me_without_cookie(self):
        """Test GET /api/auth/me without cookie - Should return 401"""
        try:
            # Create a session without authentication headers
            unauth_session = requests.Session()
            unauth_session.headers.update({
                'Content-Type': 'application/json',
                'User-Agent': 'AuthConsistencyTester/1.0'
            })
            
            response = unauth_session.get(f"{self.base_url}/auth/me", timeout=10)
            success = response.status_code == 401
            
            if success:
                details = f"Correctly returned 401 Unauthorized"
            else:
                details = f"Expected 401, got {response.status_code}: {response.text[:200]}"
            
            self.log_test("Auth Guard - /api/auth/me without cookie", success, details)
            return success
            
        except Exception as e:
            self.log_test("Auth Guard - /api/auth/me without cookie", False, f"Error: {str(e)}")
            return False

    def test_vault_redirect_without_auth(self):
        """Test direct navigation to /vault should redirect to landing page"""
        try:
            # Test frontend vault route without authentication
            unauth_session = requests.Session()
            unauth_session.headers.update({
                'User-Agent': 'AuthConsistencyTester/1.0'
            })
            
            response = unauth_session.get(f"{self.frontend_url}/vault", timeout=10, allow_redirects=False)
            
            # Check if it redirects (3xx status) or serves landing page content
            if response.status_code in [301, 302, 303, 307, 308]:
                # Check redirect location
                location = response.headers.get('Location', '')
                if '/' in location or 'login' in location.lower() or 'auth' in location.lower():
                    success = True
                    details = f"Redirected to: {location}"
                else:
                    success = False
                    details = f"Unexpected redirect to: {location}"
            elif response.status_code == 200:
                # Check if it serves landing page content instead of vault
                content = response.text.lower()
                if 'vault' in content and ('login' in content or 'sign in' in content or 'create account' in content):
                    success = True
                    details = "Serves landing page with auth prompts"
                elif 'vault' not in content:
                    success = True
                    details = "Serves landing page without vault content"
                else:
                    success = False
                    details = "Serves vault content without authentication"
            else:
                success = False
                details = f"Unexpected status: {response.status_code}"
            
            self.log_test("Auth Guard - /vault redirect", success, details)
            return success
            
        except Exception as e:
            self.log_test("Auth Guard - /vault redirect", False, f"Error: {str(e)}")
            return False

    # ============ QA REPORT ENDPOINTS TESTS ============

    def test_qa_report_lite_endpoint(self):
        """Test GET /api/qa/report-lite - Should return HTML report"""
        try:
            response = self.session.get(f"{self.base_url}/qa/report-lite", timeout=15)
            success = response.status_code == 200
            
            if success:
                content = response.text
                content_type = response.headers.get('content-type', '')
                
                # Check if it's HTML content
                if 'text/html' in content_type and '<html' in content.lower():
                    # Check for expected content
                    expected_content = [
                        'route inventory',
                        'user flows',
                        'permission matrix',
                        'qa report'
                    ]
                    
                    found_content = [item for item in expected_content if item.lower() in content.lower()]
                    
                    if len(found_content) >= 2:  # At least 2 out of 4 expected items
                        details = f"HTML report ({len(content)} chars), Contains: {', '.join(found_content)}"
                    else:
                        details = f"HTML page but missing expected content. Found: {', '.join(found_content)}"
                        success = False
                else:
                    details = f"Content-Type: {content_type}, Length: {len(content)} chars"
                    if len(content) > 1000:  # Substantial content
                        details += " (substantial content)"
                    else:
                        success = False
                        details += " (insufficient content)"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("QA Report Lite Endpoint", success, details)
            return success
            
        except Exception as e:
            self.log_test("QA Report Lite Endpoint", False, f"Error: {str(e)}")
            return False

    def test_qa_access_md_endpoint(self):
        """Test GET /api/qa/access.md - Should return markdown"""
        try:
            response = self.session.get(f"{self.base_url}/qa/access.md", timeout=10)
            success = response.status_code == 200
            
            if success:
                content = response.text
                content_type = response.headers.get('content-type', '')
                
                # Check for markdown content
                if 'text/markdown' in content_type or 'text/plain' in content_type:
                    # Check for expected markdown content
                    expected_content = [
                        'qa reviewer',
                        'instructions',
                        '#',  # Markdown headers
                        'test'
                    ]
                    
                    found_content = [item for item in expected_content if item.lower() in content.lower()]
                    
                    if len(found_content) >= 3:  # At least 3 out of 4 expected items
                        details = f"Markdown content ({len(content)} chars), Contains: {', '.join(found_content)}"
                    else:
                        details = f"Content but missing expected markdown. Found: {', '.join(found_content)}"
                        success = False
                else:
                    details = f"Content-Type: {content_type}, Length: {len(content)} chars"
                    if len(content) > 100:  # Some content
                        details += " (has content)"
                    else:
                        success = False
                        details += " (insufficient content)"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("QA Access.md Endpoint", success, details)
            return success
            
        except Exception as e:
            self.log_test("QA Access.md Endpoint", False, f"Error: {str(e)}")
            return False

    # ============ PORTFOLIO-SCOPED ENDPOINTS TESTS ============

    def test_vaults_with_auth(self):
        """Test GET /api/vaults - Should work with valid auth"""
        if not self.session_token:
            self.log_test("Vaults with Auth", False, "No session token available")
            return False
            
        try:
            # Set up authenticated session
            auth_session = requests.Session()
            auth_session.headers.update({
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.session_token}',
                'User-Agent': 'AuthConsistencyTester/1.0'
            })
            
            response = auth_session.get(f"{self.base_url}/vaults", timeout=10)
            success = response.status_code == 200
            
            if success:
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
                
                vault_count = len(vaults)
                details = f"Successfully retrieved {vault_count} vaults"
                
                if vault_count > 0:
                    # Store first vault for further testing
                    self.test_vault_id = vaults[0].get("vault_id") or vaults[0].get("id")
                    vault_name = vaults[0].get("name", "Unknown")
                    details += f", First vault: {vault_name}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Vaults with Auth", success, details)
            return success
            
        except Exception as e:
            self.log_test("Vaults with Auth", False, f"Error: {str(e)}")
            return False

    def test_documents_with_portfolio_id(self):
        """Test GET /api/documents - Should work with portfolio_id param"""
        if not self.session_token:
            self.log_test("Documents with Portfolio ID", False, "No session token available")
            return False
            
        try:
            # First get portfolios to find a valid portfolio_id
            auth_session = requests.Session()
            auth_session.headers.update({
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.session_token}',
                'User-Agent': 'AuthConsistencyTester/1.0'
            })
            
            # Get portfolios
            portfolios_resp = auth_session.get(f"{self.base_url}/portfolios", timeout=10)
            if portfolios_resp.status_code != 200:
                self.log_test("Documents with Portfolio ID", False, "Could not retrieve portfolios")
                return False
            
            portfolios = portfolios_resp.json()
            if not portfolios:
                self.log_test("Documents with Portfolio ID", False, "No portfolios found")
                return False
            
            # Use first portfolio
            portfolio_id = portfolios[0].get("portfolio_id")
            portfolio_name = portfolios[0].get("name", "Unknown")
            
            # Test documents endpoint with portfolio_id
            response = auth_session.get(
                f"{self.base_url}/documents",
                params={"portfolio_id": portfolio_id},
                timeout=10
            )
            success = response.status_code == 200
            
            if success:
                data = response.json()
                
                # Handle different response formats
                if isinstance(data, list):
                    documents = data
                elif isinstance(data, dict) and "documents" in data:
                    documents = data["documents"]
                elif isinstance(data, dict) and "data" in data:
                    documents = data["data"]
                else:
                    documents = []
                
                doc_count = len(documents)
                details = f"Portfolio '{portfolio_name}': {doc_count} documents"
                
                if doc_count > 0:
                    # Show sample document info
                    first_doc = documents[0]
                    doc_title = first_doc.get("title", "Unknown")
                    doc_type = first_doc.get("document_type", "Unknown")
                    details += f", Sample: {doc_title} ({doc_type})"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Documents with Portfolio ID", success, details)
            return success
            
        except Exception as e:
            self.log_test("Documents with Portfolio ID", False, f"Error: {str(e)}")
            return False

    # ============ PUBLIC ROUTES TESTS ============

    def test_landing_page_without_auth(self):
        """Test GET / (landing page) - Should load without auth"""
        try:
            # Test frontend landing page without authentication
            unauth_session = requests.Session()
            unauth_session.headers.update({
                'User-Agent': 'AuthConsistencyTester/1.0'
            })
            
            response = unauth_session.get(f"{self.frontend_url}/", timeout=10)
            success = response.status_code == 200
            
            if success:
                content = response.text.lower()
                
                # Check for expected landing page content
                expected_content = [
                    'omnigovault',
                    'vault',
                    'trust',
                    'login',
                    'sign in',
                    'create account'
                ]
                
                found_content = [item for item in expected_content if item in content]
                
                if len(found_content) >= 3:  # At least 3 expected items
                    details = f"Landing page loaded ({len(content)} chars), Contains: {', '.join(found_content)}"
                else:
                    details = f"Page loaded but missing expected content. Found: {', '.join(found_content)}"
                    success = False
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Landing Page without Auth", success, details)
            return success
            
        except Exception as e:
            self.log_test("Landing Page without Auth", False, f"Error: {str(e)}")
            return False

    def test_learn_page_without_auth(self):
        """Test GET /learn - Should show educational content even without auth"""
        try:
            # Test frontend learn page without authentication
            unauth_session = requests.Session()
            unauth_session.headers.update({
                'User-Agent': 'AuthConsistencyTester/1.0'
            })
            
            response = unauth_session.get(f"{self.frontend_url}/learn", timeout=10)
            success = response.status_code == 200
            
            if success:
                content = response.text.lower()
                
                # Check for expected educational content
                expected_content = [
                    'learn',
                    'education',
                    'trust',
                    'legal',
                    'course',
                    'lesson',
                    'module'
                ]
                
                found_content = [item for item in expected_content if item in content]
                
                if len(found_content) >= 3:  # At least 3 expected items
                    details = f"Learn page loaded ({len(content)} chars), Contains: {', '.join(found_content)}"
                else:
                    details = f"Page loaded but missing expected content. Found: {', '.join(found_content)}"
                    success = False
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Learn Page without Auth", success, details)
            return success
            
        except Exception as e:
            self.log_test("Learn Page without Auth", False, f"Error: {str(e)}")
            return False

    # ============ TEST RUNNER ============

    def run_review_request_tests(self):
        """Run all tests for the review request"""
        self.log("🚀 Starting REVIEW REQUEST API Tests for OmniGoVault")
        self.log(f"Testing against: {self.base_url}")
        self.log(f"Test User: {self.test_user_email}")
        self.log("=" * 80)
        
        # Test sequence based on review request
        test_sequence = [
            # 1. QA Report Endpoint (NEW - no auth required)
            self.test_qa_report_endpoint,
            self.test_qa_access_md_endpoint,
            
            # 2. Real-time Collaboration Endpoints (no auth required for stats)
            self.test_realtime_capabilities_endpoint,
            self.test_realtime_stats_endpoint,
            self.test_realtime_detailed_stats_endpoint,
            
            # 3. Portfolio-Scoped Vaults (requires auth)
            self.test_get_user_portfolios,
            self.test_portfolio_filtered_vaults,
            self.test_vault_importable_documents,
            
            # 4. Binder Generation (requires auth)
            self.test_binder_profiles_endpoint,
            self.test_weasyprint_dependency,
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
        self.log("🏁 REVIEW REQUEST TEST SUMMARY")
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
            "QA Report Endpoints": ["qa"],
            "Real-time Collaboration": ["realtime"],
            "Portfolio-Scoped Vaults": ["portfolio", "vault"],
            "Binder Generation": ["binder", "weasyprint"]
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
        
        # QA Report endpoints
        qa_tests = [t for t in self.test_results if 'qa' in t['test'].lower()]
        qa_working = any(t['success'] for t in qa_tests)
        self.log(f"  1. QA Report Endpoints: {'✅ Working' if qa_working else '❌ Issues detected'}")
        
        # Real-time endpoints
        realtime_tests = [t for t in self.test_results if 'realtime' in t['test'].lower()]
        realtime_working = any(t['success'] for t in realtime_tests)
        self.log(f"  2. Real-time Collaboration: {'✅ Working' if realtime_working else '❌ Issues detected'}")
        
        # Portfolio-scoped vaults
        vault_tests = [t for t in self.test_results if 'vault' in t['test'].lower() or 'portfolio' in t['test'].lower()]
        vault_working = any(t['success'] for t in vault_tests)
        self.log(f"  3. Portfolio-Scoped Vaults: {'✅ Working' if vault_working else '❌ Issues detected'}")
        
        # Binder generation
        binder_tests = [t for t in self.test_results if 'binder' in t['test'].lower() or 'weasyprint' in t['test'].lower()]
        binder_working = any(t['success'] for t in binder_tests)
        self.log(f"  4. Binder Generation: {'✅ Working' if binder_working else '❌ Issues detected'}")
        
        self.log("\n📝 RECOMMENDATIONS:")
        if success_rate >= 90:
            self.log("✅ All review request features are working correctly")
            self.log("✅ No critical issues found - ready for production use")
        elif success_rate >= 75:
            self.log("⚠️ Most features working with minor issues")
            self.log("✅ Core functionality is operational")
        else:
            self.log("❌ Significant issues detected in review request features")
            if not auth_working:
                self.log("❌ Authentication issues preventing full testing")
        
        return success_rate >= 75


# ============ MAIN EXECUTION ============

if __name__ == "__main__":
    print("🚀 OmniGoVault Backend API Testing - Review Request")
    print("=" * 80)
    
    tester = ReviewRequestTester()
    success = tester.run_review_request_tests()
    
    print("\n" + "=" * 80)
    if success:
        print("🎉 REVIEW REQUEST TESTING COMPLETED SUCCESSFULLY")
        sys.exit(0)
    else:
        print("⚠️ REVIEW REQUEST TESTING COMPLETED WITH ISSUES")
        sys.exit(1)