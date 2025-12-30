"""
Evidence Binder API Routes

Endpoints for generating dispute evidence binders with exhibit organization.
"""

from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse, Response
from typing import Optional
from datetime import datetime, timezone
import base64

from services.evidence_binder_service import (
    create_evidence_binder_service
)
from services.binder_service import BinderStatus

router = APIRouter(prefix="/api/evidence-binder", tags=["evidence-binder"])

# Dependencies injected from server.py
db = None
get_current_user = None


def init_evidence_binder_routes(database, auth_func):
    """Initialize routes with dependencies"""
    global db, get_current_user
    db = database
    get_current_user = auth_func


def success_response(data, status_code=200):
    return JSONResponse(content={"ok": True, "data": data}, status_code=status_code)


def error_response(code, message, details=None, status_code=400):
    return JSONResponse(
        content={"ok": False, "error": {"code": code, "message": message, "details": details or {}}},
        status_code=status_code
    )


# ============ DISPUTE SELECTION ============

@router.get("/disputes")
async def get_disputes_for_evidence(
    request: Request,
    portfolio_id: str = Query(...)
):
    """Get all disputes available for evidence binder creation."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        disputes = await db.governance_records.find(
            {
                "portfolio_id": portfolio_id,
                "user_id": user.user_id,
                "module_type": "dispute",
                "status": {"$nin": ["voided", "trashed"]}
            },
            {"_id": 0, "id": 1, "title": 1, "status": 1, "created_at": 1, "rm_id": 1}
        ).sort("created_at", -1).to_list(100)
        
        return success_response({
            "disputes": disputes,
            "total": len(disputes)
        })
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.get("/disputes/{dispute_id}")
async def get_dispute_details(
    dispute_id: str,
    request: Request
):
    """Get detailed dispute info for evidence binder configuration."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        dispute = await db.governance_records.find_one(
            {"id": dispute_id, "module_type": "dispute"},
            {"_id": 0}
        )
        
        if not dispute:
            return error_response("NOT_FOUND", "Dispute not found", status_code=404)
        
        # Get linked items count
        evidence_service = create_evidence_binder_service(db)
        linked_items = await evidence_service.get_dispute_links(dispute_id, user.user_id)
        
        return success_response({
            "dispute": {
                "id": dispute.get("id"),
                "title": dispute.get("title"),
                "status": dispute.get("status"),
                "created_at": dispute.get("created_at"),
                "rm_id": dispute.get("rm_id")
            },
            "linked_items_count": len(linked_items),
            "suggested_date_range": {
                "start": dispute.get("created_at", "")[:10],
                "end": datetime.now(timezone.utc).isoformat()[:10]
            }
        })
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


# ============ DISPUTE LINK MANAGEMENT ============

@router.get("/links")
async def get_dispute_links(
    request: Request,
    dispute_id: str = Query(...)
):
    """Get all items linked to a dispute."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        evidence_service = create_evidence_binder_service(db)
        links = await evidence_service.get_dispute_links(dispute_id, user.user_id)
        
        return success_response({
            "links": links,
            "total": len(links)
        })
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.post("/links")
async def add_dispute_link(request: Request):
    """
    Link an item to a dispute for evidence gathering.
    
    Body:
    {
        "dispute_id": "...",
        "record_id": "...",
        "record_type": "governance_minutes|document|ledger_entry",
        "category": "documents|communications|financial|governance|photos|other",
        "relevance_note": "Optional note about relevance"
    }
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        body = await request.json()
        dispute_id = body.get("dispute_id")
        record_id = body.get("record_id")
        record_type = body.get("record_type", "unknown")
        category = body.get("category", "other")
        relevance_note = body.get("relevance_note", "")
        
        if not dispute_id:
            return error_response("MISSING_FIELD", "dispute_id is required")
        if not record_id:
            return error_response("MISSING_FIELD", "record_id is required")
        
        evidence_service = create_evidence_binder_service(db)
        link = await evidence_service.add_dispute_link(
            dispute_id=dispute_id,
            user_id=user.user_id,
            record_id=record_id,
            record_type=record_type,
            category=category,
            relevance_note=relevance_note
        )
        
        return success_response({
            "link": link,
            "message": "Item linked to dispute"
        })
        
    except Exception as e:
        return error_response("CREATE_ERROR", str(e), status_code=500)


@router.delete("/links/{link_id}")
async def remove_dispute_link(link_id: str, request: Request):
    """Remove a dispute link."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        evidence_service = create_evidence_binder_service(db)
        deleted = await evidence_service.remove_dispute_link(link_id, user.user_id)
        
        if not deleted:
            return error_response("NOT_FOUND", "Link not found", status_code=404)
        
        return success_response({
            "deleted": True,
            "message": "Link removed"
        })
        
    except Exception as e:
        return error_response("DELETE_ERROR", str(e), status_code=500)


@router.post("/links/auto")
async def auto_link_dispute_items(request: Request):
    """
    Auto-link items that reference the dispute.
    
    Body:
    {
        "dispute_id": "...",
        "portfolio_id": "..."
    }
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        body = await request.json()
        dispute_id = body.get("dispute_id")
        portfolio_id = body.get("portfolio_id")
        
        if not dispute_id:
            return error_response("MISSING_FIELD", "dispute_id is required")
        if not portfolio_id:
            return error_response("MISSING_FIELD", "portfolio_id is required")
        
        evidence_service = create_evidence_binder_service(db)
        linked_count = await evidence_service.auto_link_dispute_items(
            dispute_id, portfolio_id, user.user_id
        )
        
        return success_response({
            "linked_count": linked_count,
            "message": f"Auto-linked {linked_count} items to dispute"
        })
        
    except Exception as e:
        return error_response("AUTO_LINK_ERROR", str(e), status_code=500)


# ============ EVIDENCE PREVIEW ============

@router.get("/preview")
async def preview_evidence(
    request: Request,
    portfolio_id: str = Query(...),
    dispute_id: str = Query(...),
    include_linked_only: bool = Query(True),
    include_date_range: bool = Query(True)
):
    """
    Preview what items would be included in an evidence binder.
    Does not generate PDF, just shows the item list.
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        evidence_service = create_evidence_binder_service(db)
        
        rules = {
            "include_linked_only": include_linked_only,
            "include_date_range_items": include_date_range,
            "categories_enabled": ["documents", "communications", "financial", "governance"],
            "exhibit_format": "letters"
        }
        
        # Collect evidence
        evidence = await evidence_service.collect_evidence(
            portfolio_id, user.user_id, dispute_id, rules
        )
        
        # Assign exhibits (preview)
        exhibits = evidence_service.assign_exhibits(evidence, rules)
        
        # Summarize
        summary = {
            "total_items": len(exhibits),
            "by_category": {},
            "exhibits_preview": []
        }
        
        for exhibit in exhibits[:10]:  # First 10 for preview
            cat = exhibit.category
            summary["by_category"][cat] = summary["by_category"].get(cat, 0) + 1
            summary["exhibits_preview"].append({
                "exhibit_label": exhibit.exhibit_label,
                "title": exhibit.title,
                "date": exhibit.date,
                "category": exhibit.category,
                "source": exhibit.source_type
            })
        
        # Count remaining categories
        for exhibit in exhibits[10:]:
            cat = exhibit.category
            summary["by_category"][cat] = summary["by_category"].get(cat, 0) + 1
        
        return success_response(summary)
        
    except Exception as e:
        return error_response("PREVIEW_ERROR", str(e), status_code=500)


# ============ BINDER GENERATION ============

@router.post("/generate")
async def generate_evidence_binder(request: Request):
    """
    Generate an evidence binder PDF.
    
    Body:
    {
        "portfolio_id": "...",
        "dispute_id": "...",
        "rules": {
            "exhibit_format": "letters|numbers",
            "exhibit_prefix": "PX-",
            "include_timeline": true,
            "include_linked_only": true,
            "include_date_range_items": true,
            "date_start": "2024-01-01",
            "date_end": "2025-01-01",
            "categories_enabled": ["documents", "communications", "financial", "governance"],
            "include_bates": false
        }
    }
    """
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        body = await request.json()
        portfolio_id = body.get("portfolio_id")
        dispute_id = body.get("dispute_id")
        rules = body.get("rules", {})
        
        if not portfolio_id:
            return error_response("MISSING_FIELD", "portfolio_id is required")
        if not dispute_id:
            return error_response("MISSING_FIELD", "dispute_id is required")
        
        # Apply defaults
        final_rules = {
            "evidence_enabled": True,
            "dispute_id": dispute_id,
            "exhibit_format": rules.get("exhibit_format", "letters"),
            "exhibit_prefix": rules.get("exhibit_prefix", ""),
            "include_timeline": rules.get("include_timeline", True),
            "include_linked_only": rules.get("include_linked_only", True),
            "include_date_range_items": rules.get("include_date_range_items", True),
            "date_start": rules.get("date_start"),
            "date_end": rules.get("date_end"),
            "categories_enabled": rules.get("categories_enabled", [
                "documents", "communications", "financial", "governance"
            ]),
            "include_bates": rules.get("include_bates", False)
        }
        
        evidence_service = create_evidence_binder_service(db)
        result = await evidence_service.generate_evidence_binder(
            portfolio_id=portfolio_id,
            user_id=user.user_id,
            dispute_id=dispute_id,
            rules=final_rules
        )
        
        if result.get("success"):
            return success_response(result)
        else:
            return error_response(
                "GENERATION_ERROR",
                result.get("error", "Evidence binder generation failed"),
                details={"run_id": result.get("run_id")},
                status_code=500
            )
        
    except Exception as e:
        return error_response("GENERATION_ERROR", str(e), status_code=500)


# ============ BINDER RUNS (EVIDENCE TYPE) ============

@router.get("/runs")
async def get_evidence_runs(
    request: Request,
    portfolio_id: str = Query(...),
    dispute_id: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100)
):
    """Get evidence binder run history."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        query = {
            "portfolio_id": portfolio_id,
            "user_id": user.user_id,
            "binder_type": "evidence"
        }
        
        if dispute_id:
            query["dispute_id"] = dispute_id
        
        runs = await db.binder_runs.find(
            query,
            {"_id": 0, "pdf_data": 0}  # Exclude large PDF data
        ).sort("started_at", -1).limit(limit).to_list(limit)
        
        return success_response({
            "runs": runs,
            "total": len(runs)
        })
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.get("/runs/{run_id}")
async def get_evidence_run(run_id: str, request: Request):
    """Get a specific evidence binder run."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        run = await db.binder_runs.find_one(
            {"id": run_id, "user_id": user.user_id, "binder_type": "evidence"},
            {"_id": 0, "pdf_data": 0}
        )
        
        if not run:
            return error_response("NOT_FOUND", "Evidence binder run not found", status_code=404)
        
        return success_response({"run": run})
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.get("/runs/{run_id}/download")
async def download_evidence_binder(run_id: str, request: Request):
    """Download the generated evidence binder PDF."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        run = await db.binder_runs.find_one(
            {"id": run_id, "user_id": user.user_id, "binder_type": "evidence"},
            {"_id": 0}
        )
        
        if not run:
            return error_response("NOT_FOUND", "Evidence binder run not found", status_code=404)
        
        if run.get("status") != BinderStatus.COMPLETE.value:
            return error_response(
                "NOT_READY",
                f"Evidence binder is not complete. Status: {run.get('status')}",
                status_code=400
            )
        
        pdf_data = run.get("pdf_data")
        if not pdf_data:
            return error_response("NO_DATA", "PDF data not found", status_code=404)
        
        # Decode base64 PDF
        pdf_bytes = base64.b64decode(pdf_data)
        
        # Generate filename
        dispute_id = run.get("dispute_id", "dispute")[:20]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"Evidence_Binder_{dispute_id}_{timestamp}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except Exception as e:
        return error_response("DOWNLOAD_ERROR", str(e), status_code=500)


@router.get("/runs/{run_id}/view")
async def view_evidence_binder(run_id: str, request: Request):
    """View the generated evidence binder PDF inline."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        run = await db.binder_runs.find_one(
            {"id": run_id, "user_id": user.user_id, "binder_type": "evidence"},
            {"_id": 0}
        )
        
        if not run:
            return error_response("NOT_FOUND", "Evidence binder run not found", status_code=404)
        
        if run.get("status") != BinderStatus.COMPLETE.value:
            return error_response(
                "NOT_READY",
                f"Evidence binder is not complete. Status: {run.get('status')}",
                status_code=400
            )
        
        pdf_data = run.get("pdf_data")
        if not pdf_data:
            return error_response("NO_DATA", "PDF data not found", status_code=404)
        
        # Decode base64 PDF
        pdf_bytes = base64.b64decode(pdf_data)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline",
                "Content-Length": str(len(pdf_bytes))
            }
        )
        
    except Exception as e:
        return error_response("VIEW_ERROR", str(e), status_code=500)


@router.get("/runs/{run_id}/manifest")
async def get_evidence_manifest(run_id: str, request: Request):
    """Get the manifest for an evidence binder run."""
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        run = await db.binder_runs.find_one(
            {"id": run_id, "user_id": user.user_id, "binder_type": "evidence"},
            {"_id": 0, "manifest_json": 1, "profile_name": 1, "finished_at": 1, "dispute_id": 1}
        )
        
        if not run:
            return error_response("NOT_FOUND", "Evidence binder run not found", status_code=404)
        
        return success_response({
            "manifest": run.get("manifest_json", {}),
            "dispute_id": run.get("dispute_id"),
            "profile_name": run.get("profile_name"),
            "generated_at": run.get("finished_at")
        })
        
    except Exception as e:
        return error_response("FETCH_ERROR", str(e), status_code=500)


# ============ CONFIGURATION ============

@router.get("/config")
async def get_evidence_config(request: Request):
    """Get evidence binder configuration options."""
    try:
        _ = await get_current_user(request)  # Auth check
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    return success_response({
        "exhibit_formats": [
            {"value": "letters", "label": "Letters (A, B, C...)"},
            {"value": "numbers", "label": "Numbers (1, 2, 3...)"}
        ],
        "categories": [
            {"value": "documents", "label": "Documents"},
            {"value": "communications", "label": "Communications"},
            {"value": "financial", "label": "Financial Records"},
            {"value": "governance", "label": "Governance Records"},
            {"value": "photos", "label": "Photos/Images"}
        ],
        "default_rules": {
            "exhibit_format": "letters",
            "include_timeline": True,
            "include_linked_only": True,
            "include_date_range_items": True,
            "include_bates": False,
            "categories_enabled": ["documents", "communications", "financial", "governance"]
        }
    })
