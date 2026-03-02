from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime

class AuctionResponse(BaseModel):
    auction_id: str
    task_id: str
    bidder_id: Optional[str] = None
    bid_amount: float
    timestamp: datetime


class AuctionListResponse(BaseModel):
    auctions: list[AuctionResponse]


class AuctionCreate(BaseModel):
    task_id: str
    bidder_id: Optional[str] = None
    bid_amount: float
    timestamp: datetime


