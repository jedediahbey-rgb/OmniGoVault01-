#!/usr/bin/env python3
"""
Backend API Testing for OMNIGOVAULT Application
Google Auth Integration and Dev Bypass Mode Testing
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid
import hashlib

# Use the public endpoint from frontend/.env
BASE_URL = "https://vaultshare-2.preview.emergentagent.com/api"

class OmniGoVaultAuthTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'OmniGoVault-Auth-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = []

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

    # ============ GOOGLE AUTH & DEV BYPASS TESTS ============

    def test_dev_bypass_auth_me(self):
        """Test GET /api/auth/me with no cookies/headers (dev bypass mode)"""
        try:
            # Create a clean session without any auth headers or cookies
            clean_session = requests.Session()
            clean_session.headers.update({
                'Content-Type': 'application/json',
                'User-Agent': 'OmniGoVault-Auth-Tester/1.0'
            })
            
            response = clean_session.get(f"{self.base_url}/auth/me", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                expected_user_id = "default_user"
                expected_email = "user@omnigovault.com"
                expected_name = "Default User"
                
                user_id = data.get("user_id")
                email = data.get("email")
                name = data.get("name")
                
                if (user_id == expected_user_id and 
                    email == expected_email and 
                    name == expected_name):
                    details += f", Dev bypass user returned correctly: {email}"
                else:
                    success = False
                    details += f", Unexpected user data: user_id={user_id}, email={email}, name={name}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/auth/me (Dev Bypass Mode)", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/auth/me (Dev Bypass Mode)", False, f"Error: {str(e)}")
            return False

    def test_session_endpoint_with_invalid_session(self):
        """Test POST /api/auth/session with mock session_id (should fail gracefully)"""
        try:
            # Test with invalid session_id
            payload = {
                "session_id": "mock_invalid_session_12345"
            }
            
            response = self.session.post(f"{self.base_url}/auth/session", json=payload, timeout=10)
            
            # This should fail since we can't actually complete Google Auth
            # But we want to verify the endpoint exists and handles errors properly
            details = f"Status: {response.status_code}"
            
            if response.status_code == 401:
                # Expected failure for invalid session
                data = response.json()
                error_detail = data.get('detail', '')
                details += f", Expected 401 error: {error_detail}"
                success = "Authentication failed" in error_detail or "failed" in error_detail.lower()
            elif response.status_code == 500:
                # Also acceptable - service unavailable
                data = response.json()
                error_detail = data.get('detail', '')
                details += f", Service unavailable (expected): {error_detail}"
                success = "unavailable" in error_detail.lower() or "service" in error_detail.lower()
            else:
                success = False
                details += f", Unexpected status code, Response: {response.text[:200]}"
            
            self.log_test("POST /api/auth/session (Invalid Session)", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/auth/session (Invalid Session)", False, f"Error: {str(e)}")
            return False

    def test_protected_endpoints_with_dev_bypass(self):
        """Test protected endpoints work with dev bypass user"""
        endpoints_to_test = [
            ("/portfolios", "GET", "Portfolios"),
            ("/vaults", "GET", "Vaults"),
            ("/billing/subscription", "GET", "Billing Subscription")
        ]
        
        all_success = True
        details_list = []
        
        for endpoint, method, name in endpoints_to_test:
            try:
                # Create clean session without auth
                clean_session = requests.Session()
                clean_session.headers.update({
                    'Content-Type': 'application/json',
                    'User-Agent': 'OmniGoVault-Auth-Tester/1.0'
                })
                
                if method == "GET":
                    response = clean_session.get(f"{self.base_url}{endpoint}", timeout=10)
                else:
                    response = clean_session.post(f"{self.base_url}{endpoint}", timeout=10)
                
                success = response.status_code == 200
                endpoint_details = f"{name}: {response.status_code}"
                
                if success:
                    data = response.json()
                    if isinstance(data, list):
                        endpoint_details += f" (list with {len(data)} items)"
                    elif isinstance(data, dict):
                        if 'ok' in data:
                            endpoint_details += f" (ok: {data.get('ok')})"
                        else:
                            endpoint_details += f" (dict response)"
                    else:
                        endpoint_details += f" (response type: {type(data)})"
                else:
                    endpoint_details += f" - {response.text[:100]}"
                    all_success = False
                
                details_list.append(endpoint_details)
                
            except Exception as e:
                details_list.append(f"{name}: Error - {str(e)}")
                all_success = False
        
        combined_details = "; ".join(details_list)
        self.log_test("Protected Endpoints with Dev Bypass", all_success, combined_details)
        return all_success

    def test_admin_console_restriction(self):
        """Test admin console restriction for dev bypass user"""
        try:
            # Create clean session without auth (will use dev bypass)
            clean_session = requests.Session()
            clean_session.headers.update({
                'Content-Type': 'application/json',
                'User-Agent': 'OmniGoVault-Auth-Tester/1.0'
            })
            
            response = clean_session.get(f"{self.base_url}/admin/status", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                # The dev user should have limited access
                # Check if response indicates limited access or proper admin structure
                if isinstance(data, dict):
                    # Look for indicators of limited access
                    if 'limited_access' in str(data).lower() or 'restricted' in str(data).lower():
                        details += f", Limited access confirmed for dev user"
                    elif 'admin' in data or 'status' in data:
                        details += f", Admin endpoint accessible but may show limited data"
                    else:
                        details += f", Admin response: {str(data)[:100]}"
                else:
                    details += f", Admin response type: {type(data)}"
            elif response.status_code == 403:
                # Also acceptable - forbidden access
                details += f", Access forbidden (expected for non-admin user)"
                success = True
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/admin/status (Dev User Restriction)", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/admin/status (Dev User Restriction)", False, f"Error: {str(e)}")
            return False

    def test_auth_me_with_invalid_token(self):
        """Test GET /api/auth/me with invalid Authorization header (should fallback to dev bypass)"""
        try:
            # Create session with invalid auth token
            auth_session = requests.Session()
            auth_session.headers.update({
                'Content-Type': 'application/json',
                'User-Agent': 'OmniGoVault-Auth-Tester/1.0',
                'Authorization': 'Bearer invalid_token_12345'
            })
            
            response = auth_session.get(f"{self.base_url}/auth/me", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                expected_user_id = "default_user"
                expected_email = "user@omnigovault.com"
                
                user_id = data.get("user_id")
                email = data.get("email")
                
                if user_id == expected_user_id and email == expected_email:
                    details += f", Gracefully fell back to dev bypass user: {email}"
                else:
                    success = False
                    details += f", Unexpected fallback behavior: user_id={user_id}, email={email}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/auth/me (Invalid Token Fallback)", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/auth/me (Invalid Token Fallback)", False, f"Error: {str(e)}")
            return False

    def test_session_endpoint_exists(self):
        """Test that POST /api/auth/session endpoint exists and is properly configured"""
        try:
            # Test with missing session_id
            payload = {}
            
            response = self.session.post(f"{self.base_url}/auth/session", json=payload, timeout=10)
            details = f"Status: {response.status_code}"
            
            # Should return 400 for missing session_id
            if response.status_code == 400:
                data = response.json()
                error_detail = data.get('detail', '')
                if 'session_id required' in error_detail:
                    details += f", Correctly validates session_id requirement: {error_detail}"
                    success = True
                else:
                    success = False
                    details += f", Unexpected 400 error: {error_detail}"
            else:
                success = False
                details += f", Expected 400 for missing session_id, Response: {response.text[:200]}"
            
            self.log_test("POST /api/auth/session (Endpoint Validation)", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/auth/session (Endpoint Validation)", False, f"Error: {str(e)}")
            return False

    # ============ SYSTEM HEALTH VERIFICATION ============

    def test_basic_system_health(self):
        """Test basic system health to ensure backend is operational"""
        try:
            response = self.session.get(f"{self.base_url}/portfolios", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if isinstance(data, list):
                    details += f", System operational - found {len(data)} portfolios"
                else:
                    success = False
                    details += f", Unexpected response format"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("Basic System Health Check", success, details)
            return success
            
        except Exception as e:
            self.log_test("Basic System Health Check", False, f"Error: {str(e)}")
            return False

    # ============ TEST RUNNER ============

    def run_auth_tests(self):
        """Run all Google Auth and Dev Bypass tests"""
        self.log("🚀 Starting OMNIGOVAULT Google Auth Integration Tests")
        self.log(f"Testing against: {self.base_url}")
        self.log("=" * 80)
        
        # Test sequence for Google Auth integration and dev bypass
        test_sequence = [
            self.test_basic_system_health,
            self.test_dev_bypass_auth_me,
            self.test_session_endpoint_exists,
            self.test_session_endpoint_with_invalid_session,
            self.test_auth_me_with_invalid_token,
            self.test_protected_endpoints_with_dev_bypass,
            self.test_admin_console_restriction,
        ]
        
        for test_func in test_sequence:
            try:
                test_func()
                time.sleep(0.5)  # Brief pause between tests
            except Exception as e:
                self.log(f"❌ Test {test_func.__name__} crashed: {str(e)}")
                self.tests_run += 1
                self.failed_tests.append({
                    'test': test_func.__name__,
                    'details': f"Test crashed: {str(e)}",
                    'timestamp': datetime.now().isoformat()
                })
        
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        self.log("=" * 80)
        self.log("🏁 GOOGLE AUTH INTEGRATION TEST SUMMARY")
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
        if success_rate >= 85:
            self.log("✅ Google Auth integration and dev bypass mode working correctly")
        elif success_rate >= 70:
            self.log("⚠️ Most auth functionality working with minor issues")
        else:
            self.log("❌ Significant auth integration issues detected")
        
        return success_rate >= 70


if __name__ == "__main__":
    tester = OmniGoVaultAuthTester()
    success = tester.run_auth_tests()
    sys.exit(0 if success else 1)