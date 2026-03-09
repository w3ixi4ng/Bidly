from fastapi import FastAPI, HTTPException, Request
from schema import ReleasePaymentData, StartPaymentData
import service
import stripe
from dotenv import load_dotenv, find_dotenv
import os

load_dotenv(find_dotenv())
TEMP_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

app = FastAPI()

@app.post("/handle-payment/capture")
async def capture_payment(payment_data: StartPaymentData):
    try:
        # call payment service to connect to stripe and create a payment intent and pass task data as metadata
        # payment svc has been created already
        # return payment intent client secret to frontend to complete payment
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    

@app.post("/handle-payment/release")
async def release_payment(payment_data: ReleasePaymentData):
    # get user stripe account id from user_id
    # get payment intent id from payment log using payment_id
    # call payment service to release payment to winner and refund remaining amount to client
    # update payment log with payment status


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