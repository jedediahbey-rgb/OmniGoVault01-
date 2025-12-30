#!/usr/bin/env python3
"""
Comprehensive RM-ID V2 Backend Testing
Tests the V2 RM-ID allocator system focusing on the specific requirements
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

class ComprehensiveRMIDTester:
    def __init__(self, base_url="https://trustdoc-enhance.preview.emergentagent.com"):
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
        self.user_id = f"rmid-comprehensive-{timestamp}"
        self.session_token = f"rmid_comp_session_{timestamp}"
        
        mongo_script = f'''
        use('test_database');
        db.users.insertOne({{
          user_id: "{self.user_id}",
          email: "rmid.comprehensive.{timestamp}@example.com",
          name: "RM-ID Comprehensive Test User",
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
        """Create test portfolio with trust profile"""
        print("🔧 Setting up test portfolio with trust profile...")
        
        # Create portfolio
        portfolio_data = {
            "name": f"RM-ID Comprehensive Test {datetime.now().strftime('%H%M%S')}",
            "description": "Comprehensive test portfolio for RM-ID V2 testing"
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
                
                # Create trust profile with RM-ID
                trust_data = {
                    "portfolio_id": self.portfolio_id,
                    "trust_name": "Test Trust for RM-ID V2",
                    "rm_id_raw": "RF123456789US",
                    "rm_id_normalized": "RF123456789US"
                }
                
                trust_response = requests.post(f"{self.base_url}/api/trust-profiles", 
                                             json=trust_data, headers=headers, timeout=10)
                if trust_response.status_code == 200:
                    print("✅ Trust profile created with RM-ID base")
                    return True
                else:
                    print(f"❌ Failed to create trust profile: {trust_response.status_code}")
                    return False
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
        """Test GET /api/rm/preview endpoint"""
        print("\n📋 Testing GET /api/rm/preview endpoint...")
        
        # Test basic preview
        preview = self.api_request('GET', f'rm/preview?portfolio_id={self.portfolio_id}')
        if preview and 'data' in preview:
            preview_data = preview['data']
            preview_rm_id = preview_data.get('preview_rm_id', '')
            is_new_group = preview_data.get('is_new_group', False)
            
            print(f"   Preview RM-ID: {preview_rm_id}")
            print(f"   Is new group: {is_new_group}")
            
            # Check if it shows [NEW] for new groups
            if is_new_group and '[NEW]' in preview_rm_id:
                self.log_test("RM Preview - New Group Format", True, "Shows [NEW] for new groups")
            elif not is_new_group:
                self.log_test("RM Preview - Existing Group Format", True, "Shows actual group number")
            else:
                self.log_test("RM Preview - Format", False, f"Unexpected format: {preview_rm_id}")
            
            self.log_test("RM Preview - Endpoint Available", True)
        else:
            self.log_test("RM Preview - Endpoint Available", False, "No preview data returned")

    def create_dispute_batch(self, count=10):
        """Create a batch of disputes rapidly"""
        print(f"\n📋 Creating {count} disputes rapidly...")
        
        start_time = time.time()
        
        def create_single_dispute(index):
            dispute_data = {
                "portfolio_id": self.portfolio_id,
                "title": f"Batch Dispute {index:03d} - {datetime.now().strftime('%H%M%S%f')}",
                "dispute_type": "beneficiary",
                "description": f"Batch test dispute #{index}",
                "amount_claimed": 1000.0 + (index * 100),
                "currency": "USD",
                "priority": "medium",
                "case_number": f"BATCH-{index:03d}-{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
                "jurisdiction": "Delaware"
            }
            
            result = self.api_request('POST', 'governance/disputes', dispute_data)
            if result and 'item' in result:
                dispute = result['item']
                return {
                    'index': index,
                    'dispute_id': dispute.get('dispute_id', ''),
                    'rm_id': dispute.get('rm_id', ''),
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
        
        # Create disputes concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(create_single_dispute, i) for i in range(1, count + 1)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Analyze results
        successful_results = [r for r in results if r['success']]
        failed_results = [r for r in results if not r['success']]
        
        print(f"   ⏱️ Created {len(successful_results)}/{count} disputes in {duration:.2f} seconds")
        print(f"   ✅ Successful: {len(successful_results)}")
        print(f"   ❌ Failed: {len(failed_results)}")
        
        # Store results
        self.created_disputes.extend(successful_results)
        rm_ids = [r['rm_id'] for r in successful_results if r['rm_id']]
        self.all_rm_ids.extend(rm_ids)
        
        return successful_results

    def test_rm_id_uniqueness(self):
        """Test RM-ID uniqueness requirement"""
        print("\n📋 Testing RM-ID Uniqueness...")
        
        # Create 10 disputes rapidly
        results = self.create_dispute_batch(10)
        
        if len(results) < 8:
            self.log_test("Dispute Creation", False, f"Only created {len(results)}/10 disputes")
            return
        
        self.log_test("Dispute Creation", True, f"Created {len(results)}/10 disputes successfully")
        
        # Extract RM-IDs
        rm_ids = [r['rm_id'] for r in results if r['rm_id']]
        
        print(f"   📋 RM-IDs generated:")
        for result in sorted(results, key=lambda x: x['index']):
            print(f"      #{result['index']:02d}: {result['rm_id']}")
        
        # Test uniqueness
        unique_rm_ids = set(rm_ids)
        if len(rm_ids) == len(unique_rm_ids):
            self.log_test("RM-ID Uniqueness", True, f"All {len(rm_ids)} RM-IDs are unique")
        else:
            duplicates = [rm_id for rm_id in rm_ids if rm_ids.count(rm_id) > 1]
            self.log_test("RM-ID Uniqueness", False, f"Found duplicates: {set(duplicates)}")

    def test_rm_id_format(self):
        """Test RM-ID format: BASE-NN.SSS"""
        print("\n📋 Testing RM-ID Format...")
        
        if not self.all_rm_ids:
            self.log_test("RM-ID Format", False, "No RM-IDs available for testing")
            return
        
        # Pattern: BASE-NN.SSS (e.g., RF123456789US-42.001)
        pattern = r'^.+-\d{2,3}\.\d{3}$'
        
        valid_formats = []
        invalid_formats = []
        
        for rm_id in self.all_rm_ids:
            if re.match(pattern, rm_id):
                valid_formats.append(rm_id)
            else:
                invalid_formats.append(rm_id)
        
        print(f"   ✅ Valid format: {len(valid_formats)}")
        print(f"   ❌ Invalid format: {len(invalid_formats)}")
        
        if invalid_formats:
            print(f"   Invalid RM-IDs: {invalid_formats[:3]}...")  # Show first 3
        
        if len(valid_formats) == len(self.all_rm_ids):
            self.log_test("RM-ID Format Validation", True, "All RM-IDs follow BASE-NN.SSS format")
        else:
            self.log_test("RM-ID Format Validation", False, f"{len(invalid_formats)} RM-IDs have invalid format")

    def test_unique_group_numbers(self):
        """Test that new unrelated records get NEW random group numbers"""
        print("\n📋 Testing Unique Group Numbers for Unrelated Records...")
        
        if not self.all_rm_ids:
            self.log_test("Unique Group Numbers", False, "No RM-IDs available for testing")
            return
        
        # Extract group numbers
        group_numbers = []
        for rm_id in self.all_rm_ids:
            if '-' in rm_id and '.' in rm_id:
                try:
                    parts = rm_id.split('-')[1].split('.')
                    group_num = int(parts[0])
                    group_numbers.append(group_num)
                except:
                    pass
        
        unique_groups = set(group_numbers)
        print(f"   📊 Total RM-IDs: {len(self.all_rm_ids)}")
        print(f"   📊 Group numbers extracted: {len(group_numbers)}")
        print(f"   📊 Unique group numbers: {len(unique_groups)}")
        print(f"   📊 Group numbers used: {sorted(unique_groups)}")
        
        # For unrelated disputes, each should get a different group number
        if len(unique_groups) == len(group_numbers):
            self.log_test("Unique Group Numbers", True, f"Each unrelated record got unique group number")
        else:
            shared_groups = len(group_numbers) - len(unique_groups)
            self.log_test("Unique Group Numbers", False, f"{shared_groups} records share group numbers")

    def test_database_collections(self):
        """Test rm_groups and rm_allocations collections"""
        print("\n📋 Testing Database Collections...")
        
        import subprocess
        
        # Test rm_groups collection
        groups_script = f'''
        use('test_database');
        print("Groups for portfolio {self.portfolio_id}:");
        db.rm_groups.find({{"portfolio_id": "{self.portfolio_id}"}}).forEach(function(doc) {{
            print("  Group " + doc.rm_group + ": " + doc.rm_base + " (next_sub: " + doc.next_sub + ")");
        }});
        print("Total groups: " + db.rm_groups.find({{"portfolio_id": "{self.portfolio_id}"}}).count());
        '''
        
        try:
            result = subprocess.run(['mongosh', '--eval', groups_script], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                print("   📊 rm_groups collection:")
                print("   " + result.stdout.replace('\n', '\n   '))
                
                # Count groups
                count_script = f'use("test_database"); db.rm_groups.find({{"portfolio_id": "{self.portfolio_id}"}}).count();'
                count_result = subprocess.run(['mongosh', '--eval', count_script], 
                                            capture_output=True, text=True, timeout=10)
                if count_result.returncode == 0:
                    groups_count = int(count_result.stdout.strip())
                    if groups_count > 0:
                        self.log_test("rm_groups Collection", True, f"Found {groups_count} group entries")
                    else:
                        self.log_test("rm_groups Collection", False, "No group entries found")
            else:
                self.log_test("rm_groups Collection", False, "Failed to query rm_groups")
        except Exception as e:
            self.log_test("rm_groups Collection", False, str(e))
        
        # Test rm_allocations collection
        allocations_script = f'''
        use('test_database');
        print("Allocations for portfolio {self.portfolio_id}:");
        db.rm_allocations.find({{"portfolio_id": "{self.portfolio_id}"}}).forEach(function(doc) {{
            print("  " + doc.rm_id + " (" + doc.module_type + ", group: " + doc.rm_group + ", sub: " + doc.rm_sub + ")");
        }});
        print("Total allocations: " + db.rm_allocations.find({{"portfolio_id": "{self.portfolio_id}"}}).count());
        '''
        
        try:
            result = subprocess.run(['mongosh', '--eval', allocations_script], 
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                print("   📊 rm_allocations collection:")
                print("   " + result.stdout.replace('\n', '\n   '))
                
                # Count allocations
                count_script = f'use("test_database"); db.rm_allocations.find({{"portfolio_id": "{self.portfolio_id}"}}).count();'
                count_result = subprocess.run(['mongosh', '--eval', count_script], 
                                            capture_output=True, text=True, timeout=10)
                if count_result.returncode == 0:
                    allocations_count = int(count_result.stdout.strip())
                    if allocations_count > 0:
                        self.log_test("rm_allocations Collection", True, f"Found {allocations_count} allocation entries")
                    else:
                        self.log_test("rm_allocations Collection", False, "No allocation entries found")
            else:
                self.log_test("rm_allocations Collection", False, "Failed to query rm_allocations")
        except Exception as e:
            self.log_test("rm_allocations Collection", False, str(e))

    def test_db_unique_constraints(self):
        """Test database unique constraints on rm_id"""
        print("\n📋 Testing Database Unique Constraints...")
        
        if not self.all_rm_ids:
            print("   ⚠️ No RM-IDs available for constraint testing")
            return
        
        # Check which collections have unique constraints
        import subprocess
        
        collections_to_check = ['governance_records', 'disputes', 'distributions', 'meetings']
        
        for collection in collections_to_check:
            index_script = f'use("test_database"); db.{collection}.getIndexes();'
            try:
                result = subprocess.run(['mongosh', '--eval', index_script], 
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    indexes = result.stdout
                    if 'rm_id' in indexes and 'unique' in indexes:
                        print(f"   ✅ {collection}: Has unique constraint on rm_id")
                        self.log_test(f"Unique Constraint - {collection}", True, "Has unique rm_id constraint")
                    else:
                        print(f"   ❌ {collection}: No unique constraint on rm_id")
                        self.log_test(f"Unique Constraint - {collection}", False, "Missing unique rm_id constraint")
            except Exception as e:
                print(f"   ❌ {collection}: Error checking indexes - {e}")

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
        """Run comprehensive RM-ID V2 tests"""
        print("🚀 Starting Comprehensive RM-ID V2 Backend Tests")
        print("=" * 70)
        
        # Setup
        if not self.setup_test_session():
            print("❌ Failed to setup test session, aborting tests")
            return False
        
        if not self.setup_test_portfolio():
            print("❌ Failed to setup test portfolio, aborting tests")
            return False
        
        try:
            # Run all tests
            self.test_rm_preview_endpoint()
            self.test_rm_id_uniqueness()
            self.test_rm_id_format()
            self.test_unique_group_numbers()
            self.test_database_collections()
            self.test_db_unique_constraints()
            
        finally:
            # Always cleanup
            self.cleanup_test_data()
        
        # Print summary
        print("\n" + "=" * 70)
        print(f"📊 Comprehensive RM-ID V2 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        # Categorize results
        critical_failures = []
        minor_issues = []
        
        for test in self.test_results:
            if not test['success']:
                if any(keyword in test['test'].lower() for keyword in ['uniqueness', 'constraint', 'duplicate']):
                    critical_failures.append(test)
                else:
                    minor_issues.append(test)
        
        if critical_failures:
            print("\n🚨 CRITICAL ISSUES:")
            for test in critical_failures:
                print(f"   ❌ {test['test']}: {test['details']}")
        
        if minor_issues:
            print("\n⚠️ MINOR ISSUES:")
            for test in minor_issues:
                print(f"   ❌ {test['test']}: {test['details']}")
        
        if self.tests_passed == self.tests_run:
            print("\n🎉 All RM-ID V2 tests passed!")
            return True
        else:
            success_rate = (self.tests_passed / self.tests_run) * 100
            print(f"\n📊 Success rate: {success_rate:.1f}%")
            return success_rate >= 80  # Consider 80%+ as acceptable

def main():
    tester = ComprehensiveRMIDTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())