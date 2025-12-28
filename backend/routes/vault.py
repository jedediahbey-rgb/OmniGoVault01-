"""Vault API Routes - Shared Trust Workspace System"""
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import logging

from models.vault import (
    CreateVaultRequest, UpdateVaultRequest, InviteParticipantRequest,
    CreateDocumentRequest, UpdateDocumentRequest,
    SignDocumentRequest, CommentRequest, ObjectionRequest, 
    AffirmationRequest, ResolveObjectionRequest,
    VaultType, VaultStatus, ParticipantRole, DocumentStatus, DocumentCategory, SignatureType
)
from services.vault_service import get_vault_service, VaultService
from services.document_service import get_document_service, DocumentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/vaults", tags=["vaults"])

# Dependencies - will be set during initialization
_get_current_user = None
_db = None


def init_vault_routes(db, get_current_user_func):
    """Initialize vault routes with dependencies"""
    global _get_current_user, _db
    _get_current_user = get_current_user_func
    _db = db


def get_client_ip(request: Request) -> str:
    """Get client IP address from request"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


# ============ VAULT ENDPOINTS ============

@router.post("")
async def create_vault(request: Request, body: CreateVaultRequest):
    """Create a new vault workspace"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    # Get account for user
    from routes.billing import get_or_create_account_for_user
    account = await get_or_create_account_for_user(user.user_id, _db)
    
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
    except Exception as e:
        logger.error(f"Error creating vault: {e}")
        raise HTTPException(status_code=500, detail="Failed to create vault")


@router.get("")
async def list_vaults(request: Request):
    """List all vaults the user has access to"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    # Get account for user
    from routes.billing import get_or_create_account_for_user
    account = await get_or_create_account_for_user(user.user_id, _db)
    
    vaults = await vault_service.list_user_vaults(user.user_id, account["account_id"])
    return {"vaults": vaults}


@router.get("/{vault_id}")
async def get_vault(request: Request, vault_id: str):
    """Get vault details with participants, documents, and permissions"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    try:
        details = await vault_service.get_vault_details(vault_id, user.user_id)
        return details
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.put("/{vault_id}")
async def update_vault(request: Request, vault_id: str, body: UpdateVaultRequest):
    """Update vault settings"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    try:
        updates = body.model_dump(exclude_unset=True)
        if body.status:
            updates["status"] = body.status.value
        vault = await vault_service.update_vault(vault_id, user.user_id, updates)
        return vault
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating vault: {e}")
        raise HTTPException(status_code=500, detail="Failed to update vault")


@router.post("/{vault_id}/activate")
async def activate_vault(request: Request, vault_id: str):
    """Activate a draft vault"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    try:
        vault = await vault_service.update_vault(
            vault_id, user.user_id, 
            {"status": VaultStatus.ACTIVE.value}
        )
        return vault
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/{vault_id}/close")
async def close_vault(request: Request, vault_id: str):
    """Close a vault (finalize/archive)"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    try:
        vault = await vault_service.update_vault(
            vault_id, user.user_id,
            {"status": VaultStatus.CLOSED.value}
        )
        return vault
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ============ PARTICIPANT ENDPOINTS ============

@router.post("/{vault_id}/participants")
async def invite_participant(request: Request, vault_id: str, body: InviteParticipantRequest):
    """Invite a user to participate in a vault"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    try:
        participant = await vault_service.invite_participant(
            vault_id=vault_id,
            inviter_user_id=user.user_id,
            email=body.email,
            role=body.role,
            display_name=body.display_name
        )
        return participant
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{vault_id}/participants")
async def list_participants(request: Request, vault_id: str):
    """List all participants in a vault"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    # Check access
    participant = await vault_service.get_participant(vault_id, user.user_id)
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant in this vault")
    
    participants = await _db.vault_participants.find(
        {"vault_id": vault_id, "status": {"$ne": "removed"}},
        {"_id": 0}
    ).to_list(100)
    
    return {"participants": participants}


@router.delete("/{vault_id}/participants/{participant_id}")
async def remove_participant(request: Request, vault_id: str, participant_id: str):
    """Remove a participant from a vault"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    try:
        await vault_service.remove_participant(vault_id, user.user_id, participant_id)
        return {"success": True, "message": "Participant removed"}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{vault_id}/participants/{participant_id}/role")
async def update_participant_role(
    request: Request, 
    vault_id: str, 
    participant_id: str,
    role: ParticipantRole
):
    """Change a participant's role"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    try:
        await vault_service.update_participant_role(
            vault_id, user.user_id, participant_id, role
        )
        return {"success": True, "message": f"Role updated to {role.value}"}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ============ DOCUMENT ENDPOINTS ============

@router.post("/{vault_id}/documents")
async def create_document(request: Request, vault_id: str, body: CreateDocumentRequest):
    """Create a new document in a vault"""
    user = await _get_current_user(request)
    doc_service = get_document_service()
    ip = get_client_ip(request)
    
    try:
        document = await doc_service.create_document(
            vault_id=vault_id,
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
    except Exception as e:
        logger.error(f"Error creating document: {e}")
        raise HTTPException(status_code=500, detail="Failed to create document")


@router.get("/{vault_id}/documents")
async def list_documents(request: Request, vault_id: str):
    """List all documents in a vault"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    # Check access
    participant = await vault_service.get_participant(vault_id, user.user_id)
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant in this vault")
    
    documents = await _db.vault_documents.find(
        {"vault_id": vault_id},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    return {"documents": documents}


@router.get("/documents/{document_id}")
async def get_document(request: Request, document_id: str):
    """Get document details including versions, comments, signatures"""
    user = await _get_current_user(request)
    doc_service = get_document_service()
    
    try:
        details = await doc_service.get_document_details(document_id, user.user_id)
        return details
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.put("/documents/{document_id}")
async def update_document(request: Request, document_id: str, body: UpdateDocumentRequest):
    """Update document content or status"""
    user = await _get_current_user(request)
    doc_service = get_document_service()
    ip = get_client_ip(request)
    
    try:
        updates = body.model_dump(exclude_unset=True)
        if body.status:
            updates["status"] = body.status.value
        document = await doc_service.update_document(
            document_id, user.user_id, updates, ip
        )
        return document
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/documents/{document_id}/submit-for-review")
async def submit_for_review(request: Request, document_id: str):
    """Submit a draft document for review"""
    user = await _get_current_user(request)
    doc_service = get_document_service()
    ip = get_client_ip(request)
    
    try:
        document = await doc_service.submit_for_review(document_id, user.user_id, ip)
        return document
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ============ DOCUMENT WORKFLOW ENDPOINTS ============

@router.post("/documents/{document_id}/comments")
async def add_comment(request: Request, document_id: str, body: CommentRequest):
    """Add a comment to a document"""
    user = await _get_current_user(request)
    doc_service = get_document_service()
    ip = get_client_ip(request)
    
    try:
        comment = await doc_service.add_comment(
            document_id, user.user_id, body.content, body.parent_id, ip
        )
        return comment
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.get("/documents/{document_id}/comments")
async def get_comments(request: Request, document_id: str):
    """Get all comments on a document"""
    user = await _get_current_user(request)
    doc_service = get_document_service()
    
    # Get document to check access
    doc = await doc_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    vault_service = get_vault_service()
    participant = await vault_service.get_participant(doc["vault_id"], user.user_id)
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant in this vault")
    
    comments = await _db.document_comments.find(
        {"document_id": document_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"comments": comments}


@router.post("/documents/{document_id}/affirm")
async def affirm_document(request: Request, document_id: str, body: AffirmationRequest = None):
    """Record affirmation (approval) of a document"""
    user = await _get_current_user(request)
    doc_service = get_document_service()
    ip = get_client_ip(request)
    
    note = body.note if body else ""
    
    try:
        affirmation = await doc_service.affirm_document(
            document_id, user.user_id, note, ip
        )
        return affirmation
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/documents/{document_id}/object")
async def object_to_document(request: Request, document_id: str, body: ObjectionRequest):
    """Record an objection to a document"""
    user = await _get_current_user(request)
    doc_service = get_document_service()
    ip = get_client_ip(request)
    
    try:
        objection = await doc_service.object_to_document(
            document_id, user.user_id, body.reason, ip
        )
        return objection
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/documents/{document_id}/objections/{objection_id}/resolve")
async def resolve_objection(
    request: Request, 
    document_id: str, 
    objection_id: str,
    body: ResolveObjectionRequest
):
    """Resolve an objection"""
    user = await _get_current_user(request)
    doc_service = get_document_service()
    ip = get_client_ip(request)
    
    try:
        objection = await doc_service.resolve_objection(
            objection_id, user.user_id, body.resolution_note, ip
        )
        return objection
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@router.post("/documents/{document_id}/sign")
async def sign_document(request: Request, document_id: str, body: SignDocumentRequest):
    """Sign a document"""
    user = await _get_current_user(request)
    doc_service = get_document_service()
    ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent")
    
    # Get account for entitlement check
    from routes.billing import get_or_create_account_for_user
    account = await get_or_create_account_for_user(user.user_id, _db)
    
    try:
        signature = await doc_service.sign_document(
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


@router.get("/documents/{document_id}/signatures")
async def get_signatures(request: Request, document_id: str):
    """Get all signatures on a document"""
    user = await _get_current_user(request)
    doc_service = get_document_service()
    
    # Get document to check access
    doc = await doc_service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    vault_service = get_vault_service()
    participant = await vault_service.get_participant(doc["vault_id"], user.user_id)
    if not participant:
        raise HTTPException(status_code=403, detail="Not a participant in this vault")
    
    signatures = await _db.document_signatures.find(
        {"document_id": document_id},
        {"_id": 0}
    ).to_list(50)
    
    return {"signatures": signatures}


@router.get("/documents/{document_id}/audit-trail")
async def get_document_audit_trail(request: Request, document_id: str):
    """Get complete audit trail for a document"""
    user = await _get_current_user(request)
    doc_service = get_document_service()
    
    try:
        events = await doc_service.get_audit_trail(document_id, user.user_id)
        return {"events": events}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


# ============ UTILITY ENDPOINTS ============

@router.get("/roles")
async def get_roles():
    """Get available participant roles"""
    return {
        "roles": [
            {"value": role.value, "label": role.value.replace("_", " ").title()}
            for role in ParticipantRole
        ]
    }


@router.get("/document-categories")
async def get_document_categories():
    """Get available document categories"""
    return {
        "categories": [
            {"value": cat.value, "label": cat.value.replace("_", " ").title()}
            for cat in DocumentCategory
        ]
    }


@router.get("/vault-types")
async def get_vault_types():
    """Get available vault types"""
    return {
        "types": [
            {"value": vt.value, "label": vt.value.replace("_", " ").title()}
            for vt in VaultType
        ]
    }
