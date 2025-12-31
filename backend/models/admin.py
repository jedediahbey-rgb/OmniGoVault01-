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


# ============ SUPPORT_ADMIN PERMISSION MATRIX ============
# Defines exactly what SUPPORT_ADMIN can and cannot do

class SupportAdminPermission(str, Enum):
    """Granular permissions for SUPPORT_ADMIN role"""
    # READ permissions (allowed)
    VIEW_ACCOUNTS = "view_accounts"  # List and view account details
    VIEW_USERS = "view_users"  # List and view user details
    VIEW_SUBSCRIPTIONS = "view_subscriptions"  # View subscription status
    VIEW_ENTITLEMENTS = "view_entitlements"  # View entitlement values
    VIEW_DOCUMENTS = "view_documents"  # View document metadata (not content)
    VIEW_WORKSPACES = "view_workspaces"  # View workspace info
    VIEW_AUDIT_LOGS_SELF = "view_audit_logs_self"  # View own audit logs only
    
    # ACTION permissions (allowed with restrictions)
    IMPERSONATE_USER = "impersonate_user"  # Can impersonate non-admin users
    RESET_USER_2FA = "reset_user_2fa"  # Can reset 2FA for users
    UNLOCK_USER_ACCOUNT = "unlock_user_account"  # Can unlock locked accounts
    EXTEND_TRIAL = "extend_trial"  # Can extend trial periods
    ADD_SUPPORT_NOTE = "add_support_note"  # Can add notes to accounts
    
    # WRITE permissions (DENIED - requires escalation)
    # MODIFY_ENTITLEMENTS - requires OMNICOMPETENT
    # CHANGE_PLAN - requires BILLING_ADMIN or OMNICOMPETENT
    # SUSPEND_ACCOUNT - requires OMNICOMPETENT
    # DELETE_ACCOUNT - requires OMNICOMPETENT_OWNER
    # GRANT_ROLES - requires OMNICOMPETENT_OWNER
    # MODIFY_USER_DATA - requires OMNICOMPETENT


SUPPORT_ADMIN_ALLOWED_ACTIONS = [
    SupportAdminPermission.VIEW_ACCOUNTS,
    SupportAdminPermission.VIEW_USERS,
    SupportAdminPermission.VIEW_SUBSCRIPTIONS,
    SupportAdminPermission.VIEW_ENTITLEMENTS,
    SupportAdminPermission.VIEW_DOCUMENTS,
    SupportAdminPermission.VIEW_WORKSPACES,
    SupportAdminPermission.VIEW_AUDIT_LOGS_SELF,
    SupportAdminPermission.IMPERSONATE_USER,
    SupportAdminPermission.RESET_USER_2FA,
    SupportAdminPermission.UNLOCK_USER_ACCOUNT,
    SupportAdminPermission.EXTEND_TRIAL,
    SupportAdminPermission.ADD_SUPPORT_NOTE,
]


SUPPORT_ADMIN_DENIED_ACTIONS = [
    "modify_entitlements",
    "change_plan",
    "suspend_account",
    "delete_account",
    "grant_roles",
    "revoke_roles",
    "modify_user_data",
    "view_all_audit_logs",
    "access_system_settings",
    "impersonate_admin_users",
]


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


# ============ SUPPORT_ADMIN SPECIFIC MODELS ============

class SupportNoteType(str, Enum):
    """Types of support notes"""
    GENERAL = "GENERAL"
    ISSUE_REPORT = "ISSUE_REPORT"
    RESOLUTION = "RESOLUTION"
    ESCALATION = "ESCALATION"
    FOLLOWUP = "FOLLOWUP"


class SupportNote(BaseModel):
    """Support notes attached to accounts/users"""
    id: str = Field(default_factory=lambda: f"note_{uuid.uuid4().hex[:12]}")
    account_id: Optional[str] = None
    user_id: Optional[str] = None
    note_type: SupportNoteType = SupportNoteType.GENERAL
    content: str
    created_by: str  # Support admin user_id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    is_internal: bool = True  # If True, only visible to admins
    tags: List[str] = []
    related_ticket_id: Optional[str] = None


class TrialExtension(BaseModel):
    """Record of trial extensions granted by support"""
    id: str = Field(default_factory=lambda: f"trial_ext_{uuid.uuid4().hex[:12]}")
    account_id: str
    extended_by: str  # Support admin user_id
    extended_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    original_end_date: datetime
    new_end_date: datetime
    days_extended: int
    reason: str


class AccountUnlock(BaseModel):
    """Record of account unlocks by support"""
    id: str = Field(default_factory=lambda: f"unlock_{uuid.uuid4().hex[:12]}")
    account_id: Optional[str] = None
    user_id: str
    unlocked_by: str  # Support admin user_id
    unlocked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reason: str
    previous_lock_reason: Optional[str] = None


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
