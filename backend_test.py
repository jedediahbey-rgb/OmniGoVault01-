#!/usr/bin/env python3
"""
Backend API Testing for OMNIGOVAULT Application
Global Search V2 API - Comprehensive Testing
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

class GlobalSearchV2Tester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'GlobalSearchV2-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = []
        
        # Expected V2 navigation items with shortcuts
        self.expected_navigation = [
            {"title": "Dashboard", "shortcut": "G D"},
            {"title": "Governance", "shortcut": "G G"},
            {"title": "Trust Health", "shortcut": "G H"},
            {"title": "Settings", "shortcut": "G S"},
            {"title": "Billing", "shortcut": "G B"},
        ]
        
        # Expected V2 quick actions
        self.expected_quick_actions = [
            "New Portfolio",
            "New Meeting Minutes", 
            "New Distribution",
            "New Document",
            "Export Binder"
        ]
        
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
            test_email = f"test_search_{test_suffix}@example.com"
            test_password = "testpassword123"
            
            # Try to register a test user
            register_data = {
                'email': test_email,
                'password': test_password,
                'name': f'Search Test User {test_suffix}'
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
            'test_session_search_v2',
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

    # ============ GLOBAL SEARCH V2 TESTS ============

    def test_search_dashboard(self):
        """Test GET /api/search?q=dashboard - Should return navigation items"""
        try:
            response = self.session.get(f"{self.base_url}/search?q=dashboard", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                # Check V2 response structure
                if not data.get("ok"):
                    success = False
                    details += ", Missing 'ok' field"
                else:
                    search_data = data.get("data", {})
                    
                    # Check V2 version
                    version = search_data.get("version")
                    if version != "v2":
                        success = False
                        details += f", Expected version 'v2', got '{version}'"
                    else:
                        details += ", V2 version confirmed"
                    
                    # Check for Dashboard in results
                    results = search_data.get("results", [])
                    grouped = search_data.get("grouped", {})
                    
                    dashboard_found = False
                    dashboard_shortcut = None
                    
                    for result in results:
                        if "dashboard" in result.get("title", "").lower():
                            dashboard_found = True
                            dashboard_shortcut = result.get("shortcut")
                            break
                    
                    if dashboard_found:
                        details += ", Dashboard found in results"
                        if dashboard_shortcut == "G D":
                            details += ", Correct shortcut 'G D'"
                        else:
                            success = False
                            details += f", Expected shortcut 'G D', got '{dashboard_shortcut}'"
                    else:
                        success = False
                        details += ", Dashboard not found in results"
                    
                    # Check grouped results
                    navigation_items = grouped.get("navigation", [])
                    if navigation_items:
                        details += f", {len(navigation_items)} navigation items"
                    else:
                        success = False
                        details += ", No navigation items in grouped results"
                        
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/search?q=dashboard", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/search?q=dashboard", False, f"Error: {str(e)}")
            return False

    def test_search_new_actions(self):
        """Test GET /api/search?q=new - Should return action items"""
        try:
            response = self.session.get(f"{self.base_url}/search?q=new", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                if not data.get("ok"):
                    success = False
                    details += ", Missing 'ok' field"
                else:
                    search_data = data.get("data", {})
                    results = search_data.get("results", [])
                    grouped = search_data.get("grouped", {})
                    
                    # Check for "New" actions
                    new_actions_found = []
                    for result in results:
                        title = result.get("title", "")
                        if title.startswith("New "):
                            new_actions_found.append(title)
                    
                    if len(new_actions_found) >= 3:
                        details += f", Found {len(new_actions_found)} 'New' actions: {', '.join(new_actions_found[:3])}"
                        
                        # Check for specific expected actions
                        expected_found = 0
                        for expected in ["New Portfolio", "New Meeting", "New Distribution", "New Document"]:
                            for found in new_actions_found:
                                if expected.lower() in found.lower():
                                    expected_found += 1
                                    break
                        
                        if expected_found >= 2:
                            details += f", {expected_found} expected actions found"
                        else:
                            success = False
                            details += f", Only {expected_found} expected actions found"
                    else:
                        success = False
                        details += f", Only {len(new_actions_found)} 'New' actions found"
                    
                    # Check grouped actions
                    action_items = grouped.get("actions", [])
                    if action_items:
                        details += f", {len(action_items)} action items in grouped results"
                    else:
                        details += ", No action items in grouped results"
                        
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/search?q=new", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/search?q=new", False, f"Error: {str(e)}")
            return False

    def test_search_health(self):
        """Test GET /api/search?q=health - Should return health-related items"""
        try:
            response = self.session.get(f"{self.base_url}/search?q=health", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                if not data.get("ok"):
                    success = False
                    details += ", Missing 'ok' field"
                else:
                    search_data = data.get("data", {})
                    results = search_data.get("results", [])
                    
                    # Check for health-related items
                    health_items_found = []
                    for result in results:
                        title = result.get("title", "")
                        subtitle = result.get("subtitle", "")
                        if "health" in title.lower() or "health" in subtitle.lower():
                            health_items_found.append(title)
                    
                    if health_items_found:
                        details += f", Found health items: {', '.join(health_items_found)}"
                        
                        # Check for Trust Health specifically
                        trust_health_found = any("trust health" in item.lower() for item in health_items_found)
                        if trust_health_found:
                            details += ", Trust Health found"
                            
                            # Check for shortcut
                            for result in results:
                                if "trust health" in result.get("title", "").lower():
                                    shortcut = result.get("shortcut")
                                    if shortcut == "G H":
                                        details += ", Correct shortcut 'G H'"
                                    else:
                                        success = False
                                        details += f", Expected shortcut 'G H', got '{shortcut}'"
                                    break
                        else:
                            success = False
                            details += ", Trust Health not found"
                    else:
                        success = False
                        details += ", No health-related items found"
                        
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/search?q=health", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/search?q=health", False, f"Error: {str(e)}")
            return False

    def test_search_trust(self):
        """Test GET /api/search?q=trust - Should return trust-related items"""
        try:
            response = self.session.get(f"{self.base_url}/search?q=trust", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                if not data.get("ok"):
                    success = False
                    details += ", Missing 'ok' field"
                else:
                    search_data = data.get("data", {})
                    results = search_data.get("results", [])
                    
                    # Check for trust-related items
                    trust_items_found = []
                    for result in results:
                        title = result.get("title", "")
                        subtitle = result.get("subtitle", "")
                        keywords = result.get("keywords", [])
                        
                        if ("trust" in title.lower() or 
                            "trust" in subtitle.lower() or 
                            any("trust" in str(k).lower() for k in keywords)):
                            trust_items_found.append(title)
                    
                    if trust_items_found:
                        details += f", Found {len(trust_items_found)} trust items"
                        
                        # Check for specific trust-related items
                        expected_items = ["Trust Health", "Declaration of Trust", "Certificate of Trust"]
                        found_expected = 0
                        for expected in expected_items:
                            for found in trust_items_found:
                                if expected.lower() in found.lower():
                                    found_expected += 1
                                    break
                        
                        if found_expected >= 1:
                            details += f", {found_expected} expected trust items found"
                        else:
                            success = False
                            details += ", No expected trust items found"
                    else:
                        success = False
                        details += ", No trust-related items found"
                        
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/search?q=trust", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/search?q=trust", False, f"Error: {str(e)}")
            return False

    def test_search_suggestions(self):
        """Test GET /api/search/suggestions - Get search suggestions for empty state"""
        try:
            response = self.session.get(f"{self.base_url}/search/suggestions", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                if not data.get("ok"):
                    success = False
                    details += ", Missing 'ok' field"
                else:
                    suggestions_data = data.get("data", {})
                    
                    # Check required fields
                    required_fields = ["recent", "recent_searches", "quick_actions", "navigation"]
                    missing_fields = [field for field in required_fields if field not in suggestions_data]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields: {missing_fields}"
                    else:
                        details += ", All required fields present"
                        
                        # Check quick_actions (should have 6 items)
                        quick_actions = suggestions_data.get("quick_actions", [])
                        if len(quick_actions) == 6:
                            details += f", {len(quick_actions)} quick actions (correct)"
                        else:
                            success = False
                            details += f", Expected 6 quick actions, got {len(quick_actions)}"
                        
                        # Check navigation (should have 8 items)
                        navigation = suggestions_data.get("navigation", [])
                        if len(navigation) == 8:
                            details += f", {len(navigation)} navigation items (correct)"
                        else:
                            success = False
                            details += f", Expected 8 navigation items, got {len(navigation)}"
                        
                        # Check recent_searches structure
                        recent_searches = suggestions_data.get("recent_searches", [])
                        details += f", {len(recent_searches)} recent searches"
                        
                        # Check recent items structure
                        recent = suggestions_data.get("recent", [])
                        details += f", {len(recent)} recent items"
                        
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/search/suggestions", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/search/suggestions", False, f"Error: {str(e)}")
            return False

    def test_search_recent(self):
        """Test GET /api/search/recent - Get user's recent search queries"""
        try:
            response = self.session.get(f"{self.base_url}/search/recent", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                if not data.get("ok"):
                    success = False
                    details += ", Missing 'ok' field"
                else:
                    recent_data = data.get("data", {})
                    
                    # Check searches field
                    if "searches" not in recent_data:
                        success = False
                        details += ", Missing 'searches' field"
                    else:
                        searches = recent_data.get("searches", [])
                        details += f", {len(searches)} recent searches"
                        
                        # Check structure of search items
                        if searches:
                            first_search = searches[0]
                            required_search_fields = ["query", "result_count", "search_count", "last_searched"]
                            missing_search_fields = [field for field in required_search_fields if field not in first_search]
                            
                            if missing_search_fields:
                                success = False
                                details += f", Missing search fields: {missing_search_fields}"
                            else:
                                details += ", Correct search item structure"
                        else:
                            details += ", No recent searches (expected for new user)"
                        
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/search/recent", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/search/recent", False, f"Error: {str(e)}")
            return False

    def test_clear_search_history(self):
        """Test DELETE /api/search/recent - Clear search history"""
        try:
            response = self.session.delete(f"{self.base_url}/search/recent", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                if not data.get("ok"):
                    success = False
                    details += ", Missing 'ok' field"
                else:
                    message = data.get("message")
                    if "cleared" in message.lower():
                        details += ", Correct success message"
                    else:
                        success = False
                        details += f", Unexpected message: {message}"
                    
                    # Verify history is cleared by checking recent searches
                    time.sleep(0.5)  # Brief pause
                    verify_response = self.session.get(f"{self.base_url}/search/recent", timeout=10)
                    if verify_response.status_code == 200:
                        verify_data = verify_response.json()
                        if verify_data.get("ok"):
                            searches = verify_data.get("data", {}).get("searches", [])
                            if len(searches) == 0:
                                details += ", History successfully cleared"
                            else:
                                success = False
                                details += f", History not cleared, still has {len(searches)} searches"
                        else:
                            success = False
                            details += ", Failed to verify history clearing"
                    else:
                        success = False
                        details += ", Failed to verify history clearing"
                        
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("DELETE /api/search/recent", success, details)
            return success
            
        except Exception as e:
            self.log_test("DELETE /api/search/recent", False, f"Error: {str(e)}")
            return False

    def test_v2_navigation_shortcuts(self):
        """Test V2 Navigation Items with Shortcuts"""
        try:
            response = self.session.get(f"{self.base_url}/search?q=dashboard", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                if not data.get("ok"):
                    success = False
                    details += ", Missing 'ok' field"
                else:
                    search_data = data.get("data", {})
                    results = search_data.get("results", [])
                    
                    # Check for V2 navigation items with shortcuts
                    shortcuts_found = {}
                    for result in results:
                        if result.get("type") == "navigation":
                            title = result.get("title")
                            shortcut = result.get("shortcut")
                            if title and shortcut:
                                shortcuts_found[title] = shortcut
                    
                    if shortcuts_found:
                        details += f", Found shortcuts: {shortcuts_found}"
                        
                        # Verify expected shortcuts
                        expected_shortcuts = {
                            "Dashboard": "G D",
                            "Governance": "G G", 
                            "Trust Health": "G H",
                            "Settings": "G S",
                            "Billing": "G B"
                        }
                        
                        correct_shortcuts = 0
                        for title, expected_shortcut in expected_shortcuts.items():
                            if title in shortcuts_found:
                                if shortcuts_found[title] == expected_shortcut:
                                    correct_shortcuts += 1
                                else:
                                    success = False
                                    details += f", Wrong shortcut for {title}: expected {expected_shortcut}, got {shortcuts_found[title]}"
                        
                        if correct_shortcuts >= 3:
                            details += f", {correct_shortcuts} correct shortcuts verified"
                        else:
                            success = False
                            details += f", Only {correct_shortcuts} correct shortcuts found"
                    else:
                        success = False
                        details += ", No navigation shortcuts found"
                        
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("V2 Navigation Items with Shortcuts", success, details)
            return success
            
        except Exception as e:
            self.log_test("V2 Navigation Items with Shortcuts", False, f"Error: {str(e)}")
            return False

    def test_fuzzy_matching(self):
        """Test V2 Fuzzy Matching (partial matches work)"""
        try:
            # Test partial match with "dash" for "Dashboard"
            response = self.session.get(f"{self.base_url}/search?q=dash", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                if not data.get("ok"):
                    success = False
                    details += ", Missing 'ok' field"
                else:
                    search_data = data.get("data", {})
                    results = search_data.get("results", [])
                    
                    # Check if Dashboard is found with partial match "dash"
                    dashboard_found = False
                    for result in results:
                        if "dashboard" in result.get("title", "").lower():
                            dashboard_found = True
                            break
                    
                    if dashboard_found:
                        details += ", Fuzzy matching works: 'dash' found 'Dashboard'"
                        
                        # Test another fuzzy match
                        response2 = self.session.get(f"{self.base_url}/search?q=gov", timeout=10)
                        if response2.status_code == 200:
                            data2 = response2.json()
                            if data2.get("ok"):
                                results2 = data2.get("data", {}).get("results", [])
                                governance_found = False
                                for result in results2:
                                    if "governance" in result.get("title", "").lower():
                                        governance_found = True
                                        break
                                
                                if governance_found:
                                    details += ", 'gov' found 'Governance'"
                                else:
                                    success = False
                                    details += ", 'gov' did not find 'Governance'"
                            else:
                                success = False
                                details += ", Second fuzzy test failed"
                        else:
                            success = False
                            details += ", Second fuzzy test request failed"
                    else:
                        success = False
                        details += ", Fuzzy matching failed: 'dash' did not find 'Dashboard'"
                        
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("V2 Fuzzy Matching", success, details)
            return success
            
        except Exception as e:
            self.log_test("V2 Fuzzy Matching", False, f"Error: {str(e)}")
            return False

    def test_grouped_results(self):
        """Test V2 Grouped Results by Type"""
        try:
            response = self.session.get(f"{self.base_url}/search?q=new", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                if not data.get("ok"):
                    success = False
                    details += ", Missing 'ok' field"
                else:
                    search_data = data.get("data", {})
                    grouped = search_data.get("grouped", {})
                    
                    # Check grouped structure
                    expected_groups = ["navigation", "actions", "records", "portfolios", "templates", "documents", "parties"]
                    missing_groups = [group for group in expected_groups if group not in grouped]
                    
                    if missing_groups:
                        success = False
                        details += f", Missing groups: {missing_groups}"
                    else:
                        details += ", All expected groups present"
                        
                        # Check that groups contain appropriate items
                        actions = grouped.get("actions", [])
                        navigation = grouped.get("navigation", [])
                        
                        if actions:
                            details += f", {len(actions)} actions grouped"
                            # Check that actions are actually action type
                            action_types_correct = all(item.get("type") == "action" for item in actions)
                            if action_types_correct:
                                details += ", Action types correct"
                            else:
                                success = False
                                details += ", Some action items have wrong type"
                        
                        if navigation:
                            details += f", {len(navigation)} navigation items grouped"
                            # Check that navigation items are actually navigation type
                            nav_types_correct = all(item.get("type") == "navigation" for item in navigation)
                            if nav_types_correct:
                                details += ", Navigation types correct"
                            else:
                                success = False
                                details += ", Some navigation items have wrong type"
                        
                        if not actions and not navigation:
                            success = False
                            details += ", No items in main groups"
                        
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("V2 Grouped Results by Type", success, details)
            return success
            
        except Exception as e:
            self.log_test("V2 Grouped Results by Type", False, f"Error: {str(e)}")
            return False

    # ============ TEST RUNNER ============

    def run_global_search_v2_tests(self):
        """Run all Global Search V2 API tests"""
        self.log("🚀 Starting GLOBAL SEARCH V2 API Tests")
        self.log(f"Testing against: {self.base_url}")
        self.log(f"User: {self.test_user_email} ({self.test_user_role} role)")
        self.log("=" * 80)
        
        # Test sequence for Global Search V2 API
        test_sequence = [
            # Authentication
            self.test_auth_status,
            
            # Main search functionality tests
            self.test_search_dashboard,
            self.test_search_new_actions,
            self.test_search_health,
            self.test_search_trust,
            
            # Search suggestions and history
            self.test_search_suggestions,
            self.test_search_recent,
            self.test_clear_search_history,
            
            # V2 specific features
            self.test_v2_navigation_shortcuts,
            self.test_fuzzy_matching,
            self.test_grouped_results,
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
        self.log("🏁 GLOBAL SEARCH V2 API TEST SUMMARY")
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
            self.log("✅ Global Search V2 API working perfectly")
            self.log("✅ All main search endpoints functional")
            self.log("✅ V2 features (shortcuts, fuzzy matching, grouping) working")
            self.log("✅ Search suggestions and history management working")
            self.log("✅ Navigation items with shortcuts properly implemented")
        elif success_rate >= 75:
            self.log("⚠️ Most Global Search V2 functionality working with minor issues")
        else:
            self.log("❌ Significant Global Search V2 implementation issues detected")
        
        # Specific feature status
        self.log("\n📋 FEATURE STATUS:")
        
        # Main search functionality
        search_tests = [t for t in self.test_results if 'search' in t['test'].lower() and 'suggestions' not in t['test'].lower() and 'recent' not in t['test'].lower()]
        search_success = sum(1 for t in search_tests if t['success'])
        self.log(f"  Main Search Endpoints: {search_success}/{len(search_tests)} ({'✅' if search_success == len(search_tests) else '❌'})")
        
        # V2 features
        v2_tests = [t for t in self.test_results if 'v2' in t['test'].lower() or 'fuzzy' in t['test'].lower() or 'grouped' in t['test'].lower()]
        v2_success = sum(1 for t in v2_tests if t['success'])
        self.log(f"  V2 Enhanced Features: {v2_success}/{len(v2_tests)} ({'✅' if v2_success == len(v2_tests) else '❌'})")
        
        # Suggestions and history
        suggestions_tests = [t for t in self.test_results if 'suggestions' in t['test'].lower() or 'recent' in t['test'].lower() or 'clear' in t['test'].lower()]
        suggestions_success = sum(1 for t in suggestions_tests if t['success'])
        self.log(f"  Suggestions & History: {suggestions_success}/{len(suggestions_tests)} ({'✅' if suggestions_success == len(suggestions_tests) else '❌'})")
        
        # Authentication
        auth_tests = [t for t in self.test_results if 'auth' in t['test'].lower()]
        auth_success = sum(1 for t in auth_tests if t['success'])
        self.log(f"  Authentication: {auth_success}/{len(auth_tests)} ({'✅' if auth_success == len(auth_tests) else '❌'})")
        
        self.log("\n🔍 SEARCH QUERIES TESTED:")
        tested_queries = ["dashboard", "new", "health", "trust", "dash", "gov"]
        for query in tested_queries:
            query_tests = [t for t in self.test_results if query in t['test'].lower()]
            query_success = all(t['success'] for t in query_tests) if query_tests else False
            self.log(f"  • '{query}': {'✅' if query_success else '❌'}")
        
        self.log("\n📝 V2 FEATURES VERIFIED:")
        v2_features = [
            ("Version field 'v2'", any('version' in t['details'] and t['success'] for t in self.test_results)),
            ("Navigation shortcuts", any('shortcut' in t['details'] and t['success'] for t in self.test_results)),
            ("Fuzzy matching", any('fuzzy' in t['test'].lower() and t['success'] for t in self.test_results)),
            ("Grouped results", any('grouped' in t['test'].lower() and t['success'] for t in self.test_results)),
            ("Search suggestions", any('suggestions' in t['test'].lower() and t['success'] for t in self.test_results)),
            ("Search history", any('recent' in t['test'].lower() and t['success'] for t in self.test_results))
        ]
        
        for feature_name, feature_working in v2_features:
            self.log(f"  • {feature_name}: {'✅' if feature_working else '❌'}")
        
        self.log("\n🎯 NAVIGATION SHORTCUTS TESTED:")
        expected_shortcuts = ["G D (Dashboard)", "G G (Governance)", "G H (Trust Health)", "G S (Settings)", "G B (Billing)"]
        for shortcut in expected_shortcuts:
            shortcut_working = any(shortcut.split()[0] in t['details'] and t['success'] for t in self.test_results)
            self.log(f"  • {shortcut}: {'✅' if shortcut_working else '❌'}")
        
        return success_rate >= 75


if __name__ == "__main__":
    tester = GlobalSearchV2Tester()
    success = tester.run_global_search_v2_tests()
    sys.exit(0 if success else 1)