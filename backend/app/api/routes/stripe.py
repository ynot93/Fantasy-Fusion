from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Annotated
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_401_UNAUTHORIZED
from app.core.security import get_body
from app.core.config import settings
import stripe

router = APIRouter(prefix="/stripe", tags=["stripe, payments"])

@router.get("/create-payment-intent")
async def create_payment_intent(amount: int, user_id: str):
    try:
        # Amount must be in the smallest currency unit (e.g., cents for USD)
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency="usd",  # Or your desired currency
            automatic_payment_methods={"enabled": True},
            metadata={"user_id": user_id},
        )
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Withdrawals
@router.post("/onboard-user")
async def onboard_user(user_id: str):
    # 1. Create a Connected Account for the user
    account = stripe.Account.create(
        type='express',  # Use 'custom' or 'express'
        country='US',    # The user's country
        email=f"user_{user_id}@fantasyfusion.com",
        capabilities={
            'card_payments': {'requested': True},
            'transfers': {'requested': True},
        },
        metadata={'app_user_id': user_id}
    )

    # 2. Create an Account Link to redirect the user to Stripe's hosted onboarding
    account_link = stripe.AccountLink.create(
        account=account.id,
        refresh_url=f"{settings.MY_DOMAIN}/reauth",
        return_url=f"{settings.MY_DOMAIN}/success", # Where user is returned after setup
        type='account_onboarding',
    )
    
    # You would typically store the account.id in your database linked to user_id
    return {"stripe_account_id": account.id, "onboarding_url": account_link.url}

@router.post("/withdraw")
async def initiate_withdrawal(stripe_account_id: str, amount: int):
    # Ensure the user has enough balance in their in-app wallet before calling this.
    try:
        # Payouts transfer from your platform balance to the connected account's bank.
        payout = stripe.Payout.create(
            amount=amount,
            currency="usd",
            destination=stripe_account_id,
            # The 'stripe_account' header specifies which Connected Account the money is sent to
            # This is only required for platform-to-connected_account transfers (Direct Charges)
            # For standard payouts (Platform to Bank), use the 'destination' param above.
        )
        # Payouts are often asynchronous. Your app should wait for the 'payout.paid' webhook.
        return {"message": "Payout initiated.", "payout_id": payout.id}
    except Exception as e:
        # Handle exceptions like insufficient funds, invalid account, etc.
        raise HTTPException(status_code=500, detail=str(e))

#Webhook
@router.post("/webhook")
async def stripe_webhook(
    stripe_signature: Annotated[str, Header(alias="Stripe-Signature")],
    body: bytes = Depends(get_body),
):
    WEBHOOK_SECRET = settings.STRIPE_WEBHOOK_SECRET
    
    try:
        event = stripe.Webhook.construct_event(
            payload=body, sig_header=stripe_signature, secret=WEBHOOK_SECRET
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=str(e))
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=HTTP_401_UNAUTHORIZED, detail=str(e))

    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        intent = event['data']['object']
        user_id = intent['metadata']['user_id']
        amount = intent['amount'] / 100
        # CRITICAL: Credit the user's in-app balance in your database
        print(f"Deposit Successful: User {user_id} credited ${amount}")
        
    elif event['type'] == 'payment_intent.payment_failed':
        # Log failure and notify user if necessary
        print(f"Deposit Failed: {event['data']['object']['id']}")
        
    elif event['type'] == 'payout.paid':
        payout = event['data']['object']
        # CRITICAL: Confirm withdrawal is complete. Update the transaction status in your database.
        print(f"Withdrawal Successful: Payout {payout['id']} paid to bank.")
        
    elif event['type'] == 'account.updated':
        account = event['data']['object']
        # CRITICAL: Check the 'charges_enabled' and 'payouts_enabled' status
        if account['payouts_enabled']:
            # User is now fully onboarded and can receive withdrawals
            print(f"Account {account['id']} is now enabled for payouts.")

    # Return a 200 to acknowledge receipt of the event
    return {"status": "success"}