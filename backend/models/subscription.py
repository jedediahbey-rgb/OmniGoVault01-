"""Subscription and Entitlement Models"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any
import uuid


# ============ ACCOUNT MODELS ============

class Account(BaseModel):
    """Organization/Account that owns subscriptions and resources"""
    account_id: str = Field(default_factory=lambda: f"acct_{uuid.uuid4().hex[:12]}")
    name: str
    owner_user_id: str  # Primary owner
    stripe_customer_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AccountUser(BaseModel):
    """Links users to accounts with roles"""
    id: str = Field(default_factory=lambda: f"au_{uuid.uuid4().hex[:12]}")
    account_id: str
    user_id: str
    role: str = "member"  # owner, admin, member, viewer
    invited_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ PLAN MODELS ============

class PlanEntitlement(BaseModel):
    """Defines a single entitlement within a plan"""
    key: str  # e.g., "vaults.max", "features.analytics.enabled"
    value: Any  # Can be int, bool, or string
    description: str = ""


class Plan(BaseModel):
    """Subscription plan definition"""
    plan_id: str = Field(default_factory=lambda: f"plan_{uuid.uuid4().hex[:12]}")
    name: str  # Display name: "Free", "Starter", "Pro", "Enterprise"
    tier: int  # 0=Free, 1=Starter, 2=Pro, 3=Enterprise
    description: str = ""
    price_monthly: float = 0.0  # USD
    price_yearly: float = 0.0  # USD (annual discount)
    stripe_price_id_monthly: Optional[str] = None
    stripe_price_id_yearly: Optional[str] = None
    stripe_product_id: Optional[str] = None
    entitlements: List[PlanEntitlement] = []
    is_public: bool = True  # False for custom/enterprise plans
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ SUBSCRIPTION MODELS ============

class Subscription(BaseModel):
    """Links Account to Plan with status"""
    subscription_id: str = Field(default_factory=lambda: f"sub_{uuid.uuid4().hex[:12]}")
    account_id: str
    plan_id: str
    stripe_subscription_id: Optional[str] = None
    status: str = "active"  # active, trialing, past_due, canceled, paused, incomplete
    billing_cycle: str = "monthly"  # monthly, yearly
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    canceled_at: Optional[datetime] = None
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ ENTITLEMENT MODELS ============

class Entitlement(BaseModel):
    """Computed entitlements for an account (derived from subscription plan)"""
    id: str = Field(default_factory=lambda: f"ent_{uuid.uuid4().hex[:12]}")
    account_id: str
    key: str  # e.g., "vaults.max", "features.analytics.enabled"
    value: Any  # int, bool, or string
    source: str = "plan"  # plan, override, trial
    expires_at: Optional[datetime] = None  # For time-limited overrides
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ USAGE MODELS ============

class Usage(BaseModel):
    """Tracks actual usage for metered items"""
    id: str = Field(default_factory=lambda: f"usage_{uuid.uuid4().hex[:12]}")
    account_id: str
    metric: str  # e.g., "vaults.count", "teamMembers.count", "storage.usedMB"
    value: float = 0
    last_calculated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ PAYMENT TRANSACTION MODELS ============

class PaymentTransaction(BaseModel):
    """Track payment transactions from Stripe"""
    id: str = Field(default_factory=lambda: f"txn_{uuid.uuid4().hex[:12]}")
    account_id: str
    user_id: Optional[str] = None
    stripe_session_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    amount: float
    currency: str = "usd"
    status: str = "pending"  # pending, paid, failed, expired, refunded
    payment_type: str = "subscription"  # subscription, one_time
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============ REQUEST/RESPONSE MODELS ============

class AccountCreate(BaseModel):
    name: str


class SubscriptionCreate(BaseModel):
    plan_id: str
    billing_cycle: str = "monthly"


class CheckoutRequest(BaseModel):
    plan_id: str
    billing_cycle: str = "monthly"  # monthly, yearly
    origin_url: str  # Frontend origin for success/cancel URLs


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class BillingOverview(BaseModel):
    plan_name: str
    plan_tier: int
    status: str
    current_period_end: Optional[datetime]
    cancel_at_period_end: bool
    entitlements: Dict[str, Any]
    usage: Dict[str, Any]


class InviteMemberRequest(BaseModel):
    email: str
    role: str = "member"  # admin, member, viewer
