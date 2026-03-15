from pydantic import AwareDatetime, BaseModel, ConfigDict
from typing import Literal

CATEGORY_LITERAL = Literal["Design", "Development", "Writing", "Marketing", "Other"]

class StartPaymentData(BaseModel):
    model_config = ConfigDict(extra="allow")

    title: str
    description: str
    category: CATEGORY_LITERAL = "Other"
    client_id: str
    starting_bid: float
    auction_start_time: AwareDatetime
    auction_end_time: AwareDatetime

class ReleasePaymentData(BaseModel):
    payment_id: str
    freelancer_id: str
    amount: float
    client_id: str

class RefundPaymentData(BaseModel):
    payment_id: str