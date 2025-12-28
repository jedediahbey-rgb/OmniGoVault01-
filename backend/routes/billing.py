"""Billing API Routes"""
from fastapi import APIRouter, HTTPException, Request, Depends
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging

from models.subscription import (
    CheckoutRequest,
    AccountCreate,
    InviteMemberRequest
)
from services.entitlement_service import get_entitlement_service, EntitlementKeys
from services.subscription_service import get_subscription_service
from services.billing_service import get_billing_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])


# ============ HELPER FUNCTIONS ============

async def get_or_create_account_for_user(user_id: str, db) -> Dict:
    """Get or create an account for a user"""
    entitlement_service = get_entitlement_service()
    subscription_service = get_subscription_service()
    
    # Check if user already has an account
    account = await entitlement_service.get_account_for_user(user_id)
    
    if account:
        return account
    
    # Create new account
    now = datetime.now(timezone.utc).isoformat()
    account = {
        "account_id": f"acct_{uuid.uuid4().hex[:12]}",
        "name": "My Account",
        "owner_user_id": user_id,
        "stripe_customer_id": None,
        "created_at": now,
        "updated_at": now
    }
    await db.accounts.insert_one(account)
    
    # Create account_user link
    account_user = {
        "id": f"au_{uuid.uuid4().hex[:12]}",
        "account_id": account["account_id"],
        "user_id": user_id,
        "role": "owner",
        "invited_by": None,
        "created_at": now
    }
    await db.account_users.insert_one(account_user)
    
    # Create free subscription
    await subscription_service.create_free_subscription(account["account_id"])
    
    # Initialize usage
    await entitlement_service.recalculate_usage(account["account_id"])
    
    logger.info(f"Created account {account['account_id']} for user {user_id}")
    
    return account


# ============ SUBSCRIPTION ENDPOINTS ============

@router.get("/subscription")
async def get_subscription(request: Request):
    """Get current subscription and entitlements"""
    from server import get_current_user, db
    
    user = await get_current_user(request)
    account = await get_or_create_account_for_user(user.user_id, db)
    
    subscription_service = get_subscription_service()
    overview = await subscription_service.get_billing_overview(account["account_id"])
    
    return {
        "account_id": account["account_id"],
        **overview
    }


@router.get("/plans")
async def get_plans():
    """Get all available plans"""
    subscription_service = get_subscription_service()
    plans = await subscription_service.get_public_plans()
    
    # Format for frontend
    return {
        "plans": [
            {
                "plan_id": p["plan_id"],
                "name": p["name"],
                "tier": p["tier"],
                "description": p["description"],
                "price_monthly": p["price_monthly"],
                "price_yearly": p["price_yearly"],
                "entitlements": {e["key"]: e["value"] for e in p.get("entitlements", [])}
            }
            for p in plans
        ]
    }


@router.get("/upgrade-options")
async def get_upgrade_options(request: Request):
    """Get available upgrade options for current account"""
    from server import get_current_user, db
    
    user = await get_current_user(request)
    account = await get_or_create_account_for_user(user.user_id, db)
    
    subscription_service = get_subscription_service()
    options = await subscription_service.get_upgrade_options(account["account_id"])
    
    return {"upgrade_options": options}


@router.get("/usage")
async def get_usage(request: Request):
    """Get current usage stats"""
    from server import get_current_user, db
    
    user = await get_current_user(request)
    account = await get_or_create_account_for_user(user.user_id, db)
    
    entitlement_service = get_entitlement_service()
    
    # Recalculate usage
    await entitlement_service.recalculate_usage(account["account_id"])
    
    # Get current values with limit checks
    vaults = await entitlement_service.can_create_vault(account["account_id"])
    members = await entitlement_service.can_invite_member(account["account_id"])
    storage_used = await entitlement_service.get_usage(account["account_id"], "storage.usedMB")
    storage_limit = await entitlement_service.get_limit(account["account_id"], EntitlementKeys.STORAGE_MAX_MB)
    
    return {
        "vaults": vaults,
        "teamMembers": members,
        "storage": {
            "usedMB": storage_used,
            "limitMB": storage_limit if storage_limit != float('inf') else -1,
            "unlimited": storage_limit == float('inf')
        }
    }


# ============ CHECKOUT ENDPOINTS ============

@router.post("/checkout")
async def create_checkout(request: Request, checkout_req: CheckoutRequest):
    """Create a Stripe checkout session"""
    from server import get_current_user, db
    
    user = await get_current_user(request)
    account = await get_or_create_account_for_user(user.user_id, db)
    
    billing_service = get_billing_service()
    
    # Get host URL from request
    host_url = str(request.base_url)
    
    result = await billing_service.create_checkout_session(
        account_id=account["account_id"],
        user_id=user.user_id,
        plan_id=checkout_req.plan_id,
        billing_cycle=checkout_req.billing_cycle,
        origin_url=checkout_req.origin_url,
        host_url=host_url
    )
    
    return result


@router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request):
    """Get checkout session status"""
    billing_service = get_billing_service()
    host_url = str(request.base_url)
    
    status = await billing_service.get_checkout_status(session_id, host_url)
    return status


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    billing_service = get_billing_service()
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url)
    
    result = await billing_service.handle_webhook(body, signature, host_url)
    return result


# ============ ENTITLEMENT CHECK ENDPOINTS ============

@router.get("/check/vaults")
async def check_vault_limit(request: Request):
    """Check if user can create another vault"""
    from server import get_current_user, db
    
    user = await get_current_user(request)
    account = await get_or_create_account_for_user(user.user_id, db)
    
    entitlement_service = get_entitlement_service()
    result = await entitlement_service.can_create_vault(account["account_id"])
    
    return result


@router.get("/check/members")
async def check_member_limit(request: Request):
    """Check if user can invite another team member"""
    from server import get_current_user, db
    
    user = await get_current_user(request)
    account = await get_or_create_account_for_user(user.user_id, db)
    
    entitlement_service = get_entitlement_service()
    result = await entitlement_service.can_invite_member(account["account_id"])
    
    return result


@router.get("/check/feature/{feature_key}")
async def check_feature(feature_key: str, request: Request):
    """Check if a feature is enabled for the account"""
    from server import get_current_user, db
    
    user = await get_current_user(request)
    account = await get_or_create_account_for_user(user.user_id, db)
    
    entitlement_service = get_entitlement_service()
    
    # Map common feature names to entitlement keys
    feature_map = {
        "analytics": EntitlementKeys.ANALYTICS_ENABLED,
        "api": EntitlementKeys.API_ENABLED,
        "templates": EntitlementKeys.TEMPLATES_ENABLED,
        "priority-support": EntitlementKeys.PRIORITY_SUPPORT
    }
    
    key = feature_map.get(feature_key, f"features.{feature_key}.enabled")
    enabled = await entitlement_service.has_entitlement(account["account_id"], key)
    
    return {"feature": feature_key, "enabled": enabled}


# ============ ADMIN ENDPOINTS (for testing) ============

@router.post("/admin/set-plan/{account_id}/{plan_id}")
async def admin_set_plan(account_id: str, plan_id: str, request: Request):
    """Admin endpoint to manually set an account's plan (for testing)"""
    from server import db
    from datetime import timedelta
    
    subscription_service = get_subscription_service()
    
    # Verify plan exists
    plan = await subscription_service.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    now = datetime.now(timezone.utc)
    
    # Update subscription
    await subscription_service.update_subscription_from_stripe(
        account_id=account_id,
        stripe_subscription_id=f"manual_{uuid.uuid4().hex[:8]}",
        plan_id=plan_id,
        status="active",
        current_period_start=now,
        current_period_end=now + timedelta(days=365)
    )
    
    return {"ok": True, "message": f"Account {account_id} set to plan {plan['name']}"}


@router.post("/admin/seed-plans")
async def admin_seed_plans(request: Request):
    """Seed default plans (admin/setup endpoint)"""
    from server import db
    
    await seed_default_plans(db)
    
    return {"ok": True, "message": "Plans seeded successfully"}


# ============ PLAN SEEDING ============

async def seed_default_plans(db):
    """Seed the default subscription plans"""
    now = datetime.now(timezone.utc).isoformat()
    
    default_plans = [
        {
            "plan_id": "plan_free",
            "name": "Testamentary",
            "tier": 0,
            "description": "Basic trust governance for individuals",
            "price_monthly": 0.0,
            "price_yearly": 0.0,
            "stripe_price_id_monthly": None,
            "stripe_price_id_yearly": None,
            "stripe_product_id": None,
            "entitlements": [
                {"key": "vaults.max", "value": 1, "description": "Maximum vaults"},
                {"key": "teamMembers.max", "value": 1, "description": "Maximum team members"},
                {"key": "storage.maxMB", "value": 100, "description": "Storage limit in MB"},
                {"key": "features.analytics.enabled", "value": False, "description": "Analytics access"},
                {"key": "features.api.enabled", "value": False, "description": "API access"},
                {"key": "features.templates.enabled", "value": False, "description": "Premium templates"},
                {"key": "features.prioritySupport.enabled", "value": False, "description": "Priority support"}
            ],
            "is_public": True,
            "is_active": True,
            "sort_order": 0,
            "created_at": now,
            "updated_at": now
        },
        {
            "plan_id": "plan_starter",
            "name": "Revocable",
            "tier": 1,
            "description": "For trustees managing living trusts",
            "price_monthly": 29.0,
            "price_yearly": 290.0,
            "stripe_price_id_monthly": None,  # Set when Stripe products are created
            "stripe_price_id_yearly": None,
            "stripe_product_id": None,
            "entitlements": [
                {"key": "vaults.max", "value": 5, "description": "Maximum vaults"},
                {"key": "teamMembers.max", "value": 3, "description": "Maximum team members"},
                {"key": "storage.maxMB", "value": 1000, "description": "Storage limit (1 GB)"},
                {"key": "features.analytics.enabled", "value": False, "description": "Analytics access"},
                {"key": "features.api.enabled", "value": False, "description": "API access"},
                {"key": "features.templates.enabled", "value": True, "description": "Premium templates"},
                {"key": "features.prioritySupport.enabled", "value": False, "description": "Priority support"}
            ],
            "is_public": True,
            "is_active": True,
            "sort_order": 1,
            "created_at": now,
            "updated_at": now
        },
        {
            "plan_id": "plan_pro",
            "name": "Irrevocable",
            "tier": 2,
            "description": "For fiduciaries and family offices",
            "price_monthly": 79.0,
            "price_yearly": 790.0,
            "stripe_price_id_monthly": None,
            "stripe_price_id_yearly": None,
            "stripe_product_id": None,
            "entitlements": [
                {"key": "vaults.max", "value": 25, "description": "Maximum vaults"},
                {"key": "teamMembers.max", "value": 15, "description": "Maximum team members"},
                {"key": "storage.maxMB", "value": 10000, "description": "Storage limit (10 GB)"},
                {"key": "features.analytics.enabled", "value": True, "description": "Analytics access"},
                {"key": "features.api.enabled", "value": True, "description": "API access"},
                {"key": "features.templates.enabled", "value": True, "description": "Premium templates"},
                {"key": "features.prioritySupport.enabled", "value": True, "description": "Priority support"}
            ],
            "is_public": True,
            "is_active": True,
            "sort_order": 2,
            "created_at": now,
            "updated_at": now
        },
        {
            "plan_id": "plan_enterprise",
            "name": "Dynasty",
            "tier": 3,
            "description": "For multi-generational trust management",
            "price_monthly": 199.0,
            "price_yearly": 1990.0,
            "stripe_price_id_monthly": None,
            "stripe_price_id_yearly": None,
            "stripe_product_id": None,
            "entitlements": [
                {"key": "vaults.max", "value": -1, "description": "Unlimited vaults"},
                {"key": "teamMembers.max", "value": -1, "description": "Unlimited team members"},
                {"key": "storage.maxMB", "value": -1, "description": "Unlimited storage"},
                {"key": "features.analytics.enabled", "value": True, "description": "Analytics access"},
                {"key": "features.api.enabled", "value": True, "description": "API access"},
                {"key": "features.templates.enabled", "value": True, "description": "Premium templates"},
                {"key": "features.prioritySupport.enabled", "value": True, "description": "Priority support"}
            ],
            "is_public": True,
            "is_active": True,
            "sort_order": 3,
            "created_at": now,
            "updated_at": now
        }
    ]
    
    for plan in default_plans:
        await db.plans.update_one(
            {"plan_id": plan["plan_id"]},
            {"$set": plan},
            upsert=True
        )
    
    logger.info(f"Seeded {len(default_plans)} default plans")
