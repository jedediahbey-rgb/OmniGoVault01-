"""Email Service for Workspace Invitations using Resend - V2 Enhanced"""
import os
import asyncio
import logging
import secrets
import hashlib
import resend
from datetime import datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# Initialize Resend with API key
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
APP_URL = os.environ.get("APP_URL", "https://premium-archive-1.preview.emergentagent.com")

# Database reference for audit logging
_db = None

def set_email_db(database):
    """Set database reference for audit logging"""
    global _db
    _db = database

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info("✅ Resend email service initialized with real API key")
else:
    logger.warning("⚠️ RESEND_API_KEY not set - emails will be simulated")


def generate_secure_invite_token(vault_id: str, recipient_email: str, expiry_hours: int = 72) -> tuple[str, str, datetime]:
    """
    Generate a secure invite token with expiration.
    
    Returns:
        tuple: (token, token_hash, expiry_datetime)
    """
    # Generate random token
    token = secrets.token_urlsafe(32)
    
    # Create hash for storage (don't store raw token)
    token_hash = hashlib.sha256(f"{token}:{vault_id}:{recipient_email}".encode()).hexdigest()
    
    # Calculate expiry
    expiry = datetime.now(timezone.utc) + timedelta(hours=expiry_hours)
    
    return token, token_hash, expiry


async def log_email_audit(
    email_type: str,
    recipient_email: str,
    status: str,
    message_id: Optional[str],
    metadata: dict,
    user_id: Optional[str] = None
):
    """Log email send attempt to audit log"""
    if not _db:
        logger.warning("Email audit: No database connection for audit logging")
        return
    
    try:
        audit_entry = {
            "id": f"email_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(4)}",
            "type": "email",
            "email_type": email_type,
            "recipient_email": recipient_email,
            "status": status,
            "message_id": message_id,
            "user_id": user_id,
            "metadata": metadata,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sender_email": SENDER_EMAIL
        }
        await _db.email_audit_log.insert_one(audit_entry)
        logger.info(f"📧 Email audit logged: {email_type} to {recipient_email} - {status}")
    except Exception as e:
        logger.error(f"Failed to log email audit: {e}")


async def send_workspace_invitation_email(
    recipient_email: str,
    inviter_name: str,
    vault_name: str,
    role: str,
    vault_id: str,
    user_id: Optional[str] = None,
    expiry_hours: int = 72
) -> dict:
    """
    Send a workspace invitation email to a new participant.
    
    Args:
        recipient_email: Email address of the invitee
        inviter_name: Name of the person sending the invitation
        vault_name: Name of the workspace/vault
        role: Role being assigned (e.g., TRUSTEE, BENEFICIARY)
        vault_id: ID of the vault for the invitation link
        user_id: ID of the user sending the invitation (for audit)
        expiry_hours: Hours until invite expires (default 72)
    
    Returns:
        dict with status and email_id if successful
    """
    # Format role for display
    role_display = role.replace("_", " ").title()
    
    # Generate secure invite token
    token, token_hash, expiry = generate_secure_invite_token(vault_id, recipient_email, expiry_hours)
    
    # Store invite token in database for validation
    if _db:
        try:
            await _db.workspace_invites.insert_one({
                "token_hash": token_hash,
                "vault_id": vault_id,
                "recipient_email": recipient_email,
                "role": role,
                "inviter_id": user_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": expiry.isoformat(),
                "used": False
            })
        except Exception as e:
            logger.error(f"Failed to store invite token: {e}")
    
    # Create invitation link with secure token
    invitation_link = f"{APP_URL}/invite/{token}?vault={vault_id}"
    
    # Format expiry for display
    expiry_display = expiry.strftime("%B %d, %Y at %I:%M %p UTC")
    
    # Build HTML email content
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0f1c;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0f1c; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111827; border-radius: 12px; border: 1px solid rgba(198, 168, 124, 0.2);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(198, 168, 124, 0.1);">
                                <div style="font-size: 24px; font-weight: 600; color: #C6A87C; margin-bottom: 8px;">
                                    🔐 Private Equity &amp; Trusts
                                </div>
                                <div style="font-size: 14px; color: rgba(255,255,255,0.5);">
                                    Shared Trust Workspace Invitation
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Body -->
                        <tr>
                            <td style="padding: 32px;">
                                <p style="color: #ffffff; font-size: 16px; margin: 0 0 16px;">
                                    Hello,
                                </p>
                                <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin: 0 0 24px; line-height: 1.6;">
                                    <strong style="color: #C6A87C;">{inviter_name}</strong> has invited you to join 
                                    <strong style="color: #ffffff;">&ldquo;{vault_name}&rdquo;</strong> as a 
                                    <strong style="color: #C6A87C;">{role_display}</strong>.
                                </p>
                                
                                <!-- Workspace Info Box -->
                                <div style="background-color: rgba(198, 168, 124, 0.1); border: 1px solid rgba(198, 168, 124, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="padding-bottom: 12px;">
                                                <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Workspace</p>
                                                <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0;">{vault_name}</p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding-bottom: 12px;">
                                                <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Your Role</p>
                                                <p style="color: #C6A87C; font-size: 16px; font-weight: 600; margin: 0;">{role_display}</p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Invited By</p>
                                                <p style="color: #ffffff; font-size: 14px; margin: 0;">{inviter_name}</p>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 24px; line-height: 1.6;">
                                    As a {role_display}, you&apos;ll be able to view documents, participate in governance workflows, 
                                    and collaborate with other stakeholders in this trusted workspace.
                                </p>
                                
                                <!-- CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="padding: 8px 0 24px;">
                                            <a href="{invitation_link}" 
                                               style="display: inline-block; background-color: #C6A87C; color: #0a0f1c; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px;">
                                                Accept Invitation
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Expiry Notice -->
                                <div style="background-color: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                                    <p style="color: #EAB308; font-size: 12px; margin: 0; text-align: center;">
                                        ⏰ This invitation expires on {expiry_display}
                                    </p>
                                </div>
                                
                                <p style="color: rgba(255,255,255,0.5); font-size: 13px; margin: 0; line-height: 1.5;">
                                    If you don&apos;t have an account yet, you&apos;ll be prompted to sign in with Google when you click the button above.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 24px 32px; background-color: rgba(0,0,0,0.2); border-top: 1px solid rgba(198, 168, 124, 0.1);">
                                <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0; text-align: center;">
                                    This invitation was sent by {inviter_name} via Private Equity &amp; Trusts.<br>
                                    If you didn&apos;t expect this email, you can safely ignore it.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    # Plain text version
    text_content = f"""
You've been invited to join a Trust Workspace

{inviter_name} has invited you to join "{vault_name}" as a {role_display}.

Workspace: {vault_name}
Your Role: {role_display}
Invited By: {inviter_name}

As a {role_display}, you'll be able to view documents, participate in governance workflows, and collaborate with other stakeholders.

Accept your invitation: {invitation_link}

⏰ This invitation expires on {expiry_display}

If you don't have an account yet, you'll be prompted to sign in with Google.

---
This invitation was sent by {inviter_name} via Private Equity & Trusts.
    """
    
    # Prepare metadata for audit
    audit_metadata = {
        "vault_id": vault_id,
        "vault_name": vault_name,
        "role": role,
        "inviter_name": inviter_name,
        "expires_at": expiry.isoformat()
    }
    
    # If no API key, simulate the email
    if not RESEND_API_KEY:
        logger.info(f"[SIMULATED EMAIL] Invitation to {recipient_email} for vault {vault_name}")
        await log_email_audit("workspace_invitation", recipient_email, "simulated", f"sim_{datetime.now(timezone.utc).isoformat()}", audit_metadata, user_id)
        return {
            "status": "simulated",
            "message": f"Email simulated (no API key). Would send to {recipient_email}",
            "email_id": f"sim_{datetime.now(timezone.utc).isoformat()}",
            "invite_token": token,
            "expires_at": expiry.isoformat()
        }
    
    # Build email params
    params = {
        "from": SENDER_EMAIL,
        "to": [recipient_email],
        "subject": f"You've been invited to join {vault_name}",
        "html": html_content,
        "text": text_content
    }
    
    try:
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        message_id = email.get("id")
        logger.info(f"✅ Invitation email sent to {recipient_email} for vault {vault_name} [ID: {message_id}]")
        
        # Log success to audit
        await log_email_audit("workspace_invitation", recipient_email, "success", message_id, audit_metadata, user_id)
        
        return {
            "status": "success",
            "message": f"Email sent to {recipient_email}",
            "email_id": message_id,
            "invite_token": token,
            "expires_at": expiry.isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Failed to send invitation email to {recipient_email}: {str(e)}")
        
        # Log failure to audit
        await log_email_audit("workspace_invitation", recipient_email, "error", None, {**audit_metadata, "error": str(e)}, user_id)
        
        return {
            "status": "error",
            "message": str(e),
            "email_id": None,
            "invite_token": token,
            "expires_at": expiry.isoformat()
        }


async def send_document_shared_notification(
    recipient_email: str,
    sharer_name: str,
    document_title: str,
    vault_name: str,
    document_id: str,
    vault_id: str
) -> dict:
    """Send notification when a document is shared or requires attention"""
    
    document_link = f"{APP_URL}/vault/workspaces/{vault_id}?doc={document_id}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0f1c;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0f1c; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111827; border-radius: 12px; border: 1px solid rgba(198, 168, 124, 0.2);">
                        <tr>
                            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(198, 168, 124, 0.1);">
                                <div style="font-size: 24px; font-weight: 600; color: #C6A87C;">
                                    📄 Document Shared
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 32px;">
                                <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin: 0 0 24px; line-height: 1.6;">
                                    <strong style="color: #C6A87C;">{sharer_name}</strong> has shared a document with you in 
                                    <strong style="color: #ffffff;">"{vault_name}"</strong>.
                                </p>
                                
                                <div style="background-color: rgba(198, 168, 124, 0.1); border: 1px solid rgba(198, 168, 124, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                    <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0 0 8px;">Document</p>
                                    <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0;">{document_title}</p>
                                </div>
                                
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{document_link}" 
                                               style="display: inline-block; background-color: #C6A87C; color: #0a0f1c; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px;">
                                                View Document
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    if not RESEND_API_KEY:
        logger.info(f"[SIMULATED EMAIL] Document notification to {recipient_email}")
        return {"status": "simulated", "email_id": None}
    
    params = {
        "from": SENDER_EMAIL,
        "to": [recipient_email],
        "subject": f"Document shared: {document_title}",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "success", "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"Failed to send document notification: {str(e)}")
        return {"status": "error", "message": str(e)}


async def send_signature_request_email(
    recipient_email: str,
    requester_name: str,
    document_title: str,
    vault_name: str,
    document_id: str,
    vault_id: str
) -> dict:
    """Send notification when a signature is requested"""
    
    document_link = f"{APP_URL}/vault/workspaces/{vault_id}?doc={document_id}&action=sign"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0f1c;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0f1c; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111827; border-radius: 12px; border: 1px solid rgba(198, 168, 124, 0.2);">
                        <tr>
                            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(198, 168, 124, 0.1);">
                                <div style="font-size: 24px; font-weight: 600; color: #C6A87C;">
                                    ✍️ Signature Requested
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 32px;">
                                <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin: 0 0 24px; line-height: 1.6;">
                                    <strong style="color: #C6A87C;">{requester_name}</strong> has requested your signature on a document in 
                                    <strong style="color: #ffffff;">"{vault_name}"</strong>.
                                </p>
                                
                                <div style="background-color: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                    <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0 0 8px;">Document Requiring Signature</p>
                                    <p style="color: #ffffff; font-size: 16px; font-weight: 600; margin: 0;">{document_title}</p>
                                </div>
                                
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{document_link}" 
                                               style="display: inline-block; background-color: #8B5CF6; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px;">
                                                Review & Sign
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    if not RESEND_API_KEY:
        logger.info(f"[SIMULATED EMAIL] Signature request to {recipient_email}")
        return {"status": "simulated", "email_id": None}
    
    params = {
        "from": SENDER_EMAIL,
        "to": [recipient_email],
        "subject": f"Signature requested: {document_title}",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "success", "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"Failed to send signature request email: {str(e)}")
        return {"status": "error", "message": str(e)}


async def send_role_change_notification(
    recipient_email: str,
    member_name: str,
    vault_name: str,
    old_role: str,
    new_role: str,
    changed_by: str,
    vault_id: str,
    user_id: Optional[str] = None
) -> dict:
    """Send notification when a member's role is changed in a workspace."""
    
    old_role_display = old_role.replace("_", " ").title()
    new_role_display = new_role.replace("_", " ").title()
    workspace_link = f"{APP_URL}/vault/workspaces/{vault_id}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0f1c;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0f1c; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111827; border-radius: 12px; border: 1px solid rgba(198, 168, 124, 0.2);">
                        <tr>
                            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(198, 168, 124, 0.1);">
                                <div style="font-size: 24px; font-weight: 600; color: #C6A87C;">
                                    🔄 Role Updated
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 32px;">
                                <p style="color: #ffffff; font-size: 16px; margin: 0 0 16px;">
                                    Hello {member_name},
                                </p>
                                <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin: 0 0 24px; line-height: 1.6;">
                                    Your role in <strong style="color: #ffffff;">&ldquo;{vault_name}&rdquo;</strong> has been updated by 
                                    <strong style="color: #C6A87C;">{changed_by}</strong>.
                                </p>
                                
                                <!-- Role Change Box -->
                                <div style="background-color: rgba(198, 168, 124, 0.1); border: 1px solid rgba(198, 168, 124, 0.3); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td width="45%" style="text-align: center; vertical-align: middle;">
                                                <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 0 0 6px; text-transform: uppercase;">Previous Role</p>
                                                <p style="color: rgba(255,255,255,0.6); font-size: 16px; margin: 0; text-decoration: line-through;">{old_role_display}</p>
                                            </td>
                                            <td width="10%" style="text-align: center; vertical-align: middle;">
                                                <span style="color: #C6A87C; font-size: 20px;">→</span>
                                            </td>
                                            <td width="45%" style="text-align: center; vertical-align: middle;">
                                                <p style="color: rgba(255,255,255,0.5); font-size: 11px; margin: 0 0 6px; text-transform: uppercase;">New Role</p>
                                                <p style="color: #C6A87C; font-size: 18px; font-weight: 600; margin: 0;">{new_role_display}</p>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{workspace_link}" 
                                               style="display: inline-block; background-color: #C6A87C; color: #0a0f1c; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px;">
                                                View Workspace
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 24px 32px; background-color: rgba(0,0,0,0.2); border-top: 1px solid rgba(198, 168, 124, 0.1);">
                                <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0; text-align: center;">
                                    This notification was sent from Private Equity &amp; Trusts.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    audit_metadata = {
        "vault_id": vault_id,
        "vault_name": vault_name,
        "old_role": old_role,
        "new_role": new_role,
        "changed_by": changed_by
    }
    
    if not RESEND_API_KEY:
        logger.info(f"[SIMULATED EMAIL] Role change to {recipient_email}")
        await log_email_audit("role_change", recipient_email, "simulated", None, audit_metadata, user_id)
        return {"status": "simulated", "email_id": None}
    
    params = {
        "from": SENDER_EMAIL,
        "to": [recipient_email],
        "subject": f"Your role in {vault_name} has been updated",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        message_id = email.get("id")
        await log_email_audit("role_change", recipient_email, "success", message_id, audit_metadata, user_id)
        return {"status": "success", "email_id": message_id}
    except Exception as e:
        logger.error(f"Failed to send role change email: {str(e)}")
        await log_email_audit("role_change", recipient_email, "error", None, {**audit_metadata, "error": str(e)}, user_id)
        return {"status": "error", "message": str(e)}


async def send_critical_health_alert(
    recipient_email: str,
    recipient_name: str,
    portfolio_name: str,
    health_score: int,
    critical_issues: list,
    portfolio_id: str,
    user_id: Optional[str] = None
) -> dict:
    """Send critical health alert when trust health score drops below threshold."""
    
    health_link = f"{APP_URL}/trust-health?portfolio={portfolio_id}"
    
    # Build issues list HTML
    issues_html = ""
    for issue in critical_issues[:5]:  # Limit to 5 issues
        issues_html += f"""
        <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid rgba(239, 68, 68, 0.2);">
                <p style="color: #EF4444; font-size: 14px; margin: 0;">⚠️ {issue.get('title', 'Unknown Issue')}</p>
                <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 4px 0 0;">{issue.get('description', '')}</p>
            </td>
        </tr>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0f1c;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0f1c; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111827; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.4);">
                        <tr>
                            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(239, 68, 68, 0.2); background-color: rgba(239, 68, 68, 0.1);">
                                <div style="font-size: 24px; font-weight: 600; color: #EF4444;">
                                    🚨 Critical Health Alert
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 32px;">
                                <p style="color: #ffffff; font-size: 16px; margin: 0 0 16px;">
                                    Hello {recipient_name},
                                </p>
                                <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin: 0 0 24px; line-height: 1.6;">
                                    The health score for <strong style="color: #ffffff;">&ldquo;{portfolio_name}&rdquo;</strong> has dropped to a critical level and requires immediate attention.
                                </p>
                                
                                <!-- Health Score Badge -->
                                <div style="text-align: center; margin-bottom: 24px;">
                                    <div style="display: inline-block; background-color: rgba(239, 68, 68, 0.2); border: 2px solid #EF4444; border-radius: 50%; width: 80px; height: 80px; line-height: 80px;">
                                        <span style="color: #EF4444; font-size: 28px; font-weight: 700;">{health_score}</span>
                                    </div>
                                    <p style="color: #EF4444; font-size: 14px; margin: 8px 0 0; font-weight: 600;">CRITICAL</p>
                                </div>
                                
                                <!-- Critical Issues -->
                                <div style="background-color: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
                                    <div style="padding: 12px; background-color: rgba(239, 68, 68, 0.1); border-bottom: 1px solid rgba(239, 68, 68, 0.2);">
                                        <p style="color: #EF4444; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Critical Issues Found</p>
                                    </div>
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        {issues_html}
                                    </table>
                                </div>
                                
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{health_link}" 
                                               style="display: inline-block; background-color: #EF4444; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px;">
                                                Review Issues Now
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 24px 32px; background-color: rgba(0,0,0,0.2); border-top: 1px solid rgba(239, 68, 68, 0.2);">
                                <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0; text-align: center;">
                                    This is an automated alert from Private Equity &amp; Trusts Health Monitoring.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    audit_metadata = {
        "portfolio_id": portfolio_id,
        "portfolio_name": portfolio_name,
        "health_score": health_score,
        "issues_count": len(critical_issues)
    }
    
    if not RESEND_API_KEY:
        logger.info(f"[SIMULATED EMAIL] Critical health alert to {recipient_email}")
        await log_email_audit("critical_health_alert", recipient_email, "simulated", None, audit_metadata, user_id)
        return {"status": "simulated", "email_id": None}
    
    params = {
        "from": SENDER_EMAIL,
        "to": [recipient_email],
        "subject": f"🚨 Critical: {portfolio_name} health score is {health_score}",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        message_id = email.get("id")
        await log_email_audit("critical_health_alert", recipient_email, "success", message_id, audit_metadata, user_id)
        return {"status": "success", "email_id": message_id}
    except Exception as e:
        logger.error(f"Failed to send critical health alert: {str(e)}")
        await log_email_audit("critical_health_alert", recipient_email, "error", None, {**audit_metadata, "error": str(e)}, user_id)
        return {"status": "error", "message": str(e)}


async def send_binder_ready_notification(
    recipient_email: str,
    recipient_name: str,
    binder_name: str,
    portfolio_name: str,
    download_link: str,
    page_count: int,
    user_id: Optional[str] = None
) -> dict:
    """Send notification when a binder export is ready for download."""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0f1c;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0f1c; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #111827; border-radius: 12px; border: 1px solid rgba(198, 168, 124, 0.2);">
                        <tr>
                            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(198, 168, 124, 0.1);">
                                <div style="font-size: 24px; font-weight: 600; color: #10B981;">
                                    📁 Binder Ready
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 32px;">
                                <p style="color: #ffffff; font-size: 16px; margin: 0 0 16px;">
                                    Hello {recipient_name},
                                </p>
                                <p style="color: rgba(255,255,255,0.8); font-size: 16px; margin: 0 0 24px; line-height: 1.6;">
                                    Your binder export for <strong style="color: #ffffff;">&ldquo;{portfolio_name}&rdquo;</strong> is ready for download.
                                </p>
                                
                                <!-- Binder Info Box -->
                                <div style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                                    <table width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                            <td style="padding-bottom: 12px;">
                                                <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0 0 4px; text-transform: uppercase;">Binder Name</p>
                                                <p style="color: #10B981; font-size: 16px; font-weight: 600; margin: 0;">{binder_name}</p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 0 0 4px; text-transform: uppercase;">Pages</p>
                                                <p style="color: #ffffff; font-size: 14px; margin: 0;">{page_count} pages</p>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{download_link}" 
                                               style="display: inline-block; background-color: #10B981; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 8px;">
                                                Download Binder
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 16px 0 0; text-align: center;">
                                    This download link will expire in 24 hours.
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 24px 32px; background-color: rgba(0,0,0,0.2); border-top: 1px solid rgba(198, 168, 124, 0.1);">
                                <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0; text-align: center;">
                                    This notification was sent from Private Equity &amp; Trusts.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    
    audit_metadata = {
        "binder_name": binder_name,
        "portfolio_name": portfolio_name,
        "page_count": page_count
    }
    
    if not RESEND_API_KEY:
        logger.info(f"[SIMULATED EMAIL] Binder ready notification to {recipient_email}")
        await log_email_audit("binder_ready", recipient_email, "simulated", None, audit_metadata, user_id)
        return {"status": "simulated", "email_id": None}
    
    params = {
        "from": SENDER_EMAIL,
        "to": [recipient_email],
        "subject": f"Your binder is ready: {binder_name}",
        "html": html_content
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        message_id = email.get("id")
        await log_email_audit("binder_ready", recipient_email, "success", message_id, audit_metadata, user_id)
        return {"status": "success", "email_id": message_id}
    except Exception as e:
        logger.error(f"Failed to send binder ready notification: {str(e)}")
        await log_email_audit("binder_ready", recipient_email, "error", None, {**audit_metadata, "error": str(e)}, user_id)
        return {"status": "error", "message": str(e)}

