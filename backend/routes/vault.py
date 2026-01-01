"""Vault API Routes - Shared Trust Workspace System"""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
from uuid import uuid4
import logging

from models.vault import (
    CreateVaultRequest, UpdateVaultRequest, InviteParticipantRequest,
    CreateDocumentRequest, UpdateDocumentRequest,
    SignDocumentRequest, CommentRequest, ObjectionRequest, 
    AffirmationRequest, ResolveObjectionRequest,
    VaultType, VaultStatus, ParticipantRole, DocumentCategory
)
from services.vault_service import get_vault_service
from services.document_service import get_document_service

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
            vault_type=body.vault_type,
            portfolio_id=body.portfolio_id  # Link to specific portfolio
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


# ============ UTILITY ENDPOINTS (must be before /{vault_id}) ============

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


@router.post("/{vault_id}/deactivate")
async def deactivate_vault(request: Request, vault_id: str):
    """Deactivate a vault (return to draft status) - Only for ACTIVE vaults with no signatures"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    try:
        # Get current vault
        vault = await vault_service.get_vault(vault_id)
        if not vault:
            raise HTTPException(status_code=404, detail="Vault not found")
        
        # Check if vault is ACTIVE
        if vault.get("status") != VaultStatus.ACTIVE.value:
            raise HTTPException(status_code=400, detail="Only active vaults can be deactivated")
        
        # Check if any documents have been signed
        documents = await _db.vault_documents.find({"vault_id": vault_id}).to_list(100)
        for doc in documents:
            signatures = doc.get("signatures", [])
            if signatures:
                raise HTTPException(
                    status_code=400, 
                    detail="Cannot deactivate vault with signed documents. Archive integrity must be preserved."
                )
        
        # Deactivate - update directly in DB
        await _db.vaults.update_one(
            {"vault_id": vault_id},
            {"$set": {"status": VaultStatus.DRAFT.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Return updated vault
        updated_vault = await vault_service.get_vault_details(vault_id, user.user_id)
        return updated_vault
    except HTTPException:
        raise
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to deactivate vault: {str(e)}")


@router.delete("/{vault_id}")
async def delete_vault(request: Request, vault_id: str):
    """Delete a vault - Only allowed for DRAFT vaults with no participants (except creator)"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    try:
        # Get current vault
        vault = await vault_service.get_vault(vault_id)
        if not vault:
            raise HTTPException(status_code=404, detail="Vault not found")
        
        # Only creator can delete
        if vault.get("created_by") != user.user_id:
            raise HTTPException(status_code=403, detail="Only the vault creator can delete it")
        
        # Only DRAFT vaults can be deleted
        if vault.get("status") != VaultStatus.DRAFT.value:
            raise HTTPException(
                status_code=400, 
                detail="Only draft vaults can be deleted. Active or closed vaults must be preserved for audit integrity."
            )
        
        # Check for other participants
        participants = await _db.vault_participants.find({
            "vault_id": vault_id,
            "status": {"$ne": "removed"},
            "user_id": {"$ne": user.user_id}
        }).to_list(100)
        
        if participants:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete vault with other participants. Remove all participants first."
            )
        
        # Check for documents
        doc_count = await _db.vault_documents.count_documents({"vault_id": vault_id})
        if doc_count > 0:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete vault with documents. Delete all documents first or keep as draft."
            )
        
        # Delete participant record
        await _db.vault_participants.delete_many({"vault_id": vault_id})
        
        # Delete vault
        await _db.vaults.delete_one({"vault_id": vault_id})
        
        return {"ok": True, "message": "Vault deleted successfully"}
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


@router.post("/{vault_id}/import-document")
async def import_document_to_workspace(request: Request, vault_id: str, body: dict):
    """Import an existing document from user's portfolio into the shared workspace"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    try:
        # Check if user is a participant with upload permission
        participant = await vault_service.get_participant(vault_id, user.user_id)
        if not participant:
            raise HTTPException(status_code=403, detail="Not a participant in this vault")
        
        # Check permission
        allowed_roles = ["OWNER", "ADMIN", "EDITOR"]
        if participant.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions to import documents")
        
        # Get source document ID from request body
        source_document_id = body.get("document_id")
        if not source_document_id:
            raise HTTPException(status_code=400, detail="document_id is required")
        
        # Get all user_ids associated with this email (handles multiple accounts)
        user_ids = [user.user_id]
        if user.email:
            same_email_users = await _db.users.find(
                {"email": user.email},
                {"_id": 0, "user_id": 1}
            ).to_list(10)
            user_ids = list(set([u["user_id"] for u in same_email_users]))
        
        # Find the source document in user's portfolio documents
        source_doc = await _db.documents.find_one({
            "document_id": source_document_id,
            "user_id": {"$in": user_ids},
            "is_deleted": {"$ne": True}
        }, {"_id": 0})
        
        if not source_doc:
            raise HTTPException(status_code=404, detail="Source document not found or not owned by user")
        
        # Create a new document in the workspace based on the source
        new_doc_id = str(uuid4())
        new_document = {
            "document_id": new_doc_id,
            "vault_id": vault_id,
            "title": body.get("title") or source_doc.get("title", "Imported Document"),
            "description": body.get("description") or source_doc.get("description", ""),
            "category": body.get("category") or source_doc.get("document_type", "OTHER"),
            "content": source_doc.get("content", ""),
            "status": "DRAFT",
            "created_by": user.user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "version": 1,
            "signatures": [],
            "comments": [],
            "source_document_id": source_document_id,  # Track where it came from
            "imported_from_portfolio": True
        }
        
        await _db.vault_documents.insert_one(new_document)
        
        # Log the import event
        await _db.document_events.insert_one({
            "event_id": str(uuid4()),
            "document_id": new_doc_id,
            "vault_id": vault_id,
            "user_id": user.user_id,
            "event_type": "DOCUMENT_IMPORTED",
            "details": {
                "source_document_id": source_document_id,
                "source_title": source_doc.get("title", "Unknown"),
                "imported_title": new_document["title"]
            },
            "ip_address": get_client_ip(request),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Return without _id
        new_document.pop("_id", None)
        return new_document
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error importing document: {e}")
        raise HTTPException(status_code=500, detail="Failed to import document")


@router.get("/{vault_id}/importable-documents")
async def get_importable_documents(request: Request, vault_id: str):
    """Get list of user's portfolio documents that can be imported into this workspace"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    try:
        # Check if user is a participant
        participant = await vault_service.get_participant(vault_id, user.user_id)
        if not participant:
            raise HTTPException(status_code=403, detail="Not a participant in this vault")
        
        # Debug logging
        logger.info(f"Import docs - user_id: {user.user_id}, email: {user.email}")
        
        # Get all user_ids associated with this email (handles multiple accounts)
        user_ids = [user.user_id]
        if user.email:
            same_email_users = await _db.users.find(
                {"email": user.email},
                {"_id": 0, "user_id": 1}
            ).to_list(10)
            user_ids = list(set([u["user_id"] for u in same_email_users]))
        
        logger.info(f"Import docs - searching user_ids: {user_ids}")
        
        # Get user's portfolio documents (exclude deleted ones)
        portfolio_docs = await _db.documents.find(
            {"user_id": {"$in": user_ids}, "is_deleted": {"$ne": True}},
            {"_id": 0, "document_id": 1, "title": 1, "document_type": 1, "description": 1, "created_at": 1, "portfolio_id": 1}
        ).sort("created_at", -1).to_list(100)
        
        logger.info(f"Import docs - found {len(portfolio_docs)} documents")
        
        # Get portfolio names for display
        portfolio_ids = list(set(doc.get("portfolio_id") for doc in portfolio_docs if doc.get("portfolio_id")))
        portfolios = {}
        if portfolio_ids:
            portfolio_list = await _db.portfolios.find(
                {"portfolio_id": {"$in": portfolio_ids}},
                {"_id": 0, "portfolio_id": 1, "name": 1}
            ).to_list(100)
            portfolios = {p["portfolio_id"]: p["name"] for p in portfolio_list}
        
        # Add portfolio names to documents and normalize id field
        for doc in portfolio_docs:
            doc["id"] = doc.get("document_id")  # Add id alias for frontend compatibility
            doc["portfolio_name"] = portfolios.get(doc.get("portfolio_id"), "Unknown Portfolio")
        
        return {"documents": portfolio_docs}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching importable documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch documents")


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


@router.delete("/documents/{document_id}")
async def delete_document(request: Request, document_id: str):
    """Delete a draft document - Only allowed for DRAFT documents without signatures"""
    user = await _get_current_user(request)
    vault_service = get_vault_service()
    
    try:
        # Get the document
        document = await _db.vault_documents.find_one({"document_id": document_id}, {"_id": 0})
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        vault_id = document.get("vault_id")
        
        # Check if user has permission (must be participant with edit rights or owner)
        participant = await vault_service.get_participant(vault_id, user.user_id)
        if not participant:
            raise HTTPException(status_code=403, detail="Not a participant in this vault")
        
        # Only OWNER, ADMIN, or EDITOR can delete documents
        allowed_roles = ["OWNER", "ADMIN", "EDITOR"]
        if participant.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions to delete documents")
        
        # Check document status - only DRAFT can be deleted
        doc_status = document.get("status", "DRAFT")
        if doc_status not in ["DRAFT", "UNDER_REVIEW"]:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete {doc_status} documents. Only draft documents can be deleted."
            )
        
        # Check for signatures
        signatures = document.get("signatures", [])
        if signatures:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete document with signatures. Document integrity must be preserved."
            )
        
        # Delete the document
        await _db.vault_documents.delete_one({"document_id": document_id})
        
        # Delete associated events
        await _db.document_events.delete_many({"document_id": document_id})
        
        # Log the deletion event
        await _db.document_events.insert_one({
            "event_id": str(uuid4()),
            "document_id": None,
            "vault_id": vault_id,
            "user_id": user.user_id,
            "event_type": "DOCUMENT_DELETED",
            "details": {
                "deleted_document_id": document_id,
                "deleted_document_title": document.get("title", "Unknown"),
                "reason": "User requested deletion"
            },
            "ip_address": get_client_ip(request),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {"message": "Document deleted successfully", "document_id": document_id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")


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
