import os
from fastapi import FastAPI, HTTPException
import stripe
from dotenv import load_dotenv, find_dotenv
from schema import ReleasePayment, CapturePayment, CreateConnectedAccount
import uvicorn

load_dotenv(find_dotenv())
stripe.api_key = os.getenv("STRIPE_API_KEY")


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
        # In production, these URLs should be your actual frontend routes that handle the onboarding flow
        refresh_url="https://yourapp.com/onboarding/retry",
        return_url="https://yourapp.com/onboarding/complete",
        type="account_onboarding",
    )

    return {"url": link["url"], "stripe_connected_account_id": account["id"]}      


@app.post("/payment/capture-payment")
def capture_payment_intent(payment_data: CapturePayment):
    payment_intent = stripe.PaymentIntent.create(
        amount=int(payment_data.starting_bid * 100),  # Convert to cents
        currency="sgd",
        automatic_payment_methods={"enabled": True, "allow_redirects": "never"},
        metadata={
            "client_id": payment_data.client_id,
            "title": payment_data.title,
            "description": payment_data.description,
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

    # Refund remaining amount back to client
    refund = stripe.Refund.create(
        payment_intent=data.payment_intent_id,
        amount=refund_amount,
    )

    return {"transfer_id": transfer["id"], "refund_id": refund["id"]}


@app.post("/payment/refund-payment")
def refund_payment(data: ReleasePayment):
    # Refund entire amount back to client
    refund = stripe.Refund.create(
        payment_intent=data.payment_intent_id,
        amount=int(data.amount * 100),  # Convert to cents
    )

    return {"refund_id": refund["id"]}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8011)
