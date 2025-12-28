"""Subscription Service - Manages subscriptions and billing integration"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import os
import uuid

from services.entitlement_service import EntitlementService, EntitlementKeys

logger = logging.getLogger(__name__)


class SubscriptionService:
    """Service for managing subscriptions"""
    
    def __init__(self, db: AsyncIOMotorDatabase, entitlement_service: EntitlementService):
        self.db = db
        self.entitlement_service = entitlement_service
    
    async def get_subscription(self, account_id: str) -> Optional[Dict]:
        """Get the active subscription for an account"""
        return await self.db.subscriptions.find_one(
            {"account_id": account_id},
            {"_id": 0}
        )
    
    async def get_plan(self, plan_id: str) -> Optional[Dict]:
        """Get a plan by ID"""
        return await self.db.plans.find_one(
            {"plan_id": plan_id},
            {"_id": 0}
        )
    
    async def get_plan_by_tier(self, tier: int) -> Optional[Dict]:
        """Get a plan by tier number"""
        return await self.db.plans.find_one(
            {"tier": tier, "is_active": True},
            {"_id": 0}
        )
    
    async def get_public_plans(self) -> List[Dict]:
        """Get all public, active plans"""
        plans = await self.db.plans.find(
            {"is_public": True, "is_active": True},
            {"_id": 0}
        ).sort("sort_order", 1).to_list(10)
        return plans
    
    async def create_free_subscription(self, account_id: str) -> Dict:
        """Create a free tier subscription for a new account"""
        # Get the free plan (tier 0)
        free_plan = await self.get_plan_by_tier(0)
        
        if not free_plan:
            logger.error("Free plan not found - check seed data")
            raise ValueError("Free plan not configured")
        
        now = datetime.now(timezone.utc)
        subscription = {
            "subscription_id": f"sub_{uuid.uuid4().hex[:12]}",
            "account_id": account_id,
            "plan_id": free_plan["plan_id"],
            "stripe_subscription_id": None,
            "status": "active",
            "billing_cycle": "monthly",
            "current_period_start": now.isoformat(),
            "current_period_end": None,  # Free plan doesn't expire
            "cancel_at_period_end": False,
            "canceled_at": None,
            "trial_start": None,
            "trial_end": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        await self.db.subscriptions.insert_one(subscription)
        
        # Sync entitlements from the free plan
        await self.entitlement_service.sync_entitlements_from_plan(
            account_id, 
            free_plan["plan_id"]
        )
        
        logger.info(f"Created free subscription for account {account_id}")
        return subscription
    
    async def update_subscription_from_stripe(
        self,
        account_id: str,
        stripe_subscription_id: str,
        plan_id: str,
        status: str,
        current_period_start: datetime,
        current_period_end: datetime,
        cancel_at_period_end: bool = False
    ):
        """Update subscription based on Stripe webhook data"""
        now = datetime.now(timezone.utc).isoformat()
        
        await self.db.subscriptions.update_one(
            {"account_id": account_id},
            {
                "$set": {
                    "stripe_subscription_id": stripe_subscription_id,
                    "plan_id": plan_id,
                    "status": status,
                    "current_period_start": current_period_start.isoformat() if current_period_start else None,
                    "current_period_end": current_period_end.isoformat() if current_period_end else None,
                    "cancel_at_period_end": cancel_at_period_end,
                    "updated_at": now
                }
            },
            upsert=True
        )
        
        # Sync entitlements from the new plan
        await self.entitlement_service.sync_entitlements_from_plan(account_id, plan_id)
        
        logger.info(f"Updated subscription for account {account_id} to plan {plan_id}, status {status}")
    
    async def cancel_subscription(self, account_id: str, at_period_end: bool = True):
        """Cancel a subscription"""
        now = datetime.now(timezone.utc).isoformat()
        
        if at_period_end:
            # Mark to cancel at end of billing period
            await self.db.subscriptions.update_one(
                {"account_id": account_id},
                {"$set": {
                    "cancel_at_period_end": True,
                    "updated_at": now
                }}
            )
        else:
            # Immediate cancellation - downgrade to free
            free_plan = await self.get_plan_by_tier(0)
            await self.db.subscriptions.update_one(
                {"account_id": account_id},
                {"$set": {
                    "status": "canceled",
                    "plan_id": free_plan["plan_id"] if free_plan else None,
                    "canceled_at": now,
                    "updated_at": now
                }}
            )
            if free_plan:
                await self.entitlement_service.sync_entitlements_from_plan(
                    account_id, 
                    free_plan["plan_id"]
                )
        
        logger.info(f"Canceled subscription for account {account_id}, at_period_end={at_period_end}")
    
    async def handle_payment_failed(self, account_id: str):
        """Handle payment failure - update status and potentially restrict access"""
        now = datetime.now(timezone.utc).isoformat()
        
        await self.db.subscriptions.update_one(
            {"account_id": account_id},
            {"$set": {
                "status": "past_due",
                "updated_at": now
            }}
        )
        
        logger.warning(f"Payment failed for account {account_id}, status set to past_due")
    
    async def get_billing_overview(self, account_id: str) -> Dict:
        """Get complete billing overview for an account"""
        subscription = await self.get_subscription(account_id)
        
        if not subscription:
            # No subscription - return free tier defaults
            return {
                "plan_name": "Free",
                "plan_tier": 0,
                "status": "none",
                "current_period_end": None,
                "cancel_at_period_end": False,
                "entitlements": {},
                "usage": {}
            }
        
        # Get plan details
        plan = await self.get_plan(subscription["plan_id"])
        
        # Get entitlements
        entitlements = await self.entitlement_service.get_all_entitlements(account_id)
        
        # Recalculate and get usage
        await self.entitlement_service.recalculate_usage(account_id)
        usage = {}
        for metric in ["vaults.count", "teamMembers.count", "storage.usedMB"]:
            usage[metric] = await self.entitlement_service.get_usage(account_id, metric)
        
        # Parse current_period_end
        period_end = subscription.get("current_period_end")
        if isinstance(period_end, str):
            period_end = datetime.fromisoformat(period_end.replace("Z", "+00:00"))
        
        return {
            "plan_name": plan["name"] if plan else "Unknown",
            "plan_tier": plan["tier"] if plan else 0,
            "plan_id": subscription["plan_id"],
            "status": subscription["status"],
            "billing_cycle": subscription.get("billing_cycle", "monthly"),
            "current_period_end": period_end,
            "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
            "entitlements": entitlements,
            "usage": usage
        }
    
    async def get_upgrade_options(self, account_id: str) -> List[Dict]:
        """Get available upgrade options for an account"""
        subscription = await self.get_subscription(account_id)
        current_tier = 0
        
        if subscription:
            plan = await self.get_plan(subscription["plan_id"])
            if plan:
                current_tier = plan["tier"]
        
        # Get all plans higher than current tier
        plans = await self.db.plans.find(
            {"tier": {"$gt": current_tier}, "is_public": True, "is_active": True},
            {"_id": 0}
        ).sort("tier", 1).to_list(10)
        
        return plans


# Singleton instance
subscription_service: Optional[SubscriptionService] = None


def get_subscription_service() -> SubscriptionService:
    if subscription_service is None:
        raise RuntimeError("SubscriptionService not initialized")
    return subscription_service


def init_subscription_service(
    db: AsyncIOMotorDatabase, 
    entitlement_service: EntitlementService
) -> SubscriptionService:
    global subscription_service
    subscription_service = SubscriptionService(db, entitlement_service)
    return subscription_service
