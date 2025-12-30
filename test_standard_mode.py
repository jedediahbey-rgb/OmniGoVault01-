#!/usr/bin/env python3
"""
Test generation without redaction mode
"""

import requests
import json

BASE_URL = "https://trusthealth-update.preview.emergentagent.com/api"
PORTFOLIO_ID = "port_0e9a783c1a71"

def test_without_redaction():
    session = requests.Session()
    session.headers.update({'Content-Type': 'application/json'})
    
    # Get profiles first
    response = session.get(f"{BASE_URL}/binder/profiles", params={"portfolio_id": PORTFOLIO_ID})
    profiles = response.json().get("data", {}).get("profiles", [])
    profile_id = profiles[0].get("id")
    
    # Test generation with court mode that explicitly sets standard redaction
    print("Testing generation with standard redaction mode...")
    payload = {
        "portfolio_id": PORTFOLIO_ID,
        "profile_id": profile_id,
        "court_mode": {
            "redaction_mode": "standard"
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
        else:
            print(f"Error: {data.get('error')}")
    else:
        print(f"Response: {response.text[:500]}")

if __name__ == "__main__":
    test_without_redaction()