#!/usr/bin/env python3
"""
Detailed Backend API Testing for UI Fixes
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://premium-archive-1.preview.emergentagent.com/api"

def test_detailed_apis():
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'User-Agent': 'Detailed-API-Tester/1.0'
    })
    
    print("🔍 DETAILED API TESTING")
    print("=" * 60)
    
    # Test 1: GET /api/user/profile
    print("\n1. Testing GET /api/user/profile")
    try:
        response = session.get(f"{BASE_URL}/user/profile", timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {json.dumps(data, indent=2)}")
            
            # Check specific fields
            print(f"   ✓ user_id: {data.get('user_id')}")
            print(f"   ✓ email: {data.get('email')}")
            print(f"   ✓ name: {data.get('name')}")
            print(f"   ✓ display_name: {data.get('display_name')}")
            print(f"   ✓ global_roles: {data.get('global_roles')}")
            print(f"   ✓ is_omnicompetent: {data.get('is_omnicompetent')}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Test 2: PUT /api/user/profile
    print("\n2. Testing PUT /api/user/profile")
    try:
        test_display_name = "Jedediah Bey, Chief Trustee"
        payload = {"display_name": test_display_name}
        response = session.put(f"{BASE_URL}/user/profile", json=payload, timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Updated display_name: {data.get('display_name')}")
            print(f"   ✓ Update successful: {data.get('display_name') == test_display_name}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Test 3: GET /api/billing/plans
    print("\n3. Testing GET /api/billing/plans")
    try:
        response = session.get(f"{BASE_URL}/billing/plans", timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            plans = data.get("plans", [])
            print(f"   Found {len(plans)} plans:")
            
            expected_plans = {
                "Testamentary": 0.0,
                "Revocable": 29.0,
                "Irrevocable": 79.0,
                "Dynasty": 199.0
            }
            
            for plan in plans:
                name = plan.get("name")
                price = plan.get("price_monthly")
                tier = plan.get("tier")
                print(f"   - {name}: ${price}/month (tier {tier})")
                
                if name in expected_plans:
                    expected_price = expected_plans[name]
                    if price == expected_price:
                        print(f"     ✓ Correct pricing")
                    else:
                        print(f"     ❌ Wrong price: expected ${expected_price}, got ${price}")
                else:
                    print(f"     ⚠️ Unexpected plan name")
            
            # Check for missing plans
            found_names = [p.get("name") for p in plans]
            missing = [name for name in expected_plans.keys() if name not in found_names]
            if missing:
                print(f"   ❌ Missing plans: {missing}")
            else:
                print(f"   ✓ All expected plans found")
                
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")

if __name__ == "__main__":
    test_detailed_apis()