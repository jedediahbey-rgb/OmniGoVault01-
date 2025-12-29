#!/usr/bin/env python3
"""
Test redaction mode specifically
"""

import requests
import json

BASE_URL = "https://trustworkspace.preview.emergentagent.com/api"
PORTFOLIO_ID = "port_0e9a783c1a71"

def test_redaction_mode():
    session = requests.Session()
    session.headers.update({'Content-Type': 'application/json'})
    
    # Get profiles first
    response = session.get(f"{BASE_URL}/binder/profiles", params={"portfolio_id": PORTFOLIO_ID})
    profiles = response.json().get("data", {}).get("profiles", [])
    profile_id = profiles[0].get("id")
    
    # Test generation with redaction mode
    print("Testing generation with redaction mode...")
    payload = {
        "portfolio_id": PORTFOLIO_ID,
        "profile_id": profile_id,
        "court_mode": {
            "bates_enabled": False,
            "redaction_mode": "redacted"
        }
    }
    
    response = session.post(f"{BASE_URL}/binder/generate", json=payload, timeout=30)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success: {data.get('ok')}")
        if data.get("ok"):
            result = data.get("data", {})
            print(f"Generation success: {result.get('success')}")
            print(f"Run ID: {result.get('run_id')}")
        else:
            print(f"Error: {data.get('error')}")
    else:
        print(f"Response: {response.text[:500]}")

if __name__ == "__main__":
    test_redaction_mode()