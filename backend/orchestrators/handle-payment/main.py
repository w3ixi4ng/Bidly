import httpx
import logging
from fastapi import FastAPI, HTTPException, Request
from schema import ReleasePaymentData, RefundPaymentData, StartPaymentData
import stripe
from dotenv import load_dotenv, find_dotenv
import os

load_dotenv(find_dotenv())
stripe.api_key = os.getenv("STRIPE_API_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

PAYMENT_URL = "http://payment:8011"
CREATE_TASK_URL = "http://create-task:8009"

logger = logging.getLogger(__name__)

app = FastAPI()

@app.post("/handle-payment/capture")
async def capture_payment(payment_data: StartPaymentData):
    try:
        # call payment service to connect to stripe and create a payment intent and pass task data as metadata
        # return payment intent client secret to frontend to complete payment

        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"{PAYMENT_URL}/payment/capture-payment", 
                json = payment_data.model_dump(mode="json")
            )

            res.raise_for_status()
            payment_intent = res.json()

        return {"client_secret": payment_intent["client_secret"]}
    
        # the following is depending how much you want to show to the client
        # except httpx.HTTPStatusError as e:
        # raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/handle-payment/release")
async def release_payment(payment_data: ReleasePaymentData):
    # get user stripe account id from user_id
    # get payment intent id from payment log using payment_id
    # call payment service to release payment to winner and refund remaining amount to client
    # update payment log with payment status
    
    try:
        async with httpx.AsyncClient() as client:
            # get freelancer's stripe connected account id from users service
            user_res = await client.get(f"http://users:8004/users/{payment_data.freelancer_id}")
            
            user_res.raise_for_status()
            stripe_connected_account_id = user_res.json().get("stripe_connected_account_id")

            if not stripe_connected_account_id:
                raise HTTPException(status_code=400, detail="Freelancer does not have a Stripe connected account")

            # payment_id on the task is the Stripe payment_intent_id
            # call payment service to release payment to winner and refund remaining amount to client
            release_res = await client.post(f"{PAYMENT_URL}/payment/release-payment", json={
                "payment_intent_id": payment_data.payment_id,
                "stripe_connected_account_id": stripe_connected_account_id,
                "amount": payment_data.amount,
            })
            
            release_res.raise_for_status()

        return {"status": "released"}

    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/handle-payment/refund")
async def refund_payment(payment_data: RefundPaymentData):
    """Full refund of the captured payment back to the client."""
    try:
        async with httpx.AsyncClient() as client:
            refund_res = await client.post(f"{PAYMENT_URL}/payment/refund-payment", json={
                "payment_intent_id": payment_data.payment_id,
            })
            refund_res.raise_for_status()

        return {"status": "refunded"}

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/handle-payment/stripe/webhook")
async def stripe_webhook(request: Request):
    """
    Stripe webhook handler — acts as a safety net.
    If the frontend successfully created the task, the create-task endpoint's
    idempotency check (payment_id lookup) will prevent duplicates.
    If the frontend failed (e.g. browser closed), this creates the task.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not STRIPE_WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET is not configured")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        metadata = payment_intent.get("metadata", {})

        # Only process if this PaymentIntent has our task metadata
        if not metadata.get("client_id") or not metadata.get("title"):
            return {"status": "ignored", "reason": "not a task payment"}

        # Call create-task orchestrator (its idempotency check prevents duplicates)
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(f"{CREATE_TASK_URL}/create-task", json={
                    "title": metadata["title"],
                    "description": metadata.get("description", ""),
                    "requirements": [],
                    "category": metadata.get("category", "Other"),
                    "client_id": metadata["client_id"],
                    "payment_id": payment_intent["id"],
                    "starting_bid": float(metadata.get("starting_bid", 0)),
                    "auction_start_time": metadata.get("auction_start_time"),
                    "auction_end_time": metadata.get("auction_end_time"),
                })

                if res.status_code in (200, 201):
                    task = res.json()
                    already = task.get("already_exists", False)
                    logger.info(f"Webhook: task {'already existed' if already else 'created'} for {payment_intent['id']}")
                else:
                    logger.error(f"Webhook: create-task failed ({res.status_code}): {res.text}")
        except Exception as e:
            logger.error(f"Webhook: failed to call create-task: {e}")

    return {"status": "success"}