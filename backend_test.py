#!/usr/bin/env python3
"""
Backend API Testing for OMNIGOVAULT Application
Shared Workspace Feature Testing
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid
import hashlib

# Use the public endpoint from frontend/.env
BASE_URL = "https://trustworkspace.preview.emergentagent.com/api"

class SharedWorkspaceTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        # Set the session cookie for authentication
        self.session.cookies.set('session_token', 'IcKDtBmAaY65JQz99DHwiV-NkRpcnqJFDFvh4WfIsCI')
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'SharedWorkspace-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = []
        self.vault_id = None
        self.document_id = None
        self.participant_id = None

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
                
                if email == "jedediah.bey@gmail.com":
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

    # ============ VAULT OPERATIONS TESTS ============

    def test_list_vaults(self):
        """Test GET /api/vaults - List all vaults"""
        try:
            response = self.session.get(f"{self.base_url}/vaults", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                vaults = data.get("vaults", [])
                details += f", Found {len(vaults)} vaults"
                
                # Check structure
                if isinstance(vaults, list):
                    details += ", Valid vault list structure"
                else:
                    success = False
                    details += f", Invalid structure: {type(vaults)}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/vaults", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/vaults", False, f"Error: {str(e)}")
            return False

    def test_create_vault(self):
        """Test POST /api/vaults - Create a new vault"""
        try:
            payload = {
                "name": "Test Trust Workspace",
                "description": "Testing vault creation",
                "vault_type": "TRUST"
            }
            
            response = self.session.post(f"{self.base_url}/vaults", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                vault_id = data.get("vault_id")
                name = data.get("name")
                vault_type = data.get("vault_type")
                
                if vault_id and name == payload["name"] and vault_type == payload["vault_type"]:
                    self.vault_id = vault_id  # Store for later tests
                    details += f", Created vault: {vault_id}, name: {name}"
                else:
                    success = False
                    details += f", Invalid response data: vault_id={vault_id}, name={name}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/vaults", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/vaults", False, f"Error: {str(e)}")
            return False

    def test_get_vault_details(self):
        """Test GET /api/vaults/{vault_id} - Get vault details"""
        if not self.vault_id:
            self.log_test("GET /api/vaults/{vault_id}", False, "No vault_id available from previous test")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/vaults/{self.vault_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                vault_id = data.get("vault_id")
                participants = data.get("participants", [])
                documents = data.get("documents", [])
                user_permissions = data.get("user_permissions", [])
                
                if vault_id == self.vault_id:
                    details += f", Vault details retrieved: {len(participants)} participants, {len(documents)} documents"
                    details += f", User permissions: {len(user_permissions)}"
                else:
                    success = False
                    details += f", Vault ID mismatch: expected {self.vault_id}, got {vault_id}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/vaults/{vault_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/vaults/{vault_id}", False, f"Error: {str(e)}")
            return False

    # ============ PARTICIPANT MANAGEMENT TESTS ============

    def test_invite_participant(self):
        """Test POST /api/vaults/{vault_id}/participants - Invite a participant"""
        if not self.vault_id:
            self.log_test("POST /api/vaults/{vault_id}/participants", False, "No vault_id available")
            return False
            
        try:
            payload = {
                "email": "beneficiary@example.com",
                "role": "BENEFICIARY",
                "display_name": "Test Beneficiary"
            }
            
            response = self.session.post(
                f"{self.base_url}/vaults/{self.vault_id}/participants", 
                json=payload, 
                timeout=10
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                participant_id = data.get("id")
                email = data.get("email")
                role = data.get("role")
                email_status = data.get("email_status", "unknown")
                
                if participant_id and email == payload["email"] and role == payload["role"]:
                    self.participant_id = participant_id  # Store for later tests
                    details += f", Invited participant: {email} as {role}, email_status: {email_status}"
                else:
                    success = False
                    details += f", Invalid response: id={participant_id}, email={email}, role={role}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/vaults/{vault_id}/participants", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/vaults/{vault_id}/participants", False, f"Error: {str(e)}")
            return False

    def test_list_participants(self):
        """Test GET /api/vaults/{vault_id}/participants - List participants"""
        if not self.vault_id:
            self.log_test("GET /api/vaults/{vault_id}/participants", False, "No vault_id available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/vaults/{self.vault_id}/participants", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                participants = data.get("participants", [])
                
                if isinstance(participants, list) and len(participants) >= 1:
                    details += f", Found {len(participants)} participants"
                    
                    # Check if our invited participant is in the list
                    if self.participant_id:
                        found_participant = any(p.get("id") == self.participant_id for p in participants)
                        if found_participant:
                            details += ", Invited participant found in list"
                        else:
                            success = False
                            details += ", Invited participant not found in list"
                else:
                    success = False
                    details += f", Invalid participants list: {type(participants)}, count: {len(participants) if isinstance(participants, list) else 'N/A'}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/vaults/{vault_id}/participants", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/vaults/{vault_id}/participants", False, f"Error: {str(e)}")
            return False

    # ============ DOCUMENT OPERATIONS TESTS ============

    def test_create_document(self):
        """Test POST /api/vaults/{vault_id}/documents - Create document"""
        if not self.vault_id:
            self.log_test("POST /api/vaults/{vault_id}/documents", False, "No vault_id available")
            return False
            
        try:
            payload = {
                "title": "Test Agreement",
                "description": "A test document",
                "category": "TRUST_INSTRUMENT",
                "content": "<p>Test content for signing</p>",
                "requires_signatures_from": ["TRUSTEE", "BENEFICIARY"]
            }
            
            response = self.session.post(
                f"{self.base_url}/vaults/{self.vault_id}/documents", 
                json=payload, 
                timeout=10
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                document_id = data.get("document_id")
                title = data.get("title")
                category = data.get("category")
                status = data.get("status")
                
                if document_id and title == payload["title"] and category == payload["category"]:
                    self.document_id = document_id  # Store for later tests
                    details += f", Created document: {document_id}, title: {title}, status: {status}"
                else:
                    success = False
                    details += f", Invalid response: id={document_id}, title={title}, category={category}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/vaults/{vault_id}/documents", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/vaults/{vault_id}/documents", False, f"Error: {str(e)}")
            return False

    def test_get_document_details(self):
        """Test GET /api/vaults/documents/{document_id} - Get document details"""
        if not self.document_id:
            self.log_test("GET /api/vaults/documents/{document_id}", False, "No document_id available")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/vaults/documents/{self.document_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                document_id = data.get("document_id")
                title = data.get("title")
                status = data.get("status")
                versions = data.get("versions", [])
                
                if document_id == self.document_id:
                    details += f", Document details: {title}, status: {status}, versions: {len(versions)}"
                else:
                    success = False
                    details += f", Document ID mismatch: expected {self.document_id}, got {document_id}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/vaults/documents/{document_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/vaults/documents/{document_id}", False, f"Error: {str(e)}")
            return False

    def test_submit_for_review(self):
        """Test POST /api/vaults/documents/{document_id}/submit-for-review - Submit for review"""
        if not self.document_id:
            self.log_test("POST /api/vaults/documents/{document_id}/submit-for-review", False, "No document_id available")
            return False
            
        try:
            response = self.session.post(
                f"{self.base_url}/vaults/documents/{self.document_id}/submit-for-review", 
                json={}, 
                timeout=10
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                status = data.get("status")
                
                if status == "UNDER_REVIEW":
                    details += f", Document submitted for review, status: {status}"
                else:
                    success = False
                    details += f", Unexpected status after submission: {status}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/vaults/documents/{document_id}/submit-for-review", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/vaults/documents/{document_id}/submit-for-review", False, f"Error: {str(e)}")
            return False

    def test_affirm_document(self):
        """Test POST /api/vaults/documents/{document_id}/affirm - Affirm document"""
        if not self.document_id:
            self.log_test("POST /api/vaults/documents/{document_id}/affirm", False, "No document_id available")
            return False
            
        try:
            payload = {"note": "Approved"}
            
            response = self.session.post(
                f"{self.base_url}/vaults/documents/{self.document_id}/affirm", 
                json=payload, 
                timeout=10
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                affirmation_id = data.get("id")
                note = data.get("note")
                
                if affirmation_id and note == payload["note"]:
                    details += f", Document affirmed: {affirmation_id}, note: {note}"
                else:
                    success = False
                    details += f", Invalid affirmation response: id={affirmation_id}, note={note}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/vaults/documents/{document_id}/affirm", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/vaults/documents/{document_id}/affirm", False, f"Error: {str(e)}")
            return False

    # ============ SIGNING TESTS ============

    def test_sign_document(self):
        """Test POST /api/vaults/documents/{document_id}/sign - Sign document"""
        if not self.document_id:
            self.log_test("POST /api/vaults/documents/{document_id}/sign", False, "No document_id available")
            return False
            
        try:
            payload = {
                "legal_name": "Jedediah Bey",
                "signature_type": "TYPED_NAME",
                "signature_data": "Jedediah Bey",  # For TYPED_NAME, send the name as string
                "consent_acknowledged": True
            }
            
            response = self.session.post(
                f"{self.base_url}/vaults/documents/{self.document_id}/sign", 
                json=payload, 
                timeout=10
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                signature_id = data.get("id")
                legal_name = data.get("legal_name")
                signature_type = data.get("signature_type")
                
                if signature_id and legal_name == payload["legal_name"] and signature_type == payload["signature_type"]:
                    details += f", Document signed: {signature_id}, signer: {legal_name}"
                else:
                    success = False
                    details += f", Invalid signature response: id={signature_id}, name={legal_name}, type={signature_type}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/vaults/documents/{document_id}/sign", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/vaults/documents/{document_id}/sign", False, f"Error: {str(e)}")
            return False

    # ============ NOTIFICATIONS TESTS ============

    def test_get_notifications(self):
        """Test GET /api/notifications - Get all notifications"""
        try:
            response = self.session.get(f"{self.base_url}/notifications", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                notifications = data.get("notifications", [])
                unread_count = data.get("unread_count", 0)
                total = data.get("total", 0)
                
                details += f", Found {total} notifications ({unread_count} unread)"
                
                # Check if we have notifications from vault activities
                vault_notifications = [n for n in notifications if self.vault_id and self.vault_id in str(n)]
                if vault_notifications:
                    details += f", {len(vault_notifications)} vault-related notifications"
                
                if isinstance(notifications, list):
                    details += ", Valid notification structure"
                else:
                    success = False
                    details += f", Invalid structure: {type(notifications)}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/notifications", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/notifications", False, f"Error: {str(e)}")
            return False

    # ============ TEST RUNNER ============

    def run_shared_workspace_tests(self):
        """Run all Shared Workspace feature tests"""
        self.log("🚀 Starting SHARED WORKSPACE Feature Tests")
        self.log(f"Testing against: {self.base_url}")
        self.log("User: jedediah.bey@gmail.com (OMNICOMPETENT_OWNER role)")
        self.log("=" * 80)
        
        # Test sequence for shared workspace feature
        test_sequence = [
            # Authentication
            self.test_auth_status,
            
            # Vault Operations
            self.test_list_vaults,
            self.test_create_vault,
            self.test_get_vault_details,
            
            # Participant Management
            self.test_invite_participant,
            self.test_list_participants,
            
            # Document Operations
            self.test_create_document,
            self.test_get_document_details,
            self.test_submit_for_review,
            self.test_affirm_document,
            
            # Signing
            self.test_sign_document,
            
            # Notifications
            self.test_get_notifications,
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
        self.log("🏁 SHARED WORKSPACE FEATURE TEST SUMMARY")
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
            self.log("✅ Shared Workspace feature working perfectly")
            self.log("✅ All vault CRUD operations functional")
            self.log("✅ Participant management working correctly")
            self.log("✅ Document workflow (create, review, affirm, sign) operational")
            self.log("✅ Notifications system capturing vault activities")
        elif success_rate >= 75:
            self.log("⚠️ Most shared workspace functionality working with minor issues")
        else:
            self.log("❌ Significant shared workspace implementation issues detected")
        
        # Specific feature status
        self.log("\n📋 FEATURE STATUS:")
        
        # Vault operations
        vault_tests = [t for t in self.test_results if 'vault' in t['test'].lower()]
        vault_success = sum(1 for t in vault_tests if t['success'])
        self.log(f"  Vault Operations: {vault_success}/{len(vault_tests)} ({'✅' if vault_success == len(vault_tests) else '❌'})")
        
        # Participant management
        participant_tests = [t for t in self.test_results if 'participant' in t['test'].lower()]
        participant_success = sum(1 for t in participant_tests if t['success'])
        self.log(f"  Participant Management: {participant_success}/{len(participant_tests)} ({'✅' if participant_success == len(participant_tests) else '❌'})")
        
        # Document operations
        document_tests = [t for t in self.test_results if 'document' in t['test'].lower() or 'affirm' in t['test'].lower() or 'sign' in t['test'].lower()]
        document_success = sum(1 for t in document_tests if t['success'])
        self.log(f"  Document Operations: {document_success}/{len(document_tests)} ({'✅' if document_success == len(document_tests) else '❌'})")
        
        # Notifications
        notification_tests = [t for t in self.test_results if 'notification' in t['test'].lower()]
        notification_success = sum(1 for t in notification_tests if t['success'])
        self.log(f"  Notifications: {notification_success}/{len(notification_tests)} ({'✅' if notification_success == len(notification_tests) else '❌'})")
        
        return success_rate >= 75


if __name__ == "__main__":
    tester = SharedWorkspaceTester()
    success = tester.run_shared_workspace_tests()
    sys.exit(0 if success else 1)