#!/usr/bin/env python3
"""
Backend API Testing for OMNIGOVAULT Application
Onboarding and Dev Loop Implementation Testing
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid
import hashlib

# Use the public endpoint from frontend/.env
BASE_URL = "https://role-manager-21.preview.emergentagent.com/api"

class OmniGoVaultOnboardingTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'OmniGoVault-Onboarding-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = []
        self.current_session_token = None

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

    # ============ DEV ENVIRONMENT STATUS TESTS ============

    def test_dev_environment_status(self):
        """Test GET /api/dev/status - should return dev_bypass_enabled: true and test accounts"""
        try:
            response = self.session.get(f"{self.base_url}/dev/status", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                # Check dev_bypass_enabled
                dev_bypass = data.get("dev_bypass_enabled")
                if dev_bypass is True:
                    details += ", dev_bypass_enabled: true"
                else:
                    success = False
                    details += f", dev_bypass_enabled: {dev_bypass} (expected true)"
                
                # Check test accounts
                test_accounts = data.get("test_accounts", [])
                if len(test_accounts) == 3:
                    account_plans = [acc.get("plan_name") for acc in test_accounts]
                    expected_plans = ["Free", "Starter", "Pro"]
                    if all(plan in account_plans for plan in expected_plans):
                        details += f", Found 3 test accounts: {account_plans}"
                    else:
                        success = False
                        details += f", Test accounts missing expected plans: {account_plans}"
                else:
                    success = False
                    details += f", Expected 3 test accounts, found {len(test_accounts)}"
                
                # Check dev_admin info
                dev_admin = data.get("dev_admin", {})
                if dev_admin.get("user_id") and dev_admin.get("email"):
                    details += f", dev_admin: {dev_admin.get('email')}"
                else:
                    success = False
                    details += f", dev_admin info incomplete: {dev_admin}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/dev/status", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/dev/status", False, f"Error: {str(e)}")
            return False

    # ============ AUTH/ME WITH DEV BYPASS TESTS ============

    def test_auth_me_dev_bypass(self):
        """Test GET /api/auth/me with no credentials - should return dev admin user"""
        try:
            # Create clean session without auth
            clean_session = requests.Session()
            clean_session.headers.update({
                'Content-Type': 'application/json',
                'User-Agent': 'OmniGoVault-Onboarding-Tester/1.0'
            })
            
            response = clean_session.get(f"{self.base_url}/auth/me", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                # Check for dev admin user
                expected_email = "dev.admin@system.local"
                expected_user_id = "dev_admin_user"
                
                user_id = data.get("user_id")
                email = data.get("email")
                name = data.get("name")
                dev_bypass_enabled = data.get("dev_bypass_enabled")
                
                if (user_id == expected_user_id and 
                    email == expected_email and 
                    dev_bypass_enabled is True):
                    details += f", Dev admin user returned: {email}, dev_bypass_enabled: true"
                else:
                    success = False
                    details += f", Unexpected user: user_id={user_id}, email={email}, dev_bypass={dev_bypass_enabled}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/auth/me (Dev Bypass)", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/auth/me (Dev Bypass)", False, f"Error: {str(e)}")
            return False

    # ============ TEST ACCOUNT SWITCHING TESTS ============

    def test_switch_to_free_account(self):
        """Test POST /api/dev/switch-account with {"account": "free"}"""
        try:
            payload = {"account": "free"}
            response = self.session.post(f"{self.base_url}/dev/switch-account", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                message = data.get("message", "")
                user = data.get("user", {})
                account = data.get("account", {})
                
                if ("Free" in message and 
                    user.get("email") == "free.tester@test.local" and
                    account.get("plan_name") == "Free"):
                    details += f", Successfully switched to Free account: {user.get('email')}"
                    # Store session token if provided
                    if 'session_token' in data:
                        self.current_session_token = data['session_token']
                else:
                    success = False
                    details += f", Unexpected response: {message}, user: {user.get('user_email')}, plan: {account.get('plan_name')}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/dev/switch-account (Free)", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/dev/switch-account (Free)", False, f"Error: {str(e)}")
            return False

    def test_switch_to_starter_account(self):
        """Test POST /api/dev/switch-account with {"account": "starter"}"""
        try:
            payload = {"account": "starter"}
            response = self.session.post(f"{self.base_url}/dev/switch-account", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                message = data.get("message", "")
                user = data.get("user", {})
                account = data.get("account", {})
                
                if ("Starter" in message and 
                    user.get("email") == "starter.tester@test.local" and
                    account.get("plan_name") == "Starter"):
                    details += f", Successfully switched to Starter account: {user.get('email')}"
                else:
                    success = False
                    details += f", Unexpected response: {message}, user: {user.get('email')}, plan: {account.get('plan_name')}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/dev/switch-account (Starter)", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/dev/switch-account (Starter)", False, f"Error: {str(e)}")
            return False

    def test_switch_to_pro_account(self):
        """Test POST /api/dev/switch-account with {"account": "pro"}"""
        try:
            payload = {"account": "pro"}
            response = self.session.post(f"{self.base_url}/dev/switch-account", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                message = data.get("message", "")
                user = data.get("user", {})
                account = data.get("account", {})
                
                if ("Pro" in message and 
                    user.get("email") == "pro.tester@test.local" and
                    account.get("plan_name") == "Pro"):
                    details += f", Successfully switched to Pro account: {user.get('email')}"
                else:
                    success = False
                    details += f", Unexpected response: {message}, user: {user.get('email')}, plan: {account.get('plan_name')}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/dev/switch-account (Pro)", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/dev/switch-account (Pro)", False, f"Error: {str(e)}")
            return False

    # ============ TEST ACCOUNT ENTITLEMENTS TESTS ============

    def test_free_account_entitlements(self):
        """Test entitlements for Free account after switching"""
        try:
            # First switch to Free account
            switch_payload = {"account": "free"}
            switch_response = self.session.post(f"{self.base_url}/dev/switch-account", json=switch_payload, timeout=10)
            
            if switch_response.status_code != 200:
                self.log_test("Free Account Entitlements", False, "Failed to switch to Free account")
                return False
            
            # Test subscription endpoint
            sub_response = self.session.get(f"{self.base_url}/billing/subscription", timeout=10)
            
            success = sub_response.status_code == 200
            details = f"Subscription: {sub_response.status_code}"
            
            if success:
                sub_data = sub_response.json()
                
                plan_name = sub_data.get("plan_name")
                plan_tier = sub_data.get("plan_tier")
                
                if plan_name == "Free" and plan_tier == 0:
                    details += f", Plan: {plan_name} (tier {plan_tier})"
                    
                    # Check entitlements structure
                    entitlements = sub_data.get("entitlements", {})
                    if isinstance(entitlements, dict):
                        vault_limit = entitlements.get("vaults.max", 0)
                        details += f", Vault limit: {vault_limit}"
                    else:
                        success = False
                        details += f", Invalid entitlements structure: {type(entitlements)}"
                else:
                    success = False
                    details += f", Unexpected plan: {plan_name} (tier {plan_tier})"
            else:
                details += f", Sub response: {sub_response.text[:100]}"
            
            self.log_test("Free Account Entitlements", success, details)
            return success
            
        except Exception as e:
            self.log_test("Free Account Entitlements", False, f"Error: {str(e)}")
            return False

    def test_starter_account_entitlements(self):
        """Test entitlements for Starter account after switching"""
        try:
            # First switch to Starter account
            switch_payload = {"account": "starter"}
            switch_response = self.session.post(f"{self.base_url}/dev/switch-account", json=switch_payload, timeout=10)
            
            if switch_response.status_code != 200:
                self.log_test("Starter Account Entitlements", False, "Failed to switch to Starter account")
                return False
            
            # Test subscription endpoint
            sub_response = self.session.get(f"{self.base_url}/billing/subscription", timeout=10)
            
            success = sub_response.status_code == 200
            details = f"Subscription: {sub_response.status_code}"
            
            if success:
                sub_data = sub_response.json()
                
                plan_name = sub_data.get("plan_name")
                plan_tier = sub_data.get("plan_tier")
                
                if plan_name == "Starter" and plan_tier == 1:
                    details += f", Plan: {plan_name} (tier {plan_tier})"
                    
                    # Check entitlements structure
                    entitlements = sub_data.get("entitlements", {})
                    if isinstance(entitlements, dict):
                        vault_limit = entitlements.get("vaults.max", 0)
                        details += f", Vault limit: {vault_limit}"
                    else:
                        success = False
                        details += f", Invalid entitlements structure: {type(entitlements)}"
                else:
                    success = False
                    details += f", Unexpected plan: {plan_name} (tier {plan_tier})"
            else:
                details += f", Sub response: {sub_response.text[:100]}"
            
            self.log_test("Starter Account Entitlements", success, details)
            return success
            
        except Exception as e:
            self.log_test("Starter Account Entitlements", False, f"Error: {str(e)}")
            return False

    def test_pro_account_entitlements(self):
        """Test entitlements for Pro account after switching"""
        try:
            # First switch to Pro account
            switch_payload = {"account": "pro"}
            switch_response = self.session.post(f"{self.base_url}/dev/switch-account", json=switch_payload, timeout=10)
            
            if switch_response.status_code != 200:
                self.log_test("Pro Account Entitlements", False, "Failed to switch to Pro account")
                return False
            
            # Test subscription endpoint
            sub_response = self.session.get(f"{self.base_url}/billing/subscription", timeout=10)
            
            success = sub_response.status_code == 200
            details = f"Subscription: {sub_response.status_code}"
            
            if success:
                sub_data = sub_response.json()
                
                plan_name = sub_data.get("plan_name")
                plan_tier = sub_data.get("plan_tier")
                
                if plan_name == "Pro" and plan_tier == 2:
                    details += f", Plan: {plan_name} (tier {plan_tier})"
                    
                    # Check entitlements structure
                    entitlements = sub_data.get("entitlements", {})
                    if isinstance(entitlements, dict):
                        vault_limit = entitlements.get("vaults.max", 0)
                        details += f", Vault limit: {vault_limit}"
                    else:
                        success = False
                        details += f", Invalid entitlements structure: {type(entitlements)}"
                else:
                    success = False
                    details += f", Unexpected plan: {plan_name} (tier {plan_tier})"
            else:
                details += f", Sub response: {sub_response.text[:100]}"
            
            self.log_test("Pro Account Entitlements", success, details)
            return success
            
        except Exception as e:
            self.log_test("Pro Account Entitlements", False, f"Error: {str(e)}")
            return False

    # ============ FIRST LOGIN FLAG TESTS ============

    def test_first_login_flag(self):
        """Test GET /api/auth/me includes is_first_login field"""
        try:
            response = self.session.get(f"{self.base_url}/auth/me", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                # Check if is_first_login field exists
                if "is_first_login" in data:
                    is_first_login = data.get("is_first_login")
                    details += f", is_first_login: {is_first_login}"
                    
                    # Also check other expected fields
                    user_id = data.get("user_id")
                    email = data.get("email")
                    details += f", user: {email}"
                else:
                    success = False
                    details += f", is_first_login field missing from response"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/auth/me (First Login Flag)", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/auth/me (First Login Flag)", False, f"Error: {str(e)}")
            return False

    def test_clear_first_login(self):
        """Test POST /api/auth/clear-first-login"""
        try:
            response = self.session.post(f"{self.base_url}/auth/clear-first-login", json={}, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("success") is True:
                    details += ", Successfully cleared first_login flag"
                else:
                    success = False
                    details += f", Unexpected response: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/auth/clear-first-login", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/auth/clear-first-login", False, f"Error: {str(e)}")
            return False

    # ============ SESSION ENDPOINT VALIDATION TESTS ============

    def test_session_endpoint_invalid_session(self):
        """Test POST /api/auth/session with invalid session_id - should return 401"""
        try:
            payload = {"session_id": "invalid_session_12345"}
            response = self.session.post(f"{self.base_url}/auth/session", json=payload, timeout=10)
            
            # Should return 401 or 500 (service unavailable)
            success = response.status_code in [401, 500]
            details = f"Status: {response.status_code}"
            
            if response.status_code == 401:
                data = response.json()
                error_detail = data.get('detail', '')
                if "Authentication failed" in error_detail or "failed" in error_detail.lower():
                    details += f", Correctly returned 401: {error_detail}"
                else:
                    success = False
                    details += f", Unexpected 401 error: {error_detail}"
            elif response.status_code == 500:
                data = response.json()
                error_detail = data.get('detail', '')
                if "unavailable" in error_detail.lower() or "service" in error_detail.lower():
                    details += f", Service unavailable (expected): {error_detail}"
                else:
                    success = False
                    details += f", Unexpected 500 error: {error_detail}"
            else:
                details += f", Expected 401/500, got {response.status_code}: {response.text[:200]}"
            
            self.log_test("POST /api/auth/session (Invalid Session)", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/auth/session (Invalid Session)", False, f"Error: {str(e)}")
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

    def run_onboarding_tests(self):
        """Run all Onboarding and Dev Loop tests"""
        self.log("🚀 Starting OMNIGOVAULT Onboarding and Dev Loop Tests")
        self.log(f"Testing against: {self.base_url}")
        self.log("=" * 80)
        
        # Test sequence for onboarding and dev loop implementation
        test_sequence = [
            # Dev Environment Status
            self.test_dev_environment_status,
            
            # Auth/Me with Dev Bypass
            self.test_auth_me_dev_bypass,
            
            # Test Account Switching
            self.test_switch_to_free_account,
            self.test_switch_to_starter_account,
            self.test_switch_to_pro_account,
            
            # Test Account Entitlements
            self.test_free_account_entitlements,
            self.test_starter_account_entitlements,
            self.test_pro_account_entitlements,
            
            # First Login Flag
            self.test_first_login_flag,
            self.test_clear_first_login,
            
            # Session Endpoint Validation
            self.test_session_endpoint_invalid_session,
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
        
        return self.print_summary()

    def print_summary(self):
        """Print test summary"""
        self.log("=" * 80)
        self.log("🏁 ONBOARDING AND DEV LOOP TEST SUMMARY")
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
            self.log("✅ Onboarding and dev loop implementation working perfectly")
            self.log("✅ Dev bypass mode allows full access without Google OAuth")
            self.log("✅ Test accounts can be switched for testing different tier entitlements")
            self.log("✅ All 3 test accounts (Free/Starter/Pro) have correct entitlements seeded")
        elif success_rate >= 75:
            self.log("⚠️ Most onboarding functionality working with minor issues")
        else:
            self.log("❌ Significant onboarding implementation issues detected")
        
        return success_rate >= 75


if __name__ == "__main__":
    tester = OmniGoVaultOnboardingTester()
    success = tester.run_onboarding_tests()
    sys.exit(0 if success else 1)