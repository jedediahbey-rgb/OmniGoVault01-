#!/usr/bin/env python3
"""
Backend API Testing for Portfolio Binder Feature
Tests all binder-related endpoints including profiles, generation, runs, downloads, etc.
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid
import base64

# Use the public endpoint from frontend/.env
BASE_URL = "https://ux-overhaul-23.preview.emergentagent.com/api"

class BinderAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Binder-API-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_portfolio_id = f"test_portfolio_{uuid.uuid4().hex[:8]}"
        self.created_profiles = []
        self.created_runs = []

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def test_endpoint(self, method, endpoint, expected_status, data=None, description="", params=None, expect_binary=False):
        """Test a single API endpoint"""
        url = f"{self.base_url}{endpoint}"
        self.tests_run += 1
        
        self.log(f"Testing: {description or f'{method} {endpoint}'}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, params=params, timeout=30)
            elif method == 'POST':
                response = self.session.post(url, json=data, params=params, timeout=30)
            elif method == 'PUT':
                response = self.session.put(url, json=data, params=params, timeout=30)
            elif method == 'DELETE':
                response = self.session.delete(url, params=params, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASS - Status: {response.status_code}")
                
                if expect_binary:
                    return {"status_code": response.status_code, "content": response.content}
                
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

    def test_get_profiles(self):
        """Test GET /api/binder/profiles - should return 3 default profiles"""
        self.log("\n=== Testing Get Binder Profiles ===")
        
        result = self.test_endpoint(
            'GET',
            '/binder/profiles',
            200,
            params={'portfolio_id': self.test_portfolio_id},
            description="Get binder profiles (should create defaults)"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            profiles = data.get('profiles', [])
            total = data.get('total', 0)
            
            if len(profiles) == 3 and total == 3:
                self.log(f"✅ Found 3 default profiles as expected")
                
                # Check profile types
                profile_types = {p.get('profile_type') for p in profiles}
                expected_types = {'audit', 'court', 'omni'}
                
                if profile_types == expected_types:
                    self.log(f"✅ All expected profile types found: {profile_types}")
                    self.created_profiles = profiles
                    return profiles
                else:
                    self.log(f"❌ Profile types mismatch. Expected: {expected_types}, Got: {profile_types}")
                    return None
            else:
                self.log(f"❌ Expected 3 profiles, got {len(profiles)}")
                return None
        return None

    def test_get_single_profile(self, profile_id):
        """Test GET /api/binder/profiles/{id}"""
        self.log(f"\n=== Testing Get Single Profile: {profile_id} ===")
        
        result = self.test_endpoint(
            'GET',
            f'/binder/profiles/{profile_id}',
            200,
            description=f"Get profile details for {profile_id}"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            profile = data.get('profile', {})
            
            if profile.get('id') == profile_id:
                self.log(f"✅ Profile retrieved: {profile.get('name')} ({profile.get('profile_type')})")
                return profile
            else:
                self.log(f"❌ Profile ID mismatch")
                return None
        return None

    def test_update_profile(self, profile_id):
        """Test PUT /api/binder/profiles/{id}"""
        self.log(f"\n=== Testing Update Profile: {profile_id} ===")
        
        update_data = {
            "name": "Updated Test Profile",
            "rules": {
                "include_drafts": True,
                "include_pending_approved_executed": True,
                "include_attachments": False,
                "date_range": "12months"
            }
        }
        
        result = self.test_endpoint(
            'PUT',
            f'/binder/profiles/{profile_id}',
            200,
            data=update_data,
            description=f"Update profile {profile_id}"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            profile = data.get('profile', {})
            
            if profile.get('name') == "Updated Test Profile":
                self.log(f"✅ Profile updated successfully")
                return True
            else:
                self.log(f"❌ Profile update failed")
                return False
        return False

    def test_generate_binder(self, profile_id):
        """Test POST /api/binder/generate"""
        self.log(f"\n=== Testing Generate Binder ===")
        
        generate_data = {
            "portfolio_id": self.test_portfolio_id,
            "profile_id": profile_id
        }
        
        result = self.test_endpoint(
            'POST',
            '/binder/generate',
            200,
            data=generate_data,
            description=f"Generate binder with profile {profile_id}"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            run_id = data.get('run_id')
            status = data.get('status')
            total_items = data.get('total_items', 0)
            
            if run_id and status == 'complete':
                self.log(f"✅ Binder generated successfully: {run_id}, {total_items} items")
                self.created_runs.append(run_id)
                return run_id
            elif run_id and status in ['queued', 'generating']:
                self.log(f"✅ Binder generation started: {run_id}, status: {status}")
                self.created_runs.append(run_id)
                return run_id
            else:
                self.log(f"❌ Binder generation failed")
                return None
        return None

    def test_get_runs(self):
        """Test GET /api/binder/runs"""
        self.log(f"\n=== Testing Get Binder Runs ===")
        
        result = self.test_endpoint(
            'GET',
            '/binder/runs',
            200,
            params={'portfolio_id': self.test_portfolio_id, 'limit': 10},
            description="Get binder run history"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            runs = data.get('runs', [])
            total = data.get('total', 0)
            
            self.log(f"✅ Found {len(runs)} runs, total: {total}")
            for run in runs:
                self.log(f"   - {run.get('id')}: {run.get('profile_name')} ({run.get('status')})")
            return runs
        return None

    def test_get_single_run(self, run_id):
        """Test GET /api/binder/runs/{id}"""
        self.log(f"\n=== Testing Get Single Run: {run_id} ===")
        
        result = self.test_endpoint(
            'GET',
            f'/binder/runs/{run_id}',
            200,
            description=f"Get run details for {run_id}"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            run = data.get('run', {})
            
            if run.get('id') == run_id:
                self.log(f"✅ Run retrieved: {run.get('profile_name')} ({run.get('status')})")
                return run
            else:
                self.log(f"❌ Run ID mismatch")
                return None
        return None

    def test_get_latest_run(self):
        """Test GET /api/binder/latest"""
        self.log(f"\n=== Testing Get Latest Binder ===")
        
        result = self.test_endpoint(
            'GET',
            '/binder/latest',
            200,
            params={'portfolio_id': self.test_portfolio_id},
            description="Get latest completed binder"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            run = data.get('run')
            
            if run:
                self.log(f"✅ Latest run found: {run.get('id')} ({run.get('status')})")
                return run
            else:
                self.log(f"✅ No completed binders found (expected for new portfolio)")
                return None
        return None

    def test_download_binder(self, run_id):
        """Test GET /api/binder/runs/{id}/download"""
        self.log(f"\n=== Testing Download Binder: {run_id} ===")
        
        result = self.test_endpoint(
            'GET',
            f'/binder/runs/{run_id}/download',
            200,
            description=f"Download binder PDF for {run_id}",
            expect_binary=True
        )
        
        if result and result.get('status_code') == 200:
            content = result.get('content', b'')
            if content and content.startswith(b'%PDF'):
                self.log(f"✅ PDF downloaded successfully: {len(content)} bytes")
                return True
            else:
                self.log(f"❌ Downloaded content is not a valid PDF")
                return False
        return False

    def test_view_binder(self, run_id):
        """Test GET /api/binder/runs/{id}/view"""
        self.log(f"\n=== Testing View Binder: {run_id} ===")
        
        result = self.test_endpoint(
            'GET',
            f'/binder/runs/{run_id}/view',
            200,
            description=f"View binder PDF for {run_id}",
            expect_binary=True
        )
        
        if result and result.get('status_code') == 200:
            content = result.get('content', b'')
            if content and content.startswith(b'%PDF'):
                self.log(f"✅ PDF viewed successfully: {len(content)} bytes")
                return True
            else:
                self.log(f"❌ Viewed content is not a valid PDF")
                return False
        return False

    def test_get_manifest(self, run_id):
        """Test GET /api/binder/manifest/{id}"""
        self.log(f"\n=== Testing Get Manifest: {run_id} ===")
        
        result = self.test_endpoint(
            'GET',
            f'/binder/manifest/{run_id}',
            200,
            description=f"Get manifest for {run_id}"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            manifest = data.get('manifest', [])
            profile_name = data.get('profile_name')
            generated_at = data.get('generated_at')
            
            manifest_len = len(manifest) if manifest else 0
            self.log(f"✅ Manifest retrieved: {manifest_len} items, profile: {profile_name}")
            return manifest
        return None

    def test_stale_check(self):
        """Test GET /api/binder/stale-check"""
        self.log(f"\n=== Testing Stale Check ===")
        
        result = self.test_endpoint(
            'GET',
            '/binder/stale-check',
            200,
            params={'portfolio_id': self.test_portfolio_id},
            description="Check if binder is stale"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            is_stale = data.get('is_stale')
            reason = data.get('reason')
            message = data.get('message')
            
            self.log(f"✅ Stale check completed: stale={is_stale}, reason={reason}")
            self.log(f"   Message: {message}")
            return True
        return False

    def test_validation_errors(self):
        """Test various validation error scenarios"""
        self.log("\n=== Testing Validation Errors ===")
        
        # Test generate without portfolio_id
        result1 = self.test_endpoint(
            'POST',
            '/binder/generate',
            400,
            data={"profile_id": "test"},
            description="Generate without portfolio_id (should fail)"
        )
        
        # Test generate without profile_id
        result2 = self.test_endpoint(
            'POST',
            '/binder/generate',
            400,
            data={"portfolio_id": self.test_portfolio_id},
            description="Generate without profile_id (should fail)"
        )
        
        # Test get profiles without portfolio_id
        result3 = self.test_endpoint(
            'GET',
            '/binder/profiles',
            400,
            description="Get profiles without portfolio_id (should fail)"
        )
        
        # Test get non-existent profile
        result4 = self.test_endpoint(
            'GET',
            '/binder/profiles/nonexistent',
            404,
            description="Get non-existent profile (should fail)"
        )
        
        # Test get non-existent run
        result5 = self.test_endpoint(
            'GET',
            '/binder/runs/nonexistent',
            404,
            description="Get non-existent run (should fail)"
        )
        
        # All should return None (meaning they got expected error status)
        success_count = sum(1 for r in [result1, result2, result3, result4, result5] if r is None)
        self.log(f"✅ Validation tests passed: {success_count}/5")
        return success_count == 5

    def wait_for_generation(self, run_id, max_wait=60):
        """Wait for binder generation to complete"""
        self.log(f"\n=== Waiting for Generation: {run_id} ===")
        
        start_time = time.time()
        while time.time() - start_time < max_wait:
            run = self.test_get_single_run(run_id)
            if run:
                status = run.get('status')
                if status == 'complete':
                    self.log(f"✅ Generation completed successfully")
                    return True
                elif status == 'failed':
                    self.log(f"❌ Generation failed")
                    return False
                else:
                    self.log(f"⏳ Still generating... status: {status}")
                    time.sleep(5)
            else:
                self.log(f"❌ Could not check run status")
                return False
        
        self.log(f"❌ Generation timed out after {max_wait} seconds")
        return False

    def run_all_tests(self):
        """Run all binder API tests"""
        self.log("🚀 Starting Backend API Tests for Portfolio Binder")
        self.log("=" * 60)
        
        # Test profile management
        self.log("\n📋 PROFILE MANAGEMENT")
        self.log("-" * 40)
        
        profiles = self.test_get_profiles()
        if not profiles:
            self.log("❌ Failed to get profiles, stopping tests")
            return False
        
        # Test individual profile operations
        test_profile = profiles[0]  # Use first profile for testing
        profile_id = test_profile.get('id')
        
        self.test_get_single_profile(profile_id)
        self.test_update_profile(profile_id)
        
        # Test binder generation
        self.log("\n🔄 BINDER GENERATION")
        self.log("-" * 40)
        
        run_id = self.test_generate_binder(profile_id)
        if not run_id:
            self.log("❌ Failed to generate binder, skipping dependent tests")
        else:
            # Wait for generation to complete (if needed)
            generation_complete = self.wait_for_generation(run_id, max_wait=30)
            
            if generation_complete:
                # Test download and view endpoints
                self.test_download_binder(run_id)
                self.test_view_binder(run_id)
                self.test_get_manifest(run_id)
        
        # Test run management
        self.log("\n📊 RUN MANAGEMENT")
        self.log("-" * 40)
        
        self.test_get_runs()
        if run_id:
            self.test_get_single_run(run_id)
        self.test_get_latest_run()
        
        # Test utility endpoints
        self.log("\n🔧 UTILITY ENDPOINTS")
        self.log("-" * 40)
        
        self.test_stale_check()
        
        # Test validation
        self.log("\n✅ VALIDATION TESTS")
        self.log("-" * 40)
        
        self.test_validation_errors()
        
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
    tester = BinderAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())