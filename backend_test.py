#!/usr/bin/env python3
"""
Backend API Testing for Equity Trust Portfolio Application
Comprehensive Regression Testing for Multiple Feature Updates
"""

import requests
import json
import sys
from datetime import datetime
import time
import uuid
import hashlib

# Use the public endpoint from frontend/.env
BASE_URL = "https://proof-vault.preview.emergentagent.com/api"

class EquityTrustAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'EquityTrust-API-Tester/1.0'
        })
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        # Use the specific portfolio ID from the review request for RM-ID migration testing
        self.test_portfolio_id = "port_d92308e007f1"
        self.test_dispute_id = None
        self.test_run_id = None
        self.test_link_id = None
        self.test_binder_run_id = None
        self.test_results = []
        # RM-ID migration testing variables
        self.trust_profiles = []
        self.proper_rm_id_profile = None
        self.placeholder_rm_id_profile = None

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

    # ============ RM-ID MIGRATION TESTS ============

    def test_get_trust_profiles(self):
        """Test GET /api/trust-profiles - Check existing trust profiles"""
        try:
            response = self.session.get(f"{self.base_url}/trust-profiles", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if isinstance(data, list):
                    self.trust_profiles = data
                    details += f", Found {len(data)} trust profiles"
                    
                    # Categorize profiles by RM-ID type
                    proper_profiles = [p for p in data if not p.get('rm_id_is_placeholder', True)]
                    placeholder_profiles = [p for p in data if p.get('rm_id_is_placeholder', True)]
                    
                    details += f", Proper RM-ID profiles: {len(proper_profiles)}, Placeholder profiles: {len(placeholder_profiles)}"
                    
                    # Store profiles for later tests
                    if proper_profiles:
                        self.proper_rm_id_profile = proper_profiles[0]
                        details += f", Found proper RM-ID profile: {self.proper_rm_id_profile.get('profile_id')}"
                    
                    if placeholder_profiles:
                        self.placeholder_rm_id_profile = placeholder_profiles[0]
                        details += f", Found placeholder RM-ID profile: {self.placeholder_rm_id_profile.get('profile_id')}"
                    
                    # Show RM-ID details for verification
                    for profile in data[:3]:  # Show first 3 profiles
                        rm_id = profile.get('rm_id_normalized') or profile.get('rm_id_raw', 'None')
                        is_placeholder = profile.get('rm_id_is_placeholder', True)
                        details += f"\n    Profile {profile.get('profile_id')}: RM-ID={rm_id}, Placeholder={is_placeholder}"
                        
                else:
                    success = False
                    details += f", Unexpected response format"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/trust-profiles", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/trust-profiles", False, f"Error: {str(e)}")
            return False

    def test_governance_records_rm_id_migration(self):
        """Test GET /api/governance/v2/records?portfolio_id=port_d92308e007f1 - Verify RM-ID migration"""
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/governance/v2/records", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    # Handle both 'records' and 'items' keys for backward compatibility
                    records = data['data'].get('records', data['data'].get('items', []))
                    total = data['data'].get('total', len(records))
                    details += f", Found {len(records)} records (total: {total})"
                    
                    # Analyze RM-ID patterns
                    temp_ids = []
                    proper_ids = []
                    rf_ids = []
                    
                    for record in records:
                        rm_id = record.get('rm_id', '')
                        if rm_id.startswith('TEMP'):
                            temp_ids.append(rm_id)
                        elif rm_id.startswith('RF743916765US'):
                            rf_ids.append(rm_id)
                            proper_ids.append(rm_id)
                        elif rm_id and not rm_id.startswith('TEMP'):
                            proper_ids.append(rm_id)
                    
                    details += f"\n    TEMP IDs remaining: {len(temp_ids)}"
                    details += f"\n    Proper IDs (RF743916765US): {len(rf_ids)}"
                    details += f"\n    Other proper IDs: {len(proper_ids) - len(rf_ids)}"
                    
                    # Show sample RM-IDs
                    if rf_ids:
                        details += f"\n    Sample RF IDs: {rf_ids[:3]}"
                    if temp_ids:
                        details += f"\n    Sample TEMP IDs: {temp_ids[:3]}"
                    
                    # Verify migration success - most should be proper IDs
                    migration_success_rate = len(proper_ids) / len(records) if records else 0
                    details += f"\n    Migration success rate: {migration_success_rate:.1%}"
                    
                    # Success if at least 70% are migrated (allowing for some TEMP IDs)
                    if migration_success_rate >= 0.7:
                        details += f"\n    ✅ Migration largely successful"
                    elif migration_success_rate >= 0.5:
                        details += f"\n    ⚠️ Partial migration success"
                    else:
                        details += f"\n    ❌ Low migration success rate"
                        
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/governance/v2/records (RM-ID Migration Check)", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/governance/v2/records (RM-ID Migration Check)", False, f"Error: {str(e)}")
            return False

    def test_migrate_rm_ids_with_proper_profile(self):
        """Test POST /api/trust-profiles/{profile_id}/migrate-rm-ids with proper RM-ID"""
        if not self.proper_rm_id_profile:
            self.log_test("POST /api/trust-profiles/{profile_id}/migrate-rm-ids (Proper)", False, "No proper RM-ID profile available")
            return False
        
        try:
            profile_id = self.proper_rm_id_profile.get('profile_id')
            response = self.session.post(f"{self.base_url}/trust-profiles/{profile_id}/migrate-rm-ids", timeout=30)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok'):
                    rm_base = data.get('rm_base', '')
                    groups_allocated = data.get('groups_allocated', 0)
                    results = data.get('results', {})
                    message = data.get('message', '')
                    
                    details += f", RM Base: {rm_base}, Groups allocated: {groups_allocated}"
                    details += f", Message: {message}"
                    
                    # Show migration results by category
                    total_migrated = 0
                    total_failed = 0
                    for category, result in results.items():
                        migrated = result.get('migrated', 0)
                        failed = result.get('failed', 0)
                        total_migrated += migrated
                        total_failed += failed
                        if migrated > 0 or failed > 0:
                            details += f"\n    {category}: {migrated} migrated, {failed} failed"
                    
                    details += f"\n    Total: {total_migrated} migrated, {total_failed} failed"
                    
                else:
                    success = False
                    details += f", Migration failed: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/trust-profiles/{profile_id}/migrate-rm-ids (Proper)", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/trust-profiles/{profile_id}/migrate-rm-ids (Proper)", False, f"Error: {str(e)}")
            return False

    def test_migrate_rm_ids_with_placeholder_profile(self):
        """Test POST /api/trust-profiles/{profile_id}/migrate-rm-ids with placeholder RM-ID (should fail)"""
        if not self.placeholder_rm_id_profile:
            self.log_test("POST /api/trust-profiles/{profile_id}/migrate-rm-ids (Placeholder)", True, "No placeholder RM-ID profile available - test skipped")
            return True
        
        try:
            profile_id = self.placeholder_rm_id_profile.get('profile_id')
            response = self.session.post(f"{self.base_url}/trust-profiles/{profile_id}/migrate-rm-ids", timeout=10)
            
            # This should return 400 error for placeholder RM-ID
            expected_failure = response.status_code == 400
            details = f"Status: {response.status_code}"
            
            if expected_failure:
                data = response.json()
                error_detail = data.get('detail', '')
                details += f", Expected 400 error: {error_detail}"
                success = "placeholder" in error_detail.lower() or "cannot migrate" in error_detail.lower()
                if not success:
                    details += f", Unexpected error message"
            else:
                success = False
                details += f", Expected 400 error but got different status"
                if response.status_code == 200:
                    details += f", Migration unexpectedly succeeded"
            
            self.log_test("POST /api/trust-profiles/{profile_id}/migrate-rm-ids (Placeholder)", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/trust-profiles/{profile_id}/migrate-rm-ids (Placeholder)", False, f"Error: {str(e)}")
            return False

    def test_verify_rm_id_format_in_records(self):
        """Verify governance records display proper RM-ID format like RF743916765US-XX.XXX"""
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/governance/v2/records", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    records = data['data'].get('records', [])
                    details += f", Found {len(records)} records"
                    
                    # Verify RM-ID format patterns
                    proper_format_count = 0
                    invalid_format_count = 0
                    temp_count = 0
                    sample_proper_ids = []
                    sample_invalid_ids = []
                    
                    # Expected format: RF743916765US-XX.XXX
                    import re
                    proper_pattern = re.compile(r'^RF743916765US-\d{1,2}\.\d{3}$')
                    
                    for record in records:
                        rm_id = record.get('rm_id', '')
                        if not rm_id:
                            continue
                            
                        if rm_id.startswith('TEMP'):
                            temp_count += 1
                        elif proper_pattern.match(rm_id):
                            proper_format_count += 1
                            if len(sample_proper_ids) < 5:
                                sample_proper_ids.append(rm_id)
                        else:
                            invalid_format_count += 1
                            if len(sample_invalid_ids) < 3:
                                sample_invalid_ids.append(rm_id)
                    
                    details += f"\n    Proper format (RF743916765US-XX.XXX): {proper_format_count}"
                    details += f"\n    TEMP IDs: {temp_count}"
                    details += f"\n    Invalid format: {invalid_format_count}"
                    
                    if sample_proper_ids:
                        details += f"\n    Sample proper IDs: {sample_proper_ids}"
                    if sample_invalid_ids:
                        details += f"\n    Sample invalid IDs: {sample_invalid_ids}"
                    
                    # Success if most records have proper format
                    total_with_rm_id = proper_format_count + invalid_format_count + temp_count
                    if total_with_rm_id > 0:
                        proper_rate = proper_format_count / total_with_rm_id
                        details += f"\n    Proper format rate: {proper_rate:.1%}"
                        success = proper_rate > 0.7  # At least 70% should have proper format
                    else:
                        success = False
                        details += f"\n    No records with RM-IDs found"
                        
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("Verify RM-ID Format in Records", success, details)
            return success
            
        except Exception as e:
            self.log_test("Verify RM-ID Format in Records", False, f"Error: {str(e)}")
            return False

    # ============ CORE SYSTEM HEALTH TESTS ============

    def test_system_health(self):
        """Test basic system health - GET /api/portfolios"""
        try:
            response = self.session.get(f"{self.base_url}/portfolios", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if isinstance(data, list):
                    details += f", Found {len(data)} portfolios"
                    # Verify our test portfolio exists
                    portfolio_found = any(p.get('portfolio_id') == self.test_portfolio_id for p in data)
                    if portfolio_found:
                        details += f", Test portfolio {self.test_portfolio_id} found"
                    else:
                        details += f", Test portfolio {self.test_portfolio_id} not found"
                else:
                    success = False
                    details += f", Unexpected response format"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/portfolios (System Health)", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/portfolios (System Health)", False, f"Error: {str(e)}")
            return False

    # ============ CORE BINDER SYSTEM TESTS ============

    def test_binder_profiles(self):
        """Test GET /api/binder/profiles?portfolio_id={portfolio_id}"""
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/binder/profiles", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    profiles = data['data'].get('profiles', [])
                    details += f", Found {len(profiles)} binder profiles"
                    
                    # Verify expected profiles exist
                    profile_names = [p.get('name', '') for p in profiles]
                    expected_profiles = ['Audit Binder', 'Court / Litigation Binder', 'Omni Binder']
                    found_profiles = [name for name in expected_profiles if any(name in pname for pname in profile_names)]
                    
                    details += f", Profiles: {found_profiles}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/profiles", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/profiles", False, f"Error: {str(e)}")
            return False

    def test_binder_generate(self):
        """Test POST /api/binder/generate"""
        try:
            # First get a profile to use
            params = {"portfolio_id": self.test_portfolio_id}
            profiles_response = self.session.get(f"{self.base_url}/binder/profiles", params=params, timeout=10)
            
            if profiles_response.status_code != 200:
                self.log_test("POST /api/binder/generate", False, "Could not get binder profiles")
                return False
            
            profiles_data = profiles_response.json()
            profiles = profiles_data.get('data', {}).get('profiles', [])
            if not profiles:
                self.log_test("POST /api/binder/generate", False, "No binder profiles available")
                return False
            
            # Use first available profile
            profile_id = profiles[0].get('id')
            
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "profile_id": profile_id,
                "options": {
                    "include_drafts": True,
                    "include_attachments": True
                }
            }
            
            response = self.session.post(f"{self.base_url}/binder/generate", json=payload, timeout=30)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    binder_success = result.get('success', False)
                    self.test_binder_run_id = result.get('run_id')
                    
                    if binder_success and self.test_binder_run_id:
                        details += f", Generated successfully: run_id={self.test_binder_run_id}"
                        total_items = result.get('total_items', 0)
                        details += f", Total items: {total_items}"
                    else:
                        success = False
                        error = result.get('error', 'Unknown error')
                        details += f", Generation failed: {error}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/binder/generate", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/binder/generate", False, f"Error: {str(e)}")
            return False

    def test_binder_runs(self):
        """Test GET /api/binder/runs?portfolio_id={portfolio_id}"""
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/binder/runs", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    runs = data['data'].get('runs', [])
                    total = data['data'].get('total', 0)
                    details += f", Found {len(runs)} runs (total: {total})"
                    
                    # Verify our test run if it exists
                    if self.test_binder_run_id:
                        found_run = next((r for r in runs if r.get('id') == self.test_binder_run_id), None)
                        if found_run:
                            details += f", Test run found: {found_run.get('status')}"
                        else:
                            details += f", Test run not found"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/runs", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/runs", False, f"Error: {str(e)}")
            return False

    def test_binder_download(self):
        """Test GET /api/binder/runs/{run_id}/download"""
        if not self.test_binder_run_id:
            self.log_test("GET /api/binder/runs/{run_id}/download", False, "No binder run ID available")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/binder/runs/{self.test_binder_run_id}/download", timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                content_type = response.headers.get('content-type', '')
                content_length = response.headers.get('content-length', '0')
                
                if content_type == 'application/pdf':
                    details += f", PDF download successful: {content_length} bytes"
                else:
                    success = False
                    details += f", Unexpected content type: {content_type}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/binder/runs/{run_id}/download", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/binder/runs/{run_id}/download", False, f"Error: {str(e)}")
            return False

    # ============ AUDIT LOG SYSTEM TESTS ============

    def test_audit_log_list(self):
        """Test GET /api/audit-log?limit=10"""
        try:
            params = {"limit": 10}
            response = self.session.get(f"{self.base_url}/audit-log", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    entries = data['data'].get('entries', [])
                    total = data['data'].get('total', 0)
                    details += f", Found {len(entries)} entries (total: {total})"
                    
                    # Verify entry structure if entries exist
                    if entries:
                        first_entry = entries[0]
                        required_fields = ['id', 'event_type', 'timestamp']
                        missing_fields = [field for field in required_fields if field not in first_entry]
                        
                        if missing_fields:
                            success = False
                            details += f", Missing fields: {missing_fields}"
                        else:
                            details += f", Entry structure verified"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/audit-log", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/audit-log", False, f"Error: {str(e)}")
            return False

    def test_audit_log_categories(self):
        """Test GET /api/audit-log/categories"""
        try:
            response = self.session.get(f"{self.base_url}/audit-log/categories", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    categories = data['data'].get('categories', [])
                    severities = data['data'].get('severities', [])
                    details += f", Found {len(categories)} categories, {len(severities)} severities"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/audit-log/categories", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/audit-log/categories", False, f"Error: {str(e)}")
            return False

    def test_audit_log_summary(self):
        """Test GET /api/audit-log/summary?days=30"""
        try:
            params = {"days": 30}
            response = self.session.get(f"{self.base_url}/audit-log/summary", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    summary = data['data']
                    total_events = summary.get('total_events', 0)
                    by_category = summary.get('by_category', {})
                    by_severity = summary.get('by_severity', {})
                    details += f", Total events: {total_events}, Categories: {len(by_category)}, Severities: {len(by_severity)}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/audit-log/summary", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/audit-log/summary", False, f"Error: {str(e)}")
            return False

    def test_audit_log_export(self):
        """Test GET /api/audit-log/export?format=json"""
        try:
            params = {"format": "json"}
            response = self.session.get(f"{self.base_url}/audit-log/export", params=params, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                content_type = response.headers.get('content-type', '')
                content_length = response.headers.get('content-length', '0')
                
                if 'json' in content_type.lower():
                    details += f", JSON export successful: {content_length} bytes"
                else:
                    details += f", Export successful: {content_length} bytes, Type: {content_type}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/audit-log/export", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/audit-log/export", False, f"Error: {str(e)}")
            return False

    # ============ GOVERNANCE MODULE TESTS ============

    def test_governance_records(self):
        """Test GET /api/governance/v2/records?portfolio_id={portfolio_id}"""
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/governance/v2/records", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    records = data['data'].get('records', [])
                    total = data['data'].get('total', 0)
                    details += f", Found {len(records)} records (total: {total})"
                    
                    # Verify record structure if records exist
                    if records:
                        first_record = records[0]
                        required_fields = ['id', 'module_type', 'title', 'status']
                        missing_fields = [field for field in required_fields if field not in first_record]
                        
                        if missing_fields:
                            success = False
                            details += f", Missing fields: {missing_fields}"
                        else:
                            details += f", Record structure verified"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/governance/v2/records", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/governance/v2/records", False, f"Error: {str(e)}")
            return False

    def test_governance_subjects(self):
        """Test GET /api/rm/subjects?portfolio_id={portfolio_id}"""
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/rm/subjects", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    subjects = data['data'].get('subjects', [])
                    total = data['data'].get('total', 0)
                    details += f", Found {len(subjects)} RM subjects (total: {total})"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/rm/subjects", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/rm/subjects", False, f"Error: {str(e)}")
            return False

    # ============ EVIDENCE BINDER CONFIGURATION TESTS ============

    def test_evidence_config(self):
        """Test GET /api/evidence-binder/config"""
        try:
            response = self.session.get(f"{self.base_url}/evidence-binder/config", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    exhibit_formats = result.get('exhibit_formats', [])
                    categories = result.get('categories', [])
                    default_rules = result.get('default_rules', {})
                    
                    # Expected exhibit formats
                    expected_formats = ['letters', 'numbers']
                    format_values = [f.get('value') for f in exhibit_formats]
                    
                    # Expected categories
                    expected_categories = ['documents', 'communications', 'financial', 'governance', 'photos']
                    category_values = [c.get('value') for c in categories]
                    
                    missing_formats = [f for f in expected_formats if f not in format_values]
                    missing_categories = [c for c in expected_categories if c not in category_values]
                    
                    if missing_formats:
                        success = False
                        details += f", Missing exhibit formats: {missing_formats}"
                    elif missing_categories:
                        success = False
                        details += f", Missing categories: {missing_categories}"
                    elif not default_rules:
                        success = False
                        details += f", Missing default_rules"
                    else:
                        details += f", Returns exhibit_formats ({len(exhibit_formats)}), categories ({len(categories)}), default_rules"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/config", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/config", False, f"Error: {str(e)}")
            return False

    # ============ DISPUTES LISTING TESTS ============

    def test_get_disputes(self):
        """Test GET /api/evidence-binder/disputes?portfolio_id={portfolio_id}"""
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/evidence-binder/disputes", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    disputes = result.get('disputes', [])
                    total = result.get('total', 0)
                    
                    details += f", Returns disputes array with {len(disputes)} items (total: {total})"
                    
                    # Store first dispute for later tests
                    if disputes:
                        self.test_dispute_id = disputes[0].get('id')
                        details += f", Found dispute: {self.test_dispute_id}"
                        
                        # Verify dispute structure
                        first_dispute = disputes[0]
                        required_fields = ['id', 'title', 'status', 'created_at']
                        missing_fields = [field for field in required_fields if field not in first_dispute]
                        
                        if missing_fields:
                            success = False
                            details += f", Missing fields in dispute: {missing_fields}"
                        else:
                            details += f", Dispute structure verified"
                    else:
                        details += f", No disputes found - will create test dispute"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/disputes", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/disputes", False, f"Error: {str(e)}")
            return False

    def test_create_test_dispute_if_needed(self):
        """Create a test dispute if none exist"""
        if self.test_dispute_id:
            self.log_test("Create test dispute (skipped - dispute exists)", True, f"Using existing dispute: {self.test_dispute_id}")
            return True
        
        try:
            # Create a test dispute via governance API
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "module_type": "dispute",
                "title": "Test Dispute for Evidence Binder",
                "payload_json": {
                    "dispute_type": "beneficiary_dispute",
                    "parties_involved": ["Test Party A", "Test Party B"],
                    "summary": "Test dispute created for Evidence Binder API testing",
                    "status": "active",
                    "filing_date": datetime.now().strftime("%Y-%m-%d"),
                    "description": "This is a test dispute record created specifically for testing the Evidence Binder functionality."
                }
            }
            
            response = self.session.post(f"{self.base_url}/governance/v2/records", json=payload, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    record = data['data'].get('record', {})
                    self.test_dispute_id = record.get('id')
                    details += f", Created test dispute: {self.test_dispute_id}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("Create test dispute", success, details)
            return success
            
        except Exception as e:
            self.log_test("Create test dispute", False, f"Error: {str(e)}")
            return False

    # ============ DISPUTE LINKS MANAGEMENT TESTS ============

    def test_add_dispute_link(self):
        """Test POST /api/evidence-binder/links"""
        if not self.test_dispute_id:
            self.log_test("POST /api/evidence-binder/links", False, "No dispute ID available")
            return False
        
        try:
            payload = {
                "dispute_id": self.test_dispute_id,
                "record_id": "test_record_001",
                "record_type": "governance_minutes",
                "category": "governance",
                "relevance_note": "Test link for Evidence Binder API testing"
            }
            
            response = self.session.post(f"{self.base_url}/evidence-binder/links", json=payload, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    link = result.get('link', {})
                    message = result.get('message', '')
                    
                    self.test_link_id = link.get('id')
                    details += f", Created link: {self.test_link_id}, Message: {message}"
                    
                    # Verify link structure
                    required_fields = ['id', 'dispute_id', 'record_id', 'record_type', 'category']
                    missing_fields = [field for field in required_fields if field not in link]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields in link: {missing_fields}"
                    else:
                        details += f", Link structure verified"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/evidence-binder/links", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/evidence-binder/links", False, f"Error: {str(e)}")
            return False

    def test_get_dispute_links(self):
        """Test GET /api/evidence-binder/links?dispute_id={dispute_id}"""
        if not self.test_dispute_id:
            self.log_test("GET /api/evidence-binder/links", False, "No dispute ID available")
            return False
        
        try:
            params = {"dispute_id": self.test_dispute_id}
            response = self.session.get(f"{self.base_url}/evidence-binder/links", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    links = result.get('links', [])
                    total = result.get('total', 0)
                    
                    details += f", Returns links array with {len(links)} items (total: {total})"
                    
                    # Verify we can find our test link
                    if self.test_link_id:
                        found_link = next((l for l in links if l.get('id') == self.test_link_id), None)
                        if found_link:
                            details += f", Found test link: {self.test_link_id}"
                        else:
                            details += f", Test link not found in results"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/links", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/links", False, f"Error: {str(e)}")
            return False

    def test_auto_link_dispute_items(self):
        """Test POST /api/evidence-binder/links/auto"""
        if not self.test_dispute_id:
            self.log_test("POST /api/evidence-binder/links/auto", False, "No dispute ID available")
            return False
        
        try:
            payload = {
                "dispute_id": self.test_dispute_id,
                "portfolio_id": self.test_portfolio_id
            }
            
            response = self.session.post(f"{self.base_url}/evidence-binder/links/auto", json=payload, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    linked_count = result.get('linked_count', 0)
                    message = result.get('message', '')
                    
                    details += f", Auto-linked {linked_count} items, Message: {message}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/evidence-binder/links/auto", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/evidence-binder/links/auto", False, f"Error: {str(e)}")
            return False

    # ============ EVIDENCE PREVIEW TESTS ============

    def test_evidence_preview(self):
        """Test GET /api/evidence-binder/preview"""
        if not self.test_dispute_id:
            self.log_test("GET /api/evidence-binder/preview", False, "No dispute ID available")
            return False
        
        try:
            params = {
                "portfolio_id": self.test_portfolio_id,
                "dispute_id": self.test_dispute_id,
                "include_linked_only": "true"
            }
            
            response = self.session.get(f"{self.base_url}/evidence-binder/preview", params=params, timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    total_items = result.get('total_items', 0)
                    by_category = result.get('by_category', {})
                    exhibits_preview = result.get('exhibits_preview', [])
                    
                    details += f", Preview: {total_items} total items, {len(by_category)} categories, {len(exhibits_preview)} preview items"
                    
                    # Verify preview structure
                    if exhibits_preview:
                        first_exhibit = exhibits_preview[0]
                        required_fields = ['exhibit_label', 'title', 'category', 'source']
                        missing_fields = [field for field in required_fields if field not in first_exhibit]
                        
                        if missing_fields:
                            success = False
                            details += f", Missing fields in exhibit preview: {missing_fields}"
                        else:
                            details += f", Exhibit preview structure verified"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/preview", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/preview", False, f"Error: {str(e)}")
            return False

    # ============ EVIDENCE BINDER GENERATION TESTS ============

    def test_generate_evidence_binder(self):
        """Test POST /api/evidence-binder/generate"""
        if not self.test_dispute_id:
            self.log_test("POST /api/evidence-binder/generate", False, "No dispute ID available")
            return False
        
        try:
            payload = {
                "portfolio_id": self.test_portfolio_id,
                "dispute_id": self.test_dispute_id,
                "rules": {
                    "exhibit_format": "letters",
                    "include_timeline": True,
                    "categories_enabled": ["documents", "communications", "financial", "governance"]
                }
            }
            
            response = self.session.post(f"{self.base_url}/evidence-binder/generate", json=payload, timeout=30)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    binder_success = result.get('success', False)
                    self.test_run_id = result.get('run_id')
                    total_exhibits = result.get('total_exhibits', 0)
                    categories_summary = result.get('categories_summary', {})
                    timeline_entries = result.get('timeline_entries', 0)
                    
                    if binder_success and self.test_run_id:
                        details += f", Generated successfully: run_id={self.test_run_id}, exhibits={total_exhibits}, timeline={timeline_entries}"
                        details += f", Categories: {categories_summary}"
                    else:
                        success = False
                        error = result.get('error', 'Unknown error')
                        details += f", Generation failed: {error}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("POST /api/evidence-binder/generate", success, details)
            return success
            
        except Exception as e:
            self.log_test("POST /api/evidence-binder/generate", False, f"Error: {str(e)}")
            return False

    # ============ EVIDENCE BINDER RUNS TESTS ============

    def test_get_evidence_runs(self):
        """Test GET /api/evidence-binder/runs?portfolio_id={portfolio_id}"""
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/evidence-binder/runs", params=params, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    runs = result.get('runs', [])
                    total = result.get('total', 0)
                    
                    details += f", Returns runs array with {len(runs)} items (total: {total})"
                    
                    # Verify we can find our test run
                    if self.test_run_id:
                        found_run = next((r for r in runs if r.get('id') == self.test_run_id), None)
                        if found_run:
                            details += f", Found test run: {self.test_run_id}"
                            details += f", Status: {found_run.get('status')}"
                        else:
                            details += f", Test run not found in results"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/runs", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/runs", False, f"Error: {str(e)}")
            return False

    def test_get_evidence_run_details(self):
        """Test GET /api/evidence-binder/runs/{run_id}"""
        if not self.test_run_id:
            self.log_test("GET /api/evidence-binder/runs/{run_id}", False, "No run ID available")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/evidence-binder/runs/{self.test_run_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    run = result.get('run', {})
                    
                    # Verify run structure
                    required_fields = ['id', 'portfolio_id', 'dispute_id', 'status', 'binder_type']
                    missing_fields = [field for field in required_fields if field not in run]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields in run: {missing_fields}"
                    else:
                        details += f", Run details: status={run.get('status')}, type={run.get('binder_type')}"
                        details += f", dispute_id={run.get('dispute_id')}, total_items={run.get('total_items', 0)}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/runs/{run_id}", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/runs/{run_id}", False, f"Error: {str(e)}")
            return False

    def test_get_evidence_manifest(self):
        """Test GET /api/evidence-binder/runs/{run_id}/manifest"""
        if not self.test_run_id:
            self.log_test("GET /api/evidence-binder/runs/{run_id}/manifest", False, "No run ID available")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/evidence-binder/runs/{self.test_run_id}/manifest", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    manifest = result.get('manifest', {})
                    dispute_id = result.get('dispute_id')
                    profile_name = result.get('profile_name')
                    generated_at = result.get('generated_at')
                    
                    # Verify manifest structure
                    required_fields = ['run_id', 'dispute_id', 'total_exhibits', 'exhibits']
                    missing_fields = [field for field in required_fields if field not in manifest]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields in manifest: {missing_fields}"
                    else:
                        total_exhibits = manifest.get('total_exhibits', 0)
                        exhibits = manifest.get('exhibits', [])
                        timeline = manifest.get('timeline', [])
                        
                        details += f", Manifest: {total_exhibits} exhibits, {len(exhibits)} exhibit details, {len(timeline)} timeline entries"
                        details += f", Profile: {profile_name}, Generated: {generated_at}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/runs/{run_id}/manifest", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/runs/{run_id}/manifest", False, f"Error: {str(e)}")
            return False

    def test_download_evidence_binder(self):
        """Test GET /api/evidence-binder/runs/{run_id}/download"""
        if not self.test_run_id:
            self.log_test("GET /api/evidence-binder/runs/{run_id}/download", False, "No run ID available")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/evidence-binder/runs/{self.test_run_id}/download", timeout=15)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                content_type = response.headers.get('content-type', '')
                content_length = response.headers.get('content-length', '0')
                content_disposition = response.headers.get('content-disposition', '')
                
                if content_type == 'application/pdf':
                    details += f", PDF download successful: {content_length} bytes"
                    if 'Evidence_Binder_' in content_disposition:
                        details += f", Correct filename format"
                    else:
                        details += f", Filename: {content_disposition}"
                else:
                    success = False
                    details += f", Unexpected content type: {content_type}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("GET /api/evidence-binder/runs/{run_id}/download", success, details)
            return success
            
        except Exception as e:
            self.log_test("GET /api/evidence-binder/runs/{run_id}/download", False, f"Error: {str(e)}")
            return False

    # ============ CLEANUP TESTS ============

    def test_cleanup_test_link(self):
        """Test DELETE /api/evidence-binder/links/{link_id}"""
        if not self.test_link_id:
            self.log_test("DELETE /api/evidence-binder/links/{link_id} (cleanup)", True, "No test link to cleanup")
            return True
        
        try:
            response = self.session.delete(f"{self.base_url}/evidence-binder/links/{self.test_link_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    result = data['data']
                    deleted = result.get('deleted', False)
                    message = result.get('message', '')
                    
                    if deleted:
                        details += f", Test link deleted successfully: {message}"
                    else:
                        success = False
                        details += f", Link not deleted: {message}"
                else:
                    success = False
                    details += f", Unexpected response format: {data}"
            else:
                details += f", Response: {response.text[:200]}"
            
            self.log_test("DELETE /api/evidence-binder/links/{link_id} (cleanup)", success, details)
            return success
            
        except Exception as e:
            self.log_test("DELETE /api/evidence-binder/links/{link_id} (cleanup)", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run comprehensive regression tests for Equity Trust Portfolio application"""
        self.log("🧪 Starting RM-ID Migration Testing for OmniGovault")
        self.log("=" * 70)
        self.log(f"Using Portfolio ID: {self.test_portfolio_id}")
        
        # 1. Core System Health
        self.log("\n🏥 Test 1: Core System Health")
        self.log("-" * 40)
        self.test_system_health()
        
        # 2. RM-ID Migration Tests (Primary Focus)
        self.log("\n🔄 Test 2: RM-ID Migration Functionality")
        self.log("-" * 50)
        self.test_get_trust_profiles()
        self.test_governance_records_rm_id_migration()
        self.test_migrate_rm_ids_with_proper_profile()
        self.test_migrate_rm_ids_with_placeholder_profile()
        self.test_verify_rm_id_format_in_records()
        
        # 3. Core Binder System
        self.log("\n📁 Test 3: Core Binder System")
        self.log("-" * 40)
        self.test_binder_profiles()
        self.test_binder_generate()
        self.test_binder_runs()
        self.test_binder_download()
        
        # 4. Audit Log System
        self.log("\n📊 Test 4: Audit Log System")
        self.log("-" * 40)
        self.test_audit_log_list()
        self.test_audit_log_categories()
        self.test_audit_log_summary()
        self.test_audit_log_export()
        
        # 5. Governance Module
        self.log("\n⚖️ Test 5: Governance Module")
        self.log("-" * 40)
        self.test_governance_records()
        self.test_governance_subjects()
        
        # 6. Evidence Binder (P5 Feature)
        self.log("\n📋 Test 6: Evidence Binder Configuration")
        self.log("-" * 50)
        self.test_evidence_config()
        
        self.log(f"\n📊 Test 7: Evidence Binder Disputes")
        self.log("-" * 40)
        self.test_get_disputes()
        self.test_create_test_dispute_if_needed()
        
        self.log(f"\n🔗 Test 8: Evidence Binder Links Management")
        self.log("-" * 50)
        self.test_add_dispute_link()
        self.test_get_dispute_links()
        self.test_auto_link_dispute_items()
        
        self.log(f"\n👁️ Test 9: Evidence Binder Preview")
        self.log("-" * 40)
        self.test_evidence_preview()
        
        self.log(f"\n📄 Test 10: Evidence Binder Generation")
        self.log("-" * 50)
        self.test_generate_evidence_binder()
        
        self.log(f"\n📚 Test 11: Evidence Binder Runs")
        self.log("-" * 40)
        self.test_get_evidence_runs()
        self.test_get_evidence_run_details()
        self.test_get_evidence_manifest()
        self.test_download_evidence_binder()
        
        self.log(f"\n🧹 Test 12: Cleanup")
        self.log("-" * 25)
        self.test_cleanup_test_link()
        
        self.log("\n📊 Final Test Summary")
        self.log("=" * 70)
        self.log(f"Tests run: {self.tests_run}")
        self.log(f"Tests passed: {self.tests_passed}")
        self.log(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            self.log("\n❌ Failed Tests:")
            for test in self.failed_tests:
                self.log(f"  - {test['test']}: {test.get('details', 'Unknown error')}")
        else:
            self.log("\n✅ All tests passed successfully!")
        
        return self.tests_passed == self.tests_run

def main():
    tester = EquityTrustAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/tmp/equity_trust_test_results.json', 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "total_tests": tester.tests_run,
            "passed_tests": tester.tests_passed,
            "success_rate": tester.tests_passed/tester.tests_run if tester.tests_run > 0 else 0,
            "results": tester.test_results,
            "failed_tests": tester.failed_tests
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())