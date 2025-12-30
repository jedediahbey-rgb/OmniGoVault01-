"""
Global Search API V2
Provides unified search across all content types with enhanced features.
"""

from fastapi import APIRouter, Request, Query, Depends
from typing import Dict, Optional, List
from datetime import datetime, timezone

router = APIRouter(prefix="/api/search", tags=["Global Search"])

# Database reference
db = None

def set_db(database):
    global db
    db = database


def success_response(data, message=None):
    response = {"ok": True, "data": data}
    if message:
        response["message"] = message
    return response


async def get_current_user(request: Request):
    """Get current user from request."""
    class User:
        def __init__(self):
            self.user_id = "default_user"
    return User()


# Navigation items for quick actions - V2 Enhanced
NAVIGATION_ITEMS = [
    {"id": "nav_dashboard", "type": "navigation", "title": "Dashboard", "subtitle": "Go to main dashboard", "path": "/vault", "icon": "House", "keywords": ["home", "main", "overview"], "shortcut": "G D"},
    {"id": "nav_governance", "type": "navigation", "title": "Governance", "subtitle": "Manage governance records", "path": "/vault/governance", "icon": "Gavel", "keywords": ["meetings", "distributions", "insurance", "compensation", "disputes"], "shortcut": "G G"},
    {"id": "nav_ledger", "type": "navigation", "title": "Ledger", "subtitle": "View ledger entries", "path": "/ledger", "icon": "Scroll", "keywords": ["transactions", "entries", "accounting"], "shortcut": "G L"},
    {"id": "nav_templates", "type": "navigation", "title": "Templates", "subtitle": "Document templates", "path": "/templates", "icon": "FileText", "keywords": ["documents", "forms", "declaration"], "shortcut": "G T"},
    {"id": "nav_health", "type": "navigation", "title": "Trust Health", "subtitle": "Health dashboard", "path": "/trust-health", "icon": "Heartbeat", "keywords": ["score", "audit", "integrity"], "shortcut": "G H"},
    {"id": "nav_diagnostics", "type": "navigation", "title": "Diagnostics", "subtitle": "System diagnostics", "path": "/diagnostics", "icon": "ShieldCheck", "keywords": ["scan", "repair", "orphan"]},
    {"id": "nav_learn", "type": "navigation", "title": "Learn", "subtitle": "Knowledge base", "path": "/learn", "icon": "BookOpen", "keywords": ["education", "tutorials", "guide"]},
    {"id": "nav_glossary", "type": "navigation", "title": "Glossary", "subtitle": "Term definitions", "path": "/glossary", "icon": "BookOpen", "keywords": ["terms", "definitions", "dictionary"]},
    {"id": "nav_maxims", "type": "navigation", "title": "Maxims", "subtitle": "Equity maxims", "path": "/maxims", "icon": "Sparkle", "keywords": ["principles", "rules", "equity"], "shortcut": "G M"},
    {"id": "nav_assistant", "type": "navigation", "title": "AI Assistant", "subtitle": "Get help from AI", "path": "/assistant", "icon": "Robot", "keywords": ["chat", "help", "ai", "question"], "shortcut": "G A"},
    {"id": "nav_scenarios", "type": "navigation", "title": "Scenarios", "subtitle": "What-if scenarios", "path": "/scenarios", "icon": "ChartLine", "keywords": ["simulation", "planning"]},
    {"id": "nav_nodemap", "type": "navigation", "title": "Node Map", "subtitle": "Visual node map", "path": "/node-map", "icon": "MapTrifold", "keywords": ["graph", "relationships", "visual"], "shortcut": "G N"},
    {"id": "nav_settings", "type": "navigation", "title": "Settings", "subtitle": "Account settings", "path": "/settings", "icon": "Gear", "keywords": ["preferences", "profile", "account"], "shortcut": "G S"},
    {"id": "nav_billing", "type": "navigation", "title": "Billing", "subtitle": "Subscription & billing", "path": "/billing", "icon": "CreditCard", "keywords": ["subscription", "payment", "plan"], "shortcut": "G B"},
    {"id": "nav_workspaces", "type": "navigation", "title": "Workspaces", "subtitle": "Shared workspaces", "path": "/workspaces", "icon": "Users", "keywords": ["shared", "team", "collaborate"]},
    {"id": "nav_binder", "type": "navigation", "title": "Binder", "subtitle": "Document binder", "path": "/binder", "icon": "Folder", "keywords": ["export", "compile", "pdf"]},
]

# Quick actions - V2 Enhanced
QUICK_ACTIONS = [
    {"id": "action_new_portfolio", "type": "action", "title": "New Portfolio", "subtitle": "Create a new trust portfolio", "action": "create_portfolio", "icon": "FolderPlus", "keywords": ["create", "new", "portfolio", "trust"]},
    {"id": "action_new_meeting", "type": "action", "title": "New Meeting Minutes", "subtitle": "Create meeting minutes", "action": "create_minutes", "icon": "Notebook", "keywords": ["create", "new", "meeting"]},
    {"id": "action_new_distribution", "type": "action", "title": "New Distribution", "subtitle": "Create distribution record", "action": "create_distribution", "icon": "CurrencyDollar", "keywords": ["create", "new", "payment"]},
    {"id": "action_new_insurance", "type": "action", "title": "New Insurance Policy", "subtitle": "Create insurance record", "action": "create_insurance", "icon": "Shield", "keywords": ["create", "new", "policy"]},
    {"id": "action_new_compensation", "type": "action", "title": "New Compensation", "subtitle": "Create compensation entry", "action": "create_compensation", "icon": "Users", "keywords": ["create", "new", "trustee", "payment"]},
    {"id": "action_new_dispute", "type": "action", "title": "New Dispute", "subtitle": "Create dispute record", "action": "create_dispute", "icon": "Gavel", "keywords": ["create", "new", "case"]},
    {"id": "action_new_document", "type": "action", "title": "New Document", "subtitle": "Create from template", "action": "create_document", "icon": "FilePlus", "keywords": ["create", "new", "document", "template"]},
    {"id": "action_run_scan", "type": "action", "title": "Run Health Scan", "subtitle": "Scan for issues", "action": "run_health_scan", "icon": "MagnifyingGlass", "keywords": ["scan", "check", "health"]},
    {"id": "action_export_report", "type": "action", "title": "Export Health Report", "subtitle": "Download PDF report", "action": "export_health_report", "icon": "Download", "keywords": ["export", "download", "pdf", "report"]},
    {"id": "action_export_binder", "type": "action", "title": "Export Binder", "subtitle": "Compile and export binder", "action": "export_binder", "icon": "FileArchive", "keywords": ["export", "binder", "pdf", "compile"]},
]


def fuzzy_match(query: str, text: str) -> float:
    """Simple fuzzy matching score."""
    if not query or not text:
        return 0.0
    
    query_lower = query.lower()
    text_lower = text.lower()
    
    # Exact match
    if query_lower == text_lower:
        return 1.0
    
    # Contains match
    if query_lower in text_lower:
        return 0.8 + (len(query_lower) / len(text_lower)) * 0.2
    
    # Word start match
    words = text_lower.split()
    for word in words:
        if word.startswith(query_lower):
            return 0.7
    
    # Character sequence match (fuzzy)
    query_idx = 0
    matches = 0
    for char in text_lower:
        if query_idx < len(query_lower) and char == query_lower[query_idx]:
            matches += 1
            query_idx += 1
    
    if query_idx == len(query_lower):
        return 0.5 + (matches / len(text_lower)) * 0.2
    
    return 0.0


def score_match(query: str, item: Dict) -> float:
    """Score how well an item matches the query with fuzzy matching."""
    query_lower = query.lower()
    score = 0.0
    
    # Title match (highest weight)
    title = item.get("title", "")
    title_score = fuzzy_match(query_lower, title.lower())
    score += title_score * 100
    
    # Subtitle match
    subtitle = item.get("subtitle", "")
    subtitle_score = fuzzy_match(query_lower, subtitle.lower())
    score += subtitle_score * 30
    
    # Keywords match
    keywords = item.get("keywords", [])
    for keyword in keywords:
        keyword_score = fuzzy_match(query_lower, keyword.lower())
        score += keyword_score * 20
    
    # RM-ID match (for records)
    rm_id = item.get("rm_id", "")
    if rm_id:
        rm_score = fuzzy_match(query_lower, rm_id.lower())
        score += rm_score * 80
    
    # Module type match
    module_type = item.get("module_type", "")
    if module_type:
        module_score = fuzzy_match(query_lower, module_type.lower())
        score += module_score * 40
    
    return score


@router.get("")
async def global_search(
    request: Request,
    q: str = Query(..., min_length=1, description="Search query"),
    types: Optional[str] = Query(None, description="Comma-separated types to search: records,portfolios,templates,navigation,actions"),
    limit: int = Query(20, ge=1, le=50, description="Max results")
):
    """
    Global search across all content types.
    Returns unified results sorted by relevance.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return {"ok": False, "error": {"code": "AUTH_ERROR", "message": "Authentication required"}}
    
    query = q.strip()
    results = []
    
    # Parse types filter
    search_types = types.split(",") if types else ["records", "portfolios", "templates", "navigation", "actions"]
    
    # Search navigation items
    if "navigation" in search_types:
        for item in NAVIGATION_ITEMS:
            score = score_match(query, item)
            if score > 0:
                results.append({**item, "_score": score})
    
    # Search quick actions
    if "actions" in search_types:
        for item in QUICK_ACTIONS:
            score = score_match(query, item)
            if score > 0:
                results.append({**item, "_score": score})
    
    # Search governance records
    if "records" in search_types:
        records = await db.governance_records.find(
            {"user_id": user.user_id},
            {"_id": 0, "id": 1, "title": 1, "rm_id": 1, "module_type": 1, "status": 1, "portfolio_id": 1}
        ).to_list(500)
        
        for record in records:
            item = {
                "id": record.get("id"),
                "type": "record",
                "title": record.get("title", "Untitled"),
                "subtitle": f"{record.get('module_type', 'record').title()} • {record.get('status', 'draft')}",
                "rm_id": record.get("rm_id"),
                "module_type": record.get("module_type"),
                "status": record.get("status"),
                "path": f"/vault/governance/{record.get('module_type', 'records')}/{record.get('id')}",
                "icon": get_module_icon(record.get("module_type")),
                "keywords": [record.get("module_type", ""), record.get("status", "")]
            }
            score = score_match(query, item)
            if score > 0:
                results.append({**item, "_score": score})
    
    # Search portfolios
    if "portfolios" in search_types:
        portfolios = await db.portfolios.find(
            {"user_id": user.user_id},
            {"_id": 0, "portfolio_id": 1, "name": 1, "trust_type": 1}
        ).to_list(100)
        
        for portfolio in portfolios:
            item = {
                "id": portfolio.get("portfolio_id"),
                "type": "portfolio",
                "title": portfolio.get("name", "Unnamed Portfolio"),
                "subtitle": f"Portfolio • {portfolio.get('trust_type', 'Trust')}",
                "path": f"/vault?portfolio={portfolio.get('portfolio_id')}",
                "icon": "FolderSimple",
                "keywords": ["portfolio", "trust", portfolio.get("trust_type", "")]
            }
            score = score_match(query, item)
            if score > 0:
                results.append({**item, "_score": score})
    
    # Search templates
    if "templates" in search_types:
        templates = await db.templates.find(
            {},
            {"_id": 0, "id": 1, "name": 1, "description": 1, "category": 1}
        ).to_list(100)
        
        # If no templates in DB, use default ones
        if not templates:
            templates = [
                {"id": "declaration_of_trust", "name": "Declaration of Trust", "description": "Establishes exclusive equity trust", "category": "Trust Formation"},
                {"id": "trust_transfer_grant_deed", "name": "Trust Transfer Grant Deed", "description": "Conveys property into trust", "category": "Property"},
                {"id": "certificate_of_trust", "name": "Certificate of Trust", "description": "Foreign grantor trust certificate", "category": "Certification"},
                {"id": "acknowledgement_receipt", "name": "Acknowledgement Receipt", "description": "Formal receipt for transactions", "category": "Receipts"},
                {"id": "affidavit_of_fact", "name": "Affidavit of Fact", "description": "Sworn statement under oath", "category": "Legal"},
                {"id": "trustee_acceptance", "name": "Trustee Acceptance", "description": "Notice of trustee acceptance", "category": "Notices"},
            ]
        
        for template in templates:
            item = {
                "id": template.get("id"),
                "type": "template",
                "title": template.get("name", "Unnamed Template"),
                "subtitle": f"Template • {template.get('category', 'Document')}",
                "description": template.get("description", ""),
                "path": f"/templates?template={template.get('id')}",
                "icon": "FileText",
                "keywords": ["template", "document", template.get("category", "").lower()]
            }
            score = score_match(query, item)
            if score > 0:
                results.append({**item, "_score": score})
    
    # Sort by score and limit
    results.sort(key=lambda x: x.get("_score", 0), reverse=True)
    results = results[:limit]
    
    # Remove score from results
    for r in results:
        r.pop("_score", None)
    
    # Group results by type
    grouped = {
        "navigation": [r for r in results if r.get("type") == "navigation"],
        "actions": [r for r in results if r.get("type") == "action"],
        "records": [r for r in results if r.get("type") == "record"],
        "portfolios": [r for r in results if r.get("type") == "portfolio"],
        "templates": [r for r in results if r.get("type") == "template"],
    }
    
    return success_response({
        "query": query,
        "total": len(results),
        "results": results,
        "grouped": grouped
    })


@router.get("/suggestions")
async def get_search_suggestions(request: Request):
    """
    Get search suggestions for empty state.
    Returns recent items and popular actions.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return {"ok": False, "error": {"code": "AUTH_ERROR", "message": "Authentication required"}}
    
    # Get recent records
    recent_records = await db.governance_records.find(
        {"user_id": user.user_id},
        {"_id": 0, "id": 1, "title": 1, "module_type": 1, "updated_at": 1}
    ).sort("updated_at", -1).to_list(5)
    
    recent = []
    for record in recent_records:
        recent.append({
            "id": record.get("id"),
            "type": "record",
            "title": record.get("title", "Untitled"),
            "subtitle": record.get("module_type", "record").title(),
            "path": f"/vault/governance/{record.get('module_type', 'records')}/{record.get('id')}",
            "icon": get_module_icon(record.get("module_type"))
        })
    
    return success_response({
        "recent": recent,
        "quick_actions": QUICK_ACTIONS[:5],
        "navigation": NAVIGATION_ITEMS[:6]
    })


def get_module_icon(module_type: str) -> str:
    """Get icon name for module type."""
    icons = {
        "minutes": "Notebook",
        "distribution": "CurrencyDollar",
        "insurance": "Shield",
        "compensation": "Users",
        "dispute": "Gavel"
    }
    return icons.get(module_type, "FileText")
