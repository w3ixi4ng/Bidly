import os
import math
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Request
import stripe
from dotenv import load_dotenv, find_dotenv
from schema import ReleasePayment, RefundPayment, CapturePayment, CreateConnectedAccount, CaptureFeaturedFee
import uvicorn

load_dotenv(find_dotenv())
stripe.api_key = os.getenv("STRIPE_API_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


app = FastAPI()


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.post("/payment/create-connected-account")
def create_connected_account(data: CreateConnectedAccount, request: Request):
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "127.0.0.1")
    # Use the first IP if x-forwarded-for contains multiple
    if "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
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
        tos_acceptance={"date": int(datetime.now().timestamp()), "ip": client_ip},
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


FEATURED_FEE_CENTS = int(os.getenv("FEATURED_FEE_CENTS", "500"))  # $5 default
STRIPE_FEE_PERCENT = float(os.getenv("STRIPE_FEE_PERCENT", "0.034"))  # 3.4%
STRIPE_FEE_FIXED_CENTS = int(os.getenv("STRIPE_FEE_FIXED_CENTS", "50"))  # $0.50 SGD

@app.post("/payment/capture-payment")
def capture_payment_intent(payment_data: CapturePayment):
    if payment_data.auction_end_time <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Auction has already ended")

    base_amount = int(payment_data.starting_bid * 100)  # Convert to cents
    featured_fee = FEATURED_FEE_CENTS if payment_data.is_featured else 0
    subtotal = base_amount + featured_fee

    # Pass Stripe processing fee to the client
    # Formula: total = (subtotal + fixed_fee) / (1 - percent_fee)
    # This ensures after Stripe takes their cut, we receive exactly subtotal
    total_amount = math.ceil((subtotal + STRIPE_FEE_FIXED_CENTS) / (1 - STRIPE_FEE_PERCENT))
    stripe_fee = total_amount - subtotal

    payment_intent = stripe.PaymentIntent.create(
        amount=total_amount,
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
            "auction_status": "pending",
            "is_featured": str(payment_data.is_featured),
            "featured_fee": featured_fee,
            "stripe_fee": stripe_fee,
        }
    )

    return {"client_secret": payment_intent.client_secret}


@app.post("/payment/capture-featured-fee")
def capture_featured_fee(data: CaptureFeaturedFee):
    """Create a PaymentIntent for the $5 featured listing upgrade fee (+ Stripe processing fee)."""
    featured_fee = FEATURED_FEE_CENTS
    total_amount = int((featured_fee + STRIPE_FEE_FIXED_CENTS) / (1 - STRIPE_FEE_PERCENT))
    stripe_fee = total_amount - featured_fee

    payment_intent = stripe.PaymentIntent.create(
        amount=total_amount,
        currency="sgd",
        automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
        metadata={
            "type": "featured_upgrade",
            "task_id": data.task_id,
            "client_id": data.client_id,
            "featured_fee": featured_fee,
            "stripe_fee": stripe_fee,
        }
    )

    return {"client_secret": payment_intent.client_secret}


# this release and refund at same time
@app.post("/payment/release-payment")
def release_payment(data: ReleasePayment):

    # get the payment intent details to determine the total amount paid by the client
    payment_intent = stripe.PaymentIntent.retrieve(data.payment_intent_id)

    if payment_intent["status"] != "succeeded":
        raise HTTPException(status_code=400, detail="Payment not successful")

    currency = payment_intent["currency"]
    metadata = payment_intent.get("metadata", {})
    starting_bid_cents = int(float(metadata.get("starting_bid", 0)) * 100)
    winning_bid_cents = int(data.amount * 100)  # Convert to cents

    # Platform commission: deduct from freelancer payout, retained by Bidly
    commission_rate = float(os.getenv("COMMISSION_RATE", "0.10"))
    commission_amount = int(winning_bid_cents * commission_rate)
    freelancer_payout = winning_bid_cents - commission_amount

    # Only refund the difference between starting bid and winning bid
    # Stripe fee and featured fee are non-refundable
    refund_amount = starting_bid_cents - winning_bid_cents

    # Transfer winning bid minus commission to winner's connected Stripe account
    transfer = stripe.Transfer.create(
        amount=freelancer_payout,
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

    return {
        "transfer_id": transfer["id"],
        "refund_id": refund_id,
        "commission_amount": commission_amount / 100,
        "freelancer_payout": freelancer_payout / 100,
        "commission_rate": commission_rate,
    }


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
    # Refund only the starting bid amount back to client
    # Stripe processing fee and featured fee are non-refundable
    payment_intent = stripe.PaymentIntent.retrieve(data.payment_intent_id)
    metadata = payment_intent.get("metadata", {})
    starting_bid_cents = int(float(metadata.get("starting_bid", 0)) * 100)

    refund = stripe.Refund.create(
        payment_intent=data.payment_intent_id,
        amount=starting_bid_cents,
    )

    return {"refund_id": refund["id"]}


@app.get("/payment/admin/recent-payments")
def list_recent_payments(limit: int = 10):
    """Admin: list recent PaymentIntents with full breakdown."""
    intents = stripe.PaymentIntent.list(limit=limit)
    results = []
    for pi in intents["data"]:
        meta = pi.get("metadata", {})
        results.append({
            "id": pi["id"],
            "amount": pi["amount"] / 100,
            "currency": pi["currency"],
            "status": pi["status"],
            "created": pi["created"],
            "metadata": {
                "title": meta.get("title"),
                "client_id": meta.get("client_id"),
                "starting_bid": meta.get("starting_bid"),
                "is_featured": meta.get("is_featured"),
                "featured_fee": meta.get("featured_fee"),
                "stripe_fee": meta.get("stripe_fee"),
            },
        })
    return {"payments": results}


@app.get("/payment/admin/recent-transfers")
def list_recent_transfers(limit: int = 10):
    """Admin: list recent transfers to freelancers."""
    transfers = stripe.Transfer.list(limit=limit)
    results = []
    for t in transfers["data"]:
        results.append({
            "id": t["id"],
            "amount": t["amount"] / 100,
            "currency": t["currency"],
            "destination": t["destination"],
            "created": t["created"],
        })
    return {"transfers": results}


@app.get("/payment/admin/recent-refunds")
def list_recent_refunds(limit: int = 10):
    """Admin: list recent refunds."""
    refunds = stripe.Refund.list(limit=limit)
    results = []
    for r in refunds["data"]:
        results.append({
            "id": r["id"],
            "amount": r["amount"] / 100,
            "currency": r["currency"],
            "status": r["status"],
            "payment_intent": r["payment_intent"],
            "created": r["created"],
        })
    return {"refunds": results}


@app.get("/payment/admin/balance")
def get_balance():
    """Admin: get current Stripe account balance."""
    balance = stripe.Balance.retrieve()
    return {
        "available": [{"amount": b["amount"] / 100, "currency": b["currency"]} for b in balance["available"]],
        "pending": [{"amount": b["amount"] / 100, "currency": b["currency"]} for b in balance["pending"]],
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8011)
