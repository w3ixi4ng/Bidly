from pydantic import AwareDatetime, BaseModel, ConfigDict
from typing import Literal

CATEGORY_LITERAL = Literal["Design", "Development", "Writing", "Marketing", "Other"]

class CapturePayment(BaseModel):
    model_config = ConfigDict(extra="allow")

    title: str
    description: str
    category: CATEGORY_LITERAL = "Other"
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

class RefundPayment(BaseModel):
    payment_intent_id: str
