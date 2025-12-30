"""Document Service - Document lifecycle and workflow management"""
from typing import Optional, Dict, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import uuid
import hashlib

from models.vault import (
    DocumentStatus, DocumentCategory,
    DocumentEventType,
    SignatureType,
    VaultPermission, ParticipantRole, BENEFICIARY_SIGNABLE_CATEGORIES
)
from services.vault_service import VaultService
from services.entitlement_service import EntitlementService

logger = logging.getLogger(__name__)


class DocumentService:
    """Service for document lifecycle management"""
    
    def __init__(
        self, 
        db: AsyncIOMotorDatabase, 
        vault_service: VaultService,
        entitlement_service: EntitlementService
    ):
        self.db = db
        self.vault_service = vault_service
        self.entitlement_service = entitlement_service
    
    # ============ DOCUMENT CRUD ============
    
    async def create_document(
        self,
        vault_id: str,
        user_id: str,
        title: str,
        description: str = "",
        category: DocumentCategory = DocumentCategory.OTHER,
        content: str = "",
        requires_signatures_from: List[str] = None,
        ip_address: str = None
    ) -> Dict:
        """Create a new document in a vault"""
        # Check permission
        await self.vault_service.require_permission(
            vault_id, user_id, VaultPermission.UPLOAD_DOC
        )
        
        participant = await self.vault_service.get_participant(vault_id, user_id)
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Create document record
        document = {
            "document_id": f"doc_{uuid.uuid4().hex[:12]}",
            "vault_id": vault_id,
            "title": title,
            "description": description,
            "category": category.value,
            "status": DocumentStatus.DRAFT.value,
            "current_version": 1,
            "created_by": user_id,
            "created_at": now,
            "updated_at": now,
            "requires_signatures_from": requires_signatures_from or [],
            "execution_deadline": None
        }
        
        await self.db.vault_documents.insert_one(document)
        
        # Remove MongoDB _id
        document.pop("_id", None)
        
        # Create initial version
        content_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
        
        version = {
            "id": f"docv_{uuid.uuid4().hex[:12]}",
            "document_id": document["document_id"],
            "version_number": 1,
            "content": content,
            "content_hash": content_hash,
            "file_path": None,
            "file_type": None,
            "status": DocumentStatus.DRAFT.value,
            "created_by": user_id,
            "created_at": now,
            "locked_at": None,
            "superseded_by": None
        }
        
        await self.db.document_versions.insert_one(version)
        
        # Remove MongoDB _id
        version.pop("_id", None)
        
        # Log event
        await self._log_event(
            document["document_id"],
            version["id"],
            user_id,
            participant["role"],
            DocumentEventType.CREATED,
            {"title": title, "category": category.value},
            ip_address
        )
        
        logger.info(f"Created document {document['document_id']} in vault {vault_id}")
        
        return {**document, "version": version}
    
    async def get_document(self, document_id: str) -> Optional[Dict]:
        """Get document by ID"""
        return await self.db.vault_documents.find_one(
            {"document_id": document_id},
            {"_id": 0}
        )
    
    async def get_document_details(
        self,
        document_id: str,
        user_id: str
    ) -> Dict:
        """Get document with full details for viewing"""
        doc = await self.get_document(document_id)
        if not doc:
            raise ValueError(f"Document {document_id} not found")
        
        # Check permission
        await self.vault_service.require_permission(
            doc["vault_id"], user_id, VaultPermission.VIEW_DOC
        )
        
        # Get current version
        current_version = await self.db.document_versions.find_one(
            {"document_id": document_id, "version_number": doc["current_version"]},
            {"_id": 0}
        )
        
        # Get all versions
        versions = await self.db.document_versions.find(
            {"document_id": document_id},
            {"_id": 0}
        ).sort("version_number", -1).to_list(50)
        
        # Get signatures
        signatures = await self.db.document_signatures.find(
            {"document_id": document_id},
            {"_id": 0}
        ).to_list(50)
        
        # Get affirmations
        affirmations = await self.db.document_affirmations.find(
            {"document_id": document_id},
            {"_id": 0}
        ).to_list(50)
        
        # Get objections
        objections = await self.db.document_objections.find(
            {"document_id": document_id},
            {"_id": 0}
        ).to_list(50)
        
        # Get comments
        comments = await self.db.document_comments.find(
            {"document_id": document_id},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        # Get audit trail
        events = await self.db.document_events.find(
            {"document_id": document_id},
            {"_id": 0}
        ).sort("timestamp", -1).to_list(100)
        
        # Get user's permissions for this document
        participant = await self.vault_service.get_participant(doc["vault_id"], user_id)
        permissions = await self.vault_service.get_user_permissions(doc["vault_id"], user_id)
        
        # Check if user can sign this document
        can_sign = VaultPermission.SIGN.value in permissions
        if participant["role"] == ParticipantRole.BENEFICIARY.value:
            can_sign = doc["category"] in [c.value for c in BENEFICIARY_SIGNABLE_CATEGORIES]
        
        return {
            **doc,
            "current_version": current_version,
            "versions": versions,
            "signatures": signatures,
            "affirmations": affirmations,
            "objections": objections,
            "comments": comments,
            "audit_trail": events,
            "user_role": participant["role"],
            "user_permissions": permissions,
            "can_sign": can_sign,
            "has_user_signed": any(s["user_id"] == user_id for s in signatures),
            "has_user_affirmed": any(a["user_id"] == user_id for a in affirmations),
            "has_user_objected": any(
                o["user_id"] == user_id and o["status"] == "active" 
                for o in objections
            )
        }
    
    async def update_document(
        self,
        document_id: str,
        user_id: str,
        updates: Dict,
        ip_address: str = None
    ) -> Dict:
        """Update document content (creates new version if content changed)"""
        doc = await self.get_document(document_id)
        if not doc:
            raise ValueError("Document not found")
        
        # Check permission
        await self.vault_service.require_permission(
            doc["vault_id"], user_id, VaultPermission.EDIT_DOC
        )
        
        # Can only edit drafts or under_review
        if doc["status"] not in [DocumentStatus.DRAFT.value, DocumentStatus.UNDER_REVIEW.value]:
            raise ValueError(f"Cannot edit document in {doc['status']} status")
        
        participant = await self.vault_service.get_participant(doc["vault_id"], user_id)
        now = datetime.now(timezone.utc).isoformat()
        
        # If content is changing, create new version
        if "content" in updates and updates["content"]:
            new_content = updates["content"]
            content_hash = hashlib.sha256(new_content.encode('utf-8')).hexdigest()
            
            # Mark current version as superseded
            current = await self.db.document_versions.find_one(
                {"document_id": document_id, "version_number": doc["current_version"]}
            )
            
            new_version_num = doc["current_version"] + 1
            new_version_id = f"docv_{uuid.uuid4().hex[:12]}"
            
            if current:
                await self.db.document_versions.update_one(
                    {"id": current["id"]},
                    {"$set": {"superseded_by": new_version_id}}
                )
            
            # Create new version
            new_version = {
                "id": new_version_id,
                "document_id": document_id,
                "version_number": new_version_num,
                "content": new_content,
                "content_hash": content_hash,
                "file_path": None,
                "file_type": None,
                "status": DocumentStatus.DRAFT.value,
                "created_by": user_id,
                "created_at": now,
                "locked_at": None,
                "superseded_by": None
            }
            
            await self.db.document_versions.insert_one(new_version)
            
            # Update document current version
            await self.db.vault_documents.update_one(
                {"document_id": document_id},
                {"$set": {
                    "current_version": new_version_num,
                    "updated_at": now
                }}
            )
            
            # Log event
            await self._log_event(
                document_id,
                new_version_id,
                user_id,
                participant["role"],
                DocumentEventType.VERSION_CREATED,
                {"version": new_version_num},
                ip_address
            )
        
        # Update other fields
        allowed_fields = ["title", "description", "status", "requires_signatures_from"]
        field_updates = {k: v for k, v in updates.items() if k in allowed_fields and v is not None}
        
        if field_updates:
            field_updates["updated_at"] = now
            
            # If status is changing, log it
            if "status" in field_updates:
                await self._log_event(
                    document_id,
                    None,
                    user_id,
                    participant["role"],
                    DocumentEventType.STATUS_CHANGED,
                    {"from": doc["status"], "to": field_updates["status"]},
                    ip_address
                )
            
            await self.db.vault_documents.update_one(
                {"document_id": document_id},
                {"$set": field_updates}
            )
        
        return await self.get_document(document_id)
    
    # ============ DOCUMENT WORKFLOW ============
    
    async def submit_for_review(
        self,
        document_id: str,
        user_id: str,
        ip_address: str = None
    ) -> Dict:
        """Move document from DRAFT to UNDER_REVIEW"""
        doc = await self.get_document(document_id)
        if doc["status"] != DocumentStatus.DRAFT.value:
            raise ValueError("Only draft documents can be submitted for review")
        
        return await self.update_document(
            document_id,
            user_id,
            {"status": DocumentStatus.UNDER_REVIEW.value},
            ip_address
        )
    
    async def add_comment(
        self,
        document_id: str,
        user_id: str,
        content: str,
        parent_id: str = None,
        ip_address: str = None
    ) -> Dict:
        """Add a comment to a document"""
        doc = await self.get_document(document_id)
        if not doc:
            raise ValueError("Document not found")
        
        await self.vault_service.require_permission(
            doc["vault_id"], user_id, VaultPermission.COMMENT
        )
        
        participant = await self.vault_service.get_participant(doc["vault_id"], user_id)
        now = datetime.now(timezone.utc).isoformat()
        
        comment = {
            "id": f"cmt_{uuid.uuid4().hex[:12]}",
            "document_id": document_id,
            "version_id": None,
            "user_id": user_id,
            "user_role": participant["role"],
            "content": content,
            "parent_id": parent_id,
            "created_at": now,
            "edited_at": None,
            "is_resolved": False
        }
        
        await self.db.document_comments.insert_one(comment)
        
        # Remove MongoDB _id
        comment.pop("_id", None)
        
        # Log event
        await self._log_event(
            document_id,
            None,
            user_id,
            participant["role"],
            DocumentEventType.COMMENTED,
            {"comment_id": comment["id"], "preview": content[:100]},
            ip_address
        )
        
        return comment
    
    async def affirm_document(
        self,
        document_id: str,
        user_id: str,
        note: str = "",
        ip_address: str = None
    ) -> Dict:
        """Record user's affirmation/approval of a document"""
        doc = await self.get_document(document_id)
        if not doc:
            raise ValueError("Document not found")
        
        if doc["status"] != DocumentStatus.UNDER_REVIEW.value:
            raise ValueError("Can only affirm documents under review")
        
        await self.vault_service.require_permission(
            doc["vault_id"], user_id, VaultPermission.AFFIRM
        )
        
        # Check not already affirmed
        existing = await self.db.document_affirmations.find_one({
            "document_id": document_id,
            "version_id": str(doc["current_version"]),
            "user_id": user_id
        })
        if existing:
            raise ValueError("You have already affirmed this document")
        
        participant = await self.vault_service.get_participant(doc["vault_id"], user_id)
        now = datetime.now(timezone.utc).isoformat()
        
        affirmation = {
            "id": f"aff_{uuid.uuid4().hex[:12]}",
            "document_id": document_id,
            "version_id": str(doc["current_version"]),
            "user_id": user_id,
            "user_role": participant["role"],
            "affirmed_at": now,
            "note": note
        }
        
        await self.db.document_affirmations.insert_one(affirmation)
        
        # Remove MongoDB _id
        affirmation.pop("_id", None)
        
        # Log event
        await self._log_event(
            document_id,
            None,
            user_id,
            participant["role"],
            DocumentEventType.AFFIRMED,
            {"note": note},
            ip_address
        )
        
        # Check if ready for execution
        await self._check_ready_for_execution(document_id)
        
        return affirmation
    
    async def object_to_document(
        self,
        document_id: str,
        user_id: str,
        reason: str,
        ip_address: str = None
    ) -> Dict:
        """Record user's objection to a document"""
        doc = await self.get_document(document_id)
        if not doc:
            raise ValueError("Document not found")
        
        if doc["status"] not in [DocumentStatus.UNDER_REVIEW.value, DocumentStatus.READY_FOR_EXECUTION.value]:
            raise ValueError("Can only object to documents under review or ready for execution")
        
        await self.vault_service.require_permission(
            doc["vault_id"], user_id, VaultPermission.OBJECT
        )
        
        participant = await self.vault_service.get_participant(doc["vault_id"], user_id)
        now = datetime.now(timezone.utc).isoformat()
        
        objection = {
            "id": f"obj_{uuid.uuid4().hex[:12]}",
            "document_id": document_id,
            "version_id": str(doc["current_version"]),
            "user_id": user_id,
            "user_role": participant["role"],
            "reason": reason,
            "status": "active",
            "objected_at": now,
            "resolved_at": None,
            "resolved_by": None,
            "resolution_note": None
        }
        
        await self.db.document_objections.insert_one(objection)
        
        # Remove MongoDB _id
        objection.pop("_id", None)
        
        # Log event
        await self._log_event(
            document_id,
            None,
            user_id,
            participant["role"],
            DocumentEventType.OBJECTED,
            {"reason": reason},
            ip_address
        )
        
        # If document was ready for execution, move back to under review
        if doc["status"] == DocumentStatus.READY_FOR_EXECUTION.value:
            await self.db.vault_documents.update_one(
                {"document_id": document_id},
                {"$set": {"status": DocumentStatus.UNDER_REVIEW.value}}
            )
        
        return objection
    
    async def resolve_objection(
        self,
        objection_id: str,
        user_id: str,
        resolution_note: str,
        ip_address: str = None
    ) -> Dict:
        """Resolve an objection"""
        objection = await self.db.document_objections.find_one(
            {"id": objection_id},
            {"_id": 0}
        )
        if not objection:
            raise ValueError("Objection not found")
        
        doc = await self.get_document(objection["document_id"])
        
        await self.vault_service.require_permission(
            doc["vault_id"], user_id, VaultPermission.MANAGE_VAULT
        )
        
        now = datetime.now(timezone.utc).isoformat()
        
        await self.db.document_objections.update_one(
            {"id": objection_id},
            {"$set": {
                "status": "resolved",
                "resolved_at": now,
                "resolved_by": user_id,
                "resolution_note": resolution_note
            }}
        )
        
        # Check if ready for execution
        await self._check_ready_for_execution(objection["document_id"])
        
        return await self.db.document_objections.find_one(
            {"id": objection_id},
            {"_id": 0}
        )
    
    async def sign_document(
        self,
        document_id: str,
        user_id: str,
        legal_name: str,
        signature_type: SignatureType = SignatureType.CLICK,
        signature_data: str = None,
        ip_address: str = None,
        user_agent: str = None,
        account_id: str = None
    ) -> Dict:
        """Sign a document"""
        doc = await self.get_document(document_id)
        if not doc:
            raise ValueError("Document not found")
        
        if doc["status"] != DocumentStatus.READY_FOR_EXECUTION.value:
            raise ValueError("Document is not ready for execution")
        
        # Check signing feature is enabled
        vault = await self.vault_service.get_vault(doc["vault_id"])
        acc_id = account_id or vault["account_id"]
        
        signing_enabled = await self.entitlement_service.has_entitlement(
            acc_id, "features.signing.enabled"
        )
        if not signing_enabled:
            raise PermissionError(
                "Document signing is not enabled on your plan. "
                "Upgrade to Pro or Enterprise to enable signing."
            )
        
        await self.vault_service.require_permission(
            doc["vault_id"], user_id, VaultPermission.SIGN, doc
        )
        
        # Check not already signed
        existing = await self.db.document_signatures.find_one({
            "document_id": document_id,
            "version_id": str(doc["current_version"]),
            "user_id": user_id
        })
        if existing:
            raise ValueError("You have already signed this document")
        
        participant = await self.vault_service.get_participant(doc["vault_id"], user_id)
        
        # Get current version for hash
        version = await self.db.document_versions.find_one(
            {"document_id": document_id, "version_number": doc["current_version"]}
        )
        
        now = datetime.now(timezone.utc).isoformat()
        
        signature = {
            "id": f"sig_{uuid.uuid4().hex[:12]}",
            "document_id": document_id,
            "version_id": version["id"],
            "user_id": user_id,
            "role": participant["role"],
            "legal_name": legal_name,
            "signature_type": signature_type.value,
            "signature_data": signature_data,
            "document_hash": version["content_hash"],
            "consent_text": "By signing, I agree to the terms of this document as of this version.",
            "ip_address": ip_address,
            "user_agent": user_agent,
            "signed_at": now
        }
        
        await self.db.document_signatures.insert_one(signature)
        
        # Remove MongoDB _id
        signature.pop("_id", None)
        
        # Log event
        await self._log_event(
            document_id,
            version["id"],
            user_id,
            participant["role"],
            DocumentEventType.SIGNED,
            {"legal_name": legal_name, "signature_type": signature_type.value},
            ip_address
        )
        
        # Check if all required signatures are collected
        await self._check_execution_complete(document_id)
        
        return signature
    
    async def _check_ready_for_execution(self, document_id: str):
        """Check if document should move to READY_FOR_EXECUTION"""
        doc = await self.get_document(document_id)
        
        if doc["status"] != DocumentStatus.UNDER_REVIEW.value:
            return
        
        # Check for active objections
        active_objections = await self.db.document_objections.count_documents({
            "document_id": document_id,
            "version_id": str(doc["current_version"]),
            "status": "active"
        })
        
        if active_objections > 0:
            return  # Can't proceed with active objections
        
        # For now, just having no objections is enough
        # More sophisticated rules can be added (e.g., require X affirmations)
        
        await self.db.vault_documents.update_one(
            {"document_id": document_id},
            {"$set": {
                "status": DocumentStatus.READY_FOR_EXECUTION.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"Document {document_id} is now ready for execution")
    
    async def _check_execution_complete(self, document_id: str):
        """Check if all required signatures are collected and lock document"""
        doc = await self.get_document(document_id)
        
        if doc["status"] != DocumentStatus.READY_FOR_EXECUTION.value:
            return
        
        required_roles = doc.get("requires_signatures_from", [])
        
        if not required_roles:
            # No specific roles required, just one signature is enough
            signatures = await self.db.document_signatures.count_documents({
                "document_id": document_id,
                "version_id": str(doc["current_version"])
            })
            if signatures == 0:
                return
        else:
            # Check each required role has signed
            for role in required_roles:
                signature = await self.db.document_signatures.find_one({
                    "document_id": document_id,
                    "role": role
                })
                if not signature:
                    return  # Missing required signature
        
        # All signatures collected - lock document
        now = datetime.now(timezone.utc).isoformat()
        
        await self.db.vault_documents.update_one(
            {"document_id": document_id},
            {"$set": {
                "status": DocumentStatus.EXECUTED.value,
                "updated_at": now
            }}
        )
        
        # Lock the version
        await self.db.document_versions.update_one(
            {"document_id": document_id, "version_number": doc["current_version"]},
            {"$set": {
                "status": DocumentStatus.EXECUTED.value,
                "locked_at": now
            }}
        )
        
        # Log event
        await self._log_event(
            document_id,
            None,
            "SYSTEM",
            "SYSTEM",
            DocumentEventType.LOCKED,
            {"reason": "All required signatures collected"}
        )
        
        logger.info(f"Document {document_id} has been executed and locked")
    
    async def get_audit_trail(
        self,
        document_id: str,
        user_id: str
    ) -> List[Dict]:
        """Get complete audit trail for a document"""
        doc = await self.get_document(document_id)
        if not doc:
            raise ValueError("Document not found")
        
        await self.vault_service.require_permission(
            doc["vault_id"], user_id, VaultPermission.VIEW_DOC
        )
        
        events = await self.db.document_events.find(
            {"document_id": document_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(500)
        
        return events
    
    # ============ HELPER METHODS ============
    
    async def _log_event(
        self,
        document_id: str,
        version_id: str,
        user_id: str,
        user_role: str,
        event_type: DocumentEventType,
        data: Dict = None,
        ip_address: str = None
    ):
        """Log a document event"""
        event = {
            "id": f"evt_{uuid.uuid4().hex[:12]}",
            "document_id": document_id,
            "version_id": version_id,
            "user_id": user_id,
            "user_role": user_role,
            "event_type": event_type.value,
            "data": data or {},
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.document_events.insert_one(event)
        return event


# Singleton
document_service: Optional[DocumentService] = None


def get_document_service() -> DocumentService:
    if document_service is None:
        raise RuntimeError("DocumentService not initialized")
    return document_service


def init_document_service(
    db: AsyncIOMotorDatabase,
    vault_service: VaultService,
    entitlement_service: EntitlementService
) -> DocumentService:
    global document_service
    document_service = DocumentService(db, vault_service, entitlement_service)
    return document_service
