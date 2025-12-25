#!/usr/bin/env python3
"""
Backend API Testing for Ledger Thread Management Tools
Tests merge, split, and reassign ledger threads functionality.
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid

# Use the public endpoint from frontend/.env
BASE_URL = "https://portfolio-sync-10.preview.emergentagent.com/api"

class LedgerThreadAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Ledger-Thread-API-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_portfolio_id = f"test_portfolio_{uuid.uuid4().hex[:8]}"
        self.created_threads = []  # Track created threads for cleanup

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def test_endpoint(self, method, endpoint, expected_status, data=None, description="", params=None):
        """Test a single API endpoint"""
        url = f"{self.base_url}{endpoint}"
        self.tests_run += 1
        
        self.log(f"Testing: {description or f'{method} {endpoint}'}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, params=params, timeout=10)
            elif method == 'POST':
                response = self.session.post(url, json=data, params=params, timeout=10)
            elif method == 'PUT':
                response = self.session.put(url, json=data, params=params, timeout=10)
            elif method == 'DELETE':
                response = self.session.delete(url, params=params, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASS - Status: {response.status_code}")
                try:
                    return response.json()
                except:
                    return {"status_code": response.status_code}
            else:
                self.log(f"❌ FAIL - Expected {expected_status}, got {response.status_code}")
                self.failed_tests.append({
                    'test': description,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'endpoint': endpoint
                })
                try:
                    error_data = response.json()
                    self.log(f"   Error: {error_data}")
                except:
                    self.log(f"   Response: {response.text[:200]}")
                return None
                
        except Exception as e:
            self.log(f"❌ FAIL - Exception: {str(e)}")
            self.failed_tests.append({
                'test': description,
                'error': str(e),
                'endpoint': endpoint
            })
            return None

    def test_list_threads_empty(self):
        """Test GET /api/ledger-threads with empty portfolio"""
        self.log("\n=== Testing List Threads (Empty Portfolio) ===")
        
        result = self.test_endpoint(
            'GET',
            '/ledger-threads',
            200,
            params={'portfolio_id': self.test_portfolio_id},
            description="Get threads for empty portfolio"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            items = data.get('items', [])
            total = data.get('total', 0)
            
            if len(items) == 0 and total == 0:
                self.log(f"✅ Empty portfolio correctly returns 0 threads")
                return True
            else:
                self.log(f"❌ Expected 0 threads, got {len(items)}")
                return False
        return False

    def test_create_thread(self, title="Test Thread", category="misc"):
        """Test POST /api/ledger-threads"""
        self.log(f"\n=== Testing Create Thread: {title} ===")
        
        thread_data = {
            "portfolio_id": self.test_portfolio_id,
            "title": title,
            "category": category,
            "party_name": "Test Party",
            "external_ref": f"REF-{uuid.uuid4().hex[:6]}"
        }
        
        result = self.test_endpoint(
            'POST',
            '/ledger-threads',
            200,
            data=thread_data,
            description=f"Create new thread: {title}"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            thread_id = data.get('thread_id')
            rm_group = data.get('rm_group')
            rm_id_preview = data.get('rm_id_preview')
            
            if thread_id and rm_group and rm_id_preview:
                self.log(f"✅ Thread created: {thread_id}, RM Group: {rm_group}, Preview: {rm_id_preview}")
                self.created_threads.append(thread_id)
                return thread_id
            else:
                self.log(f"❌ Missing required fields in response")
                return None
        return None

    def test_get_thread_details(self, thread_id):
        """Test GET /api/ledger-threads/{id}"""
        self.log(f"\n=== Testing Get Thread Details: {thread_id} ===")
        
        result = self.test_endpoint(
            'GET',
            f'/ledger-threads/{thread_id}',
            200,
            description=f"Get thread details for {thread_id}"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            thread = data.get('thread', {})
            records = data.get('records', [])
            record_count = data.get('record_count', 0)
            
            if thread.get('id') == thread_id:
                self.log(f"✅ Thread details retrieved: {thread.get('title')}, {record_count} records")
                return True
            else:
                self.log(f"❌ Thread ID mismatch")
                return False
        return False

    def test_update_thread(self, thread_id):
        """Test PUT /api/ledger-threads/{id}"""
        self.log(f"\n=== Testing Update Thread: {thread_id} ===")
        
        update_data = {
            "title": "Updated Test Thread",
            "primary_party_name": "Updated Party",
            "external_ref": "UPDATED-REF"
        }
        
        result = self.test_endpoint(
            'PUT',
            f'/ledger-threads/{thread_id}',
            200,
            data=update_data,
            description=f"Update thread {thread_id}"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            thread = data.get('thread', {})
            
            if thread.get('title') == "Updated Test Thread":
                self.log(f"✅ Thread updated successfully")
                return True
            else:
                self.log(f"❌ Thread update failed")
                return False
        return False

    def test_list_threads_with_data(self):
        """Test GET /api/ledger-threads with created threads"""
        self.log("\n=== Testing List Threads (With Data) ===")
        
        result = self.test_endpoint(
            'GET',
            '/ledger-threads',
            200,
            params={'portfolio_id': self.test_portfolio_id},
            description="Get threads for portfolio with data"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            items = data.get('items', [])
            total = data.get('total', 0)
            
            if len(items) > 0 and total > 0:
                self.log(f"✅ Found {len(items)} threads, total: {total}")
                for item in items:
                    self.log(f"   - {item.get('rm_id_preview')}: {item.get('title')}")
                return True
            else:
                self.log(f"❌ Expected threads, got {len(items)}")
                return False
        return False

    def test_merge_threads(self, target_thread_id, source_thread_ids):
        """Test POST /api/ledger-threads/{id}/merge"""
        self.log(f"\n=== Testing Merge Threads ===")
        
        merge_data = {
            "source_thread_ids": source_thread_ids,
            "merge_reason": "Testing merge functionality"
        }
        
        result = self.test_endpoint(
            'POST',
            f'/ledger-threads/{target_thread_id}/merge',
            200,
            data=merge_data,
            description=f"Merge {len(source_thread_ids)} threads into {target_thread_id}"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            merged_count = data.get('records_merged', 0)
            merged_threads = data.get('merged_thread_ids', [])
            
            self.log(f"✅ Merge successful: {merged_count} records, {len(merged_threads)} threads merged")
            return True
        return False

    def test_split_thread(self, thread_id, record_ids=None):
        """Test POST /api/ledger-threads/{id}/split"""
        self.log(f"\n=== Testing Split Thread ===")
        
        # For testing, we'll use empty record_ids since we don't have actual records
        split_data = {
            "record_ids": record_ids or [],
            "new_thread_title": "Split Test Thread",
            "split_reason": "Testing split functionality"
        }
        
        result = self.test_endpoint(
            'POST',
            f'/ledger-threads/{thread_id}/split',
            200,
            data=split_data,
            description=f"Split thread {thread_id}"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            new_thread_id = data.get('new_thread_id')
            records_moved = data.get('records_moved', 0)
            
            if new_thread_id:
                self.log(f"✅ Split successful: new thread {new_thread_id}, {records_moved} records moved")
                self.created_threads.append(new_thread_id)
                return new_thread_id
            else:
                self.log(f"❌ Split failed: no new thread ID")
                return None
        return None

    def test_reassign_records(self, target_thread_id, record_ids=None):
        """Test POST /api/ledger-threads/reassign"""
        self.log(f"\n=== Testing Reassign Records ===")
        
        reassign_data = {
            "record_ids": record_ids or [],
            "target_thread_id": target_thread_id,
            "reassign_reason": "Testing reassign functionality"
        }
        
        result = self.test_endpoint(
            'POST',
            '/ledger-threads/reassign',
            200,
            data=reassign_data,
            description=f"Reassign records to {target_thread_id}"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            reassigned_count = data.get('records_reassigned', 0)
            
            self.log(f"✅ Reassign successful: {reassigned_count} records reassigned")
            return True
        return False

    def test_delete_thread(self, thread_id):
        """Test DELETE /api/ledger-threads/{id}"""
        self.log(f"\n=== Testing Delete Thread: {thread_id} ===")
        
        result = self.test_endpoint(
            'DELETE',
            f'/ledger-threads/{thread_id}',
            200,
            description=f"Delete thread {thread_id}"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            deleted = data.get('deleted', False)
            
            if deleted:
                self.log(f"✅ Thread deleted successfully")
                return True
            else:
                self.log(f"❌ Thread deletion failed")
                return False
        return False

    def test_create_thread_validation(self):
        """Test POST /api/ledger-threads with validation errors"""
        self.log("\n=== Testing Create Thread Validation ===")
        
        # Test missing portfolio_id
        result = self.test_endpoint(
            'POST',
            '/ledger-threads',
            400,
            data={"title": "Test"},
            description="Create thread without portfolio_id (should fail)"
        )
        
        # Test missing title
        result2 = self.test_endpoint(
            'POST',
            '/ledger-threads',
            400,
            data={"portfolio_id": self.test_portfolio_id},
            description="Create thread without title (should fail)"
        )
        
        # Test invalid category
        result3 = self.test_endpoint(
            'POST',
            '/ledger-threads',
            400,
            data={
                "portfolio_id": self.test_portfolio_id,
                "title": "Test",
                "category": "invalid_category"
            },
            description="Create thread with invalid category (should fail)"
        )
        
        # All should return None (meaning they got expected error status)
        return result is None and result2 is None and result3 is None

    def run_all_tests(self):
        """Run all ledger thread API tests"""
        self.log("🚀 Starting Backend API Tests for Ledger Thread Management")
        self.log("=" * 60)
        
        # Test basic CRUD operations
        self.log("\n📋 BASIC CRUD OPERATIONS")
        self.log("-" * 40)
        
        # Test empty portfolio
        self.test_list_threads_empty()
        
        # Test validation
        self.test_create_thread_validation()
        
        # Create test threads
        thread1_id = self.test_create_thread("Test Thread 1", "minutes")
        thread2_id = self.test_create_thread("Test Thread 2", "distribution")
        thread3_id = self.test_create_thread("Test Thread 3", "dispute")
        
        if not all([thread1_id, thread2_id, thread3_id]):
            self.log("❌ Failed to create test threads, skipping advanced tests")
            return False
        
        # Test thread details
        self.test_get_thread_details(thread1_id)
        
        # Test update
        self.test_update_thread(thread1_id)
        
        # Test list with data
        self.test_list_threads_with_data()
        
        # Test advanced operations
        self.log("\n🔄 ADVANCED OPERATIONS")
        self.log("-" * 40)
        
        # Test merge (merge thread2 and thread3 into thread1)
        self.test_merge_threads(thread1_id, [thread2_id, thread3_id])
        
        # Create another thread for split testing
        thread4_id = self.test_create_thread("Thread for Split", "policy")
        if thread4_id:
            # Test split (with empty records since we don't have actual records)
            split_thread_id = self.test_split_thread(thread4_id)
            
            # Test reassign (with empty records)
            if split_thread_id:
                self.test_reassign_records(thread1_id)
        
        # Test delete (only works on empty threads)
        if split_thread_id:
            self.test_delete_thread(split_thread_id)
        
        # Print final results
        self.log("\n" + "=" * 60)
        self.log(f"📊 FINAL RESULTS")
        self.log(f"Tests Run: {self.tests_run}")
        self.log(f"Tests Passed: {self.tests_passed}")
        self.log(f"Tests Failed: {self.tests_run - self.tests_passed}")
        
        if self.tests_run > 0:
            success_rate = (self.tests_passed / self.tests_run) * 100
            self.log(f"Success Rate: {success_rate:.1f}%")
        
        if self.failed_tests:
            self.log(f"\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                self.log(f"{i}. {test['test']}")
                if 'error' in test:
                    self.log(f"   Error: {test['error']}")
                else:
                    self.log(f"   Expected: {test['expected']}, Got: {test['actual']}")
                self.log(f"   Endpoint: {test['endpoint']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = LedgerThreadAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())