from pydantic import BaseModel, AwareDatetime

class AuctionCreateRequest(BaseModel):
    task_id: str
    starting_bid: float
    auction_end_time: AwareDatetime


class TaskUpdateRequest(BaseModel):
    task_id: str
    title: str | None = None
    description: str | None = None
    freelancer_id: str | None = None
    payment_id: str | None = None
    auction_status: str | None = None
    auction_start_time: str | None = None
    auction_end_time: str | None = None