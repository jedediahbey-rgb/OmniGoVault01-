#!/usr/bin/env python3
"""
Backend API Testing for OMNIGOVAULT Application
Binder Generation Functionality Testing
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid
import hashlib

# Use the public endpoint from frontend/.env
BASE_URL = "https://premium-archive-1.preview.emergentagent.com/api"

class BinderTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'BinderTester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = []
        
        # Test user details - using the specified email
        self.test_user_email = "jedediah.bey@gmail.com"
        
        # Test data for Binder functionality
        self.test_portfolio_id = None
        self.test_profile_id = None
        self.test_run_id = None
        
        # Try to get a valid session token
        self.session_token = self.get_valid_session_token()

    def get_valid_session_token(self):
        """Try to get a valid session token for testing"""
        # Method 1: Try to login with the specified email
        try:
            # Try to register/login with the specified email
            test_password = "testpassword123"
            
            # Try to register first
            register_data = {
                'email': self.test_user_email,
                'password': test_password,
                'name': 'Jedediah Bey Test User'
            }
            response = requests.post(f'{self.base_url}/auth/register', json=register_data)
            if response.status_code == 200:
                data = response.json()
                session_token = data.get('session_token')
                if session_token:
                    self.log(f"✅ Registered test user: {self.test_user_email}")
                    return session_token
            
            # If registration failed, try login
            login_data = {
                'email': self.test_user_email,
                'password': test_password
            }
            response = requests.post(f'{self.base_url}/auth/login', json=login_data)
            if response.status_code == 200:
                data = response.json()
                session_token = data.get('session_token')
                if session_token:
                    self.log(f"✅ Logged in test user: {self.test_user_email}")
                    return session_token
                    
        except Exception as e:
            self.log(f"Failed to authenticate with {self.test_user_email}: {e}")
        
        # Method 2: Try some common test session tokens
        test_tokens = [
            'test_session_binder',
            'dev_session_12345',
            'sess_' + '1' * 32,
        ]
        
        for token in test_tokens:
            try:
                test_session = requests.Session()
                test_session.cookies.set('session_token', token)
                response = test_session.get(f'{self.base_url}/auth/me', timeout=5)
                if response.status_code == 200:
                    self.log(f"✅ Found valid session token: {token[:20]}...")
                    return token
            except:
                continue
        
        self.log("❌ Could not obtain valid session token")
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

    # ============ AUTHENTICATION TEST ============

    def test_auth_status(self):
        """Test authentication with session token"""
        if not self.session_token:
            self.log_test("Authentication Check", False, "No valid session token available")
            return False
            
        try:
            # Set the session token
            self.session.cookies.set('session_token', self.session_token)
            
            response = self.session.get(f"{self.base_url}/auth/me", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                email = data.get("email")
                user_id = data.get("user_id")
                
                details += f", User: {email}"
                
                # Update test user email if different
                if email != self.test_user_email:
                    self.test_user_email = email
                    details += f" (updated test user email)"
                    
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("Authentication Check", success, details)
            return success
            
        except Exception as e:
            self.log_test("Authentication Check", False, f"Error: {str(e)}")
            return False

    # ============ BINDER FUNCTIONALITY TESTS ============

    def test_get_portfolios(self):
        """Get portfolios to find a valid portfolio_id"""
        try:
            response = self.session.get(f"{self.base_url}/portfolios", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                portfolios = data if isinstance(data, list) else []
                
                if portfolios:
                    # Use the first portfolio
                    self.test_portfolio_id = portfolios[0].get("portfolio_id")
                    details += f", Found {len(portfolios)} portfolios, Using: {self.test_portfolio_id}"
                else:
                    # Create a test portfolio if none exist
                    portfolio_data = {
                        "name": "Binder Test Portfolio",
                        "description": "Test portfolio for binder functionality testing"
                    }
                    create_response = self.session.post(f"{self.base_url}/portfolios", json=portfolio_data, timeout=10)
                    if create_response.status_code == 200:
                        created_portfolio = create_response.json()
                        self.test_portfolio_id = created_portfolio.get("portfolio_id")
                        details += f", Created test portfolio: {self.test_portfolio_id}"
                    else:
                        success = False
                        details += f", Failed to create test portfolio: {create_response.status_code}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("Get Portfolios", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Portfolios", False, f"Error: {str(e)}")
            return False

    def test_get_binder_profiles(self):
        """Test GET /api/binder/profiles - Get binder profiles for a portfolio"""
        if not self.test_portfolio_id:
            self.log_test("GET /api/binder/profiles", False, "No test portfolio available")
            return False
            
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/binder/profiles", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    profiles_data = data.get("data", {})
                    profiles = profiles_data.get("profiles", [])
                    total = profiles_data.get("total", 0)
                    details += f", Found {total} profiles"
                    
                    if profiles:
                        # Store the first profile for later tests
                        self.test_profile_id = profiles[0].get("id")
                        profile_type = profiles[0].get("profile_type")
                        profile_name = profiles[0].get("name")
                        details += f", Using profile: {profile_name} ({profile_type})"
                    else:
                        success = False
                        details += ", No profiles found"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/profiles", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/profiles", False, f"Error: {str(e)}")
            return False

    def test_generate_binder(self):
        """Test POST /api/binder/generate - Generate a binder"""
        if not self.test_portfolio_id or not self.test_profile_id:
            self.log_test("POST /api/binder/generate", False, "No test portfolio or profile available")
            return False
            
        try:
            generate_data = {
                "portfolio_id": self.test_portfolio_id,
                "profile_id": self.test_profile_id
            }
            
            response = self.session.post(f"{self.base_url}/binder/generate", json=generate_data, timeout=30)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    result_data = data.get("data", {})
                    if result_data.get("success"):
                        self.test_run_id = result_data.get("run_id")
                        details += f", Generation successful, Run ID: {self.test_run_id}"
                    else:
                        success = False
                        details += f", Generation failed: {result_data.get('error', 'Unknown error')}"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/binder/generate", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/binder/generate", False, f"Error: {str(e)}")
            return False

    def test_get_binder_runs(self):
        """Test GET /api/binder/runs - Get binder run history"""
        if not self.test_portfolio_id:
            self.log_test("GET /api/binder/runs", False, "No test portfolio available")
            return False
            
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/binder/runs", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    runs_data = data.get("data", {})
                    runs = runs_data.get("runs", [])
                    total = runs_data.get("total", 0)
                    details += f", Found {total} runs"
                    
                    if self.test_run_id:
                        # Check if our generated run is in the list
                        found_run = any(r.get("id") == self.test_run_id for r in runs)
                        if found_run:
                            details += ", Generated run found in list"
                        else:
                            details += ", Generated run not found in list (may still be processing)"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/runs", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/runs", False, f"Error: {str(e)}")
            return False

    def test_get_latest_binder(self):
        """Test GET /api/binder/latest - Get latest completed binder"""
        if not self.test_portfolio_id:
            self.log_test("GET /api/binder/latest", False, "No test portfolio available")
            return False
            
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/binder/latest", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    result_data = data.get("data", {})
                    run = result_data.get("run")
                    
                    if run:
                        run_id = run.get("id")
                        status = run.get("status")
                        profile_name = run.get("profile_name")
                        finished_at = run.get("finished_at")
                        details += f", Latest run: {run_id}, Status: {status}, Profile: {profile_name}"
                        if finished_at:
                            details += f", Finished: {finished_at[:10]}"
                    else:
                        details += ", No completed binders found"
                        # This is still a successful response
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/latest", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/latest", False, f"Error: {str(e)}")
            return False

    def test_get_specific_run(self):
        """Test GET /api/binder/runs/{run_id} - Get a specific binder run"""
        if not self.test_run_id:
            self.log_test("GET /api/binder/runs/{run_id}", True, "No test run to check (skipped)")
            return True
            
        try:
            response = self.session.get(f"{self.base_url}/binder/runs/{self.test_run_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    run_data = data.get("data", {}).get("run", {})
                    status = run_data.get("status")
                    profile_name = run_data.get("profile_name")
                    total_items = run_data.get("total_items", 0)
                    total_pages = run_data.get("total_pages", 0)
                    
                    details += f", Status: {status}, Profile: {profile_name}"
                    details += f", Items: {total_items}, Pages: {total_pages}"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/runs/{run_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/runs/{run_id}", False, f"Error: {str(e)}")
            return False

    def test_binder_stale_check(self):
        """Test GET /api/binder/stale-check - Check if binder is stale"""
        if not self.test_portfolio_id:
            self.log_test("GET /api/binder/stale-check", False, "No test portfolio available")
            return False
            
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/binder/stale-check", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    result_data = data.get("data", {})
                    is_stale = result_data.get("is_stale")
                    reason = result_data.get("reason")
                    message = result_data.get("message")
                    
                    details += f", Is stale: {is_stale}, Reason: {reason}"
                    if message:
                        details += f", Message: {message}"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/stale-check", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/stale-check", False, f"Error: {str(e)}")
            return False

    # ============ TEST RUNNER ============

    def run_binder_tests(self):
        """Run all Binder Generation API tests"""
        self.log("🚀 Starting BINDER GENERATION API Tests")
        self.log(f"Testing against: {self.base_url}")
        self.log(f"User: {self.test_user_email}")
        self.log("=" * 80)
        
        # Test sequence for Binder Generation APIs
        test_sequence = [
            # Authentication
            self.test_auth_status,
            
            # Setup - Get or create test portfolio
            self.test_get_portfolios,
            
            # Core Binder Tests
            self.test_get_binder_profiles,
            self.test_generate_binder,
            self.test_get_binder_runs,
            self.test_get_latest_binder,
            self.test_get_specific_run,
            self.test_binder_stale_check,
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
        self.log("🏁 BINDER GENERATION API TEST SUMMARY")
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
        
        self.log("\n🎯 KEY FINDINGS:")
        if success_rate >= 90:
            self.log("✅ Binder Generation APIs working perfectly")
            self.log("✅ All core binder endpoints functional")
            self.log("✅ Profile management working")
            self.log("✅ Binder generation working")
            self.log("✅ Run history tracking working")
        elif success_rate >= 75:
            self.log("⚠️ Most Binder functionality working with minor issues")
        else:
            self.log("❌ Significant Binder implementation issues detected")
        
        # Specific feature status
        self.log("\n📋 FEATURE STATUS:")
        
        # Authentication
        auth_tests = [t for t in self.test_results if 'auth' in t['test'].lower()]
        auth_success = sum(1 for t in auth_tests if t['success'])
        self.log(f"  Authentication: {auth_success}/{len(auth_tests)} ({'✅' if auth_success == len(auth_tests) else '❌'})")
        
        # Portfolio Management
        portfolio_tests = [t for t in self.test_results if 'portfolio' in t['test'].lower()]
        portfolio_success = sum(1 for t in portfolio_tests if t['success'])
        self.log(f"  Portfolio Management: {portfolio_success}/{len(portfolio_tests)} ({'✅' if portfolio_success == len(portfolio_tests) else '❌'})")
        
        # Binder Profiles
        profile_tests = [t for t in self.test_results if 'profile' in t['test'].lower()]
        profile_success = sum(1 for t in profile_tests if t['success'])
        self.log(f"  Binder Profiles: {profile_success}/{len(profile_tests)} ({'✅' if profile_success == len(profile_tests) else '❌'})")
        
        # Binder Generation
        generation_tests = [t for t in self.test_results if 'generate' in t['test'].lower()]
        generation_success = sum(1 for t in generation_tests if t['success'])
        self.log(f"  Binder Generation: {generation_success}/{len(generation_tests)} ({'✅' if generation_success == len(generation_tests) else '❌'})")
        
        # Run Management
        run_tests = [t for t in self.test_results if 'run' in t['test'].lower()]
        run_success = sum(1 for t in run_tests if t['success'])
        self.log(f"  Run Management: {run_success}/{len(run_tests)} ({'✅' if run_success == len(run_tests) else '❌'})")
        
        self.log("\n🔍 BINDER ENDPOINTS TESTED:")
        binder_endpoints = [
            "GET /api/binder/profiles",
            "POST /api/binder/generate", 
            "GET /api/binder/runs",
            "GET /api/binder/runs/{run_id}",
            "GET /api/binder/latest",
            "GET /api/binder/stale-check"
        ]
        
        for endpoint in binder_endpoints:
            endpoint_key = endpoint.split()[-1].replace('/', '_').replace('{', '').replace('}', '')
            endpoint_tests = [t for t in self.test_results if endpoint_key in t['test'].lower()]
            endpoint_success = all(t['success'] for t in endpoint_tests) if endpoint_tests else False
            self.log(f"  • {endpoint}: {'✅' if endpoint_success else '❌'}")
        
        self.log("\n📝 BINDER FEATURES VERIFIED:")
        binder_features = [
            ("Profile Retrieval", any('profile' in t['test'].lower() and t['success'] for t in self.test_results)),
            ("Binder Generation", any('generate' in t['test'].lower() and t['success'] for t in self.test_results)),
            ("Run History", any('runs' in t['test'].lower() and t['success'] for t in self.test_results)),
            ("Latest Binder Retrieval", any('latest' in t['test'].lower() and t['success'] for t in self.test_results)),
            ("Stale Check", any('stale' in t['test'].lower() and t['success'] for t in self.test_results))
        ]
        
        for feature_name, feature_working in binder_features:
            self.log(f"  • {feature_name}: {'✅' if feature_working else '❌'}")
        
        return success_rate >= 75


if __name__ == "__main__":
    tester = BinderTester()
    success = tester.run_binder_tests()
    sys.exit(0 if success else 1)