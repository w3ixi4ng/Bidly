from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BidResponse(BaseModel):
    bid_id: str
    task_id: str
    bidder_id: Optional[str] = None
    bid_amount: float
    timestamp: datetime


class BidListResponse(BaseModel):
    bids: list[BidResponse]


class BidCreate(BaseModel):
    task_id: str
    bidder_id: Optional[str] = None
    bid_amount: float
    timestamp: datetime


class BidCurrentResponse(BaseModel):
    bid_amount: Optional[float] = None
    bidder_id: Optional[str] = None


class AuctionCreate(BaseModel):
    task_id: str
    auction_end_time: datetime
    starting_bid: float