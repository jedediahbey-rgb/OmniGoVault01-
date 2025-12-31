"""Admin API Routes - Protected admin console endpoints"""
from fastapi import APIRouter, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone
import logging

from models.admin import (
    GlobalRole,
    GrantGlobalRoleRequest,
    RevokeGlobalRoleRequest,
    UpdateEntitlementOverrideRequest,
    ChangePlanRequest,
    StartImpersonationRequest,
    AccountSuspendRequest,
    GLOBAL_ROLE_DESCRIPTIONS,
    AddSupportNoteRequest,
    ExtendTrialRequest,
    UnlockAccountRequest,
    Reset2FARequest
)
from services.admin_service import get_admin_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


# ============ MIDDLEWARE/HELPERS ============

async def require_admin(request: Request):
    """Require any admin role to access"""
    from server import get_current_user
    
    user = await get_current_user(request)
    admin_service = get_admin_service()
    
    if not await admin_service.can_access_admin(user.user_id):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return user


async def require_omnicompetent(request: Request):
    """Require Omnicompetent role (owner only for admin actions)"""
    from server import get_current_user, OWNER_USER_ID
    
    user = await get_current_user(request)
    admin_service = get_admin_service()
    
    # Owner always has access
    if user.user_id == OWNER_USER_ID:
        return user
    
    # Check for OMNICOMPETENT_OWNER role
    if not await admin_service.is_owner(user.user_id):
        raise HTTPException(status_code=403, detail="Owner access required")
    
    return user


async def require_owner(request: Request):
    """Require platform owner access (for sensitive operations)"""
    from server import get_current_user, OWNER_USER_ID
    
    user = await get_current_user(request)
    
    if user.user_id != OWNER_USER_ID:
        admin_service = get_admin_service()
        if not await admin_service.is_owner(user.user_id):
            raise HTTPException(status_code=403, detail="Platform owner access required")
    
    return user


def get_client_ip(request: Request) -> str:
    """Get client IP from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ============ ADMIN STATUS ============

@router.get("/status")
async def get_admin_status(request: Request):
    """Get current user's admin status and roles"""
    from server import get_current_user, OWNER_USER_ID
    
    user = await get_current_user(request)
    admin_service = get_admin_service()
    
    roles = await admin_service.get_user_global_roles(user.user_id)
    is_omni = await admin_service.is_omnicompetent(user.user_id)
    is_owner = await admin_service.is_owner(user.user_id)
    impersonation = await admin_service.get_active_impersonation(user.user_id)
    
    # Check if this is the platform owner
    is_platform_owner = user.user_id == OWNER_USER_ID
    
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "is_admin": is_owner or len([r for r in roles if r in ["SUPPORT_ADMIN", "BILLING_ADMIN"]]) > 0,
        "is_owner": is_owner or is_platform_owner,
        "is_omnicompetent": is_omni,
        "global_roles": roles,
        "role_descriptions": {r: GLOBAL_ROLE_DESCRIPTIONS.get(GlobalRole(r), "") for r in roles},
        "active_impersonation": impersonation
    }


# ============ GLOBAL ROLE MANAGEMENT ============

@router.get("/roles")
async def list_global_roles(request: Request):
    """List all available global roles"""
    await require_admin(request)
    
    return {
        "roles": [
            {
                "role": role.value,
                "description": GLOBAL_ROLE_DESCRIPTIONS[role]
            }
            for role in GlobalRole
        ]
    }


@router.post("/roles/grant")
async def grant_global_role(request: Request, body: GrantGlobalRoleRequest):
    """Grant a global role to a user (Owner only)
    
    Roles that can be granted:
    - OMNICOMPETENT: All features free (no admin access)
    - SUPPORT_ADMIN: Limited admin for support
    - BILLING_ADMIN: Billing management only
    
    Note: OMNICOMPETENT_OWNER cannot be granted - it's reserved for the platform owner
    """
    
    user = await require_owner(request)
    admin_service = get_admin_service()
    ip = get_client_ip(request)
    
    # Prevent granting OMNICOMPETENT_OWNER to anyone
    if body.role == GlobalRole.OMNICOMPETENT_OWNER:
        raise HTTPException(status_code=403, detail="OMNICOMPETENT_OWNER role cannot be granted. It's reserved for the platform owner.")
    
    try:
        result = await admin_service.grant_global_role(
            admin_user_id=user.user_id,
            target_user_id=body.user_id,
            role=body.role,
            notes=body.notes,
            expires_at=body.expires_at,
            ip_address=ip
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/roles/revoke")
async def revoke_global_role(request: Request, body: RevokeGlobalRoleRequest):
    """Revoke a global role from a user (Omnicompetent only)"""
    user = await require_omnicompetent(request)
    admin_service = get_admin_service()
    ip = get_client_ip(request)
    
    try:
        result = await admin_service.revoke_global_role(
            admin_user_id=user.user_id,
            target_user_id=body.user_id,
            role=body.role,
            reason=body.reason,
            ip_address=ip
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ IMPERSONATION ============

@router.post("/impersonate/start")
async def start_impersonation(request: Request, body: StartImpersonationRequest):
    """Start impersonating another user"""
    user = await require_admin(request)
    admin_service = get_admin_service()
    ip = get_client_ip(request)
    
    try:
        result = await admin_service.start_impersonation(
            admin_user_id=user.user_id,
            target_user_id=body.target_user_id,
            reason=body.reason,
            ip_address=ip
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/impersonate/stop")
async def stop_impersonation(request: Request):
    """Stop current impersonation session"""
    from server import get_current_user
    
    user = await get_current_user(request)
    admin_service = get_admin_service()
    ip = get_client_ip(request)
    
    result = await admin_service.stop_impersonation(
        admin_user_id=user.user_id,
        ip_address=ip
    )
    return result


@router.get("/impersonate/current")
async def get_current_impersonation(request: Request):
    """Get current impersonation session"""
    from server import get_current_user
    
    user = await get_current_user(request)
    admin_service = get_admin_service()
    
    session = await admin_service.get_active_impersonation(user.user_id)
    return {"session": session}


# ============ ACCOUNT MANAGEMENT ============

@router.get("/accounts")
async def list_accounts(
    request: Request,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """List all accounts"""
    user = await require_admin(request)
    admin_service = get_admin_service()
    ip = get_client_ip(request)
    
    result = await admin_service.list_accounts(
        admin_user_id=user.user_id,
        search=search,
        skip=skip,
        limit=limit,
        ip_address=ip
    )
    return result


@router.get("/accounts/{account_id}")
async def get_account_details(account_id: str, request: Request):
    """Get detailed account info"""
    user = await require_admin(request)
    admin_service = get_admin_service()
    ip = get_client_ip(request)
    
    try:
        result = await admin_service.get_account_details(
            admin_user_id=user.user_id,
            account_id=account_id,
            ip_address=ip
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/accounts/{account_id}/change-plan")
async def change_account_plan(account_id: str, request: Request, body: ChangePlanRequest):
    """Change an account's plan"""
    user = await require_admin(request)
    admin_service = get_admin_service()
    ip = get_client_ip(request)
    
    try:
        result = await admin_service.change_account_plan(
            admin_user_id=user.user_id,
            account_id=account_id,
            plan_id=body.plan_id,
            reason=body.reason,
            ip_address=ip
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/accounts/{account_id}/entitlements")
async def update_account_entitlement(
    account_id: str,
    request: Request,
    body: UpdateEntitlementOverrideRequest
):
    """Override an entitlement for an account (Omnicompetent only)"""
    user = await require_omnicompetent(request)
    admin_service = get_admin_service()
    ip = get_client_ip(request)
    
    try:
        result = await admin_service.update_account_entitlement(
            admin_user_id=user.user_id,
            account_id=account_id,
            key=body.key,
            value=body.value,
            reason=body.reason,
            ip_address=ip
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/accounts/{account_id}/suspend")
async def suspend_account(account_id: str, request: Request, body: AccountSuspendRequest):
    """Suspend an account (Omnicompetent only)"""
    user = await require_omnicompetent(request)
    admin_service = get_admin_service()
    ip = get_client_ip(request)
    
    try:
        result = await admin_service.suspend_account(
            admin_user_id=user.user_id,
            account_id=account_id,
            reason=body.reason,
            ip_address=ip
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ============ USER MANAGEMENT ============

@router.get("/users")
async def list_users(
    request: Request,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """List all users"""
    user = await require_admin(request)
    admin_service = get_admin_service()
    
    result = await admin_service.list_users(
        admin_user_id=user.user_id,
        search=search,
        skip=skip,
        limit=limit
    )
    return result


@router.get("/users/{target_user_id}")
async def get_user_details(target_user_id: str, request: Request):
    """Get detailed user info"""
    user = await require_admin(request)
    admin_service = get_admin_service()
    ip = get_client_ip(request)
    
    try:
        result = await admin_service.get_user_details(
            admin_user_id=user.user_id,
            target_user_id=target_user_id,
            ip_address=ip
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============ SUPPORT_ADMIN SPECIFIC ROUTES ============

@router.get("/support/permissions")
async def get_support_permissions(request: Request):
    """Get current admin's support permissions and restrictions"""
    user = await require_admin(request)
    admin_service = get_admin_service()
    
    result = await admin_service.get_support_admin_permissions(user.user_id)
    return result


@router.post("/support/notes")
async def add_support_note(request: Request, body: AddSupportNoteRequest):
    """Add a support note to an account or user"""
    user = await require_admin(request)
    admin_service = get_admin_service()
    ip = get_client_ip(request)
    
    try:
        result = await admin_service.add_support_note(
            admin_user_id=user.user_id,
            account_id=body.account_id,
            user_id=body.user_id,
            note_type=body.note_type.value,
            content=body.content,
            is_internal=body.is_internal,
            tags=body.tags,
            ip_address=ip
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/support/notes")
async def get_support_notes(
    request: Request,
    account_id: Optional[str] = None,
    user_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get support notes for an account or user"""
    user = await require_admin(request)
    admin_service = get_admin_service()
    
    try:
        result = await admin_service.get_support_notes(
            admin_user_id=user.user_id,
            account_id=account_id,
            user_id=user_id,
            skip=skip,
            limit=limit
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/support/extend-trial")
async def extend_trial(request: Request, body: ExtendTrialRequest):
    """Extend a trial period for an account (Support Admin allowed, max 30 days)"""
    user = await require_admin(request)
    admin_service = get_admin_service()
    ip = get_client_ip(request)
    
    try:
        result = await admin_service.extend_trial(
            admin_user_id=user.user_id,
            account_id=body.account_id,
            days=body.days,
            reason=body.reason,
            ip_address=ip
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/support/unlock-account")
async def unlock_account(request: Request, body: UnlockAccountRequest):
    """Unlock a locked user account (Support Admin allowed)"""
    user = await require_admin(request)
    admin_service = get_admin_service()
    ip = get_client_ip(request)
    
    try:
        result = await admin_service.unlock_user_account(
            admin_user_id=user.user_id,
            target_user_id=body.user_id,
            reason=body.reason,
            ip_address=ip
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/support/reset-2fa")
async def reset_2fa(request: Request, body: Reset2FARequest):
    """Reset 2FA for a user (Support Admin allowed)"""
    user = await require_admin(request)
    admin_service = get_admin_service()
    ip = get_client_ip(request)
    
    try:
        result = await admin_service.reset_user_2fa(
            admin_user_id=user.user_id,
            target_user_id=body.user_id,
            reason=body.reason,
            ip_address=ip
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ AUDIT LOGS ============

@router.get("/audit-logs")
async def get_audit_logs(
    request: Request,
    admin_user_id: Optional[str] = None,
    action_type: Optional[str] = None,
    account_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """Get admin audit logs (Omnicompetent only)"""
    user = await require_omnicompetent(request)
    admin_service = get_admin_service()
    
    filters = {}
    if admin_user_id:
        filters["admin_user_id"] = admin_user_id
    if action_type:
        filters["action_type"] = action_type
    if account_id:
        filters["account_id"] = account_id
    
    result = await admin_service.get_audit_logs(
        admin_user_id=user.user_id,
        filters=filters if filters else None,
        skip=skip,
        limit=limit
    )
    return result


# ============ BOOTSTRAP (for initial setup) ============

@router.post("/bootstrap")
async def bootstrap_omnicompetent(request: Request, secret: str):
    """Bootstrap first Omnicompetent user (requires secret, one-time use)"""
    from server import get_current_user, db
    import os
    
    # Check bootstrap secret (should be set in env for security)
    bootstrap_secret = os.environ.get("ADMIN_BOOTSTRAP_SECRET", "omni_bootstrap_2024")
    
    if secret != bootstrap_secret:
        raise HTTPException(status_code=403, detail="Invalid bootstrap secret")
    
    # Check if any Omnicompetent users exist
    existing = await db.user_global_roles.find_one({"role": GlobalRole.OMNICOMPETENT.value})
    if existing:
        raise HTTPException(status_code=400, detail="Omnicompetent user already exists. Use admin routes to grant additional roles.")
    
    user = await get_current_user(request)
    
    # Grant Omnicompetent to current user
    now = datetime.now(timezone.utc).isoformat()
    role_doc = {
        "id": "ugr_bootstrap",
        "user_id": user.user_id,
        "role": GlobalRole.OMNICOMPETENT.value,
        "granted_by": "SYSTEM_BOOTSTRAP",
        "granted_at": now,
        "expires_at": None,
        "notes": "Initial Omnicompetent bootstrap"
    }
    
    await db.user_global_roles.insert_one(role_doc)
    
    # Log it
    admin_service = get_admin_service()
    await admin_service._log_admin_action(
        admin_user_id="SYSTEM_BOOTSTRAP",
        action_type=AdminAuditAction.GRANT_GLOBAL_ROLE,
        target_user_id=user.user_id,
        metadata={"role": GlobalRole.OMNICOMPETENT.value, "method": "bootstrap"},
        ip_address=get_client_ip(request)
    )
    
    logger.info(f"Bootstrapped Omnicompetent user: {user.user_id}")
    
    return {
        "status": "success",
        "message": f"User {user.user_id} is now Omnicompetent",
        "user_id": user.user_id
    }


# Import AdminAuditAction for bootstrap
from models.admin import AdminAuditAction
