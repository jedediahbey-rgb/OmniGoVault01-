#!/usr/bin/env python3
"""
Simple test to debug the redaction mode generation issue
"""

import requests
import json

BASE_URL = "https://animation-cleanup.preview.emergentagent.com/api"
PORTFOLIO_ID = "port_0e9a783c1a71"

def test_simple_generation():
    session = requests.Session()
    session.headers.update({'Content-Type': 'application/json'})
    
    # Get profiles first
    print("Getting profiles...")
    response = session.get(f"{BASE_URL}/binder/profiles", params={"portfolio_id": PORTFOLIO_ID})
    if response.status_code != 200:
        print(f"Failed to get profiles: {response.status_code}")
        return
    
    data = response.json()
    if not data.get("ok"):
        print(f"Profile API error: {data}")
        return
    
    profiles = data.get("data", {}).get("profiles", [])
    if not profiles:
        print("No profiles found")
        return
    
    profile_id = profiles[0].get("id")
    print(f"Using profile: {profile_id}")
    
    # Test simple generation without court mode
    print("\nTesting simple generation...")
    payload = {
        "portfolio_id": PORTFOLIO_ID,
        "profile_id": profile_id
    }
    
    response = session.post(f"{BASE_URL}/binder/generate", json=payload, timeout=30)
    print(f"Simple generation status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"Simple generation result: {data.get('ok')}")
        if not data.get("ok"):
            print(f"Error: {data.get('error')}")
    else:
        print(f"Response: {response.text[:500]}")

if __name__ == "__main__":
    test_simple_generation()