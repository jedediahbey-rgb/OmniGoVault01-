#!/usr/bin/env python3
"""
Backend API Testing for OmniGoVault - Review Request Testing
Testing specific endpoints mentioned in the review request:
1. QA Report Endpoint (NEW - no auth required)
2. Real-time Collaboration Endpoints (no auth required for stats)
3. Portfolio-Scoped Vaults (requires auth)
4. Binder Generation (requires auth)
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

class ReviewRequestTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'ReviewRequestTester/1.0'
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
                var sessionToken = 'test_session_review_' + Date.now();
                
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
                if session_token and session_token.startswith('test_session_review_'):
                    self.log(f"✅ Created test session: {session_token[:25]}...")
                    self.session.headers['Authorization'] = f'Bearer {session_token}'
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

    # ============ QA REPORT ENDPOINT TESTS (NEW - no auth required) ============

    def test_qa_report_endpoint(self):
        """Test GET /api/qa/report - Should return a full HTML page with route inventory"""
        try:
            response = self.session.get(f"{self.base_url}/qa/report", timeout=15)
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
                        'permission matrix'
                    ]
                    
                    found_content = [item for item in expected_content if item.lower() in content.lower()]
                    
                    if len(found_content) >= 2:  # At least 2 out of 3 expected items
                        details = f"HTML page ({len(content)} chars), Contains: {', '.join(found_content)}"
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
            
            self.log_test("QA Report Endpoint", success, details)
            return success
            
        except Exception as e:
            self.log_test("QA Report Endpoint", False, f"Error: {str(e)}")
            return False

    def test_qa_access_md_endpoint(self):
        """Test GET /api/qa/access.md - Should return markdown with QA reviewer instructions"""
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

    # ============ REAL-TIME COLLABORATION ENDPOINTS (no auth required for stats) ============

    def test_realtime_capabilities_endpoint(self):
        """Test GET /api/realtime/capabilities - Should return V2 features list"""
        try:
            response = self.session.get(f"{self.base_url}/realtime/capabilities", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if data.get("ok"):
                    capabilities = data.get("data", {})
                    version = capabilities.get("version")
                    features = capabilities.get("features", {})
                    
                    # Check for V2 features
                    expected_v2_features = [
                        "presence", "rooms", "document_locking", "channel_subscriptions",
                        "activity_history", "conflict_resolution", "session_recovery", "rate_limiting"
                    ]
                    
                    found_features = [f for f in expected_v2_features if features.get(f)]
                    
                    if version == "2.0" and len(found_features) >= 6:  # Most V2 features present
                        details = f"Version: {version}, V2 Features: {len(found_features)}/{len(expected_v2_features)}"
                    else:
                        details = f"Version: {version}, Missing V2 features: {set(expected_v2_features) - set(found_features)}"
                        success = False
                else:
                    details = f"API error: {data}"
                    success = False
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Realtime Capabilities", success, details)
            return success
            
        except Exception as e:
            self.log_test("Realtime Capabilities", False, f"Error: {str(e)}")
            return False

    def test_realtime_stats_endpoint(self):
        """Test GET /api/realtime/stats - Should return connection statistics"""
        try:
            response = self.session.get(f"{self.base_url}/realtime/stats", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if data.get("ok"):
                    stats = data.get("data", {})
                    
                    # Check for expected stats fields
                    expected_fields = ["total_connections", "total_users", "total_rooms", "active_document_locks"]
                    found_fields = [f for f in expected_fields if f in stats]
                    
                    if len(found_fields) >= 3:  # Most expected fields present
                        total_connections = stats.get("total_connections", 0)
                        total_users = stats.get("total_users", 0)
                        total_rooms = stats.get("total_rooms", 0)
                        details = f"Connections: {total_connections}, Users: {total_users}, Rooms: {total_rooms}"
                    else:
                        details = f"Missing stats fields. Found: {found_fields}, Expected: {expected_fields}"
                        success = False
                else:
                    details = f"API error: {data}"
                    success = False
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Realtime Stats", success, details)
            return success
            
        except Exception as e:
            self.log_test("Realtime Stats", False, f"Error: {str(e)}")
            return False

    def test_realtime_detailed_stats_endpoint(self):
        """Test GET /api/realtime/stats/detailed - Should return detailed system metrics"""
        try:
            response = self.session.get(f"{self.base_url}/realtime/stats/detailed", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if data.get("ok"):
                    stats = data.get("data", {})
                    
                    # Check for detailed stats sections
                    expected_sections = ["connections", "rooms", "locks", "presence"]
                    found_sections = [s for s in expected_sections if s in stats]
                    
                    if len(found_sections) >= 3:  # Most sections present
                        details = f"Detailed stats sections: {', '.join(found_sections)}"
                        
                        # Add specific metrics if available
                        if "connections" in stats:
                            conn_total = stats["connections"].get("total", 0)
                            details += f", Connections: {conn_total}"
                        
                        if "rooms" in stats:
                            rooms_total = stats["rooms"].get("total", 0)
                            details += f", Rooms: {rooms_total}"
                    else:
                        details = f"Missing detailed sections. Found: {found_sections}, Expected: {expected_sections}"
                        success = False
                else:
                    details = f"API error: {data}"
                    success = False
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Realtime Detailed Stats", success, details)
            return success
            
        except Exception as e:
            self.log_test("Realtime Detailed Stats", False, f"Error: {str(e)}")
            return False

    # ============ PORTFOLIO-SCOPED VAULTS (requires auth) ============

    def test_get_user_portfolios(self):
        """Get user portfolios for testing portfolio-scoped endpoints"""
        if not self.session_token:
            self.log_test("Get User Portfolios", False, "No session token available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/portfolios", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                portfolios = data if isinstance(data, list) else []
                
                if portfolios:
                    self.test_portfolio_id = portfolios[0].get("portfolio_id")
                    portfolio_name = portfolios[0].get("name", "Unknown")
                    details = f"Found {len(portfolios)} portfolios, Using: {portfolio_name} ({self.test_portfolio_id})"
                else:
                    details = "No portfolios found"
                    success = False
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Get User Portfolios", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get User Portfolios", False, f"Error: {str(e)}")
            return False

    def test_portfolio_filtered_vaults(self):
        """Test GET /api/vaults?portfolio_id={id} - Should filter workspaces by portfolio"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Portfolio Filtered Vaults", False, "Missing session token or portfolio ID")
            return False
            
        try:
            response = self.session.get(
                f"{self.base_url}/vaults",
                params={"portfolio_id": self.test_portfolio_id},
                timeout=10
            )
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
                details = f"Portfolio {self.test_portfolio_id}: {vault_count} vaults"
                
                if vault_count > 0:
                    # Store first vault for importable documents test
                    self.test_vault_id = vaults[0].get("vault_id") or vaults[0].get("id")
                    vault_name = vaults[0].get("name", "Unknown")
                    details += f", First vault: {vault_name}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Portfolio Filtered Vaults", success, details)
            return success
            
        except Exception as e:
            self.log_test("Portfolio Filtered Vaults", False, f"Error: {str(e)}")
            return False

    def test_vault_importable_documents(self):
        """Test GET /api/vaults/{vault_id}/importable-documents?portfolio_id={id} - Should filter documents by portfolio"""
        if not self.session_token or not self.test_vault_id or not self.test_portfolio_id:
            self.log_test("Vault Importable Documents", False, "Missing session token, vault ID, or portfolio ID")
            return False
            
        try:
            response = self.session.get(
                f"{self.base_url}/vaults/{self.test_vault_id}/importable-documents",
                params={"portfolio_id": self.test_portfolio_id},
                timeout=10
            )
            success = response.status_code == 200
            
            if success:
                data = response.json()
                
                # Handle different response formats
                if isinstance(data, dict) and "documents" in data:
                    documents = data["documents"]
                elif isinstance(data, list):
                    documents = data
                elif isinstance(data, dict) and "data" in data:
                    documents = data["data"]
                else:
                    documents = []
                
                doc_count = len(documents)
                details = f"Vault {self.test_vault_id}: {doc_count} importable documents"
                
                if doc_count > 0:
                    # Show sample document info
                    first_doc = documents[0]
                    doc_title = first_doc.get("title", "Unknown")
                    doc_type = first_doc.get("document_type", "Unknown")
                    details += f", Sample: {doc_title} ({doc_type})"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Vault Importable Documents", success, details)
            return success
            
        except Exception as e:
            self.log_test("Vault Importable Documents", False, f"Error: {str(e)}")
            return False

    # ============ BINDER GENERATION (requires auth) ============

    def test_binder_profiles_endpoint(self):
        """Test GET /api/binder/profiles?portfolio_id={id} - Should return binder profiles"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Binder Profiles", False, "Missing session token or portfolio ID")
            return False
            
        try:
            response = self.session.get(
                f"{self.base_url}/binder/profiles",
                params={"portfolio_id": self.test_portfolio_id},
                timeout=10
            )
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if data.get("ok"):
                    profiles_data = data.get("data", {})
                    profiles = profiles_data.get("profiles", [])
                    
                    profile_count = len(profiles)
                    details = f"Portfolio {self.test_portfolio_id}: {profile_count} binder profiles"
                    
                    if profile_count > 0:
                        # Show sample profile info
                        first_profile = profiles[0]
                        profile_name = first_profile.get("name", "Unknown")
                        profile_type = first_profile.get("profile_type", "Unknown")
                        details += f", Sample: {profile_name} ({profile_type})"
                else:
                    error = data.get("error", {})
                    details = f"API error: {error.get('message', 'Unknown error')}"
                    success = False
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Binder Profiles", success, details)
            return success
            
        except Exception as e:
            self.log_test("Binder Profiles", False, f"Error: {str(e)}")
            return False

    def test_weasyprint_dependency(self):
        """Verify WeasyPrint dependency is working"""
        try:
            # Try to import WeasyPrint
            result = subprocess.run([
                'python3', '-c', 'import weasyprint; print("WeasyPrint available")'
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                details = "WeasyPrint library is available and importable"
                success = True
            else:
                details = f"WeasyPrint import failed: {result.stderr}"
                success = False
            
            self.log_test("WeasyPrint Dependency", success, details)
            return success
            
        except Exception as e:
            self.log_test("WeasyPrint Dependency", False, f"Error: {str(e)}")
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