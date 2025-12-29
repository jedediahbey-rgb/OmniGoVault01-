"""Vault Service - Core workspace management with permission enforcement"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import uuid
import hashlib

from models.vault import (
    Vault, VaultStatus, VaultType,
    VaultParticipant, ParticipantRole,
    Document, DocumentVersion, DocumentStatus, DocumentCategory,
    DocumentEvent, DocumentEventType,
    DocumentSignature, SignatureType,
    DocumentComment, DocumentAffirmation, DocumentObjection,
    VaultPermission, DEFAULT_ROLE_PERMISSIONS, BENEFICIARY_SIGNABLE_CATEGORIES
)
from services.entitlement_service import EntitlementService, EntitlementKeys

logger = logging.getLogger(__name__)


class VaultService:
    """Service for managing shared trust workspaces"""
    
    def __init__(self, db: AsyncIOMotorDatabase, entitlement_service: EntitlementService):
        self.db = db
        self.entitlement_service = entitlement_service
    
    # ============ PERMISSION CHECKS ============
    
    async def get_participant(self, vault_id: str, user_id: str) -> Optional[Dict]:
        """Get a user's participation in a vault"""
        return await self.db.vault_participants.find_one(
            {"vault_id": vault_id, "user_id": user_id, "status": "active"},
            {"_id": 0}
        )
    
    async def has_permission(
        self, 
        vault_id: str, 
        user_id: str, 
        permission: VaultPermission,
        document: Optional[Dict] = None
    ) -> bool:
        """Check if user has a specific permission in a vault"""
        participant = await self.get_participant(vault_id, user_id)
        
        if not participant:
            return False
        
        role = ParticipantRole(participant["role"])
        
        # Get default permissions for role
        default_perms = DEFAULT_ROLE_PERMISSIONS.get(role, [])
        
        # Apply overrides
        custom_added = participant.get("permissions_override", [])
        custom_revoked = participant.get("permissions_revoked", [])
        
        # Build effective permissions
        effective_perms = set([p.value for p in default_perms])
        effective_perms.update(custom_added)
        effective_perms -= set(custom_revoked)
        
        # Special case: Beneficiary signing only on specific document types
        if permission == VaultPermission.SIGN and role == ParticipantRole.BENEFICIARY:
            if document:
                category = document.get("category", "")
                if category not in [c.value for c in BENEFICIARY_SIGNABLE_CATEGORIES]:
                    return False
        
        return permission.value in effective_perms
    
    async def require_permission(
        self, 
        vault_id: str, 
        user_id: str, 
        permission: VaultPermission,
        document: Optional[Dict] = None
    ):
        """Raise error if user doesn't have permission"""
        if not await self.has_permission(vault_id, user_id, permission, document):
            raise PermissionError(f"User lacks {permission.value} permission in this vault")
    
    async def get_user_permissions(self, vault_id: str, user_id: str) -> List[str]:
        """Get all effective permissions for a user in a vault"""
        participant = await self.get_participant(vault_id, user_id)
        
        if not participant:
            return []
        
        role = ParticipantRole(participant["role"])
        default_perms = DEFAULT_ROLE_PERMISSIONS.get(role, [])
        
        custom_added = participant.get("permissions_override", [])
        custom_revoked = participant.get("permissions_revoked", [])
        
        effective_perms = set([p.value for p in default_perms])
        effective_perms.update(custom_added)
        effective_perms -= set(custom_revoked)
        
        return list(effective_perms)
    
    # ============ VAULT MANAGEMENT ============
    
    async def create_vault(
        self,
        account_id: str,
        user_id: str,
        name: str,
        description: str = "",
        vault_type: VaultType = VaultType.TRUST
    ) -> Dict:
        """Create a new vault workspace"""
        # Check entitlement
        can_create = await self.entitlement_service.can_create_vault(account_id)
        if not can_create["allowed"]:
            raise PermissionError(
                f"Vault limit reached ({can_create['current']}/{can_create['limit']}). "
                "Upgrade your plan to create more vaults."
            )
        
        now = datetime.now(timezone.utc).isoformat()
        
        vault = {
            "vault_id": f"vault_{uuid.uuid4().hex[:12]}",
            "account_id": account_id,
            "name": name,
            "description": description,
            "vault_type": vault_type.value,
            "status": VaultStatus.DRAFT.value,
            "settings": {},
            "created_by": user_id,
            "created_at": now,
            "updated_at": now,
            "closed_at": None
        }
        
        await self.db.vaults.insert_one(vault)
        
        # Remove MongoDB _id before returning
        vault.pop("_id", None)
        
        # Add creator as owner/trustee
        participant = {
            "id": f"vp_{uuid.uuid4().hex[:12]}",
            "vault_id": vault["vault_id"],
            "user_id": user_id,
            "email": "",  # Will be filled from user record
            "role": ParticipantRole.OWNER.value,
            "display_name": "",
            "permissions_override": [],
            "permissions_revoked": [],
            "invited_by": user_id,
            "invited_at": now,
            "accepted_at": now,
            "status": "active"
        }
        
        await self.db.vault_participants.insert_one(participant)
        
        # Remove MongoDB _id from participant
        participant.pop("_id", None)
        
        # Update usage
        await self.entitlement_service.recalculate_usage(account_id)
        
        logger.info(f"Created vault {vault['vault_id']} for account {account_id}")
        
        return vault
    
    async def get_vault(self, vault_id: str) -> Optional[Dict]:
        """Get vault by ID"""
        return await self.db.vaults.find_one(
            {"vault_id": vault_id},
            {"_id": 0}
        )
    
    async def get_vault_details(self, vault_id: str, user_id: str) -> Dict:
        """Get vault with participants, documents, and user permissions"""
        vault = await self.get_vault(vault_id)
        if not vault:
            raise ValueError(f"Vault {vault_id} not found")
        
        # Check user has access
        participant = await self.get_participant(vault_id, user_id)
        if not participant:
            raise PermissionError("You are not a participant in this vault")
        
        # Get participants
        participants = await self.db.vault_participants.find(
            {"vault_id": vault_id, "status": {"$ne": "removed"}},
            {"_id": 0}
        ).to_list(100)
        
        # Get documents
        documents = await self.db.vault_documents.find(
            {"vault_id": vault_id},
            {"_id": 0}
        ).sort("updated_at", -1).to_list(100)
        
        # Get user's permissions
        permissions = await self.get_user_permissions(vault_id, user_id)
        
        # Get recent activity (exclude _id)
        recent_events = await self.db.document_events.find(
            {"document_id": {"$in": [d["document_id"] for d in documents]}},
            {"_id": 0}
        ).sort("timestamp", -1).limit(20).to_list(20)
        
        return {
            **vault,
            "participants": participants,
            "documents": documents,
            "user_permissions": permissions,
            "user_role": participant["role"],
            "recent_activity": recent_events
        }
    
    async def update_vault(
        self,
        vault_id: str,
        user_id: str,
        updates: Dict
    ) -> Dict:
        """Update vault settings"""
        await self.require_permission(vault_id, user_id, VaultPermission.MANAGE_VAULT)
        
        allowed_fields = ["name", "description", "status", "settings"]
        filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields and v is not None}
        
        if not filtered_updates:
            vault = await self.get_vault(vault_id)
            return vault
        
        filtered_updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await self.db.vaults.update_one(
            {"vault_id": vault_id},
            {"$set": filtered_updates}
        )
        
        return await self.get_vault(vault_id)
    
    async def list_user_vaults(self, user_id: str, account_id: str) -> List[Dict]:
        """List all vaults a user has access to"""
        # Get vault IDs user participates in
        participations = await self.db.vault_participants.find(
            {"user_id": user_id, "status": "active"},
            {"vault_id": 1, "role": 1, "_id": 0}
        ).to_list(100)
        
        vault_ids = [p["vault_id"] for p in participations]
        role_map = {p["vault_id"]: p["role"] for p in participations}
        
        # Get vaults
        vaults = await self.db.vaults.find(
            {"vault_id": {"$in": vault_ids}},
            {"_id": 0}
        ).sort("updated_at", -1).to_list(100)
        
        # Enrich with role and counts
        for vault in vaults:
            vault["user_role"] = role_map.get(vault["vault_id"])
            vault["participant_count"] = await self.db.vault_participants.count_documents(
                {"vault_id": vault["vault_id"], "status": "active"}
            )
            vault["document_count"] = await self.db.vault_documents.count_documents(
                {"vault_id": vault["vault_id"]}
            )
        
        return vaults
    
    # ============ PARTICIPANT MANAGEMENT ============
    
    async def invite_participant(
        self,
        vault_id: str,
        inviter_user_id: str,
        email: str,
        role: ParticipantRole,
        display_name: str = "",
        account_id: str = None
    ) -> Dict:
        """Invite a user to participate in a vault"""
        await self.require_permission(vault_id, inviter_user_id, VaultPermission.MANAGE_PARTICIPANTS)
        
        # Get vault for account_id
        vault = await self.get_vault(vault_id)
        if not vault:
            raise ValueError("Vault not found")
        
        acc_id = account_id or vault["account_id"]
        
        # Check participant limit
        current_count = await self.db.vault_participants.count_documents(
            {"vault_id": vault_id, "status": {"$ne": "removed"}}
        )
        
        # Get participant limit from entitlements
        limit = await self.entitlement_service.get_limit(acc_id, "teamMembers.max")
        if limit != float('inf') and current_count >= limit:
            raise PermissionError(
                f"Participant limit reached ({current_count}/{int(limit)}). "
                "Upgrade your plan to add more participants."
            )
        
        # Check if already invited
        existing = await self.db.vault_participants.find_one(
            {"vault_id": vault_id, "email": email, "status": {"$ne": "removed"}}
        )
        if existing:
            raise ValueError("User already invited to this vault")
        
        # Find user by email (if they exist)
        user = await self.db.users.find_one({"email": email}, {"_id": 0})
        
        now = datetime.now(timezone.utc).isoformat()
        
        participant = {
            "id": f"vp_{uuid.uuid4().hex[:12]}",
            "vault_id": vault_id,
            "user_id": user["user_id"] if user else None,
            "email": email,
            "role": role.value,
            "display_name": display_name or (user.get("name", "") if user else ""),
            "permissions_override": [],
            "permissions_revoked": [],
            "invited_by": inviter_user_id,
            "invited_at": now,
            "accepted_at": now if user else None,  # Auto-accept if user exists
            "status": "active" if user else "pending"
        }
        
        await self.db.vault_participants.insert_one(participant)
        
        # Remove MongoDB _id
        participant.pop("_id", None)
        
        # Log event
        await self._log_document_event(
            document_id=None,
            user_id=inviter_user_id,
            user_role="",
            event_type=DocumentEventType.PARTICIPANT_ADDED,
            data={"invited_email": email, "role": role.value, "vault_id": vault_id}
        )
        
        logger.info(f"Invited {email} to vault {vault_id} as {role.value}")
        
        # Send invitation email
        try:
            from services.email_service import send_workspace_invitation_email
            
            # Get inviter's name
            inviter = await self.db.users.find_one({"user_id": inviter_user_id}, {"_id": 0})
            inviter_name = inviter.get("name", "A team member") if inviter else "A team member"
            
            email_result = await send_workspace_invitation_email(
                recipient_email=email,
                inviter_name=inviter_name,
                vault_name=vault["name"],
                role=role.value,
                vault_id=vault_id
            )
            participant["email_status"] = email_result.get("status", "unknown")
            logger.info(f"Invitation email result: {email_result}")
        except Exception as e:
            logger.error(f"Failed to send invitation email: {e}")
            participant["email_status"] = "failed"
        
        return participant
    
    async def remove_participant(
        self,
        vault_id: str,
        remover_user_id: str,
        participant_id: str
    ):
        """Remove a participant from a vault"""
        await self.require_permission(vault_id, remover_user_id, VaultPermission.MANAGE_PARTICIPANTS)
        
        # Can't remove self if owner
        participant = await self.db.vault_participants.find_one({"id": participant_id})
        if participant and participant["user_id"] == remover_user_id:
            raise ValueError("Cannot remove yourself from the vault")
        
        await self.db.vault_participants.update_one(
            {"id": participant_id},
            {"$set": {"status": "removed"}}
        )
        
        logger.info(f"Removed participant {participant_id} from vault {vault_id}")
    
    async def update_participant_role(
        self,
        vault_id: str,
        updater_user_id: str,
        participant_id: str,
        new_role: ParticipantRole
    ):
        """Change a participant's role"""
        await self.require_permission(vault_id, updater_user_id, VaultPermission.MANAGE_PARTICIPANTS)
        
        await self.db.vault_participants.update_one(
            {"id": participant_id},
            {"$set": {"role": new_role.value}}
        )
    
    # ============ HELPER METHODS ============
    
    async def _log_document_event(
        self,
        document_id: Optional[str],
        user_id: str,
        user_role: str,
        event_type: DocumentEventType,
        data: Dict = None,
        version_id: str = None,
        ip_address: str = None
    ):
        """Log an event in the document audit trail"""
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
vault_service: Optional[VaultService] = None


def get_vault_service() -> VaultService:
    if vault_service is None:
        raise RuntimeError("VaultService not initialized")
    return vault_service


def init_vault_service(
    db: AsyncIOMotorDatabase,
    entitlement_service: EntitlementService
) -> VaultService:
    global vault_service
    vault_service = VaultService(db, entitlement_service)
    return vault_service
