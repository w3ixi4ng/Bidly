from pydantic import BaseModel, AwareDatetime


class CreateTaskRequest(BaseModel):
    title: str
    description: str
    client_id: str
    payment_id: str
    starting_bid: float
    auction_start_time: AwareDatetime
    auction_end_time: AwareDatetime