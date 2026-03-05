from pydantic import BaseModel, AwareDatetime
from typing import Optional


class BidResponse(BaseModel):
    bid_id: str
    task_id: str
    bidder_id: Optional[str] = None
    bid_amount: float
    timestamp: AwareDatetime


class BidListResponse(BaseModel):
    bids: list[BidResponse]


class BidCreate(BaseModel):
    task_id: str
    bidder_id: Optional[str] = None
    bid_amount: float
    timestamp: AwareDatetime


class BidCurrentResponse(BaseModel):
    bid_amount: Optional[float] = None
    bidder_id: Optional[str] = None


class AuctionCreate(BaseModel):
    task_id: str
    auction_end_time: AwareDatetime
    starting_bid: float
