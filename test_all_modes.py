#!/usr/bin/env python3
"""
Test different redaction modes
"""

import requests
import json

BASE_URL = "https://trusthealth-update.preview.emergentagent.com/api"
PORTFOLIO_ID = "port_0e9a783c1a71"

def test_different_modes():
    session = requests.Session()
    session.headers.update({'Content-Type': 'application/json'})
    
    # Get profiles first
    response = session.get(f"{BASE_URL}/binder/profiles", params={"portfolio_id": PORTFOLIO_ID})
    profiles = response.json().get("data", {}).get("profiles", [])
    profile_id = profiles[0].get("id")
    
    modes = ["standard", "redacted", "privileged", "both"]
    
    for mode in modes:
        print(f"\nTesting redaction mode: {mode}")
        payload = {
            "portfolio_id": PORTFOLIO_ID,
            "profile_id": profile_id,
            "court_mode": {
                "bates_enabled": False,
                "redaction_mode": mode
            }
        }
        
        response = session.post(f"{BASE_URL}/binder/generate", json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("ok"):
                result = data.get("data", {})
                print(f"✅ Success: {result.get('success')}")
            else:
                print(f"❌ Error: {data.get('error')}")
        else:
            print(f"❌ HTTP Error: {response.text[:200]}")

if __name__ == "__main__":
    test_different_modes()