import requests

def get_stripe_account_id(user_id):
    # Make a request to the user service to get the Stripe account ID
    response = requests.get(f"http://localhost:8000/users/{user_id}")
    if response.status_code == 200:
        print(response.json())
        return response.json()
    else:
        raise Exception("Failed to retrieve Stripe account ID")


def get_payment_logs_by_payment_intent_id(payment_intent_id):
    # Make a request to the payment service to get payment details by payment intent ID
    response = requests.get(f"https://personal-yzh5fzm9.outsystemscloud.com/Payments/rest/OutPaymentsAPI/GetPaymentsByPaymentIntentId?payment_intent_id=eq.{payment_intent_id}")
    if response.status_code == 200:
        print(response.json())
        return response.json()
    else:
        raise Exception("Failed to retrieve payment details")
    
def get_payment_logs_by_payment_id(payment_id):
    response = requests.get(f"https://personal-yzh5fzm9.outsystemscloud.com/Payments/rest/OutPaymentsAPI/GetPaymentsByPaymentId?payment_id=eq.{payment_id}")
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception("Failed to retrieve payment log")

def post_payment_log(payment_log_data):
    # Make a request to the payment service to create a new payment log
    response = requests.post("https://personal-yzh5fzm9.outsystemscloud.com/Payments/rest/OutPaymentsAPI/PostPayments", json=payment_log_data)
    if response.status_code in (200, 201):
        return response.json()
    else:
        raise Exception(f"Failed to create payment log: {response.status_code} {response.text}")
