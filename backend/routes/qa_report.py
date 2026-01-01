"""
QA Review Report Endpoints
Serves static HTML report and screenshots for UX/QA audit
"""

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, PlainTextResponse, FileResponse
from pathlib import Path
import os

router = APIRouter(prefix="/api/qa", tags=["QA Review"])

# Screenshots directory
SCREENSHOTS_DIR = Path("/app/public/qa_screens")

@router.get("/access.md", response_class=PlainTextResponse)
async def get_access_doc():
    """Return the QA access documentation as plain text"""
    md_path = Path("/app/QA_REVIEW_ACCESS.md")
    if md_path.exists():
        return md_path.read_text()
    return "QA_REVIEW_ACCESS.md not found"

@router.get("/report", response_class=HTMLResponse)
async def get_qa_report():
    """Generate static HTML QA report - no JavaScript required"""
    
    # Get screenshots if they exist
    desktop_screens = []
    mobile_screens = []
    
    desktop_dir = SCREENSHOTS_DIR / "desktop"
    mobile_dir = SCREENSHOTS_DIR / "mobile"
    
    if desktop_dir.exists():
        desktop_screens = sorted([f.name for f in desktop_dir.glob("*.png")])
    if mobile_dir.exists():
        mobile_screens = sorted([f.name for f in mobile_dir.glob("*.png")])
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OmniGoVault - QA Review Report</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0f1a; 
            color: #e5e7eb;
            line-height: 1.6;
            padding: 20px;
        }}
        .banner {{
            background: #ca8a04;
            color: #000;
            padding: 12px 20px;
            text-align: center;
            font-weight: bold;
            margin-bottom: 30px;
            border-radius: 8px;
        }}
        h1 {{ color: #d4af37; margin-bottom: 10px; }}
        h2 {{ color: #d4af37; margin: 30px 0 15px; border-bottom: 1px solid #d4af37; padding-bottom: 8px; }}
        h3 {{ color: #fbbf24; margin: 20px 0 10px; }}
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
        tr:hover {{ background: #1f2937; }}
        code {{ 
            background: #1f2937; 
            padding: 2px 6px; 
            border-radius: 4px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.9em;
        }}
        .section {{ 
            background: #111827; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border: 1px solid #1f2937;
        }}
        .screenshots {{ 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
            gap: 15px;
            margin: 15px 0;
        }}
        .screenshot {{ 
            border: 1px solid #1f2937; 
            border-radius: 8px;
            overflow: hidden;
        }}
        .screenshot img {{ 
            width: 100%; 
            height: auto;
            display: block;
        }}
        .screenshot-label {{
            background: #1f2937;
            padding: 8px 12px;
            font-size: 0.85em;
            color: #9ca3af;
        }}
        ul {{ margin: 10px 0 10px 25px; }}
        li {{ margin: 5px 0; }}
        .badge {{
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 500;
        }}
        .badge-green {{ background: #065f46; color: #6ee7b7; }}
        .badge-yellow {{ background: #78350f; color: #fcd34d; }}
        .badge-red {{ background: #7f1d1d; color: #fca5a5; }}
        .badge-blue {{ background: #1e3a8a; color: #93c5fd; }}
        a {{ color: #60a5fa; }}
        pre {{
            background: #1f2937;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 0.85em;
        }}
    </style>
</head>
<body>
    <div class="banner">⚠️ STAGING QA REVIEW MODE - For UX/QA Audit Only</div>
    
    <h1>🏛️ OmniGoVault - QA Review Report</h1>
    <p>Private Trust & Equity Management Platform</p>
    <p><strong>Generated:</strong> January 1, 2026 | <strong>Environment:</strong> Staging/Preview</p>
    
    <h2>📍 Route Inventory (40+ Routes)</h2>
    
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
            <tr><td><code>/vault/portfolio/:portfolioId</code></td><td>Documents List</td><td>Portfolio owner/members</td></tr>
            <tr><td><code>/vault/portfolio/:portfolioId/trust-profile</code></td><td>Trust Profile</td><td>Portfolio owner/members</td></tr>
            <tr><td><code>/vault/documents</code></td><td>Documents (default)</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/document/:documentId</code></td><td>Document Editor</td><td>Document owner/editors</td></tr>
            <tr><td><code>/vault/trash</code></td><td>Trash</td><td>All authenticated users</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h3>👥 Shared Workspaces</h3>
        <table>
            <tr><th>Route</th><th>Page</th><th>Access</th></tr>
            <tr><td><code>/vault/workspaces</code></td><td>Workspaces List</td><td>All users (filtered by active portfolio)</td></tr>
            <tr><td><code>/vault/workspaces/:vaultId</code></td><td>Workspace Detail</td><td>Workspace participants only</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h3>⚖️ Governance</h3>
        <table>
            <tr><th>Route</th><th>Page</th><th>Access</th></tr>
            <tr><td><code>/vault/governance</code></td><td>Governance Dashboard</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/governance/meetings/:id</code></td><td>Meeting Detail</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/governance/distributions/:id</code></td><td>Distribution Detail</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/governance/disputes/:id</code></td><td>Dispute Detail</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/governance/insurance/:id</code></td><td>Insurance Policy</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/governance/compensation/:id</code></td><td>Compensation Entry</td><td>All authenticated users</td></tr>
            <tr><td><code>/vault/governance/record/:id</code></td><td>Governance Record</td><td>All authenticated users</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h3>📚 Tools & Features</h3>
        <table>
            <tr><th>Route</th><th>Page</th><th>Description</th></tr>
            <tr><td><code>/binder</code></td><td>Binder Generator</td><td>Generate PDF evidence binders</td></tr>
            <tr><td><code>/ledger</code></td><td>Trust Ledger</td><td>Transaction/event ledger</td></tr>
            <tr><td><code>/ledger-threads</code></td><td>Ledger Threads</td><td>Threaded ledger view</td></tr>
            <tr><td><code>/templates</code></td><td>Document Templates</td><td>Template library</td></tr>
            <tr><td><code>/archive</code></td><td>Black Archive</td><td>Historical records</td></tr>
            <tr><td><code>/vault/audit-log</code></td><td>Audit Log</td><td>Activity history</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h3>📖 Learning & Reference</h3>
        <table>
            <tr><th>Route</th><th>Page</th><th>Description</th></tr>
            <tr><td><code>/learn</code></td><td>Learning Center</td><td>Educational content</td></tr>
            <tr><td><code>/maxims</code></td><td>Legal Maxims</td><td>Legal principles reference</td></tr>
            <tr><td><code>/glossary</code></td><td>Glossary</td><td>Term definitions</td></tr>
            <tr><td><code>/diagrams</code></td><td>Trust Diagrams</td><td>Visual trust structures</td></tr>
            <tr><td><code>/node-map</code></td><td>Node Map</td><td>Entity relationship map</td></tr>
            <tr><td><code>/scenarios</code></td><td>What-If Scenarios</td><td>Scenario planning</td></tr>
            <tr><td><code>/assistant</code></td><td>AI Assistant</td><td>AI-powered help</td></tr>
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
            <tr><td><code>/support-admin</code></td><td>Support Tools</td><td><span class="badge badge-yellow">Support/Admin</span></td></tr>
        </table>
    </div>
    
    <h2>👤 Role & Permission Matrix</h2>
    <div class="section">
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
                <td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td>
            </tr>
            <tr>
                <td><span class="badge badge-blue">TRUSTEE</span></td>
                <td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>❌</td><td>❌</td>
            </tr>
            <tr>
                <td><span class="badge badge-blue">BENEFICIARY</span></td>
                <td>✅</td><td>❌</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td>
            </tr>
            <tr>
                <td><span class="badge badge-yellow">ADVISOR</span></td>
                <td>✅</td><td>✅</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td>
            </tr>
            <tr>
                <td><span class="badge badge-yellow">VIEWER</span></td>
                <td>✅</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td>
            </tr>
        </table>
    </div>
    
    <h2>🔲 Dialogs & Modals</h2>
    <div class="section">
        <table>
            <tr><th>Dialog</th><th>Location</th><th>Purpose</th></tr>
            <tr><td>Import from Vault</td><td>Workspace Detail</td><td>Import documents from user's portfolio into workspace</td></tr>
            <tr><td>Invite Participant</td><td>Workspace Detail</td><td>Send email invitation with role assignment</td></tr>
            <tr><td>Create Document</td><td>Documents Page</td><td>New document with type selection</td></tr>
            <tr><td>Create Workspace</td><td>Workspaces Page</td><td>New workspace (auto-linked to active portfolio)</td></tr>
            <tr><td>Sign Document</td><td>Workspace Detail</td><td>Digital signature capture with typed name</td></tr>
            <tr><td>Binder Configuration</td><td>Binder Page</td><td>Profile selection, date range, redaction options</td></tr>
            <tr><td>Workspace Settings</td><td>Workspace Detail</td><td>Edit workspace name and description</td></tr>
            <tr><td>Document Viewer</td><td>Workspace Detail</td><td>View document content and metadata</td></tr>
        </table>
    </div>
    
    <h2>📊 Seed Data Summary</h2>
    <div class="section">
        <h3>Portfolios (5)</h3>
        <ul>
            <li><strong>AMMITAI JEDEDIAH BEY LIVING ESTATE TRUST</strong> - Primary portfolio with documents</li>
            <li>Test Portfolio for Style Testing</li>
            <li>Test Portfolio 20251224_003153</li>
            <li>Test Portfolio 20251224_003306</li>
            <li>Test Portfolio 20251231_130328</li>
        </ul>
        
        <h3>Documents (~8 in primary portfolio)</h3>
        <ul>
            <li>Declaration of Trust (various dates) - <span class="badge badge-green">executed</span></li>
            <li>Trust Transfer Grant Deed - <span class="badge badge-yellow">draft</span></li>
            <li>Amendment to Declaration of Trust - <span class="badge badge-blue">pending</span></li>
            <li>Certificate of Acceptance - <span class="badge badge-green">executed</span></li>
        </ul>
        
        <h3>Workspaces/Vaults (14)</h3>
        <ul>
            <li>Document Signing Test Vault (multiple instances)</li>
            <li>Bey Family Trust</li>
            <li>Trust workspace</li>
        </ul>
        
        <h3>Binder Profiles (3)</h3>
        <ul>
            <li>Audit profile</li>
            <li>Court/Litigation profile</li>
            <li>Omni profile</li>
        </ul>
    </div>
    
    <h2>🔄 Key User Flows</h2>
    
    <div class="section">
        <h3>Flow 1: Onboarding (New User)</h3>
        <ol>
            <li><code>/</code> → Click "Create Account" → Google OAuth</li>
            <li>Redirected to <code>/vault</code> (Dashboard)</li>
            <li>Create first portfolio via "+" button</li>
            <li>Navigate to <code>/vault/portfolio/:id</code></li>
            <li>Create first document via "New Document" button</li>
        </ol>
        <p><strong>Expected:</strong> User has portfolio and document, can proceed to other features</p>
    </div>
    
    <div class="section">
        <h3>Flow 2: Portfolio Switching</h3>
        <ol>
            <li>On any vault page, click portfolio dropdown in header</li>
            <li>Select different portfolio</li>
            <li>Navigate to <code>/vault/workspaces</code></li>
            <li>Observe: Only workspaces for selected portfolio appear</li>
            <li>Open workspace → Click "Import from Vault"</li>
            <li>Observe: Only documents from selected portfolio appear</li>
        </ol>
        <p><strong>Expected:</strong> All content filters by active portfolio selection</p>
    </div>
    
    <div class="section">
        <h3>Flow 3: Workspace Collaboration</h3>
        <ol>
            <li>Go to <code>/vault/workspaces</code></li>
            <li>Click "New Vault" → Enter name → Create</li>
            <li>Workspace auto-linked to current portfolio</li>
            <li>Click "Invite" → Enter email → Select role → Send</li>
            <li>Click "Import from Vault" → Select document → Import</li>
            <li>View document → Click "Sign" → Enter signature → Submit</li>
        </ol>
        <p><strong>Expected:</strong> Document appears in workspace with signature recorded</p>
    </div>
    
    <div class="section">
        <h3>Flow 4: Binder Generation</h3>
        <ol>
            <li>Go to <code>/binder</code></li>
            <li>Select portfolio from dropdown</li>
            <li>Choose profile (Audit/Court/Omni)</li>
            <li>Configure date range (optional)</li>
            <li>Set Bates numbering options</li>
            <li>Click "Generate Binder"</li>
            <li>Download PDF</li>
        </ol>
        <p><strong>Expected:</strong> PDF generated with selected documents, proper formatting, Bates numbers</p>
    </div>
    
    <h2>🔌 API Endpoints by Feature</h2>
    
    <div class="section">
        <h3>Authentication</h3>
        <pre>GET  /api/auth/me              → Current user info
POST /api/auth/logout          → Logout
GET  /api/auth/session         → Exchange OAuth session_id for cookie</pre>
        
        <h3>Portfolios</h3>
        <pre>GET  /api/portfolios           → List user's portfolios
POST /api/portfolios           → Create portfolio
GET  /api/portfolios/:id       → Get portfolio details</pre>
        
        <h3>Documents</h3>
        <pre>GET  /api/documents?portfolio_id=xxx  → List documents (filtered)
POST /api/documents                    → Create document
GET  /api/documents/:id                → Get document
PUT  /api/documents/:id                → Update document
DELETE /api/documents/:id              → Soft delete</pre>
        
        <h3>Workspaces</h3>
        <pre>GET  /api/vaults?portfolio_id=xxx               → List workspaces (filtered)
POST /api/vaults                                 → Create workspace
GET  /api/vaults/:id                             → Get workspace details
GET  /api/vaults/:id/importable-documents?portfolio_id=xxx → Get importable docs
POST /api/vaults/:id/participants                → Invite participant
POST /api/vaults/:id/documents/:docId/sign       → Sign document</pre>
        
        <h3>Binder</h3>
        <pre>GET  /api/binder/profiles?portfolio_id=xxx → List binder profiles
POST /api/binder/generate                  → Generate PDF binder
GET  /api/binder/download/:runId           → Download generated PDF</pre>
        
        <h3>Real-time</h3>
        <pre>WS   /api/realtime/ws                      → WebSocket for presence</pre>
    </div>
    
    <h2>🐛 Known Issues</h2>
    <div class="section">
        <table>
            <tr><th>Issue</th><th>Severity</th><th>Status</th></tr>
            <tr>
                <td>WebSocket connection errors in console (non-blocking)</td>
                <td><span class="badge badge-yellow">Low</span></td>
                <td>Known</td>
            </tr>
            <tr>
                <td>Binder PDF generation - WeasyPrint dependency reinstalled</td>
                <td><span class="badge badge-green">Fixed</span></td>
                <td>Verify in testing</td>
            </tr>
            <tr>
                <td>Portfolio switching localStorage persistence</td>
                <td><span class="badge badge-green">Fixed</span></td>
                <td>Verify in testing</td>
            </tr>
            <tr>
                <td>Import from Vault showing wrong portfolio docs</td>
                <td><span class="badge badge-green">Fixed</span></td>
                <td>Verify in testing</td>
            </tr>
            <tr>
                <td>Duplicate user accounts for same email</td>
                <td><span class="badge badge-green">Fixed</span></td>
                <td>DB cleaned, unique index added</td>
            </tr>
        </table>
    </div>
    
    <h2>📱 Responsive Breakpoints</h2>
    <div class="section">
        <table>
            <tr><th>Breakpoint</th><th>Width</th><th>Target Device</th></tr>
            <tr><td>Mobile</td><td>390px</td><td>iPhone 12/13/14</td></tr>
            <tr><td>Tablet</td><td>768px</td><td>iPad</td></tr>
            <tr><td>Desktop</td><td>1440px</td><td>Standard laptop</td></tr>
            <tr><td>Wide</td><td>1920px</td><td>Desktop monitor</td></tr>
        </table>
    </div>
    
    <h2>📸 Screenshots</h2>
    <div class="section">
        <p>Screenshots are captured via Playwright automation at desktop (1440px) and mobile (390px) viewports.</p>
        
        <h3>Desktop Screenshots ({len(desktop_screens)} captured)</h3>
        <div class="screenshots">
            {''.join(f'<div class="screenshot"><img src="/qa/screens/desktop/{s}" alt="{s}"><div class="screenshot-label">{s}</div></div>' for s in desktop_screens) if desktop_screens else '<p>No desktop screenshots captured yet. Run screenshot generation script.</p>'}
        </div>
        
        <h3>Mobile Screenshots ({len(mobile_screens)} captured)</h3>
        <div class="screenshots">
            {''.join(f'<div class="screenshot"><img src="/qa/screens/mobile/{s}" alt="{s}"><div class="screenshot-label">{s}</div></div>' for s in mobile_screens) if mobile_screens else '<p>No mobile screenshots captured yet. Run screenshot generation script.</p>'}
        </div>
    </div>
    
    <h2>✅ QA Review Checklist</h2>
    <div class="section">
        <ul>
            <li>☐ Landing page loads correctly</li>
            <li>☐ Google OAuth login works</li>
            <li>☐ Dashboard displays portfolios</li>
            <li>☐ Portfolio switching persists across pages</li>
            <li>☐ Documents list filters by portfolio</li>
            <li>☐ Document CRUD operations work</li>
            <li>☐ Workspaces list filters by portfolio</li>
            <li>☐ Workspace detail shows participants</li>
            <li>☐ Import from Vault shows correct portfolio's docs</li>
            <li>☐ Real-time presence indicators appear</li>
            <li>☐ Binder generation produces PDF</li>
            <li>☐ Mobile responsive layout works</li>
            <li>☐ All navigation links work</li>
            <li>☐ Error states display properly</li>
            <li>☐ Toast notifications appear</li>
            <li>☐ Loading states display</li>
        </ul>
    </div>
    
    <hr style="margin: 40px 0; border-color: #1f2937;">
    <p style="text-align: center; color: #6b7280;">
        OmniGoVault QA Review Report | Generated January 1, 2026 | Staging Environment
    </p>
</body>
</html>"""
    
    return HTMLResponse(content=html)

@router.get("/screens/{viewport}/{filename}")
async def get_screenshot(viewport: str, filename: str):
    """Serve screenshot files"""
    file_path = SCREENSHOTS_DIR / viewport / filename
    if file_path.exists():
        return FileResponse(file_path, media_type="image/png")
    return PlainTextResponse("Screenshot not found", status_code=404)
