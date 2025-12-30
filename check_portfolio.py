#!/usr/bin/env python3
"""
Check portfolio structure
"""

import requests

BASE_URL = "https://trusthealth-update.preview.emergentagent.com/api"
PORTFOLIO_ID = "port_0e9a783c1a71"

def check_portfolio():
    session = requests.Session()
    session.headers.update({'Content-Type': 'application/json'})
    
    # Get portfolios
    response = session.get(f"{BASE_URL}/portfolios")
    if response.status_code == 200:
        portfolios = response.json()
        print(f"Found {len(portfolios)} portfolios")
        for p in portfolios:
            if p.get("portfolio_id") == PORTFOLIO_ID:
                print(f"Target portfolio found: {p}")
                return
        print(f"Target portfolio {PORTFOLIO_ID} not found")
    else:
        print(f"Failed to get portfolios: {response.status_code}")

if __name__ == "__main__":
    check_portfolio()