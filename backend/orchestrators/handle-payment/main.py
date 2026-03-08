from fastapi import FastAPI, HTTPException, Request
from schema import StartPaymentData
import service
import stripe
from dotenv import load_dotenv, find_dotenv
import os

load_dotenv(find_dotenv())
TEMP_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

app = FastAPI()

@app.post("/handle-payment")
async def start_payment_before_create_task(payment_data: StartPaymentData):
    # get user stripe account id from user_id
    try:
        response = service.get_stripe_account_id(payment_data.client_id)
        stripe_connected_account_id = response.get("stripe_connected_account_id")
        if not stripe_connected_account_id:
            raise HTTPException(status_code=400, detail="User does not have a connected Stripe account")
        
        # then call payment service to connect to stripe and create a payment intent and pass task as metadata
        # payment svs to not yet setup
        # payment_intent = service.create_payment_intent(stripe_connected_account_id, payment_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


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
        # publish to create task
    
    return {"status": "success"}