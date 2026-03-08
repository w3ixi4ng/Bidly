from pydantic import AwareDatetime, BaseModel

class StartPaymentData(BaseModel):
    title: str
    description: str
    client_id: str
    starting_bid: float
    auction_start_time: AwareDatetime
    auction_end_time: AwareDatetime
