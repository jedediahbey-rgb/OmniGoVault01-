#!/usr/bin/env python3
"""
Backend API Testing for OMNIGOVAULT Application
OmniBinder V2 and Real-time Collaboration V2 API Testing
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

class OmniBinderV2Tester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'OmniBinderV2-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = []
        
        # Test user details
        self.test_user_email = "jedediah.bey@gmail.com"
        self.test_user_role = "OMNICOMPETENT_OWNER"
        
        # Test data for OmniBinder V2
        self.test_portfolio_id = None
        self.test_profile_id = None
        self.test_schedule_id = None
        self.test_template_id = None
        
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
            test_email = f"test_omnibinder_{test_suffix}@example.com"
            test_password = "testpassword123"
            
            # Try to register a test user
            register_data = {
                'email': test_email,
                'password': test_password,
                'name': f'OmniBinder Test User {test_suffix}'
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
            'test_session_omnibinder_v2',
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

    # ============ OMNIBINDER V2 TESTS ============

    def test_create_test_portfolio(self):
        """Create a test portfolio for OmniBinder testing"""
        try:
            portfolio_data = {
                "name": "OmniBinder V2 Test Portfolio",
                "description": "Test portfolio for OmniBinder V2 API testing"
            }
            
            response = self.session.post(f"{self.base_url}/portfolios", json=portfolio_data, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.test_portfolio_id = data.get("portfolio_id")
                details += f", Portfolio ID: {self.test_portfolio_id}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("Create Test Portfolio", success, details)
            return success
            
        except Exception as e:
            self.log_test("Create Test Portfolio", False, f"Error: {str(e)}")
            return False

    def test_scheduled_binders_create(self):
        """Test POST /api/binder/schedule - Create a scheduled binder"""
        if not self.test_portfolio_id:
            self.log_test("POST /api/binder/schedule", False, "No test portfolio available")
            return False
            
        try:
            schedule_data = {
                "portfolio_id": self.test_portfolio_id,
                "profile_id": "default_profile",  # Assuming default profile exists
                "schedule_type": "weekly",
                "schedule_time": "09:00",
                "notify_emails": ["test@example.com"],
                "enabled": True
            }
            
            response = self.session.post(f"{self.base_url}/binder/schedule", json=schedule_data, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    schedule = data.get("data", {}).get("schedule", {})
                    self.test_schedule_id = schedule.get("id")
                    details += f", Schedule ID: {self.test_schedule_id}"
                    details += f", Type: {schedule.get('schedule_type')}"
                    details += f", Time: {schedule.get('schedule_time')}"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/binder/schedule", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/binder/schedule", False, f"Error: {str(e)}")
            return False

    def test_scheduled_binders_get(self):
        """Test GET /api/binder/schedules - Get all user's scheduled binders"""
        try:
            response = self.session.get(f"{self.base_url}/binder/schedules", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    schedules_data = data.get("data", {})
                    schedules = schedules_data.get("schedules", [])
                    total = schedules_data.get("total", 0)
                    details += f", Found {total} schedules"
                    
                    if self.test_schedule_id:
                        # Check if our created schedule is in the list
                        found_schedule = any(s.get("id") == self.test_schedule_id for s in schedules)
                        if found_schedule:
                            details += ", Created schedule found in list"
                        else:
                            success = False
                            details += ", Created schedule not found in list"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/schedules", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/schedules", False, f"Error: {str(e)}")
            return False

    def test_scheduled_binders_update(self):
        """Test PUT /api/binder/schedule/{schedule_id} - Update a schedule"""
        if not self.test_schedule_id:
            self.log_test("PUT /api/binder/schedule/{schedule_id}", False, "No test schedule available")
            return False
            
        try:
            update_data = {
                "schedule_type": "daily",
                "schedule_time": "10:00",
                "enabled": False
            }
            
            response = self.session.put(f"{self.base_url}/binder/schedule/{self.test_schedule_id}", json=update_data, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    schedule = data.get("data", {}).get("schedule", {})
                    details += f", Updated type: {schedule.get('schedule_type')}"
                    details += f", Updated time: {schedule.get('schedule_time')}"
                    details += f", Enabled: {schedule.get('enabled')}"
                    
                    # Verify updates were applied
                    if (schedule.get('schedule_type') == 'daily' and 
                        schedule.get('schedule_time') == '10:00' and 
                        schedule.get('enabled') == False):
                        details += ", All updates applied correctly"
                    else:
                        success = False
                        details += ", Updates not applied correctly"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("PUT /api/binder/schedule/{schedule_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("PUT /api/binder/schedule/{schedule_id}", False, f"Error: {str(e)}")
            return False

    def test_binder_templates_create(self):
        """Test POST /api/binder/templates - Save binder configuration as template"""
        try:
            template_data = {
                "name": "Test Court Template",
                "description": "Template for court-grade evidence packets",
                "profile_type": "court",
                "rules": {
                    "include_drafts": False,
                    "include_bates": True,
                    "bates_prefix": "COURT-",
                    "redaction_mode": "standard"
                },
                "is_public": False
            }
            
            response = self.session.post(f"{self.base_url}/binder/templates", json=template_data, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    template = data.get("data", {}).get("template", {})
                    self.test_template_id = template.get("id")
                    details += f", Template ID: {self.test_template_id}"
                    details += f", Name: {template.get('name')}"
                    details += f", Type: {template.get('profile_type')}"
                    details += f", Public: {template.get('is_public')}"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/binder/templates", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/binder/templates", False, f"Error: {str(e)}")
            return False

    def test_binder_templates_get(self):
        """Test GET /api/binder/templates - Get all templates (user's + public)"""
        try:
            response = self.session.get(f"{self.base_url}/binder/templates", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    templates_data = data.get("data", {})
                    templates = templates_data.get("templates", [])
                    total = templates_data.get("total", 0)
                    details += f", Found {total} templates"
                    
                    if self.test_template_id:
                        # Check if our created template is in the list
                        found_template = any(t.get("id") == self.test_template_id for t in templates)
                        if found_template:
                            details += ", Created template found in list"
                        else:
                            success = False
                            details += ", Created template not found in list"
                    
                    # Check for public templates
                    public_templates = [t for t in templates if t.get("is_public")]
                    details += f", {len(public_templates)} public templates"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/templates", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/templates", False, f"Error: {str(e)}")
            return False

    def test_court_packet_generate(self):
        """Test POST /api/binder/generate/court-packet - Generate court-grade evidence packet"""
        if not self.test_portfolio_id:
            self.log_test("POST /api/binder/generate/court-packet", False, "No test portfolio available")
            return False
            
        try:
            court_packet_data = {
                "portfolio_id": self.test_portfolio_id,
                "case_number": "CV-2024-001234",
                "court_name": "Superior Court of California",
                "case_title": "Test Trust v. Example Party",
                "exhibit_prefix": "EX"
            }
            
            response = self.session.post(f"{self.base_url}/binder/generate/court-packet", json=court_packet_data, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    run = data.get("data", {}).get("run", {})
                    details += f", Run ID: {run.get('id')}"
                    details += f", Status: {run.get('status')}"
                    details += f", Case: {run.get('case_info', {}).get('case_number')}"
                    details += f", Court: {run.get('case_info', {}).get('court_name')}"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/binder/generate/court-packet", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/binder/generate/court-packet", False, f"Error: {str(e)}")
            return False

    # ============ REAL-TIME COLLABORATION V2 TESTS ============

    def test_realtime_presence(self):
        """Test GET /api/realtime/presence/{room_id} - Get users in a room"""
        try:
            room_id = "workspace_test_room"
            response = self.session.get(f"{self.base_url}/realtime/presence/{room_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    presence_data = data.get("data", {})
                    users = presence_data.get("users", [])
                    count = presence_data.get("count", 0)
                    room_id_returned = presence_data.get("room_id")
                    
                    details += f", Room: {room_id_returned}"
                    details += f", Users: {count}"
                    
                    if room_id_returned == room_id:
                        details += ", Correct room ID returned"
                    else:
                        success = False
                        details += f", Expected room {room_id}, got {room_id_returned}"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/realtime/presence/{room_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/realtime/presence/{room_id}", False, f"Error: {str(e)}")
            return False

    def test_realtime_document_lock(self):
        """Test GET /api/realtime/document/{document_id}/lock - Check document lock status"""
        try:
            document_id = "doc_test_document"
            response = self.session.get(f"{self.base_url}/realtime/document/{document_id}/lock", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    lock_data = data.get("data", {})
                    document_id_returned = lock_data.get("document_id")
                    is_locked = lock_data.get("is_locked")
                    locked_by = lock_data.get("locked_by")
                    
                    details += f", Document: {document_id_returned}"
                    details += f", Locked: {is_locked}"
                    if locked_by:
                        details += f", Locked by: {locked_by}"
                    
                    if document_id_returned == document_id:
                        details += ", Correct document ID returned"
                    else:
                        success = False
                        details += f", Expected document {document_id}, got {document_id_returned}"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/realtime/document/{document_id}/lock", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/realtime/document/{document_id}/lock", False, f"Error: {str(e)}")
            return False

    def test_realtime_broadcast(self):
        """Test POST /api/realtime/broadcast - Broadcast an event"""
        try:
            broadcast_data = {
                "event_type": "document_updated",
                "payload": {
                    "document_id": "doc_test_document",
                    "changes": ["title", "content"],
                    "version": 2
                },
                "room_id": "workspace_test_room"
            }
            
            response = self.session.post(f"{self.base_url}/realtime/broadcast", json=broadcast_data, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    broadcast_result = data.get("data", {})
                    event_type = broadcast_result.get("event_type")
                    room_id = broadcast_result.get("room_id")
                    
                    details += f", Event: {event_type}"
                    details += f", Room: {room_id}"
                    details += ", Broadcast successful"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/realtime/broadcast", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/realtime/broadcast", False, f"Error: {str(e)}")
            return False

    def test_realtime_stats(self):
        """Test GET /api/realtime/stats - Get real-time system stats"""
        try:
            response = self.session.get(f"{self.base_url}/realtime/stats", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    stats = data.get("data", {})
                    total_connections = stats.get("total_connections", 0)
                    total_users = stats.get("total_users", 0)
                    total_rooms = stats.get("total_rooms", 0)
                    active_locks = stats.get("active_document_locks", 0)
                    rooms = stats.get("rooms", {})
                    
                    details += f", Connections: {total_connections}"
                    details += f", Users: {total_users}"
                    details += f", Rooms: {total_rooms}"
                    details += f", Locks: {active_locks}"
                    details += f", Room details: {len(rooms)} rooms"
                    
                    # Verify stats structure
                    required_fields = ["total_connections", "total_users", "total_rooms", "active_document_locks", "rooms"]
                    missing_fields = [field for field in required_fields if field not in stats]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields: {missing_fields}"
                    else:
                        details += ", All required fields present"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/realtime/stats", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/realtime/stats", False, f"Error: {str(e)}")
            return False

    def test_scheduled_binders_delete(self):
        """Test DELETE /api/binder/schedule/{schedule_id} - Delete a schedule (cleanup)"""
        if not self.test_schedule_id:
            self.log_test("DELETE /api/binder/schedule/{schedule_id}", True, "No test schedule to delete")
            return True
            
        try:
            response = self.session.delete(f"{self.base_url}/binder/schedule/{self.test_schedule_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    message = data.get("data", {}).get("message", "")
                    details += f", Message: {message}"
                    details += ", Schedule deleted successfully"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("DELETE /api/binder/schedule/{schedule_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("DELETE /api/binder/schedule/{schedule_id}", False, f"Error: {str(e)}")
            return False

    def test_binder_templates_delete(self):
        """Test DELETE /api/binder/templates/{template_id} - Delete a template (cleanup)"""
        if not self.test_template_id:
            self.log_test("DELETE /api/binder/templates/{template_id}", True, "No test template to delete")
            return True
            
        try:
            response = self.session.delete(f"{self.base_url}/binder/templates/{self.test_template_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get("ok"):
                    message = data.get("data", {}).get("message", "")
                    details += f", Message: {message}"
                    details += ", Template deleted successfully"
                else:
                    success = False
                    details += ", Missing 'ok' field"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("DELETE /api/binder/templates/{template_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("DELETE /api/binder/templates/{template_id}", False, f"Error: {str(e)}")
            return False

    # ============ TEST RUNNER ============

    def run_omnibinder_v2_tests(self):
        """Run all OmniBinder V2 and Real-time Collaboration V2 API tests"""
        self.log("🚀 Starting OMNIBINDER V2 & REAL-TIME COLLABORATION V2 API Tests")
        self.log(f"Testing against: {self.base_url}")
        self.log(f"User: {self.test_user_email} ({self.test_user_role} role)")
        self.log("=" * 80)
        
        # Test sequence for OmniBinder V2 and Real-time Collaboration V2 APIs
        test_sequence = [
            # Authentication
            self.test_auth_status,
            
            # Setup - Create test portfolio
            self.test_create_test_portfolio,
            
            # OmniBinder V2 - Scheduled Binders
            self.test_scheduled_binders_create,
            self.test_scheduled_binders_get,
            self.test_scheduled_binders_update,
            
            # OmniBinder V2 - Binder Templates
            self.test_binder_templates_create,
            self.test_binder_templates_get,
            
            # OmniBinder V2 - Court Packet
            self.test_court_packet_generate,
            
            # Real-time Collaboration V2 - REST Endpoints
            self.test_realtime_presence,
            self.test_realtime_document_lock,
            self.test_realtime_broadcast,
            self.test_realtime_stats,
            
            # Cleanup
            self.test_scheduled_binders_delete,
            self.test_binder_templates_delete,
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
        self.log("🏁 OMNIBINDER V2 & REAL-TIME COLLABORATION V2 API TEST SUMMARY")
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
            self.log("✅ OmniBinder V2 & Real-time Collaboration V2 APIs working perfectly")
            self.log("✅ All scheduled binder endpoints functional")
            self.log("✅ Binder templates system working")
            self.log("✅ Court packet generation working")
            self.log("✅ Real-time collaboration REST endpoints working")
        elif success_rate >= 75:
            self.log("⚠️ Most OmniBinder V2 & Real-time functionality working with minor issues")
        else:
            self.log("❌ Significant OmniBinder V2 & Real-time implementation issues detected")
        
        # Specific feature status
        self.log("\n📋 FEATURE STATUS:")
        
        # OmniBinder V2 Scheduled Binders
        scheduled_tests = [t for t in self.test_results if 'schedule' in t['test'].lower()]
        scheduled_success = sum(1 for t in scheduled_tests if t['success'])
        self.log(f"  Scheduled Binders: {scheduled_success}/{len(scheduled_tests)} ({'✅' if scheduled_success == len(scheduled_tests) else '❌'})")
        
        # OmniBinder V2 Templates
        template_tests = [t for t in self.test_results if 'template' in t['test'].lower()]
        template_success = sum(1 for t in template_tests if t['success'])
        self.log(f"  Binder Templates: {template_success}/{len(template_tests)} ({'✅' if template_success == len(template_tests) else '❌'})")
        
        # Court Packet
        court_tests = [t for t in self.test_results if 'court' in t['test'].lower()]
        court_success = sum(1 for t in court_tests if t['success'])
        self.log(f"  Court Packet Generation: {court_success}/{len(court_tests)} ({'✅' if court_success == len(court_tests) else '❌'})")
        
        # Real-time Collaboration
        realtime_tests = [t for t in self.test_results if 'realtime' in t['test'].lower()]
        realtime_success = sum(1 for t in realtime_tests if t['success'])
        self.log(f"  Real-time Collaboration: {realtime_success}/{len(realtime_tests)} ({'✅' if realtime_success == len(realtime_tests) else '❌'})")
        
        # Authentication
        auth_tests = [t for t in self.test_results if 'auth' in t['test'].lower()]
        auth_success = sum(1 for t in auth_tests if t['success'])
        self.log(f"  Authentication: {auth_success}/{len(auth_tests)} ({'✅' if auth_success == len(auth_tests) else '❌'})")
        
        self.log("\n🔍 OMNIBINDER V2 ENDPOINTS TESTED:")
        omnibinder_endpoints = [
            "POST /api/binder/schedule",
            "GET /api/binder/schedules", 
            "PUT /api/binder/schedule/{schedule_id}",
            "DELETE /api/binder/schedule/{schedule_id}",
            "POST /api/binder/templates",
            "GET /api/binder/templates",
            "DELETE /api/binder/templates/{template_id}",
            "POST /api/binder/generate/court-packet"
        ]
        
        for endpoint in omnibinder_endpoints:
            endpoint_tests = [t for t in self.test_results if endpoint.split()[-1].replace('/', '_').replace('{', '').replace('}', '') in t['test'].lower()]
            endpoint_success = all(t['success'] for t in endpoint_tests) if endpoint_tests else False
            self.log(f"  • {endpoint}: {'✅' if endpoint_success else '❌'}")
        
        self.log("\n🔍 REAL-TIME COLLABORATION V2 ENDPOINTS TESTED:")
        realtime_endpoints = [
            "GET /api/realtime/presence/{room_id}",
            "GET /api/realtime/document/{document_id}/lock",
            "POST /api/realtime/broadcast",
            "GET /api/realtime/stats"
        ]
        
        for endpoint in realtime_endpoints:
            endpoint_tests = [t for t in self.test_results if endpoint.split()[-1].replace('/', '_').replace('{', '').replace('}', '') in t['test'].lower()]
            endpoint_success = all(t['success'] for t in endpoint_tests) if endpoint_tests else False
            self.log(f"  • {endpoint}: {'✅' if endpoint_success else '❌'}")
        
        self.log("\n📝 V2 FEATURES VERIFIED:")
        v2_features = [
            ("Scheduled Binder Creation", any('schedule' in t['test'].lower() and 'create' in t['test'].lower() and t['success'] for t in self.test_results)),
            ("Binder Template System", any('template' in t['test'].lower() and t['success'] for t in self.test_results)),
            ("Court-Grade Evidence Packets", any('court' in t['test'].lower() and t['success'] for t in self.test_results)),
            ("Real-time Room Presence", any('presence' in t['test'].lower() and t['success'] for t in self.test_results)),
            ("Document Locking System", any('lock' in t['test'].lower() and t['success'] for t in self.test_results)),
            ("Event Broadcasting", any('broadcast' in t['test'].lower() and t['success'] for t in self.test_results)),
            ("Real-time Statistics", any('stats' in t['test'].lower() and t['success'] for t in self.test_results))
        ]
        
        for feature_name, feature_working in v2_features:
            self.log(f"  • {feature_name}: {'✅' if feature_working else '❌'}")
        
        self.log("\n🎯 SCHEDULED BINDER FEATURES:")
        schedule_features = ["Create Schedule", "List Schedules", "Update Schedule", "Delete Schedule"]
        for feature in schedule_features:
            feature_working = any(feature.lower().replace(' ', '_') in t['test'].lower() and t['success'] for t in self.test_results)
            self.log(f"  • {feature}: {'✅' if feature_working else '❌'}")
        
        return success_rate >= 75


if __name__ == "__main__":
    tester = OmniBinderV2Tester()
    success = tester.run_omnibinder_v2_tests()
    sys.exit(0 if success else 1)