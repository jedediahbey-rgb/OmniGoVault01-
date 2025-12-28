"""Admin and Global Roles Models"""
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, Dict, List, Any
from enum import Enum
import uuid


# ============ GLOBAL ROLES ============

class GlobalRole(str, Enum):
    """Platform-level roles that sit ABOVE subscription plans"""
    OMNICOMPETENT_OWNER = "OMNICOMPETENT_OWNER"  # Full admin + all features (owner only)
    OMNICOMPETENT = "OMNICOMPETENT"  # All features free, no admin access
    SUPPORT_ADMIN = "SUPPORT_ADMIN"  # Limited admin for support
    BILLING_ADMIN = "BILLING_ADMIN"  # Can manage billing, plans, pricing


GLOBAL_ROLE_DESCRIPTIONS = {
    GlobalRole.OMNICOMPETENT_OWNER: "Full platform control and all features (Owner)",
    GlobalRole.OMNICOMPETENT: "All platform features without billing requirements",
    GlobalRole.SUPPORT_ADMIN: "View accounts and assist users for support purposes",
    GlobalRole.BILLING_ADMIN: "Manage billing, plans, and pricing configurations"
}


class UserGlobalRole(BaseModel):
    """Links users to global platform roles"""
    id: str = Field(default_factory=lambda: f"ugr_{uuid.uuid4().hex[:12]}")
    user_id: str
    role: GlobalRole
    granted_by: str  # User ID who granted this role
    granted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None  # Optional expiration
    notes: str = ""  # Reason for granting


# ============ IMPERSONATION ============

class ImpersonationSession(BaseModel):
    """Tracks admin impersonation sessions"""
    id: str = Field(default_factory=lambda: f"imp_{uuid.uuid4().hex[:12]}")
    admin_user_id: str  # The actual admin user
    target_user_id: str  # Who they're impersonating
    target_account_id: Optional[str] = None  # If impersonating within specific account
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None
    reason: str = ""  # Why impersonating
    is_active: bool = True


# ============ ADMIN AUDIT LOGS ============

class AdminAuditAction(str, Enum):
    """Types of admin actions to audit"""
    # Global role management
    GRANT_GLOBAL_ROLE = "GRANT_GLOBAL_ROLE"
    REVOKE_GLOBAL_ROLE = "REVOKE_GLOBAL_ROLE"
    
    # Account management
    VIEW_ACCOUNT = "VIEW_ACCOUNT"
    CHANGE_PLAN = "CHANGE_PLAN"
    UPDATE_ENTITLEMENT = "UPDATE_ENTITLEMENT"
    SUSPEND_ACCOUNT = "SUSPEND_ACCOUNT"
    UNSUSPEND_ACCOUNT = "UNSUSPEND_ACCOUNT"
    DELETE_ACCOUNT = "DELETE_ACCOUNT"
    
    # User management
    VIEW_USER = "VIEW_USER"
    UPDATE_USER = "UPDATE_USER"
    RESET_PASSWORD = "RESET_PASSWORD"
    RESET_2FA = "RESET_2FA"
    
    # Impersonation
    IMPERSONATION_START = "IMPERSONATION_START"
    IMPERSONATION_END = "IMPERSONATION_END"
    
    # System
    UPDATE_PLAN_CONFIG = "UPDATE_PLAN_CONFIG"
    VIEW_AUDIT_LOGS = "VIEW_AUDIT_LOGS"


class AdminAuditLog(BaseModel):
    """Comprehensive audit log for all admin actions"""
    id: str = Field(default_factory=lambda: f"audit_{uuid.uuid4().hex[:12]}")
    admin_user_id: str  # The admin performing the action
    acting_as_user_id: Optional[str] = None  # If impersonating
    account_id: Optional[str] = None  # Target account if applicable
    target_user_id: Optional[str] = None  # Target user if applicable
    action_type: AdminAuditAction
    metadata: Dict[str, Any] = {}  # Before/after values, details
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    success: bool = True
    error_message: Optional[str] = None


# ============ REQUEST/RESPONSE MODELS ============

class GrantGlobalRoleRequest(BaseModel):
    user_id: str
    role: GlobalRole
    notes: str = ""
    expires_at: Optional[datetime] = None


class RevokeGlobalRoleRequest(BaseModel):
    user_id: str
    role: GlobalRole
    reason: str = ""


class UpdateEntitlementOverrideRequest(BaseModel):
    key: str
    value: Any
    reason: str = ""


class ChangePlanRequest(BaseModel):
    plan_id: str
    reason: str = ""


class StartImpersonationRequest(BaseModel):
    target_user_id: str
    reason: str = ""


class AccountSuspendRequest(BaseModel):
    reason: str


class AdminAccountResponse(BaseModel):
    account_id: str
    name: str
    owner_user_id: str
    owner_email: Optional[str] = None
    plan_name: str
    plan_tier: int
    status: str
    created_at: datetime
    entitlements: Dict[str, Any]
    usage: Dict[str, Any]
    member_count: int
    is_suspended: bool = False


class AdminUserResponse(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    created_at: datetime
    global_roles: List[str] = []
    account_memberships: List[Dict] = []
    is_omnicompetent: bool = False
