"""
Global Search API
Provides unified search across all content types.
"""

from fastapi import APIRouter, Request, Query
from datetime import datetime, timezone
from typing import List, Dict, Optional
import re

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


# Navigation items for quick actions
NAVIGATION_ITEMS = [
    {"id": "nav_dashboard", "type": "navigation", "title": "Dashboard", "subtitle": "Go to main dashboard", "path": "/vault", "icon": "House", "keywords": ["home", "main", "overview"]},
    {"id": "nav_governance", "type": "navigation", "title": "Governance", "subtitle": "Manage governance records", "path": "/vault/governance", "icon": "Gavel", "keywords": ["meetings", "distributions", "insurance", "compensation", "disputes"]},
    {"id": "nav_ledger", "type": "navigation", "title": "Ledger", "subtitle": "View ledger entries", "path": "/ledger", "icon": "Scroll", "keywords": ["transactions", "entries", "accounting"]},
    {"id": "nav_templates", "type": "navigation", "title": "Templates", "subtitle": "Document templates", "path": "/templates", "icon": "FileText", "keywords": ["documents", "forms", "declaration"]},
    {"id": "nav_health", "type": "navigation", "title": "Trust Health", "subtitle": "Health dashboard", "path": "/health", "icon": "Heartbeat", "keywords": ["score", "audit", "integrity"]},
    {"id": "nav_diagnostics", "type": "navigation", "title": "Diagnostics", "subtitle": "System diagnostics", "path": "/diagnostics", "icon": "ShieldCheck", "keywords": ["scan", "repair", "orphan"]},
    {"id": "nav_learn", "type": "navigation", "title": "Learn", "subtitle": "Knowledge base", "path": "/learn", "icon": "BookOpen", "keywords": ["education", "tutorials", "guide"]},
    {"id": "nav_glossary", "type": "navigation", "title": "Glossary", "subtitle": "Term definitions", "path": "/glossary", "icon": "BookOpen", "keywords": ["terms", "definitions", "dictionary"]},
    {"id": "nav_maxims", "type": "navigation", "title": "Maxims", "subtitle": "Equity maxims", "path": "/maxims", "icon": "Sparkle", "keywords": ["principles", "rules", "equity"]},
    {"id": "nav_assistant", "type": "navigation", "title": "AI Assistant", "subtitle": "Get help from AI", "path": "/assistant", "icon": "Robot", "keywords": ["chat", "help", "ai", "question"]},
    {"id": "nav_scenarios", "type": "navigation", "title": "Scenarios", "subtitle": "What-if scenarios", "path": "/scenarios", "icon": "ChartLine", "keywords": ["simulation", "planning"]},
    {"id": "nav_nodemap", "type": "navigation", "title": "Node Map", "subtitle": "Visual node map", "path": "/node-map", "icon": "MapTrifold", "keywords": ["graph", "relationships", "visual"]},
]

# Quick actions
QUICK_ACTIONS = [
    {"id": "action_new_meeting", "type": "action", "title": "New Meeting Minutes", "subtitle": "Create meeting minutes", "action": "create_minutes", "icon": "Notebook", "keywords": ["create", "new", "meeting"]},
    {"id": "action_new_distribution", "type": "action", "title": "New Distribution", "subtitle": "Create distribution record", "action": "create_distribution", "icon": "CurrencyDollar", "keywords": ["create", "new", "payment"]},
    {"id": "action_new_insurance", "type": "action", "title": "New Insurance Policy", "subtitle": "Create insurance record", "action": "create_insurance", "icon": "Shield", "keywords": ["create", "new", "policy"]},
    {"id": "action_new_compensation", "type": "action", "title": "New Compensation", "subtitle": "Create compensation entry", "action": "create_compensation", "icon": "Users", "keywords": ["create", "new", "trustee", "payment"]},
    {"id": "action_new_dispute", "type": "action", "title": "New Dispute", "subtitle": "Create dispute record", "action": "create_dispute", "icon": "Gavel", "keywords": ["create", "new", "case"]},
    {"id": "action_run_scan", "type": "action", "title": "Run Health Scan", "subtitle": "Scan for issues", "action": "run_health_scan", "icon": "MagnifyingGlass", "keywords": ["scan", "check", "health"]},
    {"id": "action_export_report", "type": "action", "title": "Export Health Report", "subtitle": "Download PDF report", "action": "export_health_report", "icon": "Download", "keywords": ["export", "download", "pdf", "report"]},
]


def score_match(query: str, item: Dict) -> float:
    """Score how well an item matches the query."""
    query_lower = query.lower()
    score = 0.0
    
    # Title match (highest weight)
    title = item.get("title", "").lower()
    if query_lower in title:
        score += 100
        if title.startswith(query_lower):
            score += 50
        if title == query_lower:
            score += 100
    
    # Subtitle match
    subtitle = item.get("subtitle", "").lower()
    if query_lower in subtitle:
        score += 30
    
    # Keywords match
    keywords = item.get("keywords", [])
    for keyword in keywords:
        if query_lower in keyword.lower():
            score += 20
        if keyword.lower().startswith(query_lower):
            score += 10
    
    # RM-ID match (for records)
    rm_id = item.get("rm_id", "").lower()
    if rm_id and query_lower in rm_id:
        score += 80
    
    # Module type match
    module_type = item.get("module_type", "").lower()
    if module_type and query_lower in module_type:
        score += 40
    
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
