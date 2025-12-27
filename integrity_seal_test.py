#!/usr/bin/env python3
"""
Backend API Testing for Enhanced Integrity Seals
Tests cryptographic sealing, verification, and chain integrity for finalized records.
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid

# Use the public endpoint from frontend/.env
BASE_URL = "https://proof-vault.preview.emergentagent.com/api"

class IntegritySealAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Integrity-Seal-API-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_portfolio_id = f"test_portfolio_{uuid.uuid4().hex[:8]}"
        self.created_records = []  # Track created records for cleanup
        self.created_seals = []    # Track created seals

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def test_endpoint(self, method, endpoint, expected_status, data=None, description="", params=None):
        """Test a single API endpoint"""
        url = f"{self.base_url}{endpoint}"
        self.tests_run += 1
        
        self.log(f"Testing: {description or f'{method} {endpoint}'}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, params=params, timeout=15)
            elif method == 'POST':
                response = self.session.post(url, json=data, params=params, timeout=15)
            elif method == 'PUT':
                response = self.session.put(url, json=data, params=params, timeout=15)
            elif method == 'DELETE':
                response = self.session.delete(url, params=params, timeout=15)
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

    def create_test_record(self, title="Test Meeting Minutes", finalize=False):
        """Create a test governance record for sealing"""
        self.log(f"\n=== Creating Test Record: {title} ===")
        
        # Create a governance record using V2 API with all required fields
        meeting_datetime = datetime.now().isoformat()
        record_data = {
            "title": title,
            "module_type": "minutes",
            "portfolio_id": self.test_portfolio_id,
            "payload_json": {
                "title": title,  # Required for finalization
                "meeting_type": "regular",
                "meeting_datetime": meeting_datetime,  # Required for finalization
                "date_time": meeting_datetime,
                "location": "Test Location",
                "called_by": "Test Caller",
                "attendees": [{"name": "Test Attendee", "role": "trustee", "present": True}],
                "agenda_items": [{"title": "Test Agenda Item", "discussion_summary": "Test discussion"}],
                "notes": "Test meeting notes"
            }
        }
        
        result = self.test_endpoint(
            'POST',
            '/governance/v2/records',
            200,
            data=record_data,
            description=f"Create test record: {title}"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            record_id = data.get('record', {}).get('id')
            
            if record_id:
                self.log(f"✅ Record created: {record_id}")
                self.created_records.append(record_id)
                
                # Finalize the record if requested
                if finalize:
                    finalize_result = self.test_endpoint(
                        'POST',
                        f'/governance/v2/records/{record_id}/finalize',
                        200,
                        description=f"Finalize record {record_id}"
                    )
                    
                    if finalize_result and finalize_result.get('ok'):
                        self.log(f"✅ Record finalized: {record_id}")
                        return record_id
                    else:
                        self.log(f"❌ Failed to finalize record: {record_id}")
                        return None
                else:
                    return record_id
            else:
                self.log(f"❌ No record ID in response")
                return None
        return None

    def test_create_seal_draft_record(self):
        """Test POST /api/integrity/seal/{record_id} on draft record (should fail)"""
        self.log("\n=== Testing Create Seal on Draft Record (Should Fail) ===")
        
        # Create a draft record
        record_id = self.create_test_record("Draft Record for Seal Test", finalize=False)
        if not record_id:
            return False
        
        result = self.test_endpoint(
            'POST',
            f'/integrity/seal/{record_id}',
            400,  # Should fail for draft records
            data={"sealed_by": "Test User"},
            description="Create seal on draft record (should fail)"
        )
        
        # Should return None because we expect a 400 error
        return result is None

    def test_create_seal_finalized_record(self):
        """Test POST /api/integrity/seal/{record_id} on finalized record"""
        self.log("\n=== Testing Create Seal on Finalized Record ===")
        
        # Create and finalize a record
        record_id = self.create_test_record("Finalized Record for Seal Test", finalize=True)
        if not record_id:
            return None, None
        
        result = self.test_endpoint(
            'POST',
            f'/integrity/seal/{record_id}',
            200,
            data={"sealed_by": "Test User"},
            description="Create seal on finalized record"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            seal = data.get('seal', {})
            
            if seal.get('id') and seal.get('record_hash') and seal.get('chain_hash'):
                self.log(f"✅ Seal created: {seal.get('id')}")
                self.log(f"   Record Hash: {seal.get('record_hash')[:16]}...")
                self.log(f"   Chain Hash: {seal.get('chain_hash')[:16]}...")
                self.log(f"   Algorithm: {seal.get('algorithm')}")
                self.created_seals.append(seal.get('id'))
                return record_id, seal.get('id')
            else:
                self.log(f"❌ Missing required seal fields")
                return None, None
        return None, None

    def test_verify_seal_valid(self, record_id):
        """Test GET /api/integrity/seal/{record_id}/verify for valid seal"""
        self.log(f"\n=== Testing Verify Valid Seal: {record_id} ===")
        
        result = self.test_endpoint(
            'GET',
            f'/integrity/seal/{record_id}/verify',
            200,
            description=f"Verify seal for record {record_id}"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            status = data.get('status')
            hash_match = data.get('hash_match')
            verified_at = data.get('verified_at')
            
            if status == 'valid' and hash_match and verified_at:
                self.log(f"✅ Seal verification successful")
                self.log(f"   Status: {status}")
                self.log(f"   Hash Match: {hash_match}")
                self.log(f"   Verified At: {verified_at}")
                return True
            else:
                self.log(f"❌ Unexpected verification result: {status}")
                return False
        return False

    def test_verify_seal_never_sealed(self):
        """Test GET /api/integrity/seal/{record_id}/verify for never sealed record"""
        self.log("\n=== Testing Verify Never Sealed Record ===")
        
        # Create a finalized record but don't seal it
        record_id = self.create_test_record("Never Sealed Record", finalize=True)
        if not record_id:
            return False
        
        result = self.test_endpoint(
            'GET',
            f'/integrity/seal/{record_id}/verify',
            200,
            description=f"Verify never sealed record {record_id}"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            status = data.get('status')
            can_seal = data.get('can_seal')
            
            if status == 'never_sealed' and can_seal:
                self.log(f"✅ Never sealed record correctly identified")
                self.log(f"   Status: {status}")
                self.log(f"   Can Seal: {can_seal}")
                return True
            else:
                self.log(f"❌ Unexpected result for never sealed record")
                return False
        return False

    def test_batch_seal_records(self):
        """Test POST /api/integrity/seal/batch"""
        self.log("\n=== Testing Batch Seal Records ===")
        
        # Create multiple finalized records
        record_ids = []
        for i in range(3):
            record_id = self.create_test_record(f"Batch Record {i+1}", finalize=True)
            if record_id:
                record_ids.append(record_id)
        
        if len(record_ids) < 2:
            self.log("❌ Failed to create enough records for batch test")
            return False
        
        result = self.test_endpoint(
            'POST',
            '/integrity/seal/batch',
            200,
            data={"portfolio_id": self.test_portfolio_id},
            description=f"Batch seal {len(record_ids)} records"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            sealed_count = data.get('sealed_count', 0)
            total_candidates = data.get('total_candidates', 0)
            errors = data.get('errors', [])
            
            if sealed_count > 0 and total_candidates >= sealed_count:
                self.log(f"✅ Batch seal successful")
                self.log(f"   Sealed: {sealed_count}/{total_candidates}")
                if errors:
                    self.log(f"   Errors: {len(errors)}")
                return True
            else:
                self.log(f"❌ Batch seal failed: {sealed_count}/{total_candidates}")
                return False
        return False

    def test_verify_all_seals(self):
        """Test POST /api/integrity/seal/verify-all"""
        self.log("\n=== Testing Verify All Seals ===")
        
        result = self.test_endpoint(
            'POST',
            '/integrity/seal/verify-all',
            200,
            data={"portfolio_id": self.test_portfolio_id},
            description="Verify all seals in portfolio"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            total_verified = data.get('total_verified', 0)
            valid_count = data.get('valid_count', 0)
            tampered_count = data.get('tampered_count', 0)
            verification_timestamp = data.get('verification_timestamp')
            
            if total_verified > 0 and verification_timestamp:
                self.log(f"✅ Verify all seals successful")
                self.log(f"   Total Verified: {total_verified}")
                self.log(f"   Valid: {valid_count}")
                self.log(f"   Tampered: {tampered_count}")
                self.log(f"   Timestamp: {verification_timestamp}")
                return tampered_count == 0  # Success if no tampering detected
            else:
                self.log(f"❌ Verify all failed or no seals found")
                return False
        return False

    def test_verify_chain_integrity(self):
        """Test GET /api/integrity/seal/chain/{portfolio_id}"""
        self.log("\n=== Testing Chain Integrity Verification ===")
        
        result = self.test_endpoint(
            'GET',
            f'/integrity/seal/chain/{self.test_portfolio_id}',
            200,
            description="Verify seal chain integrity"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            chain_valid = data.get('chain_valid')
            total_seals = data.get('total_seals', 0)
            status = data.get('status')
            broken_links = data.get('broken_links', [])
            
            if total_seals > 0:
                self.log(f"✅ Chain verification completed")
                self.log(f"   Total Seals: {total_seals}")
                self.log(f"   Chain Valid: {chain_valid}")
                self.log(f"   Status: {status}")
                if broken_links:
                    self.log(f"   Broken Links: {len(broken_links)}")
                return chain_valid
            else:
                self.log(f"✅ No seals found (expected for new portfolio)")
                return True
        return False

    def test_seal_status_report(self):
        """Test GET /api/integrity/seal/report/{portfolio_id}"""
        self.log("\n=== Testing Seal Status Report ===")
        
        result = self.test_endpoint(
            'GET',
            f'/integrity/seal/report/{self.test_portfolio_id}',
            200,
            description="Get seal status report"
        )
        
        if result and result.get('ok'):
            data = result.get('data', {})
            portfolio_id = data.get('portfolio_id')
            total_finalized = data.get('total_finalized', 0)
            sealed_count = data.get('sealed_count', 0)
            unsealed_count = data.get('unsealed_count', 0)
            seal_coverage = data.get('seal_coverage')
            status_breakdown = data.get('status_breakdown', {})
            recent_seals = data.get('recent_seals', [])
            generated_at = data.get('generated_at')
            
            if portfolio_id == self.test_portfolio_id and generated_at:
                self.log(f"✅ Seal report generated successfully")
                self.log(f"   Portfolio: {portfolio_id}")
                self.log(f"   Total Finalized: {total_finalized}")
                self.log(f"   Sealed: {sealed_count}")
                self.log(f"   Unsealed: {unsealed_count}")
                self.log(f"   Coverage: {seal_coverage}")
                self.log(f"   Valid Seals: {status_breakdown.get('valid', 0)}")
                self.log(f"   Tampered Seals: {status_breakdown.get('tampered', 0)}")
                self.log(f"   Recent Seals: {len(recent_seals)}")
                return True
            else:
                self.log(f"❌ Invalid report data")
                return False
        return False

    def test_seal_nonexistent_record(self):
        """Test POST /api/integrity/seal/{record_id} with nonexistent record"""
        self.log("\n=== Testing Seal Nonexistent Record ===")
        
        fake_record_id = f"fake_record_{uuid.uuid4().hex[:8]}"
        
        result = self.test_endpoint(
            'POST',
            f'/integrity/seal/{fake_record_id}',
            400,  # Should fail for nonexistent record
            data={"sealed_by": "Test User"},
            description="Create seal on nonexistent record (should fail)"
        )
        
        # Should return None because we expect a 400 error
        return result is None

    def test_verify_nonexistent_record(self):
        """Test GET /api/integrity/seal/{record_id}/verify with nonexistent record"""
        self.log("\n=== Testing Verify Nonexistent Record ===")
        
        fake_record_id = f"fake_record_{uuid.uuid4().hex[:8]}"
        
        result = self.test_endpoint(
            'GET',
            f'/integrity/seal/{fake_record_id}/verify',
            400,  # Should fail for nonexistent record
            description="Verify seal on nonexistent record (should fail)"
        )
        
        # Should return None because we expect a 400 error
        return result is None

    def run_all_tests(self):
        """Run all integrity seal API tests"""
        self.log("🔒 Starting Backend API Tests for Enhanced Integrity Seals")
        self.log("=" * 70)
        
        # Test basic seal operations
        self.log("\n🔐 BASIC SEAL OPERATIONS")
        self.log("-" * 50)
        
        # Test sealing draft record (should fail)
        self.test_create_seal_draft_record()
        
        # Test sealing finalized record (should succeed)
        sealed_record_id, seal_id = self.test_create_seal_finalized_record()
        
        # Test verification of valid seal
        if sealed_record_id:
            self.test_verify_seal_valid(sealed_record_id)
        
        # Test verification of never sealed record
        self.test_verify_seal_never_sealed()
        
        # Test error cases
        self.log("\n❌ ERROR HANDLING TESTS")
        self.log("-" * 50)
        
        self.test_seal_nonexistent_record()
        self.test_verify_nonexistent_record()
        
        # Test batch operations
        self.log("\n📦 BATCH OPERATIONS")
        self.log("-" * 50)
        
        self.test_batch_seal_records()
        self.test_verify_all_seals()
        
        # Test chain and reporting
        self.log("\n🔗 CHAIN & REPORTING")
        self.log("-" * 50)
        
        self.test_verify_chain_integrity()
        self.test_seal_status_report()
        
        # Print final results
        self.log("\n" + "=" * 70)
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
    tester = IntegritySealAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())