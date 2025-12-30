"""Workspace API Routes - Shared vault management endpoints"""
from fastapi import APIRouter, HTTPException, Request
import logging

from models.vault import (
    CreateVaultRequest, UpdateVaultRequest, InviteParticipantRequest,
    CreateDocumentRequest, UpdateDocumentRequest,
    SignDocumentRequest, CommentRequest, ObjectionRequest, AffirmationRequest,
    ResolveObjectionRequest, ParticipantRole
)
from services.vault_service import get_vault_service
from services.document_service import get_document_service
from services.entitlement_service import get_entitlement_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


# ============ HELPERS ============

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def get_user_account(request: Request):
    """Get current user and their account"""
    from server import get_current_user, db
    from routes.billing import get_or_create_account_for_user
    
    user = await get_current_user(request)
    account = await get_or_create_account_for_user(user.user_id, db)
    return user, account


# ============ VAULT ENDPOINTS ============

@router.post("/vaults")
async def create_vault(request: Request, body: CreateVaultRequest):
    """Create a new shared vault workspace"""
    user, account = await get_user_account(request)
    vault_service = get_vault_service()
    
    try:
        vault = await vault_service.create_vault(
            account_id=account["account_id"],
            user_id=user.user_id,
            name=body.name,
            description=body.description,
            vault_type=body.vault_type
        )
        return vault
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/vaults")
async def list_vaults(request: Request):
    """List all vaults the user has access to"""
    user, account = await get_user_account(request)
    vault_service = get_vault_service()
    
    vaults = await vault_service.list_user_vaults(user.user_id, account["account_id"])
    return {"vaults": vaults}


@router.get("/vaults/{vault_id}")
async def get_vault(vault_id: str, request: Request):
    """Get vault details with participants and documents"""
    user, account = await get_user_account(request)
    vault_service = get_vault_service()
    
    try:
        vault = await vault_service.get_vault_details(vault_id, user.user_id)
        return vault
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.patch("/vaults/{vault_id}")
async def update_vault(vault_id: str, request: Request, body: UpdateVaultRequest):
    """Update vault settings"""
    user, account = await get_user_account(request)
    vault_service = get_vault_service()
    
    try:
        vault = await vault_service.update_vault(
            vault_id=vault_id,
            user_id=user.user_id,
            updates=body.dict(exclude_none=True)
        )
        return vault
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ============ PARTICIPANT ENDPOINTS ============

@router.post("/vaults/{vault_id}/participants")
async def invite_participant(vault_id: str, request: Request, body: InviteParticipantRequest):
    """Invite a user to participate in a vault"""
    user, account = await get_user_account(request)
    vault_service = get_vault_service()
    
    try:
        participant = await vault_service.invite_participant(
            vault_id=vault_id,
            inviter_user_id=user.user_id,
            email=body.email,
            role=body.role,
            display_name=body.display_name,
            account_id=account["account_id"]
        )
        return participant
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/vaults/{vault_id}/participants/{participant_id}")
async def remove_participant(vault_id: str, participant_id: str, request: Request):
    """Remove a participant from a vault"""
    user, account = await get_user_account(request)
    vault_service = get_vault_service()
    
    try:
        await vault_service.remove_participant(vault_id, user.user_id, participant_id)
        return {"status": "removed"}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/vaults/{vault_id}/participants/{participant_id}/role")
async def update_participant_role(
    vault_id: str, 
    participant_id: str, 
    request: Request,
    role: ParticipantRole
):
    """Change a participant's role"""
    user, account = await get_user_account(request)
    vault_service = get_vault_service()
    
    try:
        await vault_service.update_participant_role(
            vault_id, user.user_id, participant_id, role
        )
        return {"status": "updated", "new_role": role.value}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ============ DOCUMENT ENDPOINTS ============

@router.post("/documents")
async def create_document(request: Request, body: CreateDocumentRequest):
    """Create a new document in a vault"""
    user, account = await get_user_account(request)
    document_service = get_document_service()
    ip = get_client_ip(request)
    
    try:
        document = await document_service.create_document(
            vault_id=body.vault_id,
            user_id=user.user_id,
            title=body.title,
            description=body.description,
            category=body.category,
            content=body.content,
            requires_signatures_from=body.requires_signatures_from,
            ip_address=ip
        )
        return document
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/documents/{document_id}")
async def get_document(document_id: str, request: Request):
    """Get document with full details"""
    user, account = await get_user_account(request)
    document_service = get_document_service()
    
    try:
        document = await document_service.get_document_details(document_id, user.user_id)
        return document
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.patch("/documents/{document_id}")
async def update_document(document_id: str, request: Request, body: UpdateDocumentRequest):
    """Update document content or metadata"""
    user, account = await get_user_account(request)
    document_service = get_document_service()
    ip = get_client_ip(request)
    
    try:
        document = await document_service.update_document(
            document_id=document_id,
            user_id=user.user_id,
            updates=body.dict(exclude_none=True),
            ip_address=ip
        )
        return document
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/documents/{document_id}/submit-for-review")
async def submit_for_review(document_id: str, request: Request):
    """Submit document for review"""
    user, account = await get_user_account(request)
    document_service = get_document_service()
    ip = get_client_ip(request)
    
    try:
        document = await document_service.submit_for_review(
            document_id, user.user_id, ip
        )
        return document
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/documents/{document_id}/comment")
async def add_comment(document_id: str, request: Request, body: CommentRequest):
    """Add a comment to a document"""
    user, account = await get_user_account(request)
    document_service = get_document_service()
    ip = get_client_ip(request)
    
    try:
        comment = await document_service.add_comment(
            document_id=document_id,
            user_id=user.user_id,
            content=body.content,
            parent_id=body.parent_id,
            ip_address=ip
        )
        return comment
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/documents/{document_id}/affirm")
async def affirm_document(document_id: str, request: Request, body: AffirmationRequest):
    """Affirm/approve a document"""
    user, account = await get_user_account(request)
    document_service = get_document_service()
    ip = get_client_ip(request)
    
    try:
        affirmation = await document_service.affirm_document(
            document_id=document_id,
            user_id=user.user_id,
            note=body.note,
            ip_address=ip
        )
        return affirmation
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/documents/{document_id}/object")
async def object_to_document(document_id: str, request: Request, body: ObjectionRequest):
    """Object to a document"""
    user, account = await get_user_account(request)
    document_service = get_document_service()
    ip = get_client_ip(request)
    
    try:
        objection = await document_service.object_to_document(
            document_id=document_id,
            user_id=user.user_id,
            reason=body.reason,
            ip_address=ip
        )
        return objection
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/objections/{objection_id}/resolve")
async def resolve_objection(objection_id: str, request: Request, body: ResolveObjectionRequest):
    """Resolve an objection"""
    user, account = await get_user_account(request)
    document_service = get_document_service()
    ip = get_client_ip(request)
    
    try:
        objection = await document_service.resolve_objection(
            objection_id=objection_id,
            user_id=user.user_id,
            resolution_note=body.resolution_note,
            ip_address=ip
        )
        return objection
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/documents/{document_id}/sign")
async def sign_document(document_id: str, request: Request, body: SignDocumentRequest):
    """Sign a document"""
    user, account = await get_user_account(request)
    document_service = get_document_service()
    ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "")
    
    if not body.consent_acknowledged:
        raise HTTPException(status_code=400, detail="You must acknowledge consent to sign")
    
    try:
        signature = await document_service.sign_document(
            document_id=document_id,
            user_id=user.user_id,
            legal_name=body.legal_name,
            signature_type=body.signature_type,
            signature_data=body.signature_data,
            ip_address=ip,
            user_agent=user_agent,
            account_id=account["account_id"]
        )
        return signature
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/documents/{document_id}/audit-trail")
async def get_audit_trail(document_id: str, request: Request):
    """Get document audit trail"""
    user, account = await get_user_account(request)
    document_service = get_document_service()
    
    try:
        events = await document_service.get_audit_trail(document_id, user.user_id)
        return {"events": events}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ============ ENTITLEMENT INFO ============

@router.get("/entitlements/workspace")
async def get_workspace_entitlements(request: Request):
    """Get workspace-related entitlements for current account"""
    user, account = await get_user_account(request)
    entitlement_service = get_entitlement_service()
    
    # Get vault limit
    vault_check = await entitlement_service.can_create_vault(account["account_id"])
    
    # Get other workspace entitlements
    participant_limit = await entitlement_service.get_limit(account["account_id"], "participants.max")
    signing_enabled = await entitlement_service.has_entitlement(account["account_id"], "features.signing.enabled")
    audit_export = await entitlement_service.has_entitlement(account["account_id"], "features.audit_export.enabled")
    
    return {
        "vaults": {
            "current": vault_check["current"],
            "limit": vault_check["limit"],
            "allowed": vault_check["allowed"],
            "unlimited": vault_check["unlimited"]
        },
        "participants_per_vault": {
            "limit": participant_limit if participant_limit != float('inf') else -1,
            "unlimited": participant_limit == float('inf')
        },
        "features": {
            "signing_enabled": signing_enabled,
            "audit_export_enabled": audit_export
        }
    }
