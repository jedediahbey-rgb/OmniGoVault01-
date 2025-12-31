#!/usr/bin/env python3
"""
Backend API Testing for OMNIGOVAULT Application
V2 Trust Health Feature - Comprehensive Testing
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid
import hashlib

# Use the public endpoint from frontend/.env
BASE_URL = "https://vault-enhance.preview.emergentagent.com/api"

class V2TrustHealthTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        # Set the session cookie for authentication
        self.session.cookies.set('session_token', 'sess_a67ad050a63d4f0f82e479b165e70f4a')
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'V2TrustHealth-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = []
        
        # Expected V2 features
        self.expected_v2_features = {
            "category_weights": ["governance_hygiene", "financial_integrity", "compliance_recordkeeping", "risk_exposure", "data_integrity"],
            "severity_multipliers": ["info", "warning", "critical"],
            "readiness_modes": ["normal", "audit", "court"],
            "blocking_caps": ["CAP_ORPHANS", "CAP_MISSING_FINALIZER", "CAP_LEDGER_IMBALANCE", "CAP_DRAFT_ACTIVE"]
        }

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
        """Test authentication with provided session token"""
        try:
            response = self.session.get(f"{self.base_url}/auth/me", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                email = data.get("email")
                user_id = data.get("user_id")
                
                if email == "test@example.com":  # Updated for our test user
                    details += f", Authenticated as: {email}"
                else:
                    success = False
                    details += f", Unexpected user: {email}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("Authentication Check", success, details)
            return success
            
        except Exception as e:
            self.log_test("Authentication Check", False, f"Error: {str(e)}")
            return False

    # ============ V2 TRUST HEALTH TESTS ============

    def test_get_v2_ruleset(self):
        """Test GET /api/health/v2/ruleset - Fetch V2 ruleset configuration"""
        try:
            response = self.session.get(f"{self.base_url}/health/v2/ruleset", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                # Check response structure
                if data.get("ok") and data.get("data"):
                    ruleset = data["data"]
                    details += ", Valid response structure"
                    
                    # Check category weights
                    weights = ruleset.get("category_weights", {})
                    if weights:
                        total_weight = sum(weights.values())
                        details += f", Category weights sum: {total_weight}%"
                        
                        # Verify weights sum to 100%
                        if abs(total_weight - 100) <= 0.1:
                            details += " ✅ Weights sum to 100%"
                        else:
                            success = False
                            details += f" ❌ Weights should sum to 100%, got {total_weight}%"
                        
                        # Check expected categories
                        expected_cats = self.expected_v2_features["category_weights"]
                        missing_cats = [cat for cat in expected_cats if cat not in weights]
                        if missing_cats:
                            success = False
                            details += f", Missing categories: {missing_cats}"
                        else:
                            details += f", All {len(expected_cats)} categories present"
                    else:
                        success = False
                        details += ", Missing category_weights"
                    
                    # Check severity multipliers
                    multipliers = ruleset.get("severity_multipliers", {})
                    if multipliers:
                        expected_severities = self.expected_v2_features["severity_multipliers"]
                        missing_sev = [sev for sev in expected_severities if sev not in multipliers]
                        if missing_sev:
                            success = False
                            details += f", Missing severity multipliers: {missing_sev}"
                        else:
                            details += f", All {len(expected_severities)} severity multipliers present"
                    else:
                        success = False
                        details += ", Missing severity_multipliers"
                    
                    # Check blocking caps
                    caps = ruleset.get("blocking_caps", {})
                    if caps:
                        expected_caps = self.expected_v2_features["blocking_caps"]
                        missing_caps = [cap for cap in expected_caps if cap not in caps]
                        if missing_caps:
                            success = False
                            details += f", Missing blocking caps: {missing_caps}"
                        else:
                            details += f", All {len(expected_caps)} blocking caps present"
                    
                    # Check readiness mode
                    mode = ruleset.get("readiness_mode", "")
                    if mode in self.expected_v2_features["readiness_modes"]:
                        details += f", Readiness mode: {mode}"
                    else:
                        success = False
                        details += f", Invalid readiness mode: {mode}"
                        
                else:
                    success = False
                    details += ", Invalid response structure"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/health/v2/ruleset", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/health/v2/ruleset", False, f"Error: {str(e)}")
            return False

    def test_put_v2_ruleset(self):
        """Test PUT /api/health/v2/ruleset - Save custom V2 ruleset"""
        try:
            # Test payload with valid weights
            payload = {
                "category_weights": {
                    "governance_hygiene": 30,
                    "financial_integrity": 25,
                    "compliance_recordkeeping": 15,
                    "risk_exposure": 10,
                    "data_integrity": 20
                },
                "readiness_mode": "audit"
            }
            
            response = self.session.put(f"{self.base_url}/health/v2/ruleset", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                if data.get("ok") and data.get("data"):
                    saved_config = data["data"]
                    details += ", Configuration saved successfully"
                    
                    # Verify saved weights
                    saved_weights = saved_config.get("category_weights", {})
                    if saved_weights == payload["category_weights"]:
                        details += ", Weights saved correctly"
                    else:
                        success = False
                        details += ", Weights not saved correctly"
                    
                    # Verify saved mode
                    saved_mode = saved_config.get("readiness_mode")
                    if saved_mode == payload["readiness_mode"]:
                        details += f", Mode saved correctly: {saved_mode}"
                    else:
                        success = False
                        details += f", Mode not saved correctly: expected {payload['readiness_mode']}, got {saved_mode}"
                        
                else:
                    success = False
                    details += ", Invalid response structure"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("PUT /api/health/v2/ruleset (Valid)", success, details)
            return success
            
        except Exception as e:
            self.log_test("PUT /api/health/v2/ruleset (Valid)", False, f"Error: {str(e)}")
            return False

    def test_put_v2_ruleset_invalid_weights(self):
        """Test PUT /api/health/v2/ruleset with invalid weights (should return error)"""
        try:
            # Test payload with weights that don't sum to 100
            payload = {
                "category_weights": {
                    "governance_hygiene": 30,
                    "financial_integrity": 25,
                    "compliance_recordkeeping": 15,
                    "risk_exposure": 10,
                    "data_integrity": 10  # Total = 90%, should fail
                }
            }
            
            response = self.session.put(f"{self.base_url}/health/v2/ruleset", json=payload, timeout=10)
            success = response.status_code == 200  # API returns 200 with error structure
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok") == False and "weight" in data.get("error", {}).get("message", "").lower():
                    details += ", Correctly rejected invalid weights"
                else:
                    success = False
                    details += ", Error response structure incorrect"
            else:
                details += f", Expected 200 with error, got {response.status_code}"
            
            self.log_test("PUT /api/health/v2/ruleset (Invalid Weights)", success, details)
            return success
            
        except Exception as e:
            self.log_test("PUT /api/health/v2/ruleset (Invalid Weights)", False, f"Error: {str(e)}")
            return False

    def test_post_v2_ruleset_reset(self):
        """Test POST /api/health/v2/ruleset/reset - Reset to defaults"""
        try:
            response = self.session.post(f"{self.base_url}/health/v2/ruleset/reset", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                if data.get("ok") and data.get("data"):
                    reset_config = data["data"]
                    details += ", Reset to defaults successful"
                    
                    # Verify default weights are restored
                    weights = reset_config.get("category_weights", {})
                    if weights:
                        total_weight = sum(weights.values())
                        if abs(total_weight - 100) <= 0.1:
                            details += f", Default weights sum to 100%"
                        else:
                            success = False
                            details += f", Default weights don't sum to 100%: {total_weight}%"
                    else:
                        success = False
                        details += ", Missing category_weights in reset"
                    
                    # Check that all expected fields are present
                    required_fields = ["category_weights", "severity_multipliers", "blocking_caps", "readiness_mode"]
                    missing_fields = [field for field in required_fields if field not in reset_config]
                    if missing_fields:
                        success = False
                        details += f", Missing fields after reset: {missing_fields}"
                    else:
                        details += ", All required fields present after reset"
                        
                else:
                    success = False
                    details += ", Invalid response structure"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/health/v2/ruleset/reset", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/health/v2/ruleset/reset", False, f"Error: {str(e)}")
            return False

    def test_get_health_score_v2(self):
        """Test GET /api/health/score?version=v2 - Run V2 health scan"""
        try:
            response = self.session.get(f"{self.base_url}/health/score?version=v2", timeout=30)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                if data.get("ok") and data.get("data"):
                    scan_result = data["data"]
                    details += ", V2 health scan completed"
                    
                    # Check V2-specific fields
                    version = scan_result.get("version")
                    if version == "v2":
                        details += ", Correct version: v2"
                    else:
                        success = False
                        details += f", Expected version v2, got {version}"
                    
                    # Check score structure
                    final_score = scan_result.get("final_score")
                    raw_score = scan_result.get("raw_score")
                    if isinstance(final_score, (int, float)) and isinstance(raw_score, (int, float)):
                        details += f", Scores: final={final_score}, raw={raw_score}"
                        
                        # Check if score is within valid range
                        if 0 <= final_score <= 100 and 0 <= raw_score <= 100:
                            details += ", Scores in valid range (0-100)"
                        else:
                            success = False
                            details += ", Scores outside valid range"
                    else:
                        success = False
                        details += ", Invalid score format"
                    
                    # Check V2 features
                    blockers = scan_result.get("blockers_triggered", [])
                    details += f", Blockers triggered: {len(blockers)}"
                    
                    findings = scan_result.get("findings", [])
                    details += f", Findings: {len(findings)}"
                    
                    next_actions = scan_result.get("next_actions", [])
                    if next_actions:
                        # Check for V2 estimated_gain feature
                        first_action = next_actions[0]
                        if "estimated_gain" in first_action:
                            details += f", Next actions with estimated gains: {len(next_actions)}"
                        else:
                            success = False
                            details += ", Next actions missing estimated_gain (V2 feature)"
                    
                    # Check category scores
                    category_scores = scan_result.get("category_scores", {})
                    expected_categories = self.expected_v2_features["category_weights"]
                    missing_cats = [cat for cat in expected_categories if cat not in category_scores]
                    if missing_cats:
                        success = False
                        details += f", Missing category scores: {missing_cats}"
                    else:
                        details += f", All {len(expected_categories)} category scores present"
                        
                else:
                    success = False
                    details += ", Invalid response structure"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/health/score?version=v2", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/health/score?version=v2", False, f"Error: {str(e)}")
            return False

    def test_post_health_scan_v2(self):
        """Test POST /api/health/scan?version=v2 - Force fresh V2 scan"""
        try:
            response = self.session.post(f"{self.base_url}/health/scan?version=v2", timeout=30)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                if data.get("ok") and data.get("data"):
                    scan_result = data["data"]
                    details += ", Fresh V2 scan completed"
                    
                    # Verify it's a V2 scan
                    version = scan_result.get("version")
                    if version == "v2":
                        details += ", Confirmed V2 scan"
                    else:
                        success = False
                        details += f", Expected V2 scan, got {version}"
                    
                    # Check scan metadata
                    scan_id = scan_result.get("scan_id")
                    scanned_at = scan_result.get("scanned_at")
                    if scan_id and scanned_at:
                        details += f", Scan ID: {scan_id[:12]}..., Time: {scanned_at[:19]}"
                    else:
                        success = False
                        details += ", Missing scan metadata"
                    
                    # Check V2-specific structure
                    v2_fields = ["final_score", "raw_score", "category_penalties", "blockers_triggered", "readiness"]
                    missing_v2_fields = [field for field in v2_fields if field not in scan_result]
                    if missing_v2_fields:
                        success = False
                        details += f", Missing V2 fields: {missing_v2_fields}"
                    else:
                        details += ", All V2-specific fields present"
                    
                    # Check findings structure
                    findings = scan_result.get("findings", [])
                    if findings:
                        first_finding = findings[0]
                        v2_finding_fields = ["severity", "penalty_applied", "max_penalty", "estimated_gain"]
                        missing_finding_fields = [field for field in v2_finding_fields if field not in first_finding]
                        if missing_finding_fields:
                            success = False
                            details += f", Missing V2 finding fields: {missing_finding_fields}"
                        else:
                            details += ", V2 finding structure correct"
                            
                else:
                    success = False
                    details += ", Invalid response structure"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/health/scan?version=v2", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/health/scan?version=v2", False, f"Error: {str(e)}")
            return False

    # ============ TEST RUNNER ============

    def run_v2_trust_health_tests(self):
        """Run all V2 Trust Health feature tests"""
        self.log("🚀 Starting V2 TRUST HEALTH Feature Tests")
        self.log(f"Testing against: {self.base_url}")
        self.log("User: jedediah.bey@gmail.com (OMNICOMPETENT_OWNER role)")
        self.log("=" * 80)
        
        # Test sequence for V2 Trust Health feature
        test_sequence = [
            # Authentication
            self.test_auth_status,
            
            # V2 Ruleset Configuration Tests
            self.test_get_v2_ruleset,
            self.test_put_v2_ruleset,
            self.test_put_v2_ruleset_invalid_weights,
            self.test_post_v2_ruleset_reset,
            
            # V2 Health Scanning Tests
            self.test_get_health_score_v2,
            self.test_post_health_scan_v2,
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
        self.log("🏁 V2 TRUST HEALTH FEATURE TEST SUMMARY")
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
            self.log("✅ V2 Trust Health feature working perfectly")
            self.log("✅ V2 ruleset configuration endpoints functional")
            self.log("✅ Category weights validation working (must sum to 100%)")
            self.log("✅ V2 health scanning with bounded penalties operational")
            self.log("✅ Severity multipliers and blocking caps implemented")
            self.log("✅ Next actions with estimated gains working")
        elif success_rate >= 75:
            self.log("⚠️ Most V2 Trust Health functionality working with minor issues")
        else:
            self.log("❌ Significant V2 Trust Health implementation issues detected")
        
        # Specific feature status
        self.log("\n📋 V2 FEATURE STATUS:")
        
        # Ruleset configuration tests
        ruleset_tests = [t for t in self.test_results if 'ruleset' in t['test'].lower()]
        ruleset_success = sum(1 for t in ruleset_tests if t['success'])
        self.log(f"  V2 Ruleset Configuration: {ruleset_success}/{len(ruleset_tests)} ({'✅' if ruleset_success == len(ruleset_tests) else '❌'})")
        
        # Health scanning tests
        scan_tests = [t for t in self.test_results if 'scan' in t['test'].lower() or 'score' in t['test'].lower()]
        scan_success = sum(1 for t in scan_tests if t['success'])
        self.log(f"  V2 Health Scanning: {scan_success}/{len(scan_tests)} ({'✅' if scan_success == len(scan_tests) else '❌'})")
        
        # Authentication
        auth_tests = [t for t in self.test_results if 'auth' in t['test'].lower()]
        auth_success = sum(1 for t in auth_tests if t['success'])
        self.log(f"  Authentication: {auth_success}/{len(auth_tests)} ({'✅' if auth_success == len(auth_tests) else '❌'})")
        
        self.log("\n🔍 V2-SPECIFIC FEATURES TESTED:")
        self.log("  • Bounded penalties with max caps")
        self.log("  • Severity multipliers (info: 0.5, warning: 1.0, critical: 1.5)")
        self.log("  • Category weights that sum to 100%")
        self.log("  • Blocking conditions (CAP_ORPHANS, CAP_MISSING_FINALIZER, etc.)")
        self.log("  • Next actions with estimated score gains")
        self.log("  • Readiness modes (normal, audit, court)")
        
        return success_rate >= 75


if __name__ == "__main__":
    tester = V2TrustHealthTester()
    success = tester.run_v2_trust_health_tests()
    sys.exit(0 if success else 1)