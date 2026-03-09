from pydantic import AwareDatetime, BaseModel

class CapturePayment(BaseModel):
    stripe_connected_account_id: str
    title: str
    description: str
    client_id: str
    starting_bid: float
    auction_start_time: AwareDatetime
    auction_end_time: AwareDatetime

class CreateConnectedAccount(BaseModel):
    email: str

class ReleasePayment(BaseModel):
    payment_intent_id: str
    stripe_connected_account_id: str
    amount: float
