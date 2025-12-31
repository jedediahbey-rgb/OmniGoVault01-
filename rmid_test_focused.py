#!/usr/bin/env python3
"""
Focused RM-ID Migration Testing for OmniGovault
"""

import requests
import json
import sys
from datetime import datetime
import re

# Use the public endpoint from frontend/.env
BASE_URL = "https://premium-archive-1.preview.emergentagent.com/api"

class RMIDMigrationTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'RMID-Migration-Tester/1.0'
        })
        self.test_portfolio_id = "port_d92308e007f1"
        self.trust_profiles = []
        self.proper_rm_id_profile = None
        self.placeholder_rm_id_profile = None

    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def test_trust_profiles(self):
        """Test GET /api/trust-profiles - Check existing trust profiles"""
        self.log("🔍 Testing Trust Profiles...")
        try:
            response = self.session.get(f"{self.base_url}/trust-profiles", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.trust_profiles = data
                    self.log(f"✅ Found {len(data)} trust profiles")
                    
                    # Categorize profiles by RM-ID type
                    proper_profiles = [p for p in data if not p.get('rm_id_is_placeholder', True)]
                    placeholder_profiles = [p for p in data if p.get('rm_id_is_placeholder', True)]
                    
                    self.log(f"   📊 Proper RM-ID profiles: {len(proper_profiles)}")
                    self.log(f"   📊 Placeholder profiles: {len(placeholder_profiles)}")
                    
                    # Store profiles for later tests
                    if proper_profiles:
                        self.proper_rm_id_profile = proper_profiles[0]
                        self.log(f"   ✅ Found proper RM-ID profile: {self.proper_rm_id_profile.get('profile_id')}")
                        self.log(f"      RM-ID: {self.proper_rm_id_profile.get('rm_id_normalized', 'N/A')}")
                    
                    if placeholder_profiles:
                        self.placeholder_rm_id_profile = placeholder_profiles[0]
                        self.log(f"   ⚠️ Found placeholder RM-ID profile: {self.placeholder_rm_id_profile.get('profile_id')}")
                    
                    return True
                else:
                    self.log(f"❌ Unexpected response format")
                    return False
            else:
                self.log(f"❌ HTTP {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            self.log(f"❌ Error: {str(e)}")
            return False

    def test_governance_records(self):
        """Test governance records RM-ID migration status"""
        self.log("🔍 Testing Governance Records RM-ID Migration...")
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/governance/v2/records", params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    # Handle both 'records' and 'items' keys
                    records = data['data'].get('records', data['data'].get('items', []))
                    total = data['data'].get('total', len(records))
                    self.log(f"✅ Found {len(records)} records (total: {total})")
                    
                    # Analyze RM-ID patterns
                    temp_ids = []
                    rf_ids = []
                    other_proper_ids = []
                    
                    for record in records:
                        rm_id = record.get('rm_id', '')
                        title = record.get('title', 'Untitled')
                        module_type = record.get('module_type', 'unknown')
                        
                        if rm_id.startswith('TEMP'):
                            temp_ids.append({'rm_id': rm_id, 'title': title, 'type': module_type})
                        elif rm_id.startswith('RF743916765US'):
                            rf_ids.append({'rm_id': rm_id, 'title': title, 'type': module_type})
                        elif rm_id:
                            other_proper_ids.append({'rm_id': rm_id, 'title': title, 'type': module_type})
                    
                    self.log(f"   📊 Analysis Results:")
                    self.log(f"      🔴 TEMP IDs remaining: {len(temp_ids)}")
                    self.log(f"      🟢 Proper IDs (RF743916765US): {len(rf_ids)}")
                    self.log(f"      🟡 Other proper IDs: {len(other_proper_ids)}")
                    
                    # Show sample records
                    if rf_ids:
                        self.log(f"   ✅ Sample migrated records:")
                        for record in rf_ids[:3]:
                            self.log(f"      • {record['rm_id']} - {record['title']} ({record['type']})")
                    
                    if temp_ids:
                        self.log(f"   ⚠️ Records still with TEMP IDs:")
                        for record in temp_ids:
                            self.log(f"      • {record['rm_id']} - {record['title']} ({record['type']})")
                    
                    # Calculate migration success rate
                    total_proper = len(rf_ids) + len(other_proper_ids)
                    migration_success_rate = total_proper / len(records) if records else 0
                    self.log(f"   📈 Migration success rate: {migration_success_rate:.1%}")
                    
                    return True
                else:
                    self.log(f"❌ Unexpected response format")
                    return False
            else:
                self.log(f"❌ HTTP {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            self.log(f"❌ Error: {str(e)}")
            return False

    def test_migration_endpoint(self):
        """Test the migration endpoint"""
        self.log("🔍 Testing Migration Endpoint...")
        if not self.proper_rm_id_profile:
            self.log("⚠️ No proper RM-ID profile available for migration test")
            return False
        
        try:
            profile_id = self.proper_rm_id_profile.get('profile_id')
            self.log(f"   🔄 Attempting migration for profile: {profile_id}")
            
            response = self.session.post(f"{self.base_url}/trust-profiles/{profile_id}/migrate-rm-ids", timeout=30)
            if response.status_code == 200:
                data = response.json()
                if data.get('ok'):
                    rm_base = data.get('rm_base', '')
                    groups_allocated = data.get('groups_allocated', 0)
                    results = data.get('results', {})
                    message = data.get('message', '')
                    
                    self.log(f"✅ Migration completed successfully")
                    self.log(f"   📋 RM Base: {rm_base}")
                    self.log(f"   📋 Groups allocated: {groups_allocated}")
                    self.log(f"   📋 Message: {message}")
                    
                    # Show migration results by category
                    total_migrated = 0
                    total_failed = 0
                    for category, result in results.items():
                        migrated = result.get('migrated', 0)
                        failed = result.get('failed', 0)
                        total_migrated += migrated
                        total_failed += failed
                        if migrated > 0 or failed > 0:
                            self.log(f"      • {category}: {migrated} migrated, {failed} failed")
                    
                    self.log(f"   📊 Total: {total_migrated} migrated, {total_failed} failed")
                    return True
                else:
                    self.log(f"❌ Migration failed: {data}")
                    return False
            else:
                self.log(f"❌ HTTP {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            self.log(f"❌ Error: {str(e)}")
            return False

    def test_rm_id_format_verification(self):
        """Verify RM-ID format in records"""
        self.log("🔍 Verifying RM-ID Format...")
        try:
            params = {"portfolio_id": self.test_portfolio_id}
            response = self.session.get(f"{self.base_url}/governance/v2/records", params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('ok') and 'data' in data:
                    records = data['data'].get('records', data['data'].get('items', []))
                    self.log(f"✅ Analyzing {len(records)} records for RM-ID format")
                    
                    # Expected format: RF743916765US-XX.XXX
                    proper_pattern = re.compile(r'^RF743916765US-\d{1,2}\.\d{3}$')
                    
                    proper_format_count = 0
                    temp_count = 0
                    invalid_format_count = 0
                    sample_proper_ids = []
                    sample_temp_ids = []
                    
                    for record in records:
                        rm_id = record.get('rm_id', '')
                        if not rm_id:
                            continue
                            
                        if rm_id.startswith('TEMP'):
                            temp_count += 1
                            if len(sample_temp_ids) < 3:
                                sample_temp_ids.append(rm_id)
                        elif proper_pattern.match(rm_id):
                            proper_format_count += 1
                            if len(sample_proper_ids) < 5:
                                sample_proper_ids.append(rm_id)
                        else:
                            invalid_format_count += 1
                    
                    self.log(f"   📊 Format Analysis:")
                    self.log(f"      🟢 Proper format (RF743916765US-XX.XXX): {proper_format_count}")
                    self.log(f"      🟡 TEMP IDs: {temp_count}")
                    self.log(f"      🔴 Invalid format: {invalid_format_count}")
                    
                    if sample_proper_ids:
                        self.log(f"   ✅ Sample proper format IDs:")
                        for rm_id in sample_proper_ids:
                            self.log(f"      • {rm_id}")
                    
                    if sample_temp_ids:
                        self.log(f"   ⚠️ Sample TEMP IDs:")
                        for rm_id in sample_temp_ids:
                            self.log(f"      • {rm_id}")
                    
                    total_with_rm_id = proper_format_count + invalid_format_count + temp_count
                    if total_with_rm_id > 0:
                        proper_rate = proper_format_count / total_with_rm_id
                        self.log(f"   📈 Proper format rate: {proper_rate:.1%}")
                        return proper_rate >= 0.5 or proper_format_count > 0
                    else:
                        self.log(f"   ❌ No records with RM-IDs found")
                        return False
                else:
                    self.log(f"❌ Unexpected response format")
                    return False
            else:
                self.log(f"❌ HTTP {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            self.log(f"❌ Error: {str(e)}")
            return False

    def run_tests(self):
        """Run all RM-ID migration tests"""
        self.log("🧪 Starting RM-ID Migration Testing for OmniGovault")
        self.log("=" * 70)
        self.log(f"Portfolio ID: {self.test_portfolio_id}")
        self.log("")
        
        tests = [
            ("Trust Profiles Check", self.test_trust_profiles),
            ("Governance Records Migration Status", self.test_governance_records),
            ("Migration Endpoint Test", self.test_migration_endpoint),
            ("RM-ID Format Verification", self.test_rm_id_format_verification)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            self.log(f"🔄 {test_name}")
            self.log("-" * 50)
            if test_func():
                passed += 1
                self.log(f"✅ {test_name} - PASSED")
            else:
                self.log(f"❌ {test_name} - FAILED")
            self.log("")
        
        self.log("📊 Final Results")
        self.log("=" * 70)
        self.log(f"Tests passed: {passed}/{total}")
        self.log(f"Success rate: {(passed/total*100):.1f}%")
        
        if passed == total:
            self.log("🎉 All RM-ID migration tests passed!")
            return True
        else:
            self.log("⚠️ Some tests failed - see details above")
            return False

def main():
    tester = RMIDMigrationTester()
    success = tester.run_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())