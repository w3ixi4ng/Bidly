from pydantic import BaseModel
from typing import Optional


class ProcessWinnerRequest(BaseModel):
    task_id: str


class WinnerResponse(BaseModel):
    bidder_id: str
    bid_amount: float


class NoWinnerResponse(BaseModel):
    auction_status: str = "no-bids"


class UpdateTaskRequest(BaseModel):
    freelancer_id: Optional[str] = None
    auction_status: str