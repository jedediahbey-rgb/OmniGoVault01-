"""Billing Service - Stripe integration for payments"""
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import os
import uuid

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionRequest, 
    CheckoutSessionResponse,
    CheckoutStatusResponse
)
from services.subscription_service import SubscriptionService
from services.entitlement_service import EntitlementService

logger = logging.getLogger(__name__)


class BillingService:
    """Service for Stripe billing integration"""
    
    def __init__(
        self, 
        db: AsyncIOMotorDatabase,
        subscription_service: SubscriptionService,
        entitlement_service: EntitlementService
    ):
        self.db = db
        self.subscription_service = subscription_service
        self.entitlement_service = entitlement_service
        self.stripe_api_key = os.environ.get("STRIPE_API_KEY")
        self._stripe_checkout: Optional[StripeCheckout] = None
    
    def _get_stripe_checkout(self, webhook_url: str) -> StripeCheckout:
        """Get or create Stripe checkout instance"""
        if not self.stripe_api_key:
            raise ValueError("STRIPE_API_KEY not configured")
        return StripeCheckout(api_key=self.stripe_api_key, webhook_url=webhook_url)
    
    async def create_checkout_session(
        self,
        account_id: str,
        user_id: str,
        plan_id: str,
        billing_cycle: str,
        origin_url: str,
        host_url: str
    ) -> Dict:
        """Create a Stripe checkout session for subscription"""
        
        # Get the plan
        plan = await self.subscription_service.get_plan(plan_id)
        if not plan:
            raise ValueError(f"Plan {plan_id} not found")
        
        # Get the appropriate Stripe price ID
        if billing_cycle == "yearly":
            stripe_price_id = plan.get("stripe_price_id_yearly")
            amount = plan.get("price_yearly", 0)
        else:
            stripe_price_id = plan.get("stripe_price_id_monthly")
            amount = plan.get("price_monthly", 0)
        
        # Build URLs
        success_url = f"{origin_url}/billing?session_id={{CHECKOUT_SESSION_ID}}&success=true"
        cancel_url = f"{origin_url}/billing?canceled=true"
        webhook_url = f"{host_url}api/billing/webhook/stripe"
        
        # Create checkout instance
        stripe_checkout = self._get_stripe_checkout(webhook_url)
        
        # Prepare metadata
        metadata = {
            "account_id": account_id,
            "user_id": user_id,
            "plan_id": plan_id,
            "billing_cycle": billing_cycle,
            "plan_name": plan["name"]
        }
        
        # Create checkout request
        if stripe_price_id:
            # Use Stripe price ID for recurring subscriptions
            checkout_request = CheckoutSessionRequest(
                stripe_price_id=stripe_price_id,
                quantity=1,
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata
            )
        else:
            # Use amount for one-time or when no price ID configured
            checkout_request = CheckoutSessionRequest(
                amount=float(amount),
                currency="usd",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata
            )
        
        # Create the session
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Record the transaction
        now = datetime.now(timezone.utc).isoformat()
        transaction = {
            "id": f"txn_{uuid.uuid4().hex[:12]}",
            "account_id": account_id,
            "user_id": user_id,
            "stripe_session_id": session.session_id,
            "amount": float(amount),
            "currency": "usd",
            "status": "pending",
            "payment_type": "subscription",
            "metadata": metadata,
            "created_at": now,
            "updated_at": now
        }
        await self.db.payment_transactions.insert_one(transaction)
        
        logger.info(f"Created checkout session {session.session_id} for account {account_id}, plan {plan_id}")
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id
        }
    
    async def get_checkout_status(self, session_id: str, host_url: str) -> Dict:
        """Get the status of a checkout session"""
        webhook_url = f"{host_url}api/billing/webhook/stripe"
        stripe_checkout = self._get_stripe_checkout(webhook_url)
        
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction record
        payment_status = "pending"
        if status.payment_status == "paid":
            payment_status = "paid"
        elif status.status == "expired":
            payment_status = "expired"
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Find and update transaction (only if not already processed)
        transaction = await self.db.payment_transactions.find_one(
            {"stripe_session_id": session_id}
        )
        
        if transaction and transaction.get("status") != "paid":
            await self.db.payment_transactions.update_one(
                {"stripe_session_id": session_id},
                {"$set": {
                    "status": payment_status,
                    "updated_at": now
                }}
            )
            
            # If payment successful, activate the subscription
            if payment_status == "paid":
                await self._activate_subscription_from_checkout(
                    transaction["account_id"],
                    transaction["metadata"]["plan_id"],
                    transaction["metadata"].get("billing_cycle", "monthly"),
                    session_id
                )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "metadata": status.metadata
        }
    
    async def _activate_subscription_from_checkout(
        self,
        account_id: str,
        plan_id: str,
        billing_cycle: str,
        stripe_session_id: str
    ):
        """Activate subscription after successful payment"""
        from datetime import timedelta
        
        now = datetime.now(timezone.utc)
        
        # Calculate period end
        if billing_cycle == "yearly":
            period_end = now + timedelta(days=365)
        else:
            period_end = now + timedelta(days=30)
        
        # Update subscription
        await self.subscription_service.update_subscription_from_stripe(
            account_id=account_id,
            stripe_subscription_id=stripe_session_id,  # Use session ID for now
            plan_id=plan_id,
            status="active",
            current_period_start=now,
            current_period_end=period_end
        )
        
        logger.info(f"Activated subscription for account {account_id} to plan {plan_id}")
    
    async def handle_webhook(
        self,
        webhook_body: bytes,
        stripe_signature: str,
        host_url: str
    ) -> Dict:
        """Handle Stripe webhook events"""
        webhook_url = f"{host_url}api/billing/webhook/stripe"
        stripe_checkout = self._get_stripe_checkout(webhook_url)
        
        try:
            webhook_response = await stripe_checkout.handle_webhook(
                webhook_body,
                stripe_signature
            )
            
            event_type = webhook_response.event_type
            session_id = webhook_response.session_id
            metadata = webhook_response.metadata
            
            logger.info(f"Received webhook: {event_type}, session: {session_id}")
            
            # Handle different event types
            if event_type in ["checkout.session.completed", "payment_intent.succeeded"]:
                if metadata and "account_id" in metadata:
                    await self._activate_subscription_from_checkout(
                        metadata["account_id"],
                        metadata.get("plan_id"),
                        metadata.get("billing_cycle", "monthly"),
                        session_id
                    )
            
            elif event_type == "customer.subscription.deleted":
                if metadata and "account_id" in metadata:
                    await self.subscription_service.cancel_subscription(
                        metadata["account_id"],
                        at_period_end=False
                    )
            
            elif event_type == "invoice.payment_failed":
                if metadata and "account_id" in metadata:
                    await self.subscription_service.handle_payment_failed(
                        metadata["account_id"]
                    )
            
            return {
                "received": True,
                "event_type": event_type,
                "session_id": session_id
            }
            
        except Exception as e:
            logger.error(f"Webhook handling error: {e}")
            return {"received": True, "error": str(e)}


# Singleton
billing_service: Optional[BillingService] = None


def get_billing_service() -> BillingService:
    if billing_service is None:
        raise RuntimeError("BillingService not initialized")
    return billing_service


def init_billing_service(
    db: AsyncIOMotorDatabase,
    subscription_service: SubscriptionService,
    entitlement_service: EntitlementService
) -> BillingService:
    global billing_service
    billing_service = BillingService(db, subscription_service, entitlement_service)
    return billing_service
