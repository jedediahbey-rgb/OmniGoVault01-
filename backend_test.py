#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timezone, timedelta
import uuid
import os

# Get backend URL from frontend .env
BACKEND_URL = "https://equity-trust-hub.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class EquityTrustAPITester:
    def __init__(self):
        self.session_token = None
        self.user_id = None
        self.test_portfolio_id = None
        self.test_trust_profile_id = None
        self.test_asset_id = None
        self.test_notice_id = None
        self.test_document_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            self.failed_tests.append({"name": name, "details": details})
            print(f"❌ {name} - {details}")
        
    def test_health_check(self):
        """Test health endpoint"""
        try:
            response = requests.get(f"{API_BASE}/health", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Response: {data}"
            self.log_test("Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            return False
    
    def test_root_endpoint(self):
        """Test root API endpoint"""
        try:
            response = requests.get(f"{API_BASE}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'N/A')}"
            self.log_test("Root Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_knowledge_topics(self):
        """Test knowledge topics endpoint (public)"""
        try:
            response = requests.get(f"{API_BASE}/knowledge/topics", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                topic_count = len(data) if isinstance(data, list) else 0
                details += f", Topics count: {topic_count}"
                # Should have 10 topics as per review request
                if topic_count >= 10:
                    details += " (Expected 10+ topics present)"
                else:
                    details += f" (Expected 10+ topics, got {topic_count})"
            self.log_test("Knowledge Topics Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Knowledge Topics Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_knowledge_maxims(self):
        """Test knowledge maxims endpoint (public)"""
        try:
            response = requests.get(f"{API_BASE}/knowledge/maxims", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                maxim_count = len(data) if isinstance(data, list) else 0
                details += f", Maxims count: {maxim_count}"
                # Should have 12 maxims as per review request
                if maxim_count >= 12:
                    details += " (Expected 12 maxims present)"
                else:
                    details += f" (Expected 12 maxims, got {maxim_count})"
            self.log_test("Knowledge Maxims Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Knowledge Maxims Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_knowledge_relationships(self):
        """Test knowledge relationships endpoint (public)"""
        try:
            response = requests.get(f"{API_BASE}/knowledge/relationships", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                rel_count = len(data) if isinstance(data, list) else 0
                details += f", Relationships count: {rel_count}"
                # Should have duty-right pairs
                if rel_count >= 4:
                    details += " (Expected duty-right pairs present)"
                else:
                    details += f" (Expected 4+ relationships, got {rel_count})"
            self.log_test("Knowledge Relationships Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Knowledge Relationships Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_templates_endpoint(self):
        """Test templates endpoint (public)"""
        try:
            response = requests.get(f"{API_BASE}/templates", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                template_count = len(data) if isinstance(data, list) else 0
                details += f", Templates count: {template_count}"
                # Should have 7 document templates as per review request
                if template_count >= 7:
                    details += " (Expected 7 document templates present)"
                else:
                    details += f" (Expected 7 templates, got {template_count})"
            self.log_test("Templates Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Templates Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_sources_endpoint(self):
        """Test sources endpoint (public)"""
        try:
            response = requests.get(f"{API_BASE}/sources", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                source_count = len(data) if isinstance(data, list) else 0
                details += f", Sources count: {source_count}"
                # Should have PDF sources
                if source_count >= 2:
                    details += " (Expected PDF sources present)"
                else:
                    details += f" (Expected 2+ sources, got {source_count})"
            self.log_test("Sources Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Sources Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_ai_assistant_chat(self):
        """Test AI Assistant chat endpoint (public)"""
        try:
            payload = {
                "message": "What are the maxims of equity?",
                "session_id": f"test_session_{int(datetime.now().timestamp())}"
            }
            response = requests.post(f"{API_BASE}/assistant/chat", json=payload, timeout=30)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                response_text = data.get('response', '')
                details += f", Response length: {len(response_text)} chars"
                # Check if response contains grounded information
                if len(response_text) > 50 and ('maxim' in response_text.lower() or 'equity' in response_text.lower()):
                    details += " (Grounded response received)"
                else:
                    details += " (Response may not be grounded)"
            self.log_test("AI Assistant Chat", success, details)
            return success
        except Exception as e:
            self.log_test("AI Assistant Chat", False, f"Exception: {str(e)}")
            return False
    
    def test_protected_endpoints_without_auth(self):
        """Test that protected endpoints return 401 without authentication"""
        endpoints = [
            "/auth/me",
            "/portfolios",
            "/dashboard/stats"
        ]
        
        all_success = True
        for endpoint in endpoints:
            try:
                response = requests.get(f"{API_BASE}{endpoint}", timeout=10)
                success = response.status_code == 401
                details = f"Status: {response.status_code} (Expected: 401)"
                self.log_test(f"Protected endpoint {endpoint} without auth", success, details)
                if not success:
                    all_success = False
            except Exception as e:
                self.log_test(f"Protected endpoint {endpoint} without auth", False, f"Exception: {str(e)}")
                all_success = False
        
        return all_success
    
    def create_test_user_and_session(self):
        """Create test user and session in MongoDB for testing"""
        try:
            # Generate test data
            timestamp = int(datetime.now().timestamp())
            self.user_id = f"test-user-{timestamp}"
            self.session_token = f"test_session_{timestamp}"
            test_email = f"test.user.{timestamp}@example.com"
            
            # MongoDB commands to create test user and session
            mongo_commands = f"""
            use('test_database');
            db.users.insertOne({{
                user_id: '{self.user_id}',
                email: '{test_email}',
                name: 'Test User',
                picture: 'https://via.placeholder.com/150',
                created_at: new Date().toISOString()
            }});
            db.user_sessions.insertOne({{
                user_id: '{self.user_id}',
                session_token: '{self.session_token}',
                expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
                created_at: new Date().toISOString()
            }});
            """
            
            # Execute MongoDB commands
            import subprocess
            result = subprocess.run(
                ['mongosh', '--eval', mongo_commands],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            success = result.returncode == 0
            details = f"User ID: {self.user_id}, Session: {self.session_token[:20]}..."
            if not success:
                details += f" Error: {result.stderr}"
            
            self.log_test("Create Test User & Session", success, details)
            return success
            
        except Exception as e:
            self.log_test("Create Test User & Session", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_me_endpoint(self):
        """Test /auth/me endpoint with valid session"""
        if not self.session_token:
            self.log_test("Auth Me Endpoint", False, "No session token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", User ID: {data.get('user_id', 'N/A')}"
                # Verify the returned user_id matches our test user
                if data.get('user_id') == self.user_id:
                    details += " (Correct user)"
                else:
                    success = False
                    details += " (Wrong user returned)"
            
            self.log_test("Auth Me Endpoint", success, details)
            return success
        except Exception as e:
            self.log_test("Auth Me Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        if not self.session_token:
            self.log_test("Dashboard Stats", False, "No session token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{API_BASE}/dashboard/stats", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Portfolios: {data.get('portfolios', 0)}"
                details += f", Documents: {data.get('documents', 0)}"
                details += f", Assets: {data.get('assets', 0)}"
                details += f", Pending Notices: {data.get('pending_notices', 0)}"
            
            self.log_test("Dashboard Stats", success, details)
            return success
        except Exception as e:
            self.log_test("Dashboard Stats", False, f"Exception: {str(e)}")
            return False
    
    def test_create_portfolio(self):
        """Test POST /portfolios creates a new portfolio"""
        if not self.session_token:
            self.log_test("Create Portfolio", False, "No session token available")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "name": "Test Family Trust Portfolio",
                "description": "Test portfolio for automated testing"
            }
            
            response = requests.post(f"{API_BASE}/portfolios", headers=headers, json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.test_portfolio_id = data.get('portfolio_id')
                details += f", Portfolio ID: {self.test_portfolio_id}"
            
            self.log_test("Create Portfolio", success, details)
            return success
        except Exception as e:
            self.log_test("Create Portfolio", False, f"Exception: {str(e)}")
            return False
    
    def test_create_trust_profile(self):
        """Test POST /trust-profiles creates a trust profile"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Create Trust Profile", False, "No session token or portfolio ID available")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "trust_name": "Test Family Trust"
            }
            
            response = requests.post(f"{API_BASE}/trust-profiles", headers=headers, json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.test_trust_profile_id = data.get('profile_id')
                details += f", Profile ID: {self.test_trust_profile_id}"
            
            self.log_test("Create Trust Profile", success, details)
            return success
        except Exception as e:
            self.log_test("Create Trust Profile", False, f"Exception: {str(e)}")
            return False
    
    def test_create_asset(self):
        """Test POST /assets creates an asset"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Create Asset", False, "No session token or portfolio ID available")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "asset_type": "real_property",
                "description": "Test Property - 123 Main Street",
                "value": "$500,000",
                "notes": "Primary residence for testing"
            }
            
            response = requests.post(f"{API_BASE}/assets", headers=headers, json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.test_asset_id = data.get('asset_id')
                details += f", Asset ID: {self.test_asset_id}"
            
            self.log_test("Create Asset", success, details)
            return success
        except Exception as e:
            self.log_test("Create Asset", False, f"Exception: {str(e)}")
            return False
    
    def test_create_notice(self):
        """Test POST /notices creates a notice"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Create Notice", False, "No session token or portfolio ID available")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "event_type": "notice_of_intent",
                "title": "Test Notice of Intent",
                "date": "2024-01-15",
                "description": "Test notice for automated testing"
            }
            
            response = requests.post(f"{API_BASE}/notices", headers=headers, json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.test_notice_id = data.get('notice_id')
                details += f", Notice ID: {self.test_notice_id}"
            
            self.log_test("Create Notice", success, details)
            return success
        except Exception as e:
            self.log_test("Create Notice", False, f"Exception: {str(e)}")
            return False
    
    def test_create_document(self):
        """Test POST /documents creates a document"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Create Document", False, "No session token or portfolio ID available")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "title": "Test Declaration of Trust",
                "document_type": "declaration_of_trust",
                "content": "This is a test declaration of trust document for automated testing."
            }
            
            response = requests.post(f"{API_BASE}/documents", headers=headers, json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.test_document_id = data.get('document_id')
                details += f", Document ID: {self.test_document_id}"
            
            self.log_test("Create Document", success, details)
            return success
        except Exception as e:
            self.log_test("Create Document", False, f"Exception: {str(e)}")
            return False
    
    def test_update_document(self):
        """Test PUT /documents/:id updates a document"""
        if not self.session_token or not self.test_document_id:
            self.log_test("Update Document", False, "No session token or document ID available")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "title": "Updated Test Declaration of Trust",
                "content": "This is an updated test declaration of trust document with versioning.",
                "status": "completed"
            }
            
            response = requests.put(f"{API_BASE}/documents/{self.test_document_id}", headers=headers, json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f", Version: {data.get('version', 'N/A')}"
                details += f", Status: {data.get('status', 'N/A')}"
            
            self.log_test("Update Document", success, details)
            return success
        except Exception as e:
            self.log_test("Update Document", False, f"Exception: {str(e)}")
            return False
    
    def test_document_versions(self):
        """Test GET /documents/:id/versions returns version history"""
        if not self.session_token or not self.test_document_id:
            self.log_test("Document Versions", False, "No session token or document ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{API_BASE}/documents/{self.test_document_id}/versions", headers=headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                version_count = len(data) if isinstance(data, list) else 0
                details += f", Versions: {version_count}"
            
            self.log_test("Document Versions", success, details)
            return success
        except Exception as e:
            self.log_test("Document Versions", False, f"Exception: {str(e)}")
            return False
    
    def test_document_pdf_export(self):
        """Test GET /documents/:id/export/pdf generates PDF"""
        if not self.session_token or not self.test_document_id:
            self.log_test("Document PDF Export", False, "No session token or document ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{API_BASE}/documents/{self.test_document_id}/export/pdf", headers=headers, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                details += f", Content-Type: {content_type}, Size: {content_length} bytes"
                
                # Check if it's actually a PDF
                if content_type == 'application/pdf' and content_length > 1000:
                    details += " (Valid PDF)"
                else:
                    success = False
                    details += " (Invalid PDF)"
            
            self.log_test("Document PDF Export", success, details)
            return success
        except Exception as e:
            self.log_test("Document PDF Export", False, f"Exception: {str(e)}")
            return False
    
    def cleanup_test_data(self):
        """Clean up test data from MongoDB"""
        try:
            if not self.user_id:
                return True
                
            mongo_commands = f"""
            use('test_database');
            db.users.deleteMany({{user_id: '{self.user_id}'}});
            db.user_sessions.deleteMany({{user_id: '{self.user_id}'}});
            db.portfolios.deleteMany({{user_id: '{self.user_id}'}});
            db.trust_profiles.deleteMany({{user_id: '{self.user_id}'}});
            db.assets.deleteMany({{user_id: '{self.user_id}'}});
            db.notices.deleteMany({{user_id: '{self.user_id}'}});
            db.documents.deleteMany({{user_id: '{self.user_id}'}});
            db.document_versions.deleteMany({{document_id: '{self.test_document_id}'}});
            """
            
            import subprocess
            result = subprocess.run(
                ['mongosh', '--eval', mongo_commands],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            success = result.returncode == 0
            self.log_test("Cleanup Test Data", success, f"Cleaned user: {self.user_id}")
            return success
            
        except Exception as e:
            self.log_test("Cleanup Test Data", False, f"Exception: {str(e)}")
            return False
    
    def test_rm_id_sequence_bug_fix(self):
        """Test P0 Bug Fix: RM-ID sequence generation for documents"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("RM-ID Sequence Bug Fix", False, "No session token or portfolio ID available")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            # Test 1: First document from "Declaration of Trust" template should get .001
            payload1 = {
                "portfolio_id": self.test_portfolio_id,
                "template_id": "declaration_of_trust",
                "title": "First Declaration of Trust",
                "document_type": "declaration_of_trust",
                "content": "First test document"
            }
            
            response1 = requests.post(f"{API_BASE}/documents", headers=headers, json=payload1, timeout=10)
            if response1.status_code != 200:
                self.log_test("RM-ID Sequence Bug Fix - First Declaration", False, f"Status: {response1.status_code}")
                return False
            
            doc1 = response1.json()
            rm_id1 = doc1.get('rm_id', '')
            
            # Test 2: Second document from same template should get .002
            payload2 = {
                "portfolio_id": self.test_portfolio_id,
                "template_id": "declaration_of_trust",
                "title": "Second Declaration of Trust",
                "document_type": "declaration_of_trust",
                "content": "Second test document"
            }
            
            response2 = requests.post(f"{API_BASE}/documents", headers=headers, json=payload2, timeout=10)
            if response2.status_code != 200:
                self.log_test("RM-ID Sequence Bug Fix - Second Declaration", False, f"Status: {response2.status_code}")
                return False
            
            doc2 = response2.json()
            rm_id2 = doc2.get('rm_id', '')
            
            # Test 3: First document from different template should get .001 for its category
            payload3 = {
                "portfolio_id": self.test_portfolio_id,
                "template_id": "trust_transfer_grant_deed",
                "title": "First TTGD Document",
                "document_type": "trust_transfer_grant_deed",
                "content": "First TTGD test document"
            }
            
            response3 = requests.post(f"{API_BASE}/documents", headers=headers, json=payload3, timeout=10)
            if response3.status_code != 200:
                self.log_test("RM-ID Sequence Bug Fix - First TTGD", False, f"Status: {response3.status_code}")
                return False
            
            doc3 = response3.json()
            rm_id3 = doc3.get('rm_id', '')
            
            # Verify RM-ID patterns
            success = True
            details = ""
            
            # Check first Declaration of Trust ends with -01.001
            if not rm_id1.endswith('-01.001'):
                success = False
                details += f"First Declaration RM-ID should end with -01.001, got: {rm_id1}. "
            
            # Check second Declaration of Trust ends with -01.002
            if not rm_id2.endswith('-01.002'):
                success = False
                details += f"Second Declaration RM-ID should end with -01.002, got: {rm_id2}. "
            
            # Check first TTGD ends with -02.001
            if not rm_id3.endswith('-02.001'):
                success = False
                details += f"First TTGD RM-ID should end with -02.001, got: {rm_id3}. "
            
            if success:
                details = f"✓ Declaration 1: {rm_id1}, Declaration 2: {rm_id2}, TTGD 1: {rm_id3}"
            
            self.log_test("RM-ID Sequence Bug Fix", success, details)
            return success
            
        except Exception as e:
            self.log_test("RM-ID Sequence Bug Fix", False, f"Exception: {str(e)}")
            return False
    
    def test_documents_sorting_order(self):
        """Test P0 Bug Fix: Documents sorted by created_at ascending (oldest first)"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Documents Sorting Order", False, "No session token or portfolio ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{API_BASE}/documents?portfolio_id={self.test_portfolio_id}", headers=headers, timeout=10)
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                documents = response.json()
                if len(documents) >= 2:
                    # Check if documents are sorted by created_at ascending
                    created_dates = [doc.get('created_at') for doc in documents if doc.get('created_at')]
                    is_sorted = all(created_dates[i] <= created_dates[i+1] for i in range(len(created_dates)-1))
                    
                    if is_sorted:
                        details += f", {len(documents)} documents sorted correctly (oldest first)"
                    else:
                        success = False
                        details += f", {len(documents)} documents NOT sorted correctly"
                        details += f", First: {created_dates[0] if created_dates else 'N/A'}"
                        details += f", Last: {created_dates[-1] if created_dates else 'N/A'}"
                else:
                    details += f", Only {len(documents)} documents found (need 2+ to verify sorting)"
            
            self.log_test("Documents Sorting Order", success, details)
            return success
        except Exception as e:
            self.log_test("Documents Sorting Order", False, f"Exception: {str(e)}")
            return False
    
    def test_assets_sorting_order(self):
        """Test P0 Bug Fix: Assets sorted by created_at ascending (oldest first)"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Assets Sorting Order", False, "No session token or portfolio ID available")
            return False
        
        try:
            # Create multiple assets to test sorting
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            # Create first asset
            asset1_payload = {
                "portfolio_id": self.test_portfolio_id,
                "asset_type": "real_property",
                "description": "First Test Property",
                "value": 100000,
                "notes": "First asset for sorting test"
            }
            requests.post(f"{API_BASE}/portfolios/{self.test_portfolio_id}/assets", headers=headers, json=asset1_payload, timeout=10)
            
            # Small delay to ensure different timestamps
            import time
            time.sleep(0.1)
            
            # Create second asset
            asset2_payload = {
                "portfolio_id": self.test_portfolio_id,
                "asset_type": "financial_account",
                "description": "Second Test Account",
                "value": 50000,
                "notes": "Second asset for sorting test"
            }
            requests.post(f"{API_BASE}/portfolios/{self.test_portfolio_id}/assets", headers=headers, json=asset2_payload, timeout=10)
            
            # Now test the sorting
            response = requests.get(f"{API_BASE}/portfolios/{self.test_portfolio_id}/assets", headers=headers, timeout=10)
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                assets = response.json()
                if len(assets) >= 2:
                    # Check if assets are sorted by created_at ascending
                    created_dates = [asset.get('created_at') for asset in assets if asset.get('created_at')]
                    is_sorted = all(created_dates[i] <= created_dates[i+1] for i in range(len(created_dates)-1))
                    
                    if is_sorted:
                        details += f", {len(assets)} assets sorted correctly (oldest first)"
                    else:
                        success = False
                        details += f", {len(assets)} assets NOT sorted correctly"
                        details += f", First: {created_dates[0] if created_dates else 'N/A'}"
                        details += f", Last: {created_dates[-1] if created_dates else 'N/A'}"
                else:
                    details += f", Only {len(assets)} assets found (need 2+ to verify sorting)"
            
            self.log_test("Assets Sorting Order", success, details)
            return success
        except Exception as e:
            self.log_test("Assets Sorting Order", False, f"Exception: {str(e)}")
            return False
    
    def test_ledger_sorting_order(self):
        """Test P0 Bug Fix: Ledger entries sorted by created_at ascending (oldest first)"""
        if not self.session_token or not self.test_portfolio_id:
            self.log_test("Ledger Sorting Order", False, "No session token or portfolio ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{API_BASE}/portfolios/{self.test_portfolio_id}/ledger", headers=headers, timeout=10)
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                entries = data.get('entries', []) if isinstance(data, dict) else data
                
                if len(entries) >= 2:
                    # Check if ledger entries are sorted by created_at ascending
                    created_dates = [entry.get('created_at') for entry in entries if entry.get('created_at')]
                    is_sorted = all(created_dates[i] <= created_dates[i+1] for i in range(len(created_dates)-1))
                    
                    if is_sorted:
                        details += f", {len(entries)} ledger entries sorted correctly (oldest first)"
                    else:
                        success = False
                        details += f", {len(entries)} ledger entries NOT sorted correctly"
                        details += f", First: {created_dates[0] if created_dates else 'N/A'}"
                        details += f", Last: {created_dates[-1] if created_dates else 'N/A'}"
                else:
                    details += f", Only {len(entries)} ledger entries found (need 2+ to verify sorting)"
            
            self.log_test("Ledger Sorting Order", success, details)
            return success
        except Exception as e:
            self.log_test("Ledger Sorting Order", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print(f"🚀 Starting Equity Trust Portfolio API Tests - P0 Bug Fixes")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Basic connectivity tests
        self.test_health_check()
        self.test_root_endpoint()
        
        # Public knowledge base endpoints
        self.test_knowledge_topics()
        self.test_knowledge_maxims()
        self.test_knowledge_relationships()
        self.test_templates_endpoint()
        self.test_sources_endpoint()
        
        # AI Assistant test
        self.test_ai_assistant_chat()
        
        # Protected endpoints without auth
        self.test_protected_endpoints_without_auth()
        
        # Authentication setup
        if self.create_test_user_and_session():
            # Authenticated tests
            self.test_auth_me_endpoint()
            self.test_dashboard_stats()
            
            # Portfolio CRUD operations
            if self.test_create_portfolio():
                self.test_create_trust_profile()
                
                # P0 BUG TESTS - Main focus of this testing session
                print("\n🔍 P0 BUG TESTS - RM-ID Sequence & Sorting Order")
                print("-" * 50)
                self.test_rm_id_sequence_bug_fix()
                self.test_documents_sorting_order()
                self.test_assets_sorting_order()
                self.test_ledger_sorting_order()
                
                # Additional tests
                self.test_create_asset()
                self.test_create_notice()
                
                # Document operations with versioning
                if self.test_create_document():
                    self.test_update_document()
                    self.test_document_versions()
                    self.test_document_pdf_export()
            
            # Cleanup
            self.cleanup_test_data()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['name']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = EquityTrustAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())