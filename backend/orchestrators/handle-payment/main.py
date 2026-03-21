import httpx
import logging
from fastapi import FastAPI, HTTPException, Request
from schema import ReleasePaymentData, RefundPaymentData, StartPaymentData
import stripe
from dotenv import load_dotenv, find_dotenv
import os
from service import post_payment_log, get_payment_logs_by_payment_id, update_payment_log_status

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
        # Look up payment_intent_id from OutSystems payment log using the payment UUID
        payment_log = get_payment_logs_by_payment_id(payment_data.payment_id)
        payment_intent_id = payment_log.get("payment_intent_id")
        if not payment_intent_id:
            raise HTTPException(status_code=404, detail="Payment log not found or missing payment_intent_id")

        async with httpx.AsyncClient() as client:
            # get freelancer's stripe connected account id from users service
            user_res = await client.get(f"http://users:8004/users/{payment_data.freelancer_id}")
            user_res.raise_for_status()
            stripe_connected_account_id = user_res.json().get("stripe_connected_account_id")

            if not stripe_connected_account_id:
                raise HTTPException(status_code=400, detail="Freelancer does not have a Stripe connected account")

            release_res = await client.post(f"{PAYMENT_URL}/payment/release-payment", json={
                "payment_intent_id": payment_intent_id,
                "stripe_connected_account_id": stripe_connected_account_id,
                "amount": payment_data.amount,
            })
            release_res.raise_for_status()

        try:
            update_payment_log_status(payment_data.payment_id, "released")
        except Exception as e:
            logger.error(f"Release succeeded but failed to update payment log: {e}")

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
        # Look up payment_intent_id from OutSystems payment log using the payment UUID
        payment_log = get_payment_logs_by_payment_id(payment_data.payment_id)
        payment_intent_id = payment_log.get("payment_intent_id")
        if not payment_intent_id:
            raise HTTPException(status_code=404, detail="Payment log not found or missing payment_intent_id")

        async with httpx.AsyncClient() as client:
            refund_res = await client.post(f"{PAYMENT_URL}/payment/refund-payment", json={
                "payment_intent_id": payment_intent_id,
            })
            refund_res.raise_for_status()

        try:
            update_payment_log_status(payment_data.payment_id, "refunded")
        except Exception as e:
            logger.error(f"Refund succeeded but failed to update payment log: {e}")

        return {"status": "refunded"}

    except HTTPException:
        raise
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/handle-payment/stripe/webhook")
async def stripe_webhook(request: Request):
    """
    Stripe webhook handler for payment_intent.succeeded events.
    Logs the payment to OutSystems and creates the task via the create-task orchestrator.
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

        # Log payment to OutSystems and get the payment_id UUID
        payment_id = None
        try:
            payment_log = post_payment_log({
                "payment_intent_id": payment_intent["id"],
                "amount": payment_intent["amount"] / 100,
                "client_id": metadata["client_id"],
                "freelancer_id": None,
                "payment_status": "captured",
            })
            payment_id = payment_log.get("payment_id")
        except Exception as e:
            logger.error(f"Webhook: failed to log payment: {e}")

        if not payment_id:
            logger.error(f"Webhook: no payment_id returned from payment log, aborting task creation")
            return {"status": "error", "reason": "payment log failed"}

        # Call create-task orchestrator (its idempotency check prevents duplicates)
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(f"{CREATE_TASK_URL}/create-task", json={
                    "title": metadata["title"],
                    "description": metadata.get("description", ""),
                    "requirements": [],
                    "category": metadata.get("category", "Other"),
                    "client_id": metadata["client_id"],
                    "payment_id": payment_id,
                    "payment_intent_id": payment_intent["id"],
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