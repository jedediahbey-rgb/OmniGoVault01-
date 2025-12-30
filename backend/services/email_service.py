"""Email Service for Workspace Invitations using Resend"""
import os
import asyncio
import logging
import resend
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Initialize Resend with API key
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
APP_URL = os.environ.get("APP_URL", "https://trustshare.preview.emergentagent.com")

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info("Resend email service initialized")
else:
    logger.warning("RESEND_API_KEY not set - emails will be simulated")


async def send_workspace_invitation_email(
    recipient_email: str,
    inviter_name: str,
    vault_name: str,
    role: str,
    vault_id: str
) -> dict:
    """
    Send a workspace invitation email to a new participant.
    
    Args:
        recipient_email: Email address of the invitee
        inviter_name: Name of the person sending the invitation
        vault_name: Name of the workspace/vault
        role: Role being assigned (e.g., TRUSTEE, BENEFICIARY)
        vault_id: ID of the vault for the invitation link
    
    Returns:
        dict with status and email_id if successful
    """
    # Format role for display
    role_display = role.replace("_", " ").title()
    
    # Create invitation link - user will auth via Google then be redirected to workspace
    invitation_link = f"{APP_URL}/vault/workspaces/{vault_id}?invited=true"
    
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
                                    🔐 Private Equity & Trusts
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
                                    <strong style="color: #ffffff;">"{vault_name}"</strong> as a 
                                    <strong style="color: #C6A87C;">{role_display}</strong>.
                                </p>
                                
                                <!-- Role Badge -->
                                <div style="background-color: rgba(198, 168, 124, 0.1); border: 1px solid rgba(198, 168, 124, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                    <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                                        Your Role
                                    </p>
                                    <p style="color: #C6A87C; font-size: 18px; font-weight: 600; margin: 0;">
                                        {role_display}
                                    </p>
                                </div>
                                
                                <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 24px; line-height: 1.6;">
                                    As a {role_display}, you'll be able to view documents, participate in governance workflows, 
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
                                
                                <p style="color: rgba(255,255,255,0.5); font-size: 13px; margin: 0; line-height: 1.5;">
                                    If you don't have an account yet, you'll be prompted to sign in with Google when you click the button above.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 24px 32px; background-color: rgba(0,0,0,0.2); border-top: 1px solid rgba(198, 168, 124, 0.1);">
                                <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0; text-align: center;">
                                    This invitation was sent by {inviter_name} via Private Equity & Trusts.<br>
                                    If you didn't expect this email, you can safely ignore it.
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

Your Role: {role_display}

As a {role_display}, you'll be able to view documents, participate in governance workflows, and collaborate with other stakeholders.

Accept your invitation: {invitation_link}

If you don't have an account yet, you'll be prompted to sign in with Google.

---
This invitation was sent by {inviter_name} via Private Equity & Trusts.
    """
    
    # If no API key, simulate the email
    if not RESEND_API_KEY:
        logger.info(f"[SIMULATED EMAIL] Invitation to {recipient_email} for vault {vault_name}")
        return {
            "status": "simulated",
            "message": f"Email simulated (no API key). Would send to {recipient_email}",
            "email_id": f"sim_{datetime.now(timezone.utc).isoformat()}"
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
        logger.info(f"Invitation email sent to {recipient_email} for vault {vault_name}")
        return {
            "status": "success",
            "message": f"Email sent to {recipient_email}",
            "email_id": email.get("id")
        }
    except Exception as e:
        logger.error(f"Failed to send invitation email to {recipient_email}: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "email_id": None
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
