import httpx
from fastapi import FastAPI, HTTPException, Request
from schema import ReleasePaymentData, RefundPaymentData, StartPaymentData
import service
import stripe
from dotenv import load_dotenv, find_dotenv
import os

load_dotenv(find_dotenv())
TEMP_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

PAYMENT_URL = "http://payment:8011"

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


# TODO: post to paymentlogs, and publish rabbitmq message to create task when payment success webhook is received from stripe
@app.post("/handle-payment/stripe/webhook")
async def payment_success_web_hook(request: Request):
    # handle stripe webhook for payment success
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, TEMP_WEBHOOK_SECRET
        )

    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail=str(e))
    
    if event["type"] == "payment_intent.succeeded":
        # post to payment logs if payment_intent_id does not exist

        if not service.get_payment_logs_by_payment_intent_id("payment_intent_id"):
            # create payment log
            service.post_payment_log({
                "payment_intent_id": "payment_intent_id",
                "amount": event["data"]["object"]["amount"],
                "payment_status": "captured",
                "client_id": event["data"]["object"]["metadata"]["client_id"],
            })
            pass

        # publish rabbitmq message to create task 
    
    return {"status": "success"}