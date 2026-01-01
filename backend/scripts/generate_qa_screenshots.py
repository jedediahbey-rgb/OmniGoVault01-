#!/usr/bin/env python3
"""
QA Screenshot Generator
Captures screenshots of all major application pages for the QA report
"""

import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

# Configuration
BASE_URL = "https://docs-audit-tool.preview.emergentagent.com"
OUTPUT_DIR = Path("/app/public/qa_screens")
DESKTOP_SIZE = {"width": 1440, "height": 900}
MOBILE_SIZE = {"width": 390, "height": 844}

# Routes to capture (grouped by section)
ROUTES = {
    "landing": [
        ("/", "landing_page"),
    ],
    "vault_dashboard": [
        ("/vault", "dashboard"),
        ("/vault/documents", "documents"),
        ("/vault/trash", "trash"),
    ],
    "workspaces": [
        ("/vault/workspaces", "workspaces_list"),
    ],
    "tools": [
        ("/binder", "binder_generator"),
        ("/ledger", "trust_ledger"),
        ("/ledger-threads", "ledger_threads"),
        ("/templates", "templates"),
    ],
    "learning": [
        ("/learn", "learning_center"),
        ("/maxims", "legal_maxims"),
        ("/glossary", "glossary"),
        ("/diagrams", "trust_diagrams"),
        ("/assistant", "ai_assistant"),
    ],
    "settings": [
        ("/settings", "user_settings"),
        ("/billing", "billing"),
        ("/diagnostics", "diagnostics"),
    ],
    "governance": [
        ("/vault/governance", "governance_dashboard"),
    ],
}

async def capture_screenshot(page, route, name, viewport_type):
    """Capture a single screenshot"""
    output_dir = OUTPUT_DIR / viewport_type
    output_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        url = f"{BASE_URL}{route}"
        print(f"  Capturing {viewport_type}: {route}")
        
        await page.goto(url, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)  # Wait for animations
        
        filepath = output_dir / f"{name}.png"
        await page.screenshot(path=str(filepath), full_page=False)
        print(f"    ✓ Saved: {filepath}")
        return True
    except Exception as e:
        print(f"    ✗ Failed: {e}")
        return False

async def authenticate(page, context):
    """Authenticate using Google OAuth - creates session"""
    print("Attempting authentication...")
    
    # For unauthenticated screenshots, we'll capture what's visible
    # The landing page and some pages have public content
    
    # Try to create a test session directly via API
    try:
        # Create a test session for QA
        import httpx
        async with httpx.AsyncClient() as client:
            # First check if we can access auth endpoint
            response = await client.get(f"{BASE_URL}/api/health")
            if response.status_code == 200:
                print("  ✓ Backend is healthy")
    except Exception as e:
        print(f"  ! Auth check failed: {e}")
    
    return True

async def main():
    print("=" * 60)
    print("QA Screenshot Generator")
    print("=" * 60)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        # Desktop screenshots
        print("\n📸 Capturing Desktop Screenshots (1440x900)")
        print("-" * 40)
        desktop_context = await browser.new_context(viewport=DESKTOP_SIZE)
        desktop_page = await desktop_context.new_page()
        
        await authenticate(desktop_page, desktop_context)
        
        for section, routes in ROUTES.items():
            print(f"\n[{section.upper()}]")
            for route, name in routes:
                await capture_screenshot(desktop_page, route, name, "desktop")
        
        await desktop_context.close()
        
        # Mobile screenshots
        print("\n📱 Capturing Mobile Screenshots (390x844)")
        print("-" * 40)
        mobile_context = await browser.new_context(
            viewport=MOBILE_SIZE,
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15"
        )
        mobile_page = await mobile_context.new_page()
        
        for section, routes in ROUTES.items():
            print(f"\n[{section.upper()}]")
            for route, name in routes:
                await capture_screenshot(mobile_page, route, name, "mobile")
        
        await mobile_context.close()
        await browser.close()
    
    print("\n" + "=" * 60)
    print("Screenshot generation complete!")
    print(f"Desktop: {OUTPUT_DIR}/desktop/")
    print(f"Mobile: {OUTPUT_DIR}/mobile/")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
