#!/usr/bin/env python3
"""
Governance Module Testing - Meeting Locking & Amendment Features
Tests specific features mentioned in the review request
"""

import requests
import sys
import json
from datetime import datetime
import subprocess

class GovernanceFeatureTester:
    def __init__(self, base_url="https://ledgerfix-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.portfolio_id = None
        self.meeting_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return response.json() if response.content else {}
                except:
                    return {}
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}")
                return {"status_code": response.status_code, "response": response.text}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return {}

    def setup_test_session(self):
        """Create test user and session"""
        print("🔧 Setting up test session...")
        
        timestamp = int(datetime.now().timestamp() * 1000)
        self.user_id = f"test-user-{timestamp}"
        self.session_token = f"test_session_{timestamp}"
        
        mongo_script = f'''
        use('test_database');
        db.users.insertOne({{
          user_id: "{self.user_id}",
          email: "test.user.{timestamp}@example.com",
          name: "Test User",
          picture: "https://via.placeholder.com/150",
          created_at: new Date()
        }});
        db.user_sessions.insertOne({{
          user_id: "{self.user_id}",
          session_token: "{self.session_token}",
          expires_at: new Date(Date.now() + 7*24*60*60*1000),
          created_at: new Date()
        }});
        '''
        
        try:
            result = subprocess.run(['mongosh', '--eval', mongo_script], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                print(f"✅ Test session created: {self.session_token}")
                return True
            else:
                print(f"❌ Failed to create test session: {result.stderr}")
                return False
        except Exception as e:
            print(f"❌ Error creating test session: {e}")
            return False

    def setup_test_portfolio(self):
        """Create a test portfolio"""
        print("🏢 Setting up test portfolio...")
        
        portfolio_data = {
            "name": "Governance Test Portfolio",
            "description": "Test portfolio for governance feature testing"
        }
        
        response = self.run_test("Setup - Create Portfolio", "POST", "portfolios", 200, portfolio_data)
        if response and 'portfolio_id' in response:
            self.portfolio_id = response['portfolio_id']
            print(f"   Portfolio ID: {self.portfolio_id}")
            return True
        return False

    def test_meeting_list_fields(self):
        """Test that meetings list returns id, locked, revision fields"""
        print("\n📋 Testing Meeting List Fields...")
        
        # First create a meeting to test with
        meeting_data = {
            "portfolio_id": self.portfolio_id,
            "title": "Test Meeting for Field Validation",
            "meeting_type": "regular",
            "date_time": "2024-12-24T14:00:00Z",
            "location": "Test Location",
            "called_by": "Test User"
        }
        
        created = self.run_test("Create Test Meeting", "POST", "governance/meetings", 200, meeting_data)
        if not created:
            return False
        
        # Handle envelope format: { ok: true, item: {...} }
        meeting_data_response = created.get('item', created)
        if 'meeting_id' not in meeting_data_response:
            print(f"   ❌ No meeting_id in response: {created}")
            return False
        
        self.meeting_id = meeting_data_response['meeting_id']
        print(f"   Meeting ID: {self.meeting_id}")
        
        # Test meetings list endpoint
        response = self.run_test("Get Meetings List", "GET", f"governance/meetings?portfolio_id={self.portfolio_id}", 200)
        
        if response:
            # Handle envelope format: { ok: true, items: [...] }
            meetings = response.get('items', response if isinstance(response, list) else [])
            if meetings:
                meeting = meetings[0]
                
                # Check for required fields
                has_id = 'id' in meeting
                has_locked = 'locked' in meeting
                has_revision = 'revision' in meeting
                
                self.log_test("Meeting List - Has 'id' field", has_id, "Missing 'id' field" if not has_id else "")
                self.log_test("Meeting List - Has 'locked' field", has_locked, "Missing 'locked' field" if not has_locked else "")
                self.log_test("Meeting List - Has 'revision' field", has_revision, "Missing 'revision' field" if not has_revision else "")
                
                if has_id and has_locked and has_revision:
                    print(f"   ✅ Meeting fields: id={meeting['id']}, locked={meeting['locked']}, revision={meeting['revision']}")
                    return True
            else:
                print(f"   ❌ No meetings found in response: {response}")
        
        return False

    def test_single_meeting_fields(self):
        """Test that single meeting returns id, locked, revision fields"""
        print("\n📋 Testing Single Meeting Fields...")
        
        if not self.meeting_id:
            print("   ⚠️ No meeting ID available, skipping test")
            return False
        
        response = self.run_test("Get Single Meeting", "GET", f"governance/meetings/{self.meeting_id}", 200)
        
        if response:
            # Handle envelope format: { ok: true, item: {...} }
            meeting = response.get('item', response)
            
            # Check for required fields
            has_id = 'id' in meeting
            has_locked = 'locked' in meeting
            has_revision = 'revision' in meeting
            
            self.log_test("Single Meeting - Has 'id' field", has_id, "Missing 'id' field" if not has_id else "")
            self.log_test("Single Meeting - Has 'locked' field", has_locked, "Missing 'locked' field" if not has_locked else "")
            self.log_test("Single Meeting - Has 'revision' field", has_revision, "Missing 'revision' field" if not has_revision else "")
            
            if has_id and has_locked and has_revision:
                print(f"   ✅ Meeting fields: id={meeting['id']}, locked={meeting['locked']}, revision={meeting['revision']}")
                return True
        
        return False

    def test_meeting_finalization_locking(self):
        """Test meeting finalization sets locked=true and locked_at"""
        print("\n🔒 Testing Meeting Finalization & Locking...")
        
        if not self.meeting_id:
            print("   ⚠️ No meeting ID available, skipping test")
            return False
        
        # Finalize the meeting
        finalize_data = {"finalized_by_name": "Test User"}
        response = self.run_test("Finalize Meeting", "POST", f"governance/meetings/{self.meeting_id}/finalize", 200, finalize_data)
        
        if response:
            # Handle envelope format: { ok: true, message: "...", item: {...} }
            meeting = response.get('item', response)
            
            is_locked = meeting.get('locked', False)
            has_locked_at = 'locked_at' in meeting and meeting['locked_at'] is not None
            status_finalized = meeting.get('status') == 'finalized'
            
            self.log_test("Finalization - Sets locked=true", is_locked, f"locked={is_locked}" if not is_locked else "")
            self.log_test("Finalization - Sets locked_at", has_locked_at, "locked_at not set" if not has_locked_at else "")
            self.log_test("Finalization - Sets status=finalized", status_finalized, f"status={meeting.get('status')}" if not status_finalized else "")
            
            if is_locked and has_locked_at and status_finalized:
                print(f"   ✅ Meeting finalized: locked={is_locked}, locked_at={meeting.get('locked_at')}")
                return True
        
        return False

    def test_locked_meeting_409_error(self):
        """Test that PUT on finalized meeting returns 409 MEETING_LOCKED"""
        print("\n🚫 Testing Locked Meeting 409 Error...")
        
        if not self.meeting_id:
            print("   ⚠️ No meeting ID available, skipping test")
            return False
        
        # Try to update the finalized meeting
        update_data = {
            "title": "Attempting to update finalized meeting",
            "location": "Should not work"
        }
        
        response = self.run_test("Update Locked Meeting (Expect 409)", "PUT", f"governance/meetings/{self.meeting_id}", 409, update_data)
        
        if response and response.get('status_code') == 409:
            # Check if the error response contains MEETING_LOCKED
            response_text = response.get('response', '')
            has_meeting_locked_error = 'MEETING_LOCKED' in response_text
            
            self.log_test("409 Error - Contains MEETING_LOCKED code", has_meeting_locked_error, 
                         "Missing MEETING_LOCKED error code" if not has_meeting_locked_error else "")
            
            if has_meeting_locked_error:
                print(f"   ✅ Correct 409 error with MEETING_LOCKED code")
                return True
        
        return False

    def test_amendment_creation(self):
        """Test amendment creation with parent_meeting_id and revision tracking"""
        print("\n📝 Testing Amendment Creation...")
        
        if not self.meeting_id:
            print("   ⚠️ No meeting ID available, skipping test")
            return False
        
        # Create amendment
        amendment_data = {"reason": "Test amendment for revision tracking"}
        response = self.run_test("Create Amendment", "POST", f"governance/meetings/{self.meeting_id}/amend", 200, amendment_data)
        
        if response:
            # Handle envelope format: { ok: true, message: "...", item: {...} }
            amendment = response.get('item', response)
            
            has_parent_id = 'parent_meeting_id' in amendment and amendment['parent_meeting_id'] == self.meeting_id
            has_revision = 'revision' in amendment and amendment['revision'] > 1
            is_draft = amendment.get('status') == 'draft'
            is_unlocked = not amendment.get('locked', True)
            
            self.log_test("Amendment - Has parent_meeting_id", has_parent_id, 
                         f"parent_meeting_id={amendment.get('parent_meeting_id')}" if not has_parent_id else "")
            self.log_test("Amendment - Has incremented revision", has_revision, 
                         f"revision={amendment.get('revision')}" if not has_revision else "")
            self.log_test("Amendment - Is draft status", is_draft, 
                         f"status={amendment.get('status')}" if not is_draft else "")
            self.log_test("Amendment - Is unlocked", is_unlocked, 
                         f"locked={amendment.get('locked')}" if not is_unlocked else "")
            
            if has_parent_id and has_revision and is_draft and is_unlocked:
                amendment_id = amendment.get('meeting_id')
                print(f"   ✅ Amendment created: ID={amendment_id}, revision={amendment['revision']}")
                return amendment_id
        
        return None

    def test_versions_endpoint(self):
        """Test GET /meetings/{id}/versions returns all versions sorted by revision"""
        print("\n📚 Testing Versions Endpoint...")
        
        if not self.meeting_id:
            print("   ⚠️ No meeting ID available, skipping test")
            return False
        
        response = self.run_test("Get Meeting Versions", "GET", f"governance/meetings/{self.meeting_id}/versions", 200)
        
        if response:
            # Handle envelope format: { ok: true, items: [...] }
            versions = response.get('items', response if isinstance(response, list) else [])
            
            has_versions = len(versions) >= 2  # Original + amendment
            sorted_by_revision = True
            
            if len(versions) > 1:
                for i in range(1, len(versions)):
                    if versions[i].get('revision', 0) < versions[i-1].get('revision', 0):
                        sorted_by_revision = False
                        break
            
            self.log_test("Versions - Returns multiple versions", has_versions, 
                         f"Found {len(versions)} versions" if not has_versions else "")
            self.log_test("Versions - Sorted by revision", sorted_by_revision, 
                         "Versions not sorted by revision" if not sorted_by_revision else "")
            
            if has_versions and sorted_by_revision:
                print(f"   ✅ Found {len(versions)} versions, properly sorted")
                for i, version in enumerate(versions):
                    print(f"      v{version.get('revision', 'unknown')}: {version.get('title', 'Unknown')[:50]}...")
                return True
            elif len(versions) == 1:
                print(f"   ⚠️ Only found 1 version (expected 2+ after amendment)")
        
        return False

    def run_governance_tests(self):
        """Run all governance feature tests"""
        print("🚀 Starting Governance Feature Tests")
        print("=" * 60)
        
        # Setup
        if not self.setup_test_session():
            print("❌ Failed to setup test session")
            return False
        
        if not self.setup_test_portfolio():
            print("❌ Failed to setup test portfolio")
            return False
        
        # Run specific feature tests
        print("\n🎯 Testing Specific Features from Review Request:")
        
        # Backend field tests
        self.test_meeting_list_fields()
        self.test_single_meeting_fields()
        
        # Locking and finalization tests
        self.test_meeting_finalization_locking()
        self.test_locked_meeting_409_error()
        
        # Amendment tests
        amendment_id = self.test_amendment_creation()
        self.test_versions_endpoint()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Governance Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All governance feature tests passed!")
            return True
        else:
            print("⚠️ Some governance tests failed")
            failed_tests = [t for t in self.test_results if not t['success']]
            for test in failed_tests:
                print(f"   ❌ {test['test']}: {test['details']}")
            return False

def main():
    tester = GovernanceFeatureTester()
    success = tester.run_governance_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())