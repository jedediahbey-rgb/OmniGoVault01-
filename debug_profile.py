#!/usr/bin/env python3
"""
Debug script to check profile data structure
"""

import requests
import json

BASE_URL = "https://proof-vault.preview.emergentagent.com/api"
PORTFOLIO_ID = "port_0e9a783c1a71"

def debug_profile():
    session = requests.Session()
    session.headers.update({'Content-Type': 'application/json'})
    
    # Get profiles
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
    
    profile = profiles[0]
    print(f"Profile ID: {profile.get('id')}")
    print(f"Profile name: {profile.get('name')}")
    print(f"Profile type: {profile.get('profile_type')}")
    
    rules_json = profile.get("rules_json")
    print(f"Rules JSON type: {type(rules_json)}")
    print(f"Rules JSON: {rules_json}")
    
    if isinstance(rules_json, str):
        try:
            parsed_rules = json.loads(rules_json)
            print(f"Parsed rules type: {type(parsed_rules)}")
            print(f"Parsed rules: {parsed_rules}")
        except Exception as e:
            print(f"Failed to parse rules JSON: {e}")

if __name__ == "__main__":
    debug_profile()