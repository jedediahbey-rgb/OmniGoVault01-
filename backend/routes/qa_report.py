"""
QA Review Report Endpoints
Serves static HTML report and screenshots for UX/QA audit
NO JavaScript required - fully server-rendered static HTML with embedded images
"""

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, PlainTextResponse, FileResponse, Response
from pathlib import Path
import os
import base64
from datetime import datetime

router = APIRouter(prefix="/api/qa", tags=["QA Review"])

# Screenshots directory
SCREENSHOTS_DIR = Path("/app/public/qa_screens")

def get_screenshot_base64(viewport: str, filename: str) -> str:
    """Load screenshot and convert to base64 for embedding"""
    file_path = SCREENSHOTS_DIR / viewport / filename
    if file_path.exists():
        with open(file_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")
    return ""

def get_embedded_img(viewport: str, filename: str, alt: str) -> str:
    """Generate embedded base64 image tag"""
    b64 = get_screenshot_base64(viewport, filename)
    if b64:
        return f'<img src="data:image/png;base64,{b64}" alt="{alt}" style="max-width:100%;border-radius:8px;border:1px solid #1f2937;">'
    return f'<p style="color:#fca5a5;">Screenshot not available: {filename}</p>'

@router.get("/access.md", response_class=PlainTextResponse)
async def get_access_doc():
    """Return the QA access documentation as plain text"""
    md_path = Path("/app/QA_REVIEW_ACCESS.md")
    if md_path.exists():
        return md_path.read_text()
    return "QA_REVIEW_ACCESS.md not found"

@router.get("/report", response_class=HTMLResponse)
async def get_qa_report():
    """
    Generate static HTML QA report - NO JavaScript required
    All screenshots embedded as base64 for self-contained viewing
    """
    
    # Get screenshots lists
    desktop_screens = []
    mobile_screens = []
    
    desktop_dir = SCREENSHOTS_DIR / "desktop"
    mobile_dir = SCREENSHOTS_DIR / "mobile"
    
    if desktop_dir.exists():
        desktop_screens = sorted([f.name for f in desktop_dir.glob("*.png")])
    if mobile_dir.exists():
        mobile_screens = sorted([f.name for f in mobile_dir.glob("*.png")])
    
    # Generate screenshot sections with embedded images
    desktop_screenshots_html = ""
    mobile_screenshots_html = ""
    
    screenshot_labels = {
        "landing_page.png": ("Landing Page", "/"),
        "dashboard.png": ("Dashboard", "/vault"),
        "documents.png": ("Documents", "/vault/documents"),
        "trash.png": ("Trash", "/vault/trash"),
        "workspaces_list.png": ("Workspaces", "/vault/workspaces"),
        "binder_generator.png": ("Binder Generator", "/binder"),
        "trust_ledger.png": ("Trust Ledger", "/ledger"),
        "ledger_threads.png": ("Ledger Threads", "/ledger-threads"),
        "templates.png": ("Templates", "/templates"),
        "learning_center.png": ("Learning Center", "/learn"),
        "legal_maxims.png": ("Legal Maxims", "/maxims"),
        "glossary.png": ("Glossary", "/glossary"),
        "trust_diagrams.png": ("Trust Diagrams", "/diagrams"),
        "ai_assistant.png": ("AI Assistant", "/assistant"),
        "user_settings.png": ("Settings", "/settings"),
        "billing.png": ("Billing", "/billing"),
        "diagnostics.png": ("Diagnostics", "/diagnostics"),
        "governance_dashboard.png": ("Governance", "/vault/governance"),
    }
    
    for screen in desktop_screens:
        label, route = screenshot_labels.get(screen, (screen.replace(".png", "").replace("_", " ").title(), ""))
        b64 = get_screenshot_base64("desktop", screen)
        if b64:
            desktop_screenshots_html += f'''
            <div class="screenshot-card">
                <div class="screenshot-header">
                    <strong>{label}</strong>
                    <code>{route}</code>
                </div>
                <img src="data:image/png;base64,{b64}" alt="{label}" loading="lazy">
            </div>
            '''
    
    for screen in mobile_screens:
        label, route = screenshot_labels.get(screen, (screen.replace(".png", "").replace("_", " ").title(), ""))
        b64 = get_screenshot_base64("mobile", screen)
        if b64:
            mobile_screenshots_html += f'''
            <div class="screenshot-card mobile">
                <div class="screenshot-header">
                    <strong>{label}</strong>
                    <code>{route}</code>
                </div>
                <img src="data:image/png;base64,{b64}" alt="{label} (Mobile)" loading="lazy">
            </div>
            '''
    
    generated_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OmniGoVault - QA Review Report (No JS Required)</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0f1a; 
            color: #e5e7eb;
            line-height: 1.6;
            padding: 20px;
            max-width: 1400px;
            margin: 0 auto;
        }}
        .banner {{
            background: linear-gradient(135deg, #ca8a04, #92400e);
            color: #000;
            padding: 16px 24px;
            text-align: center;
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 30px;
            border-radius: 8px;
            border: 2px solid #fbbf24;
        }}
        h1 {{ color: #d4af37; margin-bottom: 10px; font-size: 2em; }}
        h2 {{ 
            color: #d4af37; 
            margin: 40px 0 20px; 
            border-bottom: 2px solid #d4af37; 
            padding-bottom: 10px;
            font-size: 1.5em;
        }}
        h3 {{ color: #fbbf24; margin: 25px 0 15px; font-size: 1.2em; }}
        h4 {{ color: #fcd34d; margin: 20px 0 10px; }}
        table {{ 
            width: 100%; 
            border-collapse: collapse; 
            margin: 15px 0;
            background: #111827;
            border-radius: 8px;
            overflow: hidden;
        }}
        th, td {{ 
            padding: 12px 15px; 
            text-align: left; 
            border-bottom: 1px solid #1f2937;
        }}
        th {{ background: #1f2937; color: #d4af37; font-weight: 600; }}
        tr:hover {{ background: rgba(212, 175, 55, 0.05); }}
        code {{ 
            background: #1f2937; 
            padding: 2px 8px; 
            border-radius: 4px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.85em;
            color: #60a5fa;
        }}
        .section {{ 
            background: #111827; 
            padding: 25px; 
            border-radius: 12px; 
            margin: 25px 0;
            border: 1px solid #1f2937;
        }}
        .screenshots-grid {{ 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); 
            gap: 20px;
            margin: 20px 0;
        }}
        .screenshots-grid.mobile {{ 
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
        }}
        .screenshot-card {{ 
            background: #1f2937;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #374151;
        }}
        .screenshot-card.mobile {{
            max-width: 250px;
        }}
        .screenshot-header {{
            padding: 12px 15px;
            background: #111827;
            border-bottom: 1px solid #374151;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }}
        .screenshot-card img {{ 
            width: 100%; 
            height: auto;
            display: block;
        }}
        ul, ol {{ margin: 15px 0 15px 30px; }}
        li {{ margin: 8px 0; }}
        .badge {{
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.8em;
            font-weight: 600;
            text-transform: uppercase;
        }}
        .badge-green {{ background: #065f46; color: #6ee7b7; }}
        .badge-yellow {{ background: #78350f; color: #fcd34d; }}
        .badge-red {{ background: #7f1d1d; color: #fca5a5; }}
        .badge-blue {{ background: #1e3a8a; color: #93c5fd; }}
        .badge-purple {{ background: #4c1d95; color: #c4b5fd; }}
        a {{ color: #60a5fa; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
        pre {{
            background: #1f2937;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 0.85em;
            border: 1px solid #374151;
        }}
        .flow-step {{
            background: #1f2937;
            padding: 15px 20px;
            border-radius: 8px;
            margin: 10px 0;
            border-left: 4px solid #d4af37;
        }}
        .flow-step strong {{ color: #d4af37; }}
        .toc {{
            background: #111827;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }}
        .toc a {{
            display: block;
            padding: 5px 0;
        }}
        .meta {{
            color: #9ca3af;
            font-size: 0.9em;
            margin-bottom: 30px;
        }}
        .check {{ color: #6ee7b7; }}
        .cross {{ color: #fca5a5; }}
        hr {{ border: none; border-top: 1px solid #1f2937; margin: 40px 0; }}
    </style>
</head>
<body>
    <div class="banner">⚠️ STAGING QA REVIEW MODE — For UX/QA Audit Only — No JavaScript Required</div>
    
    <h1>🏛️ OmniGoVault — QA Review Report</h1>
    <p class="meta">
        <strong>Platform:</strong> Private Trust & Equity Management<br>
        <strong>Generated:</strong> {generated_at}<br>
        <strong>Environment:</strong> Staging/Preview<br>
        <strong>Base URL:</strong> <a href="https://docs-audit-tool.preview.emergentagent.com">https://docs-audit-tool.preview.emergentagent.com</a>
    </p>
    
    <div class="toc">
        <h3>📑 Table of Contents</h3>
        <a href="#routes">1. Route Inventory (40+ Routes)</a>
        <a href="#permissions">2. Role & Permission Matrix</a>
        <a href="#dialogs">3. Dialogs & Modals</a>
        <a href="#screenshots-desktop">4. Desktop Screenshots (1440×900)</a>
        <a href="#screenshots-mobile">5. Mobile Screenshots (390×844)</a>
        <a href="#flows">6. Key User Flows</a>
        <a href="#api">7. API Endpoints by Feature</a>
        <a href="#seed">8. Seed Data Summary</a>
        <a href="#issues">9. Known Issues</a>
        <a href="#checklist">10. QA Checklist</a>
    </div>
    
    <h2 id="routes">📍 1. Route Inventory (40+ Routes)</h2>
    
    <div class="section">
        <h3>🌐 Public Routes (No Auth)</h3>
        <table>
            <tr><th>Route</th><th>Page</th><th>Description</th></tr>
            <tr><td><code>/</code></td><td>Landing Page</td><td>Hero section, login buttons, feature showcase</td></tr>
            <tr><td><code>/login</code></td><td>Login Redirect</td><td>Redirects to /vault</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h3>🏠 Dashboard & Portfolio</h3>
        <table>
            <tr><th>Route</th><th>Page</th><th>Access</th></tr>
            <tr><td><code>/vault</code></td><td>Dashboard</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/portfolio/:portfolioId</code></td><td>Portfolio Documents</td><td>Portfolio owner/members</td></tr>
            <tr><td><code>/vault/portfolio/:portfolioId/trust-profile</code></td><td>Trust Profile Editor</td><td>Portfolio owner/members</td></tr>
            <tr><td><code>/vault/documents</code></td><td>Documents (default portfolio)</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/document/:documentId</code></td><td>Document Editor</td><td>Document owner/editors</td></tr>
            <tr><td><code>/vault/trash</code></td><td>Trash / Recycle Bin</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/audit-log</code></td><td>Audit Log</td><td>All authenticated users</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h3>👥 Shared Workspaces</h3>
        <table>
            <tr><th>Route</th><th>Page</th><th>Access</th></tr>
            <tr><td><code>/vault/workspaces</code></td><td>Workspaces List</td><td>All users (filtered by active portfolio)</td></tr>
            <tr><td><code>/vault/workspaces/:vaultId</code></td><td>Workspace Detail</td><td>Workspace participants only</td></tr>
        </table>
        <p style="margin-top:10px;color:#fbbf24;"><strong>Note:</strong> Workspaces are now filtered by the user's currently active portfolio. Switching portfolios will show different workspaces.</p>
    </div>
    
    <div class="section">
        <h3>⚖️ Governance Module</h3>
        <table>
            <tr><th>Route</th><th>Page</th><th>Access</th></tr>
            <tr><td><code>/vault/governance</code></td><td>Governance Dashboard</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/governance/meetings/:id</code></td><td>Meeting Minutes Detail</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/governance/distributions/:id</code></td><td>Distribution Record</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/governance/disputes/:id</code></td><td>Dispute Case</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/governance/insurance/:id</code></td><td>Insurance Policy</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/governance/compensation/:id</code></td><td>Compensation Entry</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/governance/record/:id</code></td><td>Generic Governance Record</td><td>All authenticated users</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h3>📚 Tools & Features</h3>
        <table>
            <tr><th>Route</th><th>Page</th><th>Description</th></tr>
            <tr><td><code>/binder</code></td><td>Binder Generator</td><td>Generate PDF evidence binders with Bates numbering</td></tr>
            <tr><td><code>/ledger</code></td><td>Trust Ledger</td><td>Transaction and event ledger</td></tr>
            <tr><td><code>/ledger-threads</code></td><td>Ledger Threads</td><td>Threaded ledger view</td></tr>
            <tr><td><code>/templates</code></td><td>Document Templates</td><td>9 pre-built trust document templates</td></tr>
            <tr><td><code>/archive</code></td><td>Black Archive</td><td>Historical legal records and doctrine</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h3>📖 Learning & Reference</h3>
        <table>
            <tr><th>Route</th><th>Page</th><th>Description</th></tr>
            <tr><td><code>/learn</code></td><td>Learning Center</td><td>Educational modules on trust law</td></tr>
            <tr><td><code>/maxims</code></td><td>Legal Maxims</td><td>53 maxims of equity with spaced repetition study</td></tr>
            <tr><td><code>/glossary</code></td><td>Glossary</td><td>Legal term definitions</td></tr>
            <tr><td><code>/diagrams</code></td><td>Trust Diagrams</td><td>Visual trust structure diagrams</td></tr>
            <tr><td><code>/node-map</code></td><td>Node Map</td><td>Entity relationship visualization</td></tr>
            <tr><td><code>/scenarios</code></td><td>What-If Scenarios</td><td>Scenario planning tool</td></tr>
            <tr><td><code>/assistant</code></td><td>AI Assistant</td><td>AI-powered legal research chat</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h3>⚙️ Settings & Admin</h3>
        <table>
            <tr><th>Route</th><th>Page</th><th>Access</th></tr>
            <tr><td><code>/settings</code></td><td>User Settings</td><td>All authenticated users</td></tr>
            <tr><td><code>/billing</code></td><td>Subscription/Billing</td><td>Account owners</td></tr>
            <tr><td><code>/diagnostics</code></td><td>System Diagnostics</td><td>All authenticated users</td></tr>
            <tr><td><code>/health</code></td><td>Health Check</td><td>All authenticated users</td></tr>
            <tr><td><code>/admin</code></td><td>Admin Console</td><td><span class="badge badge-red">Admin only</span></td></tr>
            <tr><td><code>/archive/admin</code></td><td>Archive Admin</td><td><span class="badge badge-red">Admin only</span></td></tr>
            <tr><td><code>/support-admin</code></td><td>Support Admin Tools</td><td><span class="badge badge-yellow">Support/Admin</span></td></tr>
        </table>
    </div>
    
    <h2 id="permissions">👤 2. Role & Permission Matrix</h2>
    
    <div class="section">
        <h3>Workspace Roles</h3>
        <table>
            <tr>
                <th>Role</th>
                <th>View Docs</th>
                <th>Edit Docs</th>
                <th>Sign Docs</th>
                <th>Invite Users</th>
                <th>Manage Workspace</th>
                <th>Delete</th>
            </tr>
            <tr>
                <td><span class="badge badge-green">OWNER</span></td>
                <td class="check">✓</td><td class="check">✓</td><td class="check">✓</td><td class="check">✓</td><td class="check">✓</td><td class="check">✓</td>
            </tr>
            <tr>
                <td><span class="badge badge-blue">TRUSTEE</span></td>
                <td class="check">✓</td><td class="check">✓</td><td class="check">✓</td><td class="check">✓</td><td class="cross">✗</td><td class="cross">✗</td>
            </tr>
            <tr>
                <td><span class="badge badge-blue">BENEFICIARY</span></td>
                <td class="check">✓</td><td class="cross">✗</td><td class="check">✓</td><td class="cross">✗</td><td class="cross">✗</td><td class="cross">✗</td>
            </tr>
            <tr>
                <td><span class="badge badge-yellow">ADVISOR</span></td>
                <td class="check">✓</td><td class="check">✓</td><td class="cross">✗</td><td class="cross">✗</td><td class="cross">✗</td><td class="cross">✗</td>
            </tr>
            <tr>
                <td><span class="badge badge-yellow">VIEWER</span></td>
                <td class="check">✓</td><td class="cross">✗</td><td class="cross">✗</td><td class="cross">✗</td><td class="cross">✗</td><td class="cross">✗</td>
            </tr>
        </table>
        
        <h3 style="margin-top:25px;">Global Roles (Platform-wide)</h3>
        <table>
            <tr><th>Role</th><th>Description</th><th>Capabilities</th></tr>
            <tr>
                <td><span class="badge badge-purple">OMNICOMPETENT_OWNER</span></td>
                <td>Platform owner</td>
                <td>Full admin + all features + billing + user management</td>
            </tr>
            <tr>
                <td><span class="badge badge-purple">OMNICOMPETENT</span></td>
                <td>Full features</td>
                <td>All platform features without admin access</td>
            </tr>
            <tr>
                <td><span class="badge badge-yellow">SUPPORT_ADMIN</span></td>
                <td>Support staff</td>
                <td>Limited admin for customer support (impersonation, trial extensions)</td>
            </tr>
            <tr>
                <td><span class="badge badge-yellow">BILLING_ADMIN</span></td>
                <td>Billing staff</td>
                <td>Subscription and billing management only</td>
            </tr>
        </table>
    </div>
    
    <h2 id="dialogs">🔲 3. Dialogs & Modals</h2>
    
    <div class="section">
        <table>
            <tr><th>Dialog</th><th>Location</th><th>Purpose</th></tr>
            <tr><td>Import from Vault</td><td>Workspace Detail Page</td><td>Import documents from user's portfolio into workspace (filtered by active portfolio)</td></tr>
            <tr><td>Invite Participant</td><td>Workspace Detail Page</td><td>Send email invitation with role assignment</td></tr>
            <tr><td>Create Document</td><td>Documents Page</td><td>New document with type selection</td></tr>
            <tr><td>Create Workspace</td><td>Workspaces Page</td><td>New workspace (auto-linked to active portfolio)</td></tr>
            <tr><td>Sign Document</td><td>Workspace Detail Page</td><td>Digital signature capture with typed name</td></tr>
            <tr><td>Binder Configuration</td><td>Binder Page</td><td>Profile selection, date range, Bates numbering, redaction options</td></tr>
            <tr><td>Workspace Settings</td><td>Workspace Detail Page</td><td>Edit workspace name and description</td></tr>
            <tr><td>Document Viewer</td><td>Workspace Detail Page</td><td>View document content, metadata, and signatures</td></tr>
            <tr><td>Portfolio Selector</td><td>Header (all pages)</td><td>Switch between portfolios (affects workspace filtering)</td></tr>
            <tr><td>Create Portfolio</td><td>Dashboard</td><td>Create new trust portfolio</td></tr>
        </table>
    </div>
    
    <h2 id="screenshots-desktop">📸 4. Desktop Screenshots (1440×900)</h2>
    
    <div class="section">
        <p>All screenshots captured at 1440×900 viewport. Note: Pages requiring authentication show the login/redirect state.</p>
        <div class="screenshots-grid">
            {desktop_screenshots_html if desktop_screenshots_html else '<p style="color:#fca5a5;">No desktop screenshots available. Run the screenshot generator script.</p>'}
        </div>
    </div>
    
    <h2 id="screenshots-mobile">📱 5. Mobile Screenshots (390×844)</h2>
    
    <div class="section">
        <p>Mobile viewport (iPhone 12/13/14 size). Tests responsive design.</p>
        <div class="screenshots-grid mobile">
            {mobile_screenshots_html if mobile_screenshots_html else '<p style="color:#fca5a5;">No mobile screenshots available. Run the screenshot generator script.</p>'}
        </div>
    </div>
    
    <h2 id="flows">🔄 6. Key User Flows</h2>
    
    <div class="section">
        <h3>Flow 1: New User Onboarding</h3>
        <div class="flow-step">
            <strong>Step 1:</strong> Land on <code>/</code> → Click "Create Account" → Google OAuth
        </div>
        <div class="flow-step">
            <strong>Step 2:</strong> Redirected to <code>/vault</code> (Dashboard)
        </div>
        <div class="flow-step">
            <strong>Step 3:</strong> Welcome modal shows → Click "Create First Portfolio"
        </div>
        <div class="flow-step">
            <strong>Step 4:</strong> Enter portfolio name → Portfolio created
        </div>
        <div class="flow-step">
            <strong>Step 5:</strong> Navigate to <code>/vault/portfolio/:id</code> → Create first document
        </div>
        <p style="margin-top:15px;"><strong>Expected Outcome:</strong> User has portfolio with at least one document, can proceed to other features.</p>
    </div>
    
    <div class="section">
        <h3>Flow 2: Portfolio Switching</h3>
        <div class="flow-step">
            <strong>Step 1:</strong> On any vault page, click portfolio dropdown in header
        </div>
        <div class="flow-step">
            <strong>Step 2:</strong> Select a different portfolio from the list
        </div>
        <div class="flow-step">
            <strong>Step 3:</strong> Navigate to <code>/vault/workspaces</code>
        </div>
        <div class="flow-step">
            <strong>Step 4:</strong> <span class="badge badge-green">VERIFY</span> Only workspaces linked to selected portfolio appear
        </div>
        <div class="flow-step">
            <strong>Step 5:</strong> Open a workspace → Click "Import from Vault"
        </div>
        <div class="flow-step">
            <strong>Step 6:</strong> <span class="badge badge-green">VERIFY</span> Only documents from selected portfolio appear in import dialog
        </div>
        <p style="margin-top:15px;"><strong>Expected Outcome:</strong> All content filters by active portfolio selection. This was a recently fixed bug.</p>
    </div>
    
    <div class="section">
        <h3>Flow 3: Workspace Collaboration</h3>
        <div class="flow-step">
            <strong>Step 1:</strong> Go to <code>/vault/workspaces</code>
        </div>
        <div class="flow-step">
            <strong>Step 2:</strong> Click "New Vault" → Enter name → Create
        </div>
        <div class="flow-step">
            <strong>Step 3:</strong> Workspace auto-linked to current active portfolio
        </div>
        <div class="flow-step">
            <strong>Step 4:</strong> Click "Invite" → Enter email → Select role (Trustee/Beneficiary/Advisor/Viewer) → Send
        </div>
        <div class="flow-step">
            <strong>Step 5:</strong> Click "Import from Vault" → Select document(s) → Import
        </div>
        <div class="flow-step">
            <strong>Step 6:</strong> View imported document → Click "Sign" → Enter signature → Submit
        </div>
        <p style="margin-top:15px;"><strong>Expected Outcome:</strong> Document appears in workspace with signature recorded. Invited participant receives email.</p>
    </div>
    
    <div class="section">
        <h3>Flow 4: Binder Generation</h3>
        <div class="flow-step">
            <strong>Step 1:</strong> Go to <code>/binder</code>
        </div>
        <div class="flow-step">
            <strong>Step 2:</strong> Select portfolio from dropdown
        </div>
        <div class="flow-step">
            <strong>Step 3:</strong> Choose profile: Audit / Court / Omni
        </div>
        <div class="flow-step">
            <strong>Step 4:</strong> (Optional) Configure date range filter
        </div>
        <div class="flow-step">
            <strong>Step 5:</strong> (Optional) Expand "Court Mode" → Configure Bates numbering prefix, start number, position
        </div>
        <div class="flow-step">
            <strong>Step 6:</strong> Click "Generate Binder" → Wait for processing
        </div>
        <div class="flow-step">
            <strong>Step 7:</strong> Download generated PDF
        </div>
        <p style="margin-top:15px;"><strong>Expected Outcome:</strong> PDF generated with selected documents, proper formatting, Bates numbers if configured.</p>
        <p style="color:#fbbf24;"><strong>Known Issue:</strong> Binder generation has had intermittent WeasyPrint dependency issues. Recently fixed by installing libpangoft2-1.0-0.</p>
    </div>
    
    <h2 id="api">🔌 7. API Endpoints by Feature</h2>
    
    <div class="section">
        <h3>Authentication</h3>
        <pre>GET  /api/auth/me              → Current user info
POST /api/auth/logout          → Logout (clears session)
POST /api/auth/session         → Exchange OAuth session_id for cookie</pre>
        
        <h3>Portfolios</h3>
        <pre>GET  /api/portfolios           → List user's portfolios
POST /api/portfolios           → Create portfolio
GET  /api/portfolios/:id       → Get portfolio details
PUT  /api/portfolios/:id       → Update portfolio
DELETE /api/portfolios/:id     → Delete portfolio</pre>
        
        <h3>Documents</h3>
        <pre>GET  /api/documents?portfolio_id=xxx  → List documents (filtered by portfolio)
POST /api/documents                    → Create document
GET  /api/documents/:id                → Get document with content
PUT  /api/documents/:id                → Update document
DELETE /api/documents/:id              → Soft delete (moves to trash)</pre>
        
        <h3>Workspaces (Vaults)</h3>
        <pre>GET  /api/vaults?portfolio_id=xxx                    → List workspaces (filtered by portfolio)
POST /api/vaults                                      → Create workspace
GET  /api/vaults/:id                                  → Get workspace details with participants
PUT  /api/vaults/:id                                  → Update workspace
DELETE /api/vaults/:id                                → Delete workspace
GET  /api/vaults/:id/importable-documents?portfolio_id=xxx → Get importable docs (filtered)
POST /api/vaults/:id/documents                        → Import document to workspace
POST /api/vaults/:id/participants                     → Invite participant (sends email)
POST /api/vaults/:id/documents/:docId/sign            → Sign document</pre>
        
        <h3>Binder Generation</h3>
        <pre>GET  /api/binder/profiles?portfolio_id=xxx → List binder profiles for portfolio
POST /api/binder/profiles                   → Create/update binder profile
POST /api/binder/generate                   → Generate PDF binder (async)
GET  /api/binder/runs/:runId                → Get generation run status
GET  /api/binder/download/:runId            → Download generated PDF</pre>
        
        <h3>Bates Numbering</h3>
        <pre>GET  /api/bates/presets                → Get built-in Bates scheme presets
GET  /api/bates/schemes                 → List custom schemes for workspace
POST /api/bates/schemes                 → Create custom scheme
POST /api/bates/validate-prefix         → Validate and normalize prefix
POST /api/bates/format-number           → Format a Bates number</pre>
        
        <h3>Real-time Collaboration</h3>
        <pre>WS   /api/realtime/ws                  → WebSocket for presence and updates
GET  /api/realtime/capabilities        → List V2 features (version, features, actions)
GET  /api/realtime/stats               → Connection statistics
GET  /api/realtime/presence/:roomId    → Get room presence</pre>
        
        <h3>Governance</h3>
        <pre>GET  /api/governance/v2/meetings       → List meeting minutes
POST /api/governance/v2/meetings       → Create meeting
GET  /api/governance/v2/distributions  → List distributions
POST /api/governance/v2/distributions  → Create distribution
GET  /api/governance/v2/disputes       → List dispute cases
GET  /api/governance/v2/insurance      → List insurance policies
GET  /api/governance/v2/compensation   → List compensation entries</pre>
    </div>
    
    <h2 id="seed">📊 8. Seed Data Summary</h2>
    
    <div class="section">
        <h3>Test User</h3>
        <ul>
            <li><strong>Email:</strong> jedediah.bey@gmail.com</li>
            <li><strong>User ID:</strong> dev_admin_user (canonical, merged from duplicates)</li>
            <li><strong>Roles:</strong> OMNICOMPETENT_OWNER</li>
        </ul>
        
        <h3>Portfolios (5)</h3>
        <ul>
            <li><strong>AMMITAI JEDEDIAH BEY LIVING ESTATE TRUST</strong> — Primary portfolio with documents</li>
            <li>Test Portfolio for Style Testing</li>
            <li>Test Portfolio 20251224_003153</li>
            <li>Test Portfolio 20251224_003306</li>
            <li>Test Portfolio 20251231_130328</li>
        </ul>
        
        <h3>Documents (~8 in primary portfolio)</h3>
        <ul>
            <li>Declaration of Trust (various dates) — <span class="badge badge-green">executed</span></li>
            <li>Trust Transfer Grant Deed — <span class="badge badge-yellow">draft</span></li>
            <li>Amendment to Declaration of Trust — <span class="badge badge-blue">pending</span></li>
            <li>Certificate of Acceptance — <span class="badge badge-green">executed</span></li>
        </ul>
        
        <h3>Workspaces/Vaults (14)</h3>
        <ul>
            <li>Document Signing Test Vault (multiple instances)</li>
            <li>Bey Family Trust</li>
            <li>Trust workspace</li>
        </ul>
        
        <h3>Binder Profiles (3)</h3>
        <ul>
            <li>Audit profile — Basic audit with all documents</li>
            <li>Court/Litigation profile — Court-ready with Bates numbering</li>
            <li>Omni profile — Everything included</li>
        </ul>
    </div>
    
    <h2 id="issues">🐛 9. Known Issues</h2>
    
    <div class="section">
        <table>
            <tr><th>Issue</th><th>Severity</th><th>Status</th><th>Notes</th></tr>
            <tr>
                <td>Binder PDF generation — WeasyPrint dependency</td>
                <td><span class="badge badge-yellow">Medium</span></td>
                <td><span class="badge badge-green">Fixed</span></td>
                <td>Installed libpangoft2-1.0-0. Needs user verification.</td>
            </tr>
            <tr>
                <td>Portfolio switching — localStorage persistence</td>
                <td><span class="badge badge-yellow">Medium</span></td>
                <td><span class="badge badge-green">Fixed</span></td>
                <td>Active portfolio now persists correctly.</td>
            </tr>
            <tr>
                <td>Import from Vault — wrong portfolio's documents shown</td>
                <td><span class="badge badge-red">High</span></td>
                <td><span class="badge badge-green">Fixed</span></td>
                <td>Now correctly filters by active portfolio.</td>
            </tr>
            <tr>
                <td>Duplicate user accounts for same email</td>
                <td><span class="badge badge-red">Critical</span></td>
                <td><span class="badge badge-green">Fixed</span></td>
                <td>Merged accounts, added unique index on email.</td>
            </tr>
            <tr>
                <td>WebSocket connection errors in console</td>
                <td><span class="badge badge-blue">Low</span></td>
                <td>Known</td>
                <td>Non-blocking console errors, doesn't affect functionality.</td>
            </tr>
            <tr>
                <td>Real-time presence indicator — needs E2E testing</td>
                <td><span class="badge badge-blue">Low</span></td>
                <td>Testing Pending</td>
                <td>UI implemented, needs verification with multiple users.</td>
            </tr>
        </table>
    </div>
    
    <h2 id="checklist">✅ 10. QA Checklist</h2>
    
    <div class="section">
        <h3>Landing & Authentication</h3>
        <ul>
            <li>☐ Landing page loads with hero section</li>
            <li>☐ "Create Account" triggers Google OAuth</li>
            <li>☐ "Enter the Vault" triggers Google OAuth</li>
            <li>☐ OAuth redirects back to /vault after success</li>
        </ul>
        
        <h3>Dashboard & Portfolio</h3>
        <ul>
            <li>☐ Dashboard displays user's portfolios</li>
            <li>☐ Can create new portfolio</li>
            <li>☐ Can switch between portfolios via header dropdown</li>
            <li>☐ Portfolio switch persists across page navigation</li>
            <li>☐ Documents list filters by selected portfolio</li>
        </ul>
        
        <h3>Workspaces</h3>
        <ul>
            <li>☐ Workspaces list filters by active portfolio</li>
            <li>☐ Can create new workspace</li>
            <li>☐ New workspace auto-links to active portfolio</li>
            <li>☐ Can invite participant by email</li>
            <li>☐ Invitation email is sent</li>
            <li>☐ Import from Vault shows only active portfolio's docs</li>
            <li>☐ Can import document to workspace</li>
            <li>☐ Can sign document</li>
            <li>☐ Real-time presence indicator shows other viewers</li>
        </ul>
        
        <h3>Binder Generation</h3>
        <ul>
            <li>☐ Binder page loads with portfolio selector</li>
            <li>☐ Can select binder profile (Audit/Court/Omni)</li>
            <li>☐ Court Mode panel expands with Bates options</li>
            <li>☐ Generate button triggers PDF creation</li>
            <li>☐ Generated PDF downloads successfully</li>
            <li>☐ PDF contains expected documents</li>
        </ul>
        
        <h3>Mobile Responsive</h3>
        <ul>
            <li>☐ Landing page renders correctly on mobile</li>
            <li>☐ Navigation works on mobile (hamburger menu)</li>
            <li>☐ Document editor usable on tablet</li>
            <li>☐ Forms accessible on mobile</li>
        </ul>
        
        <h3>General</h3>
        <ul>
            <li>☐ All navigation links work</li>
            <li>☐ Error states display properly</li>
            <li>☐ Loading states display</li>
            <li>☐ Toast notifications appear for actions</li>
            <li>☐ No console errors (except known WebSocket issue)</li>
        </ul>
    </div>
    
    <hr>
    <p style="text-align: center; color: #6b7280; margin-top: 40px;">
        OmniGoVault QA Review Report | Generated {generated_at} | Staging Environment<br>
        <a href="/api/qa/access.md">View Full Access Documentation (Markdown)</a>
    </p>
</body>
</html>'''
    
    return HTMLResponse(content=html)

@router.get("/screens/{viewport}/{filename}")
async def get_screenshot(viewport: str, filename: str):
    """Serve screenshot files directly"""
    file_path = SCREENSHOTS_DIR / viewport / filename
    if file_path.exists():
        return FileResponse(file_path, media_type="image/png")
    return PlainTextResponse("Screenshot not found", status_code=404)
