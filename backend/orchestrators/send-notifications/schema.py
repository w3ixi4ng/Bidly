from pydantic import BaseModel

class AuctionEndNotification(BaseModel):
    client_id: str
    freelancer_id: str
    task_title: str
    task_description: str
    amount: float

class BidOutbidNotification(BaseModel):
    task_id: str
    previous_bidder_id: str
    bid_amount: float
    
