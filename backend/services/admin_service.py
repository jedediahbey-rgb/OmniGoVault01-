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
    AdminAuditAction
)
from services.entitlement_service import EntitlementService
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
        
        # Prevent self-revocation of Omnicompetent ONLY if user doesn't have OMNICOMPETENT_OWNER
        if admin_user_id == target_user_id and role == GlobalRole.OMNICOMPETENT:
            # Check if user has OMNICOMPETENT_OWNER - if so, allow removing OMNICOMPETENT
            has_owner_role = await self.db.user_global_roles.find_one({
                "user_id": admin_user_id,
                "role": GlobalRole.OMNICOMPETENT_OWNER.value
            })
            if not has_owner_role:
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
        
        # Handle "Free Forever" special plan
        if plan_id == "free_forever":
            # Grant all entitlements for free
            all_entitlements = [
                {"key": "vaults.max", "value": -1, "description": "Unlimited vaults"},
                {"key": "teamMembers.max", "value": -1, "description": "Unlimited team members"},
                {"key": "storage.maxMB", "value": -1, "description": "Unlimited storage"},
                {"key": "features.analytics.enabled", "value": True, "description": "Analytics access"},
                {"key": "features.api.enabled", "value": True, "description": "API access"},
                {"key": "features.templates.enabled", "value": True, "description": "Premium templates"},
                {"key": "features.prioritySupport.enabled", "value": True, "description": "Priority support"},
                {"key": "features.signing.enabled", "value": True, "description": "Document signing"},
            ]
            
            # Remove existing entitlements
            await self.db.entitlements.delete_many({"account_id": account_id})
            
            # Insert new entitlements
            for ent in all_entitlements:
                await self.db.entitlements.insert_one({
                    "entitlement_id": f"ent_{uuid.uuid4().hex[:12]}",
                    "account_id": account_id,
                    "key": ent["key"],
                    "value": ent["value"],
                    "source": "free_forever",
                    "description": ent["description"],
                    "granted_at": datetime.now(timezone.utc).isoformat(),
                    "granted_by": admin_user_id
                })
            
            # Update account with free_forever flag
            await self.db.accounts.update_one(
                {"account_id": account_id},
                {"$set": {
                    "free_forever": True,
                    "plan_name": "Free Forever",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Update subscription
            now = datetime.now(timezone.utc)
            current_sub = await self.subscription_service.get_subscription(account_id)
            
            if current_sub:
                await self.db.subscriptions.update_one(
                    {"subscription_id": current_sub["subscription_id"]},
                    {"$set": {
                        "plan_id": "free_forever",
                        "updated_at": now.isoformat(),
                        "updated_by_admin": admin_user_id
                    }}
                )
            else:
                await self.db.subscriptions.insert_one({
                    "subscription_id": f"sub_{uuid.uuid4().hex[:12]}",
                    "account_id": account_id,
                    "plan_id": "free_forever",
                    "status": "active",
                    "created_at": now.isoformat(),
                    "created_by_admin": admin_user_id
                })
            
            # Audit log
            await self._log_admin_action(
                admin_user_id=admin_user_id,
                action_type=AdminAuditAction.CHANGE_PLAN,
                account_id=account_id,
                metadata={
                    "to_plan": "Free Forever",
                    "reason": reason,
                    "is_free_forever": True
                },
                ip_address=ip_address
            )
            
            logger.info(f"Admin {admin_user_id} granted Free Forever to account {account_id}")
            
            return {"status": "success", "new_plan": "Free Forever", "message": "Granted Free Forever access with all features"}
        
        # Get current subscription
        current_sub = await self.subscription_service.get_subscription(account_id)
        current_plan = await self.subscription_service.get_plan(current_sub["plan_id"]) if current_sub else None
        
        # Get new plan
        new_plan = await self.subscription_service.get_plan(plan_id)
        if not new_plan:
            raise ValueError(f"Plan {plan_id} not found")
        
        # Remove free_forever flag if it was set
        await self.db.accounts.update_one(
            {"account_id": account_id},
            {"$set": {"free_forever": False, "plan_name": new_plan["name"], "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
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
        
        # Sync entitlements from the new plan
        await self.entitlement_service.sync_entitlements_from_plan(account_id, plan_id)
        
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
    
    # ============ SUPPORT_ADMIN SPECIFIC METHODS ============
    
    async def is_support_admin(self, user_id: str) -> bool:
        """Check if user has SUPPORT_ADMIN role"""
        return await self.has_global_role(user_id, GlobalRole.SUPPORT_ADMIN)
    
    async def can_support_admin_impersonate(self, admin_user_id: str, target_user_id: str) -> bool:
        """
        Check if support admin can impersonate the target user.
        Support admins CANNOT impersonate other admins or Omnicompetent users.
        """
        # Check if target has any admin roles
        target_roles = await self.get_user_global_roles(target_user_id)
        
        # Block impersonation of any admin user
        admin_roles = [
            GlobalRole.OMNICOMPETENT_OWNER.value,
            GlobalRole.OMNICOMPETENT.value,
            GlobalRole.SUPPORT_ADMIN.value,
            GlobalRole.BILLING_ADMIN.value
        ]
        
        for role in target_roles:
            if role in admin_roles:
                return False
        
        return True
    
    async def add_support_note(
        self,
        admin_user_id: str,
        account_id: str = None,
        user_id: str = None,
        note_type: str = "GENERAL",
        content: str = "",
        is_internal: bool = True,
        tags: List[str] = None,
        ip_address: str = None
    ) -> Dict:
        """Add a support note to an account or user"""
        # Verify support admin role
        if not await self.is_support_admin(admin_user_id) and not await self.is_omnicompetent(admin_user_id):
            raise PermissionError("Support Admin or Omnicompetent role required")
        
        if not account_id and not user_id:
            raise ValueError("Either account_id or user_id must be provided")
        
        now = datetime.now(timezone.utc).isoformat()
        note = {
            "id": f"note_{uuid.uuid4().hex[:12]}",
            "account_id": account_id,
            "user_id": user_id,
            "note_type": note_type,
            "content": content,
            "created_by": admin_user_id,
            "created_at": now,
            "is_internal": is_internal,
            "tags": tags or []
        }
        
        await self.db.support_notes.insert_one(note)
        
        # Audit log
        await self._log_admin_action(
            admin_user_id=admin_user_id,
            action_type=AdminAuditAction.VIEW_ACCOUNT,  # Using existing action type
            account_id=account_id,
            target_user_id=user_id,
            metadata={"action": "add_support_note", "note_id": note["id"], "note_type": note_type},
            ip_address=ip_address
        )
        
        return {"status": "created", "note_id": note["id"]}
    
    async def get_support_notes(
        self,
        admin_user_id: str,
        account_id: str = None,
        user_id: str = None,
        skip: int = 0,
        limit: int = 50
    ) -> Dict:
        """Get support notes for an account or user"""
        if not await self.can_access_admin(admin_user_id):
            raise PermissionError("Admin access required")
        
        query = {}
        if account_id:
            query["account_id"] = account_id
        if user_id:
            query["user_id"] = user_id
        
        notes = await self.db.support_notes.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
        
        total = await self.db.support_notes.count_documents(query)
        
        return {"notes": notes, "total": total}
    
    async def extend_trial(
        self,
        admin_user_id: str,
        account_id: str,
        days: int,
        reason: str,
        ip_address: str = None
    ) -> Dict:
        """Extend a trial period for an account (Support Admin allowed)"""
        # Support admin or higher can extend trials
        is_support = await self.is_support_admin(admin_user_id)
        is_omni = await self.is_omnicompetent(admin_user_id)
        
        if not is_support and not is_omni:
            raise PermissionError("Support Admin or higher role required")
        
        # Support admins limited to 30 days, Omnicompetent can do up to 90
        max_days = 90 if is_omni else 30
        if days > max_days:
            raise ValueError(f"Maximum extension for your role is {max_days} days")
        
        # Get current subscription
        subscription = await self.subscription_service.get_subscription(account_id)
        if not subscription:
            raise ValueError("Account has no subscription")
        
        # Calculate new trial end date
        now = datetime.now(timezone.utc)
        current_end = subscription.get("trial_end") or subscription.get("current_period_end")
        
        if isinstance(current_end, str):
            current_end = datetime.fromisoformat(current_end.replace("Z", "+00:00"))
        
        # If trial already ended, extend from now
        if current_end < now:
            current_end = now
        
        from datetime import timedelta
        new_end = current_end + timedelta(days=days)
        
        # Update subscription
        await self.db.subscriptions.update_one(
            {"subscription_id": subscription["subscription_id"]},
            {"$set": {
                "trial_end": new_end.isoformat(),
                "status": "trialing",
                "updated_at": now.isoformat()
            }}
        )
        
        # Record the extension
        extension_record = {
            "id": f"trial_ext_{uuid.uuid4().hex[:12]}",
            "account_id": account_id,
            "extended_by": admin_user_id,
            "extended_at": now.isoformat(),
            "original_end_date": current_end.isoformat(),
            "new_end_date": new_end.isoformat(),
            "days_extended": days,
            "reason": reason
        }
        await self.db.trial_extensions.insert_one(extension_record)
        
        # Audit log
        await self._log_admin_action(
            admin_user_id=admin_user_id,
            action_type=AdminAuditAction.UPDATE_ENTITLEMENT,
            account_id=account_id,
            metadata={
                "action": "extend_trial",
                "days": days,
                "reason": reason,
                "new_end_date": new_end.isoformat()
            },
            ip_address=ip_address
        )
        
        logger.info(f"Support admin {admin_user_id} extended trial for {account_id} by {days} days")
        
        return {
            "status": "extended",
            "days_extended": days,
            "new_trial_end": new_end.isoformat()
        }
    
    async def unlock_user_account(
        self,
        admin_user_id: str,
        target_user_id: str,
        reason: str,
        ip_address: str = None
    ) -> Dict:
        """Unlock a locked user account (Support Admin allowed)"""
        if not await self.is_support_admin(admin_user_id) and not await self.is_omnicompetent(admin_user_id):
            raise PermissionError("Support Admin or higher role required")
        
        # Get user
        user = await self.db.users.find_one({"user_id": target_user_id})
        if not user:
            raise ValueError("User not found")
        
        previous_lock_reason = user.get("lock_reason")
        
        # Unlock the user
        now = datetime.now(timezone.utc).isoformat()
        await self.db.users.update_one(
            {"user_id": target_user_id},
            {"$set": {
                "is_locked": False,
                "lock_reason": None,
                "unlocked_at": now,
                "unlocked_by": admin_user_id
            }}
        )
        
        # Record the unlock
        unlock_record = {
            "id": f"unlock_{uuid.uuid4().hex[:12]}",
            "user_id": target_user_id,
            "unlocked_by": admin_user_id,
            "unlocked_at": now,
            "reason": reason,
            "previous_lock_reason": previous_lock_reason
        }
        await self.db.account_unlocks.insert_one(unlock_record)
        
        # Audit log
        await self._log_admin_action(
            admin_user_id=admin_user_id,
            action_type=AdminAuditAction.UPDATE_USER,
            target_user_id=target_user_id,
            metadata={"action": "unlock_account", "reason": reason},
            ip_address=ip_address
        )
        
        logger.info(f"Support admin {admin_user_id} unlocked user {target_user_id}")
        
        return {"status": "unlocked", "user_id": target_user_id}
    
    async def reset_user_2fa(
        self,
        admin_user_id: str,
        target_user_id: str,
        reason: str,
        ip_address: str = None
    ) -> Dict:
        """Reset 2FA for a user (Support Admin allowed)"""
        if not await self.is_support_admin(admin_user_id) and not await self.is_omnicompetent(admin_user_id):
            raise PermissionError("Support Admin or higher role required")
        
        # Get user
        user = await self.db.users.find_one({"user_id": target_user_id})
        if not user:
            raise ValueError("User not found")
        
        # Reset 2FA settings
        now = datetime.now(timezone.utc).isoformat()
        await self.db.users.update_one(
            {"user_id": target_user_id},
            {"$set": {
                "two_factor_enabled": False,
                "two_factor_secret": None,
                "two_factor_reset_at": now,
                "two_factor_reset_by": admin_user_id
            }}
        )
        
        # Audit log
        await self._log_admin_action(
            admin_user_id=admin_user_id,
            action_type=AdminAuditAction.RESET_2FA,
            target_user_id=target_user_id,
            metadata={"reason": reason},
            ip_address=ip_address
        )
        
        logger.info(f"Support admin {admin_user_id} reset 2FA for user {target_user_id}")
        
        return {"status": "reset", "user_id": target_user_id}
    
    async def get_support_admin_permissions(self, user_id: str) -> Dict:
        """Get detailed permission info for a support admin"""
        from models.admin import SUPPORT_ADMIN_ALLOWED_ACTIONS, SUPPORT_ADMIN_DENIED_ACTIONS
        
        is_support = await self.is_support_admin(user_id)
        is_billing = await self.has_global_role(user_id, GlobalRole.BILLING_ADMIN)
        is_omni = await self.is_omnicompetent(user_id)
        
        return {
            "user_id": user_id,
            "is_support_admin": is_support,
            "is_billing_admin": is_billing,
            "is_omnicompetent": is_omni,
            "allowed_actions": [a.value for a in SUPPORT_ADMIN_ALLOWED_ACTIONS] if is_support else [],
            "denied_actions": SUPPORT_ADMIN_DENIED_ACTIONS if is_support else [],
            "restrictions": {
                "max_trial_extension_days": 30 if is_support and not is_omni else 90,
                "can_impersonate_admins": False if is_support and not is_omni else True,
                "can_modify_entitlements": is_omni,
                "can_suspend_accounts": is_omni,
                "can_change_plans": is_billing or is_omni
            }
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
