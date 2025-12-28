#!/usr/bin/env python3
"""
RM-ID V2 Allocator Testing - Comprehensive Uniqueness and Concurrency Tests
Tests the new V2 RM-ID allocator system for atomic, unique RM-ID generation
"""

import requests
import sys
import json
import time
import threading
import concurrent.futures
from datetime import datetime
from collections import defaultdict
import re

class RMIDv2Tester:
    def __init__(self, base_url="https://role-manager-21.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.portfolio_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_disputes = []
        self.all_rm_ids = []

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

    def setup_test_session(self):
        """Create test user and session"""
        print("🔧 Setting up test session...")
        
        import subprocess
        
        timestamp = int(datetime.now().timestamp() * 1000)
        self.user_id = f"rmid-test-user-{timestamp}"
        self.session_token = f"rmid_test_session_{timestamp}"
        
        mongo_script = f'''
        use('test_database');
        db.users.insertOne({{
          user_id: "{self.user_id}",
          email: "rmid.test.{timestamp}@example.com",
          name: "RM-ID Test User",
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
        """Create test portfolio"""
        print("🔧 Setting up test portfolio...")
        
        portfolio_data = {
            "name": f"RM-ID V2 Test Portfolio {datetime.now().strftime('%H%M%S')}",
            "description": "Test portfolio for RM-ID V2 allocator testing"
        }
        
        url = f"{self.base_url}/api/portfolios"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }
        
        try:
            response = requests.post(url, json=portfolio_data, headers=headers, timeout=10)
            if response.status_code == 200:
                portfolio = response.json()
                self.portfolio_id = portfolio.get('portfolio_id')
                print(f"✅ Test portfolio created: {self.portfolio_id}")
                return True
            else:
                print(f"❌ Failed to create portfolio: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error creating portfolio: {e}")
            return False

    def api_request(self, method, endpoint, data=None, expected_status=200):
        """Make API request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            if response.status_code == expected_status:
                try:
                    return response.json() if response.content else {}
                except:
                    return {}
            else:
                print(f"❌ API Error: {method} {endpoint} returned {response.status_code}, expected {expected_status}")
                if response.content:
                    try:
                        error_data = response.json()
                        print(f"   Error details: {error_data}")
                    except:
                        print(f"   Response: {response.text[:200]}")
                return None
        except Exception as e:
            print(f"❌ API Exception: {method} {endpoint} - {e}")
            return None

    def test_rm_preview_endpoint(self):
        """Test the RM-ID preview endpoint"""
        print("\n📋 Testing RM-ID Preview Endpoint...")
        
        # Test 1: Basic preview without relation
        preview = self.api_request('GET', f'rm/preview?portfolio_id={self.portfolio_id}')
        if preview and 'data' in preview:
            preview_data = preview['data']
            preview_rm_id = preview_data.get('preview_rm_id', '')
            print(f"   Preview RM-ID: {preview_rm_id}")
            
            # Validate format
            if self.validate_rm_id_format(preview_rm_id):
                self.log_test("RM Preview - Format Validation", True)
            else:
                self.log_test("RM Preview - Format Validation", False, f"Invalid format: {preview_rm_id}")
            
            self.log_test("RM Preview - Basic Preview", True)
        else:
            self.log_test("RM Preview - Basic Preview", False, "No preview data returned")

    def validate_rm_id_format(self, rm_id):
        """Validate RM-ID format: BASE-NN.SSS"""
        if not rm_id:
            return False
        
        # Pattern: BASE-NN.SSS (e.g., RF123456789US-42.001)
        pattern = r'^.+-\d{2,3}\.\d{3}$'
        return bool(re.match(pattern, rm_id))

    def create_dispute_rapid(self, index):
        """Create a single dispute rapidly (for concurrency testing)"""
        dispute_data = {
            "portfolio_id": self.portfolio_id,
            "title": f"Rapid Test Dispute {index:03d} - {datetime.now().strftime('%H%M%S%f')}",
            "dispute_type": "beneficiary",
            "description": f"Concurrency test dispute #{index}",
            "amount_claimed": 1000.0 + (index * 100),
            "currency": "USD",
            "priority": "medium",
            "case_number": f"RAPID-{index:03d}-{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
            "jurisdiction": "Delaware"
        }
        
        result = self.api_request('POST', 'governance/disputes', dispute_data)
        if result and 'item' in result:
            dispute = result['item']
            rm_id = dispute.get('rm_id', '')
            dispute_id = dispute.get('dispute_id', '')
            return {
                'index': index,
                'dispute_id': dispute_id,
                'rm_id': rm_id,
                'success': True,
                'timestamp': datetime.now().isoformat()
            }
        else:
            return {
                'index': index,
                'success': False,
                'error': 'Failed to create dispute',
                'timestamp': datetime.now().isoformat()
            }

    def test_rapid_dispute_creation(self):
        """Test creating 10 disputes rapidly to verify uniqueness"""
        print("\n📋 Testing Rapid Dispute Creation (Uniqueness Test)...")
        
        # Create 10 disputes rapidly using threading for concurrency
        print("   Creating 10 disputes concurrently...")
        start_time = time.time()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(self.create_dispute_rapid, i) for i in range(1, 11)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        end_time = time.time()
        duration = end_time - start_time
        print(f"   ⏱️ Created 10 disputes in {duration:.2f} seconds")
        
        # Analyze results
        successful_results = [r for r in results if r['success']]
        failed_results = [r for r in results if not r['success']]
        
        print(f"   ✅ Successful: {len(successful_results)}")
        print(f"   ❌ Failed: {len(failed_results)}")
        
        if failed_results:
            for failure in failed_results:
                print(f"      Failed #{failure['index']}: {failure.get('error', 'Unknown error')}")
        
        # Extract RM-IDs and check uniqueness
        rm_ids = [r['rm_id'] for r in successful_results if r['rm_id']]
        self.all_rm_ids.extend(rm_ids)
        self.created_disputes.extend(successful_results)
        
        print(f"   📋 RM-IDs generated:")
        for result in sorted(successful_results, key=lambda x: x['index']):
            print(f"      #{result['index']:02d}: {result['rm_id']}")
        
        # Test uniqueness
        unique_rm_ids = set(rm_ids)
        if len(rm_ids) == len(unique_rm_ids):
            self.log_test("Rapid Creation - RM-ID Uniqueness", True, f"All {len(rm_ids)} RM-IDs are unique")
        else:
            duplicates = [rm_id for rm_id in rm_ids if rm_ids.count(rm_id) > 1]
            self.log_test("Rapid Creation - RM-ID Uniqueness", False, f"Found duplicates: {set(duplicates)}")
        
        # Test format validation
        invalid_formats = [rm_id for rm_id in rm_ids if not self.validate_rm_id_format(rm_id)]
        if not invalid_formats:
            self.log_test("Rapid Creation - Format Validation", True, "All RM-IDs follow correct format")
        else:
            self.log_test("Rapid Creation - Format Validation", False, f"Invalid formats: {invalid_formats}")
        
        # Test group number distribution
        group_numbers = []
        for rm_id in rm_ids:
            if '-' in rm_id and '.' in rm_id:
                try:
                    parts = rm_id.split('-')[1].split('.')
                    group_num = int(parts[0])
                    group_numbers.append(group_num)
                except:
                    pass
        
        unique_groups = set(group_numbers)
        print(f"   📊 Group numbers used: {sorted(unique_groups)}")
        
        # For unrelated disputes, each should get a different group number
        if len(unique_groups) == len(group_numbers):
            self.log_test("Rapid Creation - Unique Group Numbers", True, f"Each dispute got unique group number")
        else:
            self.log_test("Rapid Creation - Unique Group Numbers", False, f"Some disputes share group numbers: {group_numbers}")
        
        return len(successful_results) >= 8  # Allow for some failures due to concurrency

    def test_database_collections(self):
        """Test that rm_groups and rm_allocations collections are populated"""
        print("\n📋 Testing Database Collections...")
        
        import subprocess
        
        # Check rm_groups collection
        groups_script = f'''
        use('test_database');
        db.rm_groups.find({{"portfolio_id": "{self.portfolio_id}"}}).count();
        '''
        
        try:
            result = subprocess.run(['mongosh', '--eval', groups_script], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                groups_count = int(result.stdout.strip())
                print(f"   📊 rm_groups collection: {groups_count} entries")
                if groups_count > 0:
                    self.log_test("Database - rm_groups Collection", True, f"Found {groups_count} group entries")
                else:
                    self.log_test("Database - rm_groups Collection", False, "No group entries found")
            else:
                self.log_test("Database - rm_groups Collection", False, "Failed to query rm_groups")
        except Exception as e:
            self.log_test("Database - rm_groups Collection", False, str(e))
        
        # Check rm_allocations collection
        allocations_script = f'''
        use('test_database');
        db.rm_allocations.find({{"portfolio_id": "{self.portfolio_id}"}}).count();
        '''
        
        try:
            result = subprocess.run(['mongosh', '--eval', allocations_script], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                allocations_count = int(result.stdout.strip())
                print(f"   📊 rm_allocations collection: {allocations_count} entries")
                if allocations_count > 0:
                    self.log_test("Database - rm_allocations Collection", True, f"Found {allocations_count} allocation entries")
                else:
                    self.log_test("Database - rm_allocations Collection", False, "No allocation entries found")
            else:
                self.log_test("Database - rm_allocations Collection", False, "Failed to query rm_allocations")
        except Exception as e:
            self.log_test("Database - rm_allocations Collection", False, str(e))

    def test_unique_constraint_enforcement(self):
        """Test that database unique constraints prevent duplicates"""
        print("\n📋 Testing Database Unique Constraint Enforcement...")
        
        if not self.all_rm_ids:
            print("   ⚠️ No RM-IDs available for constraint testing")
            return
        
        # Try to manually insert a duplicate RM-ID into governance_records
        # This should fail due to unique constraint
        import subprocess
        
        test_rm_id = self.all_rm_ids[0] if self.all_rm_ids else "TEST-99.999"
        
        duplicate_script = f'''
        use('test_database');
        try {{
            db.governance_records.insertOne({{
                "id": "test_duplicate_constraint",
                "portfolio_id": "{self.portfolio_id}",
                "user_id": "{self.user_id}",
                "rm_id": "{test_rm_id}",
                "module_type": "test",
                "title": "Duplicate Test",
                "created_at": new Date()
            }});
            print("INSERT_SUCCESS");
        }} catch (e) {{
            if (e.code === 11000) {{
                print("DUPLICATE_KEY_ERROR");
            }} else {{
                print("OTHER_ERROR: " + e.message);
            }}
        }}
        '''
        
        try:
            result = subprocess.run(['mongosh', '--eval', duplicate_script], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                output = result.stdout.strip()
                if "DUPLICATE_KEY_ERROR" in output:
                    self.log_test("Database - Unique Constraint Enforcement", True, "Duplicate RM-ID correctly rejected")
                elif "INSERT_SUCCESS" in output:
                    self.log_test("Database - Unique Constraint Enforcement", False, "Duplicate RM-ID was allowed (constraint not working)")
                else:
                    self.log_test("Database - Unique Constraint Enforcement", False, f"Unexpected result: {output}")
            else:
                self.log_test("Database - Unique Constraint Enforcement", False, "Failed to test constraint")
        except Exception as e:
            self.log_test("Database - Unique Constraint Enforcement", False, str(e))

    def test_related_records_grouping(self):
        """Test that related records share the same group number"""
        print("\n📋 Testing Related Records Grouping...")
        
        if not self.created_disputes:
            print("   ⚠️ No disputes available for grouping test")
            return
        
        # Create a related dispute (amendment) to an existing dispute
        original_dispute = self.created_disputes[0]
        original_dispute_id = original_dispute['dispute_id']
        
        print(f"   Creating related dispute to: {original_dispute_id}")
        
        related_dispute_data = {
            "portfolio_id": self.portfolio_id,
            "title": f"Related Dispute to {original_dispute_id}",
            "dispute_type": "beneficiary",
            "description": "This dispute is related to another dispute",
            "amount_claimed": 5000.0,
            "currency": "USD",
            "priority": "medium",
            "case_number": f"RELATED-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "jurisdiction": "Delaware",
            "related_to": {
                "record_id": original_dispute_id
            }
        }
        
        related_result = self.api_request('POST', 'governance/disputes', related_dispute_data)
        if related_result and 'item' in related_result:
            related_dispute = related_result['item']
            related_rm_id = related_dispute.get('rm_id', '')
            
            print(f"   Original RM-ID: {original_dispute['rm_id']}")
            print(f"   Related RM-ID:  {related_rm_id}")
            
            # Extract group numbers
            original_group = self.extract_group_number(original_dispute['rm_id'])
            related_group = self.extract_group_number(related_rm_id)
            
            if original_group and related_group:
                if original_group == related_group:
                    self.log_test("Related Records - Same Group Number", True, f"Both use group {original_group}")
                else:
                    self.log_test("Related Records - Same Group Number", False, f"Different groups: {original_group} vs {related_group}")
            else:
                self.log_test("Related Records - Same Group Number", False, "Could not extract group numbers")
        else:
            self.log_test("Related Records - Same Group Number", False, "Failed to create related dispute")

    def extract_group_number(self, rm_id):
        """Extract group number from RM-ID"""
        if not rm_id or '-' not in rm_id or '.' not in rm_id:
            return None
        try:
            parts = rm_id.split('-')[1].split('.')
            return int(parts[0])
        except:
            return None

    def test_sequential_subnumbers(self):
        """Test that related records get sequential subnumbers"""
        print("\n📋 Testing Sequential Subnumbers...")
        
        if not self.created_disputes:
            print("   ⚠️ No disputes available for subnumber test")
            return
        
        # Create multiple related disputes to test subnumber sequence
        original_dispute = self.created_disputes[0]
        original_dispute_id = original_dispute['dispute_id']
        original_rm_id = original_dispute['rm_id']
        
        print(f"   Creating 3 related disputes to: {original_dispute_id}")
        
        related_rm_ids = [original_rm_id]
        
        for i in range(1, 4):
            related_data = {
                "portfolio_id": self.portfolio_id,
                "title": f"Sequential Test Dispute {i}",
                "dispute_type": "beneficiary",
                "description": f"Sequential test dispute #{i}",
                "amount_claimed": 1000.0 * i,
                "currency": "USD",
                "priority": "medium",
                "case_number": f"SEQ-{i}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "jurisdiction": "Delaware",
                "related_to": {
                    "record_id": original_dispute_id
                }
            }
            
            result = self.api_request('POST', 'governance/disputes', related_data)
            if result and 'item' in result:
                related_rm_id = result['item'].get('rm_id', '')
                related_rm_ids.append(related_rm_id)
                print(f"   Related #{i}: {related_rm_id}")
        
        # Analyze subnumber sequence
        subnumbers = []
        for rm_id in related_rm_ids:
            if rm_id and '-' in rm_id and '.' in rm_id:
                try:
                    sub_part = rm_id.split('.')[-1]
                    subnumbers.append(int(sub_part))
                except:
                    pass
        
        if len(subnumbers) >= 2:
            is_sequential = all(subnumbers[i] == subnumbers[i-1] + 1 for i in range(1, len(subnumbers)))
            if is_sequential:
                self.log_test("Sequential Subnumbers", True, f"Subnumbers are sequential: {subnumbers}")
            else:
                self.log_test("Sequential Subnumbers", False, f"Subnumbers not sequential: {subnumbers}")
        else:
            self.log_test("Sequential Subnumbers", False, "Could not extract enough subnumbers")

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete created disputes
        deleted_count = 0
        for dispute in self.created_disputes:
            dispute_id = dispute.get('dispute_id')
            if dispute_id:
                result = self.api_request('DELETE', f'governance/disputes/{dispute_id}')
                if result:
                    deleted_count += 1
        
        print(f"   Deleted {deleted_count} test disputes")
        
        # Delete test portfolio
        if self.portfolio_id:
            result = self.api_request('DELETE', f'portfolios/{self.portfolio_id}')
            if result:
                print(f"   Deleted test portfolio: {self.portfolio_id}")

    def run_all_tests(self):
        """Run all RM-ID V2 tests"""
        print("🚀 Starting RM-ID V2 Allocator Tests")
        print("=" * 60)
        
        # Setup
        if not self.setup_test_session():
            print("❌ Failed to setup test session, aborting tests")
            return False
        
        if not self.setup_test_portfolio():
            print("❌ Failed to setup test portfolio, aborting tests")
            return False
        
        try:
            # Run tests
            self.test_rm_preview_endpoint()
            self.test_rapid_dispute_creation()
            self.test_database_collections()
            self.test_unique_constraint_enforcement()
            self.test_related_records_grouping()
            self.test_sequential_subnumbers()
            
        finally:
            # Always cleanup
            self.cleanup_test_data()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 RM-ID V2 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All RM-ID V2 tests passed!")
            return True
        else:
            print("⚠️ Some RM-ID V2 tests failed")
            failed_tests = [t for t in self.test_results if not t['success']]
            for test in failed_tests:
                print(f"   ❌ {test['test']}: {test['details']}")
            return False

def main():
    tester = RMIDv2Tester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())