import os
from fastapi import FastAPI, HTTPException
import stripe
from dotenv import load_dotenv, find_dotenv
from schema import ReleasePayment, RefundPayment, CapturePayment, CreateConnectedAccount
import uvicorn

load_dotenv(find_dotenv())
stripe.api_key = os.getenv("STRIPE_API_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


app = FastAPI()


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.post("/payment/create-connected-account")
def create_connected_account(data: CreateConnectedAccount):
    account = stripe.Account.create(
        country="SG",
        email=data.email,
        controller={
            "requirement_collection": "application",
            "fees": {"payer": "application"},
            "losses": {"payments": "application"},
            "stripe_dashboard": {"type": "none"},
        },
        capabilities={"transfers": {"requested": True}},
        tos_acceptance={"date": 1609798905, "ip": "8.8.8.8"},
    )

    link = stripe.AccountLink.create(
        account=account["id"],
        refresh_url=f"{FRONTEND_URL}/tasks",
        return_url=f"{FRONTEND_URL}/tasks",
        type="account_onboarding",
    )

    return {"url": link["url"], "stripe_connected_account_id": account["id"]}      


@app.get("/payment/account-status/{account_id}")
def get_account_status(account_id: str):
    """Check if a connected account has completed onboarding."""
    try:
        account = stripe.Account.retrieve(account_id)
        return {
            "account_id": account["id"],
            "charges_enabled": account["charges_enabled"],
            "payouts_enabled": account["payouts_enabled"],
            "details_submitted": account["details_submitted"],
        }
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=404, detail="Connected account not found")


@app.post("/payment/onboarding-link/{account_id}")
def create_onboarding_link(account_id: str):
    """Create a new onboarding link for an existing connected account."""
    try:
        link = stripe.AccountLink.create(
            account=account_id,
            refresh_url=f"{FRONTEND_URL}/tasks",
            return_url=f"{FRONTEND_URL}/tasks",
            type="account_onboarding",
        )
        return {"url": link["url"]}
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=404, detail="Connected account not found")


@app.post("/payment/capture-payment")
def capture_payment_intent(payment_data: CapturePayment):
    payment_intent = stripe.PaymentIntent.create(
        amount=int(payment_data.starting_bid * 100),  # Convert to cents
        currency="sgd",
        automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
        metadata={
            "client_id": payment_data.client_id,
            "title": payment_data.title[:500],
            "description": payment_data.description[:500],
            "category": payment_data.category,
            "auction_start_time": payment_data.auction_start_time.isoformat(),
            "auction_end_time": payment_data.auction_end_time.isoformat(),
            "starting_bid": payment_data.starting_bid,
            "auction_status": "pending"
        }
    )

    return payment_intent


# this release and refund at same time
@app.post("/payment/release-payment")
def release_payment(data: ReleasePayment):

    # get the payment intent details to determine the total amount paid by the client
    payment_intent = stripe.PaymentIntent.retrieve(data.payment_intent_id)

    if payment_intent["status"] != "succeeded":
        raise HTTPException(status_code=400, detail="Payment not successful")
    
    currency = payment_intent["currency"]
    total_paid = payment_intent["amount_received"]
    winning_amount = int(data.amount * 100)  # Convert to cents
    refund_amount = total_paid - winning_amount

    # Transfer winning bid to winner's connected Stripe account
    transfer = stripe.Transfer.create(
        amount=winning_amount,
        currency=currency,
        destination=data.stripe_connected_account_id,
        transfer_group=data.payment_intent_id,
    )

    # Refund remaining amount back to client (skip if nothing to refund)
    refund_id = None
    if refund_amount >= 1:
        refund = stripe.Refund.create(
            payment_intent=data.payment_intent_id,
            amount=refund_amount,
        )
        refund_id = refund["id"]

    return {"transfer_id": transfer["id"], "refund_id": refund_id}


@app.get("/payment/verify/{payment_intent_id}")
def verify_payment(payment_intent_id: str):
    """Verify a PaymentIntent's status directly with Stripe."""
    try:
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        return {
            "payment_intent_id": payment_intent["id"],
            "status": payment_intent["status"],
            "amount": payment_intent["amount"],
            "metadata": payment_intent.get("metadata", {}),
        }
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=404, detail="PaymentIntent not found")


@app.post("/payment/refund-payment")
def refund_payment(data: RefundPayment):
    # Full refund back to client
    refund = stripe.Refund.create(
        payment_intent=data.payment_intent_id,
    )

    return {"refund_id": refund["id"]}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8011)
