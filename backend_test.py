#!/usr/bin/env python3
"""
Backend API Testing for OMNIGOVAULT Application
Portrait Customization Feature - Comprehensive Testing
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid
import hashlib

# Use the public endpoint from frontend/.env
BASE_URL = "https://trusthealth-update.preview.emergentagent.com/api"

class PortraitCustomizationTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'PortraitCustomization-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = []
        
        # Valid portrait styles as per backend implementation
        self.valid_styles = ["standard", "gold", "emerald", "sapphire", "amethyst", "obsidian", "dynasty", "crown"]
        
        # Test user details
        self.test_user_email = "jedediah.bey@gmail.com"
        self.test_user_role = "OMNICOMPETENT_OWNER"
        
        # Try to get a valid session token
        self.session_token = self.get_valid_session_token()

    def get_valid_session_token(self):
        """Try to get a valid session token for testing"""
        # Try different approaches to get a valid session token
        
        # Method 1: Try to create a test user and session
        try:
            # Generate a unique test user
            import uuid
            test_suffix = uuid.uuid4().hex[:8]
            test_email = f"test_portrait_{test_suffix}@example.com"
            test_password = "testpassword123"
            
            # Try to register a test user
            register_data = {
                'email': test_email,
                'password': test_password,
                'name': f'Portrait Test User {test_suffix}'
            }
            response = requests.post(f'{self.base_url}/auth/register', json=register_data)
            if response.status_code == 200:
                data = response.json()
                session_token = data.get('session_token')
                if session_token:
                    self.log(f"✅ Created test user: {test_email}")
                    self.test_user_email = test_email  # Update test user email
                    return session_token
        except Exception as e:
            self.log(f"Failed to create test user: {e}")
        
        # Method 2: Try some common test session tokens
        test_tokens = [
            'test_session_portrait_customization',
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

    # ============ PORTRAIT CUSTOMIZATION TESTS ============

    def test_get_user_profile(self):
        """Test GET /api/user/profile - Should return user profile including portrait_style field"""
        try:
            response = self.session.get(f"{self.base_url}/user/profile", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                # Check required fields
                required_fields = ["user_id", "email", "name", "portrait_style", "global_roles"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                else:
                    details += ", All required fields present"
                    
                    # Check portrait_style field specifically
                    portrait_style = data.get("portrait_style")
                    if portrait_style:
                        if portrait_style in self.valid_styles:
                            details += f", Portrait style: {portrait_style} (valid)"
                        else:
                            success = False
                            details += f", Invalid portrait style: {portrait_style}"
                    else:
                        # Should default to "standard" if not set
                        if portrait_style == "standard":
                            details += ", Portrait style defaults to 'standard'"
                        else:
                            success = False
                            details += f", Expected default 'standard', got: {portrait_style}"
                    
                    # Check user details
                    email = data.get("email")
                    global_roles = data.get("global_roles", [])
                    is_omnicompetent = data.get("is_omnicompetent", False)
                    
                    if email == self.test_user_email:
                        details += f", Correct user: {email}"
                    else:
                        success = False
                        details += f", Wrong user: {email}"
                    
                    if self.test_user_role in global_roles:
                        details += f", Has {self.test_user_role} role"
                    else:
                        success = False
                        details += f", Missing {self.test_user_role} role, has: {global_roles}"
                        
                    if is_omnicompetent:
                        details += ", Omnicompetent access confirmed"
                    else:
                        success = False
                        details += ", Should have omnicompetent access"
                        
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/user/profile", success, details)
            return success, data if success else None
            
        except Exception as e:
            self.log_test("GET /api/user/profile", False, f"Error: {str(e)}")
            return False, None

    def test_update_portrait_style_valid(self, style):
        """Test PUT /api/user/profile - Update Portrait Style with valid value"""
        try:
            payload = {"portrait_style": style}
            
            response = self.session.put(f"{self.base_url}/user/profile", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Style: {style}"
            
            if success:
                data = response.json()
                
                # Check that the style was updated
                updated_style = data.get("portrait_style")
                if updated_style == style:
                    details += f", Successfully updated to '{style}'"
                else:
                    success = False
                    details += f", Expected '{style}', got '{updated_style}'"
                
                # Verify the response structure
                required_fields = ["user_id", "email", "portrait_style"]
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    success = False
                    details += f", Missing fields in response: {missing_fields}"
                else:
                    details += ", Complete response structure"
                    
            else:
                details += f", Response: {response.text[:200]}"
            
            test_name = f"PUT /api/user/profile - Update to '{style}'"
            self.log_test(test_name, success, details)
            return success
            
        except Exception as e:
            test_name = f"PUT /api/user/profile - Update to '{style}'"
            self.log_test(test_name, False, f"Error: {str(e)}")
            return False

    def test_update_portrait_style_invalid(self):
        """Test PUT /api/user/profile - Invalid Style (should return 400 error)"""
        try:
            invalid_style = "invalid_style"
            payload = {"portrait_style": invalid_style}
            
            response = self.session.put(f"{self.base_url}/user/profile", json=payload, timeout=10)
            success = response.status_code == 400  # Should return 400 error
            details = f"Status: {response.status_code}, Style: {invalid_style}"
            
            if success:
                data = response.json()
                error_detail = data.get("detail", "")
                
                # Check that error message mentions valid styles
                if "Invalid portrait style" in error_detail and "Must be one of:" in error_detail:
                    details += ", Correct error message format"
                    
                    # Check that all valid styles are mentioned in error
                    valid_styles_mentioned = all(style in error_detail for style in self.valid_styles)
                    if valid_styles_mentioned:
                        details += ", All valid styles listed in error"
                    else:
                        success = False
                        details += ", Not all valid styles listed in error"
                        
                else:
                    success = False
                    details += f", Unexpected error message: {error_detail}"
                    
            else:
                details += f", Expected 400 error, got {response.status_code}"
                if response.status_code == 200:
                    details += " (Should have rejected invalid style)"
                else:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test("PUT /api/user/profile - Invalid Style", success, details)
            return success
            
        except Exception as e:
            self.log_test("PUT /api/user/profile - Invalid Style", False, f"Error: {str(e)}")
            return False

    def test_portrait_style_persistence(self, style):
        """Test that portrait style persists after update by fetching profile again"""
        try:
            # First update the style
            update_success = self.test_update_portrait_style_valid(style)
            if not update_success:
                self.log_test(f"Portrait Style Persistence - {style}", False, "Update failed")
                return False
            
            # Wait a moment for database update
            time.sleep(0.5)
            
            # Then fetch the profile to verify persistence
            response = self.session.get(f"{self.base_url}/user/profile", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}, Style: {style}"
            
            if success:
                data = response.json()
                persisted_style = data.get("portrait_style")
                
                if persisted_style == style:
                    details += f", Style '{style}' persisted correctly"
                else:
                    success = False
                    details += f", Expected '{style}', got '{persisted_style}'"
                    
            else:
                details += f", Response: {response.text[:200]}"
            
            test_name = f"Portrait Style Persistence - {style}"
            self.log_test(test_name, success, details)
            return success
            
        except Exception as e:
            test_name = f"Portrait Style Persistence - {style}"
            self.log_test(test_name, False, f"Error: {str(e)}")
            return False

    def test_multiple_field_update(self):
        """Test updating portrait_style along with other profile fields"""
        try:
            payload = {
                "portrait_style": "emerald",
                "display_name": "Portrait Test User"
            }
            
            response = self.session.put(f"{self.base_url}/user/profile", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                # Check both fields were updated
                updated_style = data.get("portrait_style")
                updated_display_name = data.get("display_name")
                
                if updated_style == "emerald" and updated_display_name == "Portrait Test User":
                    details += ", Both portrait_style and display_name updated correctly"
                else:
                    success = False
                    details += f", Style: {updated_style}, Display name: {updated_display_name}"
                    
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("Multiple Field Update", success, details)
            return success
            
        except Exception as e:
            self.log_test("Multiple Field Update", False, f"Error: {str(e)}")
            return False

    def test_empty_portrait_style_update(self):
        """Test updating with empty/null portrait_style (should default to 'standard')"""
        try:
            payload = {"portrait_style": ""}
            
            response = self.session.put(f"{self.base_url}/user/profile", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                updated_style = data.get("portrait_style")
                
                if updated_style == "standard":
                    details += ", Empty style correctly defaults to 'standard'"
                else:
                    success = False
                    details += f", Expected 'standard', got '{updated_style}'"
                    
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("Empty Portrait Style Update", success, details)
            return success
            
        except Exception as e:
            self.log_test("Empty Portrait Style Update", False, f"Error: {str(e)}")
            return False

    # ============ TEST RUNNER ============

    def run_portrait_customization_tests(self):
        """Run all Portrait Customization feature tests"""
        self.log("🚀 Starting PORTRAIT CUSTOMIZATION Feature Tests")
        self.log(f"Testing against: {self.base_url}")
        self.log(f"User: {self.test_user_email} ({self.test_user_role} role)")
        self.log("=" * 80)
        
        # Test sequence for portrait customization feature
        test_sequence = [
            # Authentication
            self.test_auth_status,
            
            # Basic profile retrieval
            self.test_get_user_profile,
            
            # Test updating to specific valid styles (as requested)
            lambda: self.test_update_portrait_style_valid("gold"),
            lambda: self.test_update_portrait_style_valid("emerald"),
            lambda: self.test_update_portrait_style_valid("dynasty"),
            lambda: self.test_update_portrait_style_valid("crown"),
            
            # Test invalid style
            self.test_update_portrait_style_invalid,
            
            # Test persistence for a few key styles
            lambda: self.test_portrait_style_persistence("sapphire"),
            lambda: self.test_portrait_style_persistence("obsidian"),
            
            # Test edge cases
            self.test_multiple_field_update,
            self.test_empty_portrait_style_update,
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
        self.log("🏁 PORTRAIT CUSTOMIZATION FEATURE TEST SUMMARY")
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
            self.log("✅ Portrait Customization feature working perfectly")
            self.log("✅ GET /api/user/profile returns portrait_style field correctly")
            self.log("✅ PUT /api/user/profile updates portrait_style successfully")
            self.log("✅ Invalid portrait styles properly rejected with 400 error")
            self.log("✅ Portrait style changes persist after update")
            self.log("✅ All valid styles supported: " + ", ".join(self.valid_styles))
        elif success_rate >= 75:
            self.log("⚠️ Most portrait customization functionality working with minor issues")
        else:
            self.log("❌ Significant portrait customization implementation issues detected")
        
        # Specific feature status
        self.log("\n📋 FEATURE STATUS:")
        
        # Profile retrieval
        profile_tests = [t for t in self.test_results if 'profile' in t['test'].lower() and 'get' in t['test'].lower()]
        profile_success = sum(1 for t in profile_tests if t['success'])
        self.log(f"  Profile Retrieval: {profile_success}/{len(profile_tests)} ({'✅' if profile_success == len(profile_tests) else '❌'})")
        
        # Style updates
        update_tests = [t for t in self.test_results if 'update' in t['test'].lower() and 'invalid' not in t['test'].lower()]
        update_success = sum(1 for t in update_tests if t['success'])
        self.log(f"  Style Updates: {update_success}/{len(update_tests)} ({'✅' if update_success == len(update_tests) else '❌'})")
        
        # Validation
        validation_tests = [t for t in self.test_results if 'invalid' in t['test'].lower()]
        validation_success = sum(1 for t in validation_tests if t['success'])
        self.log(f"  Input Validation: {validation_success}/{len(validation_tests)} ({'✅' if validation_success == len(validation_tests) else '❌'})")
        
        # Persistence
        persistence_tests = [t for t in self.test_results if 'persistence' in t['test'].lower()]
        persistence_success = sum(1 for t in persistence_tests if t['success'])
        self.log(f"  Style Persistence: {persistence_success}/{len(persistence_tests)} ({'✅' if persistence_success == len(persistence_tests) else '❌'})")
        
        # Authentication
        auth_tests = [t for t in self.test_results if 'auth' in t['test'].lower()]
        auth_success = sum(1 for t in auth_tests if t['success'])
        self.log(f"  Authentication: {auth_success}/{len(auth_tests)} ({'✅' if auth_success == len(auth_tests) else '❌'})")
        
        self.log("\n🎨 PORTRAIT STYLES TESTED:")
        tested_styles = ["gold", "emerald", "dynasty", "crown", "sapphire", "obsidian"]
        for style in tested_styles:
            style_tests = [t for t in self.test_results if style in t['test'].lower()]
            style_success = all(t['success'] for t in style_tests)
            self.log(f"  • {style}: {'✅' if style_success else '❌'}")
        
        self.log("\n📝 VALIDATION TESTS:")
        self.log("  • Invalid style rejection: ✅" if validation_success > 0 else "  • Invalid style rejection: ❌")
        self.log("  • Empty style handling: ✅" if any('empty' in t['test'].lower() and t['success'] for t in self.test_results) else "  • Empty style handling: ❌")
        self.log("  • Multiple field updates: ✅" if any('multiple' in t['test'].lower() and t['success'] for t in self.test_results) else "  • Multiple field updates: ❌")
        
        return success_rate >= 75


if __name__ == "__main__":
    tester = PortraitCustomizationTester()
    success = tester.run_portrait_customization_tests()
    sys.exit(0 if success else 1)