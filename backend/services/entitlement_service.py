"""Entitlement Service - Central entitlement checking logic

This is the SINGLE SOURCE OF TRUTH for entitlement checks.
Never check plan names directly - always use this service.
"""
from typing import Optional, Any, Dict
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)

# ============ ENTITLEMENT KEYS ============
# Standard entitlement keys used across the application

class EntitlementKeys:
    # Numeric limits
    VAULTS_MAX = "vaults.max"
    TEAM_MEMBERS_MAX = "teamMembers.max"
    STORAGE_MAX_MB = "storage.maxMB"
    
    # Feature flags (boolean)
    ANALYTICS_ENABLED = "features.analytics.enabled"
    API_ENABLED = "features.api.enabled"
    TEMPLATES_ENABLED = "features.templates.enabled"
    PRIORITY_SUPPORT = "features.prioritySupport.enabled"
    
    # Special values
    UNLIMITED = -1  # Use -1 to represent unlimited


class EntitlementService:
    """Service for checking and managing entitlements"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def get_account_for_user(self, user_id: str) -> Optional[Dict]:
        """Get the account associated with a user"""
        # First try to find user's account membership
        membership = await self.db.account_users.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        if membership:
            account = await self.db.accounts.find_one(
                {"account_id": membership["account_id"]},
                {"_id": 0}
            )
            return account
        
        # Fallback: check if user owns an account directly
        account = await self.db.accounts.find_one(
            {"owner_user_id": user_id},
            {"_id": 0}
        )
        return account
    
    async def get_entitlement(self, account_id: str, key: str) -> Optional[Any]:
        """Get a single entitlement value for an account"""
        entitlement = await self.db.entitlements.find_one(
            {"account_id": account_id, "key": key},
            {"_id": 0}
        )
        
        if not entitlement:
            return None
        
        # Check if expired
        if entitlement.get("expires_at"):
            if datetime.now(timezone.utc) > entitlement["expires_at"]:
                return None
        
        return entitlement.get("value")
    
    async def get_all_entitlements(self, account_id: str) -> Dict[str, Any]:
        """Get all entitlements for an account as a dictionary"""
        entitlements = await self.db.entitlements.find(
            {"account_id": account_id},
            {"_id": 0}
        ).to_list(100)
        
        result = {}
        now = datetime.now(timezone.utc)
        
        for ent in entitlements:
            # Skip expired entitlements
            if ent.get("expires_at"):
                expires = ent["expires_at"]
                if isinstance(expires, str):
                    expires = datetime.fromisoformat(expires.replace("Z", "+00:00"))
                if now > expires:
                    continue
            
            # Handle both old and new entitlement formats
            if "value" in ent:
                result[ent["key"]] = ent["value"]
            elif "entitlements" in ent:
                # Old format where entitlements were stored as a nested list or object
                entitlements_data = ent["entitlements"]
                if isinstance(entitlements_data, list):
                    # List format: [{"key": "vaults.max", "value": 1}, ...]
                    for item in entitlements_data:
                        if "key" in item and "value" in item:
                            result[item["key"]] = item["value"]
                elif isinstance(entitlements_data, dict):
                    # Dict format: {"vaults.max": 1, ...}
                    for key, value in entitlements_data.items():
                        result[key] = value
        
        return result
    
    async def has_entitlement(self, account_id: str, key: str) -> bool:
        """Check if account has a boolean entitlement (feature flag)"""
        value = await self.get_entitlement(account_id, key)
        return bool(value)
    
    async def get_limit(self, account_id: str, key: str) -> int:
        """Get a numeric limit entitlement. Returns default free tier limit if not found."""
        value = await self.get_entitlement(account_id, key)
        if value is None:
            # Default to free tier limits if no entitlement found
            # This prevents "0 of 0" display for new/corrupted accounts
            defaults = {
                "vaults.max": 1,
                "teamMembers.max": 1,
                "storage.maxMB": 100,
            }
            logger.warning(f"Entitlement {key} not found for account {account_id}, using default: {defaults.get(key, 0)}")
            return defaults.get(key, 0)
        if value == EntitlementKeys.UNLIMITED:
            return float('inf')  # Return infinity for unlimited
        return int(value)
    
    async def get_usage(self, account_id: str, metric: str) -> float:
        """Get current usage for a metric"""
        usage = await self.db.usage.find_one(
            {"account_id": account_id, "metric": metric},
            {"_id": 0}
        )
        return usage.get("value", 0) if usage else 0
    
    async def update_usage(self, account_id: str, metric: str, value: float):
        """Update usage for a metric"""
        await self.db.usage.update_one(
            {"account_id": account_id, "metric": metric},
            {
                "$set": {
                    "value": value,
                    "last_calculated": datetime.now(timezone.utc).isoformat()
                },
                "$setOnInsert": {
                    "id": f"usage_{account_id}_{metric}",
                    "account_id": account_id,
                    "metric": metric
                }
            },
            upsert=True
        )
    
    async def check_limit(self, account_id: str, limit_key: str, usage_metric: str) -> Dict:
        """Check if account is within a limit.
        
        Returns:
            {
                "allowed": bool,
                "current": int,
                "limit": int,
                "remaining": int,
                "unlimited": bool
            }
        """
        limit = await self.get_limit(account_id, limit_key)
        current = await self.get_usage(account_id, usage_metric)
        
        is_unlimited = limit == float('inf') or limit == EntitlementKeys.UNLIMITED
        
        if is_unlimited:
            return {
                "allowed": True,
                "current": int(current),
                "limit": -1,
                "remaining": -1,
                "unlimited": True
            }
        
        return {
            "allowed": current < limit,
            "current": int(current),
            "limit": int(limit),
            "remaining": max(0, int(limit - current)),
            "unlimited": False
        }
    
    async def can_create_vault(self, account_id: str) -> Dict:
        """Check if account can create another vault"""
        return await self.check_limit(
            account_id,
            EntitlementKeys.VAULTS_MAX,
            "vaults.count"
        )
    
    async def can_invite_member(self, account_id: str) -> Dict:
        """Check if account can invite another team member"""
        return await self.check_limit(
            account_id,
            EntitlementKeys.TEAM_MEMBERS_MAX,
            "teamMembers.count"
        )
    
    async def recalculate_usage(self, account_id: str):
        """Recalculate all usage metrics for an account"""
        # Count vaults (portfolios)
        vault_count = await self.db.portfolios.count_documents(
            {"account_id": account_id}
        )
        # Fallback: count by user if no account_id on portfolios
        if vault_count == 0:
            account = await self.db.accounts.find_one({"account_id": account_id})
            if account:
                vault_count = await self.db.portfolios.count_documents(
                    {"user_id": account.get("owner_user_id")}
                )
        await self.update_usage(account_id, "vaults.count", vault_count)
        
        # Count team members
        member_count = await self.db.account_users.count_documents(
            {"account_id": account_id}
        )
        await self.update_usage(account_id, "teamMembers.count", member_count)
        
        # Calculate storage (simplified - count documents)
        # In production, you'd sum actual file sizes
        doc_count = await self.db.documents.count_documents(
            {"account_id": account_id}
        )
        # Estimate 0.1 MB per document
        storage_mb = doc_count * 0.1
        await self.update_usage(account_id, "storage.usedMB", storage_mb)
        
        logger.info(f"Recalculated usage for account {account_id}: vaults={vault_count}, members={member_count}, storage={storage_mb}MB")
    
    async def sync_entitlements_from_plan(self, account_id: str, plan_id: str):
        """Sync entitlements from a plan to an account"""
        # Get the plan
        plan = await self.db.plans.find_one(
            {"plan_id": plan_id},
            {"_id": 0}
        )
        
        if not plan:
            logger.error(f"Plan {plan_id} not found")
            return
        
        # Delete existing plan-sourced entitlements
        await self.db.entitlements.delete_many({
            "account_id": account_id,
            "source": "plan"
        })
        
        # Create new entitlements from plan
        now = datetime.now(timezone.utc).isoformat()
        entitlements_to_insert = []
        
        for ent in plan.get("entitlements", []):
            entitlements_to_insert.append({
                "id": f"ent_{account_id}_{ent['key']}",
                "account_id": account_id,
                "key": ent["key"],
                "value": ent["value"],
                "source": "plan",
                "expires_at": None,
                "created_at": now,
                "updated_at": now
            })
        
        if entitlements_to_insert:
            await self.db.entitlements.insert_many(entitlements_to_insert)
        
        logger.info(f"Synced {len(entitlements_to_insert)} entitlements from plan {plan_id} to account {account_id}")


# Singleton instance (initialized in server.py)
entitlement_service: Optional[EntitlementService] = None


def get_entitlement_service() -> EntitlementService:
    """Get the entitlement service instance"""
    if entitlement_service is None:
        raise RuntimeError("EntitlementService not initialized")
    return entitlement_service


def init_entitlement_service(db: AsyncIOMotorDatabase) -> EntitlementService:
    """Initialize the entitlement service"""
    global entitlement_service
    entitlement_service = EntitlementService(db)
    return entitlement_service
