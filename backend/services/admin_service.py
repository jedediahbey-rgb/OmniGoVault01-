"""Admin Service - Core admin functionality with Omnicompetent support

This service handles:
- Global role management (Omnicompetent, SupportAdmin, BillingAdmin)
- Impersonation sessions
- Admin audit logging
- Authorization checks that respect global roles
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import uuid

from models.admin import (
    GlobalRole, 
    AdminAuditAction, 
    AdminAuditLog,
    UserGlobalRole,
    ImpersonationSession,
    GLOBAL_ROLE_DESCRIPTIONS
)
from services.entitlement_service import EntitlementService, EntitlementKeys
from services.subscription_service import SubscriptionService

logger = logging.getLogger(__name__)


class AdminService:
    """Central admin service with Omnicompetent authorization"""
    
    def __init__(
        self, 
        db: AsyncIOMotorDatabase,
        entitlement_service: EntitlementService,
        subscription_service: SubscriptionService
    ):
        self.db = db
        self.entitlement_service = entitlement_service
        self.subscription_service = subscription_service
    
    # ============ GLOBAL ROLE CHECKS ============
    
    async def is_omnicompetent(self, user_id: str) -> bool:
        """Check if user has any Omnicompetent role (owner or regular)"""
        # Check for OMNICOMPETENT_OWNER or OMNICOMPETENT role
        role = await self.db.user_global_roles.find_one({
            "user_id": user_id,
            "role": {"$in": [GlobalRole.OMNICOMPETENT_OWNER.value, GlobalRole.OMNICOMPETENT.value]}
        })
        
        if not role:
            return False
        
        # Check expiration
        if role.get("expires_at"):
            expires = role["expires_at"]
            if isinstance(expires, str):
                expires = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > expires:
                return False
        
        return True
    
    async def is_owner(self, user_id: str) -> bool:
        """Check if user has OMNICOMPETENT_OWNER role (full admin)"""
        role = await self.db.user_global_roles.find_one({
            "user_id": user_id,
            "role": GlobalRole.OMNICOMPETENT_OWNER.value
        })
        
        if not role:
            return False
        
        # Check expiration
        if role.get("expires_at"):
            expires = role["expires_at"]
            if isinstance(expires, str):
                expires = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > expires:
                return False
        
        return True
    
    async def is_admin(self, user_id: str) -> bool:
        """Check if user has any admin access (owner or support)"""
        role = await self.db.user_global_roles.find_one({
            "user_id": user_id,
            "role": {"$in": [
                GlobalRole.OMNICOMPETENT_OWNER.value, 
                GlobalRole.SUPPORT_ADMIN.value,
                GlobalRole.BILLING_ADMIN.value
            ]}
        })
        return role is not None
    
    async def has_global_role(self, user_id: str, role: GlobalRole) -> bool:
        """Check if user has a specific global role"""
        found = await self.db.user_global_roles.find_one({
            "user_id": user_id,
            "role": role.value
        })
        
        if not found:
            return False
        
        # Check expiration
        if found.get("expires_at"):
            expires = found["expires_at"]
            if isinstance(expires, str):
                expires = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > expires:
                return False
        
        return True
    
    async def get_user_global_roles(self, user_id: str) -> List[str]:
        """Get all global roles for a user"""
        roles = await self.db.user_global_roles.find(
            {"user_id": user_id},
            {"_id": 0}
        ).to_list(10)
        
        now = datetime.now(timezone.utc)
        active_roles = []
        
        for r in roles:
            # Check expiration
            if r.get("expires_at"):
                expires = r["expires_at"]
                if isinstance(expires, str):
                    expires = datetime.fromisoformat(expires.replace("Z", "+00:00"))
                if now > expires:
                    continue
            active_roles.append(r["role"])
        
        return active_roles
    
    async def can_access_admin(self, user_id: str) -> bool:
        """Check if user can access admin console (any admin role)"""
        roles = await self.get_user_global_roles(user_id)
        return len(roles) > 0
    
    async def can_access_account(self, user_id: str, account_id: str) -> bool:
        """Check if user can access a specific account (Omnicompetent bypasses)"""
        # Omnicompetent can access any account
        if await self.is_omnicompetent(user_id):
            return True
        
        # Support admins can view accounts
        if await self.has_global_role(user_id, GlobalRole.SUPPORT_ADMIN):
            return True
        
        # Normal check: is user a member of this account?
        membership = await self.db.account_users.find_one({
            "user_id": user_id,
            "account_id": account_id
        })
        
        return membership is not None
    
    # ============ GLOBAL ROLE MANAGEMENT ============
    
    async def grant_global_role(
        self,
        admin_user_id: str,
        target_user_id: str,
        role: GlobalRole,
        notes: str = "",
        expires_at: Optional[datetime] = None,
        ip_address: str = None
    ) -> Dict:
        """Grant a global role to a user (requires Omnicompetent)"""
        # Only Omnicompetent can grant roles
        if not await self.is_omnicompetent(admin_user_id):
            await self._log_admin_action(
                admin_user_id=admin_user_id,
                action_type=AdminAuditAction.GRANT_GLOBAL_ROLE,
                target_user_id=target_user_id,
                metadata={"role": role.value, "error": "Insufficient permissions"},
                success=False,
                error_message="Only Omnicompetent users can grant global roles",
                ip_address=ip_address
            )
            raise PermissionError("Only Omnicompetent users can grant global roles")
        
        # Check if role already exists
        existing = await self.db.user_global_roles.find_one({
            "user_id": target_user_id,
            "role": role.value
        })
        
        if existing:
            return {"status": "already_exists", "role": role.value}
        
        # Create the role assignment
        now = datetime.now(timezone.utc).isoformat()
        role_doc = {
            "id": f"ugr_{uuid.uuid4().hex[:12]}",
            "user_id": target_user_id,
            "role": role.value,
            "granted_by": admin_user_id,
            "granted_at": now,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "notes": notes
        }
        
        await self.db.user_global_roles.insert_one(role_doc)
        
        # Audit log
        await self._log_admin_action(
            admin_user_id=admin_user_id,
            action_type=AdminAuditAction.GRANT_GLOBAL_ROLE,
            target_user_id=target_user_id,
            metadata={
                "role": role.value,
                "expires_at": expires_at.isoformat() if expires_at else None,
                "notes": notes
            },
            ip_address=ip_address
        )
        
        logger.info(f"Admin {admin_user_id} granted {role.value} to user {target_user_id}")
        
        return {"status": "granted", "role": role.value}
    
    async def revoke_global_role(
        self,
        admin_user_id: str,
        target_user_id: str,
        role: GlobalRole,
        reason: str = "",
        ip_address: str = None
    ) -> Dict:
        """Revoke a global role from a user (requires Omnicompetent)"""
        if not await self.is_omnicompetent(admin_user_id):
            await self._log_admin_action(
                admin_user_id=admin_user_id,
                action_type=AdminAuditAction.REVOKE_GLOBAL_ROLE,
                target_user_id=target_user_id,
                metadata={"role": role.value, "error": "Insufficient permissions"},
                success=False,
                error_message="Only Omnicompetent users can revoke global roles",
                ip_address=ip_address
            )
            raise PermissionError("Only Omnicompetent users can revoke global roles")
        
        # Prevent self-revocation of Omnicompetent
        if admin_user_id == target_user_id and role == GlobalRole.OMNICOMPETENT:
            raise ValueError("Cannot revoke your own Omnicompetent status")
        
        result = await self.db.user_global_roles.delete_one({
            "user_id": target_user_id,
            "role": role.value
        })
        
        # Audit log
        await self._log_admin_action(
            admin_user_id=admin_user_id,
            action_type=AdminAuditAction.REVOKE_GLOBAL_ROLE,
            target_user_id=target_user_id,
            metadata={"role": role.value, "reason": reason},
            ip_address=ip_address
        )
        
        logger.info(f"Admin {admin_user_id} revoked {role.value} from user {target_user_id}")
        
        return {"status": "revoked" if result.deleted_count > 0 else "not_found"}
    
    # ============ IMPERSONATION ============
    
    async def start_impersonation(
        self,
        admin_user_id: str,
        target_user_id: str,
        reason: str = "",
        ip_address: str = None
    ) -> Dict:
        """Start impersonating another user"""
        # Check permission (Omnicompetent or Support Admin)
        can_impersonate = (
            await self.is_omnicompetent(admin_user_id) or
            await self.has_global_role(admin_user_id, GlobalRole.SUPPORT_ADMIN)
        )
        
        if not can_impersonate:
            await self._log_admin_action(
                admin_user_id=admin_user_id,
                action_type=AdminAuditAction.IMPERSONATION_START,
                target_user_id=target_user_id,
                metadata={"error": "Insufficient permissions"},
                success=False,
                error_message="Requires Omnicompetent or Support Admin role",
                ip_address=ip_address
            )
            raise PermissionError("Requires Omnicompetent or Support Admin role")
        
        # Can't impersonate yourself
        if admin_user_id == target_user_id:
            raise ValueError("Cannot impersonate yourself")
        
        # End any existing impersonation session
        await self.db.impersonation_sessions.update_many(
            {"admin_user_id": admin_user_id, "is_active": True},
            {"$set": {"is_active": False, "ended_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Get target user's account
        target_account = await self.entitlement_service.get_account_for_user(target_user_id)
        
        # Create new session
        now = datetime.now(timezone.utc).isoformat()
        session = {
            "id": f"imp_{uuid.uuid4().hex[:12]}",
            "admin_user_id": admin_user_id,
            "target_user_id": target_user_id,
            "target_account_id": target_account["account_id"] if target_account else None,
            "started_at": now,
            "ended_at": None,
            "reason": reason,
            "is_active": True
        }
        
        await self.db.impersonation_sessions.insert_one(session)
        
        # Audit log
        await self._log_admin_action(
            admin_user_id=admin_user_id,
            action_type=AdminAuditAction.IMPERSONATION_START,
            target_user_id=target_user_id,
            account_id=target_account["account_id"] if target_account else None,
            metadata={"reason": reason, "session_id": session["id"]},
            ip_address=ip_address
        )
        
        logger.info(f"Admin {admin_user_id} started impersonating user {target_user_id}")
        
        return {
            "session_id": session["id"],
            "target_user_id": target_user_id,
            "target_account_id": target_account["account_id"] if target_account else None
        }
    
    async def stop_impersonation(
        self,
        admin_user_id: str,
        ip_address: str = None
    ) -> Dict:
        """Stop current impersonation session"""
        session = await self.db.impersonation_sessions.find_one(
            {"admin_user_id": admin_user_id, "is_active": True}
        )
        
        if not session:
            return {"status": "no_active_session"}
        
        now = datetime.now(timezone.utc).isoformat()
        
        await self.db.impersonation_sessions.update_one(
            {"id": session["id"]},
            {"$set": {"is_active": False, "ended_at": now}}
        )
        
        # Audit log
        await self._log_admin_action(
            admin_user_id=admin_user_id,
            action_type=AdminAuditAction.IMPERSONATION_END,
            target_user_id=session["target_user_id"],
            metadata={"session_id": session["id"]},
            ip_address=ip_address
        )
        
        logger.info(f"Admin {admin_user_id} stopped impersonating user {session['target_user_id']}")
        
        return {"status": "ended", "session_id": session["id"]}
    
    async def get_active_impersonation(self, admin_user_id: str) -> Optional[Dict]:
        """Get current active impersonation session"""
        session = await self.db.impersonation_sessions.find_one(
            {"admin_user_id": admin_user_id, "is_active": True},
            {"_id": 0}
        )
        return session
    
    # ============ ACCOUNT MANAGEMENT ============
    
    async def list_accounts(
        self,
        admin_user_id: str,
        search: str = None,
        skip: int = 0,
        limit: int = 50,
        ip_address: str = None
    ) -> Dict:
        """List all accounts (admin only)"""
        if not await self.can_access_admin(admin_user_id):
            raise PermissionError("Admin access required")
        
        query = {}
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"account_id": {"$regex": search, "$options": "i"}}
            ]
        
        accounts = await self.db.accounts.find(
            query,
            {"_id": 0}
        ).skip(skip).limit(limit).to_list(limit)
        
        total = await self.db.accounts.count_documents(query)
        
        # Enrich with subscription data
        enriched = []
        for acc in accounts:
            sub = await self.subscription_service.get_subscription(acc["account_id"])
            plan = await self.subscription_service.get_plan(sub["plan_id"]) if sub else None
            member_count = await self.db.account_users.count_documents({"account_id": acc["account_id"]})
            
            enriched.append({
                **acc,
                "plan_name": plan["name"] if plan else "Free",
                "plan_tier": plan["tier"] if plan else 0,
                "subscription_status": sub["status"] if sub else "none",
                "member_count": member_count,
                "is_suspended": acc.get("is_suspended", False)
            })
        
        return {
            "accounts": enriched,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    
    async def get_account_details(
        self,
        admin_user_id: str,
        account_id: str,
        ip_address: str = None
    ) -> Dict:
        """Get detailed account info (admin only)"""
        if not await self.can_access_account(admin_user_id, account_id):
            raise PermissionError("Access denied to this account")
        
        account = await self.db.accounts.find_one(
            {"account_id": account_id},
            {"_id": 0}
        )
        
        if not account:
            raise ValueError(f"Account {account_id} not found")
        
        # Get subscription and entitlements
        overview = await self.subscription_service.get_billing_overview(account_id)
        
        # Get members
        members = await self.db.account_users.find(
            {"account_id": account_id},
            {"_id": 0}
        ).to_list(100)
        
        # Get owner user details
        owner = await self.db.users.find_one(
            {"user_id": account["owner_user_id"]},
            {"_id": 0, "email": 1, "name": 1}
        )
        
        # Audit log
        await self._log_admin_action(
            admin_user_id=admin_user_id,
            action_type=AdminAuditAction.VIEW_ACCOUNT,
            account_id=account_id,
            ip_address=ip_address
        )
        
        return {
            **account,
            "owner_email": owner.get("email") if owner else None,
            "owner_name": owner.get("name") if owner else None,
            **overview,
            "members": members
        }
    
    async def change_account_plan(
        self,
        admin_user_id: str,
        account_id: str,
        plan_id: str,
        reason: str = "",
        ip_address: str = None
    ) -> Dict:
        """Change an account's plan (Omnicompetent or Billing Admin)"""
        can_change = (
            await self.is_omnicompetent(admin_user_id) or
            await self.has_global_role(admin_user_id, GlobalRole.BILLING_ADMIN)
        )
        
        if not can_change:
            raise PermissionError("Requires Omnicompetent or Billing Admin role")
        
        # Get current subscription
        current_sub = await self.subscription_service.get_subscription(account_id)
        current_plan = await self.subscription_service.get_plan(current_sub["plan_id"]) if current_sub else None
        
        # Get new plan
        new_plan = await self.subscription_service.get_plan(plan_id)
        if not new_plan:
            raise ValueError(f"Plan {plan_id} not found")
        
        # Update subscription
        from datetime import timedelta
        now = datetime.now(timezone.utc)
        
        await self.subscription_service.update_subscription_from_stripe(
            account_id=account_id,
            stripe_subscription_id=f"admin_{uuid.uuid4().hex[:8]}",
            plan_id=plan_id,
            status="active",
            current_period_start=now,
            current_period_end=now + timedelta(days=365)
        )
        
        # Audit log
        await self._log_admin_action(
            admin_user_id=admin_user_id,
            action_type=AdminAuditAction.CHANGE_PLAN,
            account_id=account_id,
            metadata={
                "from_plan": current_plan["name"] if current_plan else "None",
                "to_plan": new_plan["name"],
                "reason": reason
            },
            ip_address=ip_address
        )
        
        logger.info(f"Admin {admin_user_id} changed account {account_id} plan to {new_plan['name']}")
        
        return {"status": "success", "new_plan": new_plan["name"]}
    
    async def update_account_entitlement(
        self,
        admin_user_id: str,
        account_id: str,
        key: str,
        value: Any,
        reason: str = "",
        ip_address: str = None
    ) -> Dict:
        """Override a specific entitlement for an account"""
        if not await self.is_omnicompetent(admin_user_id):
            raise PermissionError("Only Omnicompetent users can override entitlements")
        
        # Get current value
        current_value = await self.entitlement_service.get_entitlement(account_id, key)
        
        # Update or create entitlement with override source
        now = datetime.now(timezone.utc).isoformat()
        
        await self.db.entitlements.update_one(
            {"account_id": account_id, "key": key},
            {
                "$set": {
                    "value": value,
                    "source": "admin_override",
                    "updated_at": now
                },
                "$setOnInsert": {
                    "id": f"ent_{account_id}_{key}_override",
                    "account_id": account_id,
                    "key": key,
                    "created_at": now
                }
            },
            upsert=True
        )
        
        # Audit log
        await self._log_admin_action(
            admin_user_id=admin_user_id,
            action_type=AdminAuditAction.UPDATE_ENTITLEMENT,
            account_id=account_id,
            metadata={
                "key": key,
                "from_value": current_value,
                "to_value": value,
                "reason": reason
            },
            ip_address=ip_address
        )
        
        logger.info(f"Admin {admin_user_id} updated entitlement {key}={value} for account {account_id}")
        
        return {"status": "success", "key": key, "value": value}
    
    async def suspend_account(
        self,
        admin_user_id: str,
        account_id: str,
        reason: str,
        ip_address: str = None
    ) -> Dict:
        """Suspend an account"""
        if not await self.is_omnicompetent(admin_user_id):
            raise PermissionError("Only Omnicompetent users can suspend accounts")
        
        await self.db.accounts.update_one(
            {"account_id": account_id},
            {"$set": {
                "is_suspended": True,
                "suspended_at": datetime.now(timezone.utc).isoformat(),
                "suspended_by": admin_user_id,
                "suspension_reason": reason
            }}
        )
        
        # Audit log
        await self._log_admin_action(
            admin_user_id=admin_user_id,
            action_type=AdminAuditAction.SUSPEND_ACCOUNT,
            account_id=account_id,
            metadata={"reason": reason},
            ip_address=ip_address
        )
        
        return {"status": "suspended"}
    
    # ============ USER MANAGEMENT ============
    
    async def list_users(
        self,
        admin_user_id: str,
        search: str = None,
        skip: int = 0,
        limit: int = 50
    ) -> Dict:
        """List all users (admin only)"""
        if not await self.can_access_admin(admin_user_id):
            raise PermissionError("Admin access required")
        
        query = {}
        if search:
            query["$or"] = [
                {"email": {"$regex": search, "$options": "i"}},
                {"name": {"$regex": search, "$options": "i"}},
                {"user_id": {"$regex": search, "$options": "i"}}
            ]
        
        users = await self.db.users.find(
            query,
            {"_id": 0, "password_hash": 0}
        ).skip(skip).limit(limit).to_list(limit)
        
        total = await self.db.users.count_documents(query)
        
        # Enrich with global roles
        enriched = []
        for user in users:
            roles = await self.get_user_global_roles(user["user_id"])
            enriched.append({
                **user,
                "global_roles": roles,
                "is_omnicompetent": GlobalRole.OMNICOMPETENT.value in roles
            })
        
        return {
            "users": enriched,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    
    async def get_user_details(
        self,
        admin_user_id: str,
        target_user_id: str,
        ip_address: str = None
    ) -> Dict:
        """Get detailed user info (admin only)"""
        if not await self.can_access_admin(admin_user_id):
            raise PermissionError("Admin access required")
        
        user = await self.db.users.find_one(
            {"user_id": target_user_id},
            {"_id": 0, "password_hash": 0}
        )
        
        if not user:
            raise ValueError(f"User {target_user_id} not found")
        
        # Get global roles
        roles = await self.get_user_global_roles(target_user_id)
        
        # Get account memberships
        memberships = await self.db.account_users.find(
            {"user_id": target_user_id},
            {"_id": 0}
        ).to_list(20)
        
        # Enrich memberships with account names
        for m in memberships:
            account = await self.db.accounts.find_one(
                {"account_id": m["account_id"]},
                {"_id": 0, "name": 1}
            )
            m["account_name"] = account["name"] if account else "Unknown"
        
        # Audit log
        await self._log_admin_action(
            admin_user_id=admin_user_id,
            action_type=AdminAuditAction.VIEW_USER,
            target_user_id=target_user_id,
            ip_address=ip_address
        )
        
        return {
            **user,
            "global_roles": roles,
            "is_omnicompetent": GlobalRole.OMNICOMPETENT.value in roles,
            "account_memberships": memberships
        }
    
    # ============ AUDIT LOGGING ============
    
    async def _log_admin_action(
        self,
        admin_user_id: str,
        action_type: AdminAuditAction,
        account_id: str = None,
        target_user_id: str = None,
        metadata: Dict = None,
        success: bool = True,
        error_message: str = None,
        ip_address: str = None,
        user_agent: str = None
    ):
        """Log an admin action for audit purposes"""
        # Check if admin is impersonating
        impersonation = await self.get_active_impersonation(admin_user_id)
        
        log = {
            "id": f"audit_{uuid.uuid4().hex[:12]}",
            "admin_user_id": admin_user_id,
            "acting_as_user_id": impersonation["target_user_id"] if impersonation else None,
            "account_id": account_id,
            "target_user_id": target_user_id,
            "action_type": action_type.value,
            "metadata": metadata or {},
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "success": success,
            "error_message": error_message
        }
        
        try:
            await self.db.admin_audit_logs.insert_one(log)
        except Exception as e:
            # Fail safe - log to stderr but don't crash
            logger.error(f"Failed to write audit log: {e}")
    
    async def get_audit_logs(
        self,
        admin_user_id: str,
        filters: Dict = None,
        skip: int = 0,
        limit: int = 100
    ) -> Dict:
        """Get admin audit logs (Omnicompetent only)"""
        if not await self.is_omnicompetent(admin_user_id):
            raise PermissionError("Only Omnicompetent users can view audit logs")
        
        query = filters or {}
        
        logs = await self.db.admin_audit_logs.find(
            query,
            {"_id": 0}
        ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await self.db.admin_audit_logs.count_documents(query)
        
        # Log this access
        await self._log_admin_action(
            admin_user_id=admin_user_id,
            action_type=AdminAuditAction.VIEW_AUDIT_LOGS,
            metadata={"query": str(filters), "count": len(logs)}
        )
        
        return {
            "logs": logs,
            "total": total,
            "skip": skip,
            "limit": limit
        }


# Singleton
admin_service: Optional[AdminService] = None


def get_admin_service() -> AdminService:
    if admin_service is None:
        raise RuntimeError("AdminService not initialized")
    return admin_service


def init_admin_service(
    db: AsyncIOMotorDatabase,
    entitlement_service: EntitlementService,
    subscription_service: SubscriptionService
) -> AdminService:
    global admin_service
    admin_service = AdminService(db, entitlement_service, subscription_service)
    return admin_service
