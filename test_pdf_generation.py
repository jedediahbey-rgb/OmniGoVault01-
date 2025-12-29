#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timezone, timedelta
import uuid
import os
import subprocess

# Get backend URL from frontend .env
BACKEND_URL = "https://trustworkspace.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

class PDFGenerationTester:
    def __init__(self):
        self.session_token = None
        self.user_id = None
        self.document_ids = {}  # Store document IDs by type
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
    
    def create_document_with_full_data(self, doc_type, title):
        """Create a document with comprehensive test data"""
        if not self.session_token:
            return None
        
        try:
            headers = {
                "Authorization": f"Bearer {self.session_token}",
                "Content-Type": "application/json"
            }
            
            # Create the document first
            payload = {
                "document_type": doc_type,
                "title": title
            }
            
            response = requests.post(f"{API_BASE}/trusts", headers=headers, json=payload, timeout=10)
            if response.status_code != 200:
                self.log_test(f"Create {doc_type} document", False, f"Status: {response.status_code}")
                return None
            
            document_id = response.json().get('document_id')
            
            # Update with full test data
            update_payload = {
                "title": title,
                "status": "completed",
                "grantor_name": "John Alexander Smith",
                "grantor_address": "123 Main Street, Suite 100\nAnytown, State 12345\nUnited States of America",
                "trustee_name": "Jane Elizabeth Doe",
                "trustee_address": "456 Oak Avenue, Unit 200\nTrustee City, State 67890\nUnited States of America",
                "beneficiary_name": "Robert Michael Johnson",
                "beneficiary_address": "789 Pine Road, Apartment 300\nBeneficiary Town, State 54321\nUnited States of America",
                "trust_name": f"The Smith Family Pure Equity Trust - {doc_type.replace('_', ' ').title()}",
                "trust_purpose": "To re-unite, deliver, transfer, and merge titles for all the corpus of this Trust for the use and benefit of the beneficiary, providing asset protection, estate planning, and wealth preservation in accordance with the Maxims of Equity.",
                "property_description": "All real property located at 123 Main Street, Anytown, State 12345, including all improvements, fixtures, and appurtenances thereto; Personal property including vehicles, bank accounts, investment accounts, and all other tangible and intangible assets; All rights, titles, deeds, and interests associated therewith.",
                "additional_terms": "This Trust shall be administered according to the principles of equity and the Maxims thereof. The Trustee shall have full discretionary authority to manage Trust assets for the benefit of the Beneficiary. All distributions shall be made in accordance with the beneficial interest of the Trust."
            }
            
            update_response = requests.put(f"{API_BASE}/trusts/{document_id}", headers=headers, json=update_payload, timeout=10)
            if update_response.status_code != 200:
                self.log_test(f"Update {doc_type} document", False, f"Status: {update_response.status_code}")
                return None
            
            self.document_ids[doc_type] = document_id
            self.log_test(f"Create and populate {doc_type} document", True, f"Document ID: {document_id}")
            return document_id
            
        except Exception as e:
            self.log_test(f"Create {doc_type} document", False, f"Exception: {str(e)}")
            return None
    
    def test_pdf_generation(self, doc_type, document_id):
        """Test PDF generation for a specific document type"""
        if not self.session_token or not document_id:
            self.log_test(f"PDF Generation - {doc_type}", False, "No session token or document ID")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{API_BASE}/trusts/{document_id}/pdf", headers=headers, timeout=20)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                details += f", Content-Type: {content_type}, Size: {content_length} bytes"
                
                # Check if it's actually a PDF and has reasonable size
                if content_type == 'application/pdf' and content_length > 2000:
                    # Check PDF header
                    pdf_header = response.content[:4]
                    if pdf_header == b'%PDF':
                        details += " (Valid PDF with header)"
                        
                        # Check for PDF trailer
                        pdf_content = response.content.decode('latin-1', errors='ignore')
                        if '%%EOF' in pdf_content:
                            details += " (Complete PDF)"
                        else:
                            details += " (PDF may be incomplete)"
                    else:
                        success = False
                        details += " (Invalid PDF header)"
                else:
                    success = False
                    details += " (Invalid PDF or too small)"
            
            self.log_test(f"PDF Generation - {doc_type}", success, details)
            return success
        except Exception as e:
            self.log_test(f"PDF Generation - {doc_type}", False, f"Exception: {str(e)}")
            return False
    
    def test_all_document_types(self):
        """Test all 4 document types and their PDF generation"""
        document_types = [
            ("declaration_of_trust", "Test Declaration of Trust"),
            ("trust_transfer_grant_deed", "Test Trust Transfer Grant Deed"),
            ("notice_of_intent", "Test Notice of Intent to Preserve Interest"),
            ("affidavit_of_fact", "Test Affidavit of Fact")
        ]
        
        all_success = True
        
        for doc_type, title in document_types:
            print(f"\n📄 Testing {doc_type}...")
            
            # Create document with full data
            document_id = self.create_document_with_full_data(doc_type, title)
            
            if document_id:
                # Test PDF generation
                pdf_success = self.test_pdf_generation(doc_type, document_id)
                if not pdf_success:
                    all_success = False
            else:
                all_success = False
        
        return all_success
    
    def cleanup_test_data(self):
        """Clean up test data from MongoDB"""
        try:
            if not self.user_id:
                return True
                
            mongo_commands = f"""
            use('test_database');
            db.users.deleteMany({{user_id: '{self.user_id}'}});
            db.user_sessions.deleteMany({{user_id: '{self.user_id}'}});
            db.trust_documents.deleteMany({{user_id: '{self.user_id}'}});
            """
            
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
    
    def run_pdf_tests(self):
        """Run all PDF generation tests"""
        print(f"🚀 Starting PDF Generation Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Setup authentication
        if self.create_test_user_and_session():
            # Test all document types
            self.test_all_document_types()
            
            # Cleanup
            self.cleanup_test_data()
        
        # Print summary
        print("=" * 60)
        print(f"📊 PDF Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['name']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = PDFGenerationTester()
    success = tester.run_pdf_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())