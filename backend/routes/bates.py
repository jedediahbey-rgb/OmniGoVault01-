"""
Bates Configuration API Routes

Provides endpoints for managing Bates numbering configuration:
- Prefix schemes (templates)
- Continuation tracking
- Configuration resolution
"""
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional
import logging

from services.bates_config_service import (
    get_bates_service,
    CreatePrefixSchemeRequest,
    UpdatePrefixSchemeRequest,
    SetContinuationRequest
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bates", tags=["bates"])


def success_response(data: dict, status_code: int = 200):
    return {"success": True, "data": data}


def error_response(code: str, message: str, status_code: int = 400):
    raise HTTPException(status_code=status_code, detail={"code": code, "message": message})


# ============ PREFIX SCHEMES ============

@router.post("/schemes")
async def create_prefix_scheme(request: Request, body: CreatePrefixSchemeRequest):
    """Create a new Bates prefix scheme for a workspace"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    workspace_id = request.headers.get("X-Workspace-ID")
    if not workspace_id:
        return error_response("MISSING_WORKSPACE", "X-Workspace-ID header required")
    
    try:
        bates_service = get_bates_service()
        result = await bates_service.create_prefix_scheme(
            workspace_id=workspace_id,
            user_id=user.user_id,
            data=body
        )
        return success_response(result)
    except ValueError as e:
        return error_response("VALIDATION_ERROR", str(e))
    except Exception as e:
        logger.error(f"Error creating prefix scheme: {e}")
        return error_response("CREATE_ERROR", str(e), status_code=500)


@router.get("/schemes")
async def list_prefix_schemes(request: Request):
    """List all Bates prefix schemes for a workspace"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    workspace_id = request.headers.get("X-Workspace-ID")
    if not workspace_id:
        return error_response("MISSING_WORKSPACE", "X-Workspace-ID header required")
    
    try:
        bates_service = get_bates_service()
        schemes = await bates_service.get_prefix_schemes(workspace_id)
        return success_response({
            "schemes": schemes,
            "count": len(schemes)
        })
    except Exception as e:
        logger.error(f"Error listing schemes: {e}")
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.get("/schemes/{scheme_id}")
async def get_prefix_scheme(scheme_id: str, request: Request):
    """Get a specific Bates prefix scheme"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        bates_service = get_bates_service()
        scheme = await bates_service.get_prefix_scheme(scheme_id)
        
        if not scheme:
            return error_response("NOT_FOUND", "Scheme not found", status_code=404)
        
        return success_response(scheme)
    except Exception as e:
        logger.error(f"Error getting scheme: {e}")
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.put("/schemes/{scheme_id}")
async def update_prefix_scheme(scheme_id: str, request: Request, body: UpdatePrefixSchemeRequest):
    """Update a Bates prefix scheme"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        bates_service = get_bates_service()
        result = await bates_service.update_prefix_scheme(scheme_id, body)
        return success_response(result)
    except ValueError as e:
        return error_response("NOT_FOUND", str(e), status_code=404)
    except Exception as e:
        logger.error(f"Error updating scheme: {e}")
        return error_response("UPDATE_ERROR", str(e), status_code=500)


@router.delete("/schemes/{scheme_id}")
async def delete_prefix_scheme(scheme_id: str, request: Request):
    """Delete a Bates prefix scheme"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        bates_service = get_bates_service()
        result = await bates_service.delete_prefix_scheme(scheme_id)
        return success_response(result)
    except ValueError as e:
        return error_response("NOT_FOUND", str(e), status_code=404)
    except Exception as e:
        logger.error(f"Error deleting scheme: {e}")
        return error_response("DELETE_ERROR", str(e), status_code=500)


# ============ CONTINUATION TRACKING ============

@router.get("/continuation")
async def get_continuation(
    request: Request,
    prefix: str = Query(...),
    portfolio_id: Optional[str] = Query(None)
):
    """Get continuation info for a Bates prefix"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    workspace_id = request.headers.get("X-Workspace-ID")
    if not workspace_id:
        return error_response("MISSING_WORKSPACE", "X-Workspace-ID header required")
    
    try:
        bates_service = get_bates_service()
        continuation = await bates_service.get_continuation(workspace_id, prefix, portfolio_id)
        
        if not continuation:
            return success_response({
                "found": False,
                "prefix": prefix.upper(),
                "next_number": 1
            })
        
        return success_response({
            "found": True,
            **continuation,
            "next_number": continuation["last_number"] + 1
        })
    except Exception as e:
        logger.error(f"Error getting continuation: {e}")
        return error_response("FETCH_ERROR", str(e), status_code=500)


@router.post("/continuation")
async def set_continuation(request: Request, body: SetContinuationRequest):
    """Set/update continuation for a Bates prefix"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    workspace_id = request.headers.get("X-Workspace-ID")
    if not workspace_id:
        return error_response("MISSING_WORKSPACE", "X-Workspace-ID header required")
    
    try:
        bates_service = get_bates_service()
        result = await bates_service.set_continuation(
            workspace_id=workspace_id,
            prefix=body.prefix,
            last_number=body.last_number,
            portfolio_id=body.portfolio_id
        )
        return success_response(result)
    except Exception as e:
        logger.error(f"Error setting continuation: {e}")
        return error_response("UPDATE_ERROR", str(e), status_code=500)


@router.get("/continuations")
async def list_continuations(
    request: Request,
    portfolio_id: Optional[str] = Query(None)
):
    """List all continuation records for a workspace"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    workspace_id = request.headers.get("X-Workspace-ID")
    if not workspace_id:
        return error_response("MISSING_WORKSPACE", "X-Workspace-ID header required")
    
    try:
        bates_service = get_bates_service()
        continuations = await bates_service.list_continuations(workspace_id, portfolio_id)
        return success_response({
            "continuations": continuations,
            "count": len(continuations)
        })
    except Exception as e:
        logger.error(f"Error listing continuations: {e}")
        return error_response("FETCH_ERROR", str(e), status_code=500)


# ============ CONFIGURATION RESOLUTION ============

@router.get("/config/resolve")
async def resolve_config(
    request: Request,
    portfolio_id: Optional[str] = Query(None),
    scheme_id: Optional[str] = Query(None),
    use_continuation: bool = Query(False)
):
    """
    Get a fully resolved Bates configuration ready for use.
    
    This endpoint resolves the prefix pattern, determines the start number
    (with optional continuation), and returns a complete configuration.
    """
    from server import get_current_user
    
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    workspace_id = request.headers.get("X-Workspace-ID")
    if not workspace_id:
        return error_response("MISSING_WORKSPACE", "X-Workspace-ID header required")
    
    try:
        bates_service = get_bates_service()
        config = await bates_service.get_resolved_config(
            workspace_id=workspace_id,
            portfolio_id=portfolio_id,
            scheme_id=scheme_id,
            use_continuation=use_continuation
        )
        return success_response(config)
    except Exception as e:
        logger.error(f"Error resolving config: {e}")
        return error_response("CONFIG_ERROR", str(e), status_code=500)


# ============ UTILITIES ============

@router.post("/validate-prefix")
async def validate_prefix(request: Request):
    """Validate a Bates prefix and get normalized version"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        body = await request.json()
        prefix = body.get("prefix", "")
        
        bates_service = get_bates_service()
        result = bates_service.validate_prefix(prefix)
        return success_response(result)
    except Exception as e:
        logger.error(f"Error validating prefix: {e}")
        return error_response("VALIDATION_ERROR", str(e), status_code=500)


@router.post("/format-number")
async def format_bates_number(request: Request):
    """Format a Bates number with prefix and leading zeros"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        body = await request.json()
        prefix = body.get("prefix", "")
        number = body.get("number", 1)
        digits = body.get("digits", 6)
        
        bates_service = get_bates_service()
        formatted = bates_service.format_bates_number(prefix, number, digits)
        
        return success_response({
            "formatted": formatted,
            "prefix": prefix,
            "number": number,
            "digits": digits
        })
    except Exception as e:
        logger.error(f"Error formatting number: {e}")
        return error_response("FORMAT_ERROR", str(e), status_code=500)


@router.post("/parse-number")
async def parse_bates_number(request: Request):
    """Parse a Bates number string into components"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    try:
        body = await request.json()
        bates_string = body.get("bates_string", "")
        
        bates_service = get_bates_service()
        parsed = bates_service.parse_bates_number(bates_string)
        
        if not parsed:
            return success_response({
                "valid": False,
                "input": bates_string
            })
        
        return success_response({
            "valid": True,
            "input": bates_string,
            **parsed
        })
    except Exception as e:
        logger.error(f"Error parsing number: {e}")
        return error_response("PARSE_ERROR", str(e), status_code=500)


# ============ DEFAULT SCHEME PRESETS ============

@router.get("/presets")
async def get_scheme_presets(request: Request):
    """Get built-in Bates prefix scheme presets"""
    from server import get_current_user
    
    try:
        user = await get_current_user(request)
    except Exception:
        return error_response("AUTH_ERROR", "Authentication required", status_code=401)
    
    presets = [
        {
            "name": "Portfolio Standard",
            "prefix_type": "portfolio_abbrev",
            "prefix_pattern": "{PORTFOLIO}-",
            "description": "Uses portfolio abbreviation as prefix (e.g., SMITH-000001)",
            "digits": 6
        },
        {
            "name": "Case Number",
            "prefix_type": "case_number",
            "prefix_pattern": "{MATTER}-",
            "description": "Uses case/matter number as prefix",
            "digits": 6
        },
        {
            "name": "Date Based",
            "prefix_type": "date_based",
            "prefix_pattern": "{PORTFOLIO}-{YEAR}-",
            "description": "Includes year in prefix (e.g., SMITH-2024-000001)",
            "digits": 6
        },
        {
            "name": "Court Filing",
            "prefix_type": "custom",
            "prefix_pattern": "EXHIBIT-",
            "description": "Simple EXHIBIT prefix for court filings",
            "digits": 4
        },
        {
            "name": "Discovery",
            "prefix_type": "custom",
            "prefix_pattern": "{PORTFOLIO}-DISC-",
            "description": "Discovery document prefix",
            "digits": 6
        },
        {
            "name": "Sequential Only",
            "prefix_type": "sequential",
            "prefix_pattern": "",
            "description": "Numbers only without prefix (e.g., 000001)",
            "digits": 6
        }
    ]
    
    return success_response({
        "presets": presets,
        "count": len(presets)
    })
