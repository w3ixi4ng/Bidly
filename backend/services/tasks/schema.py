from pydantic import BaseModel, AwareDatetime
from typing import Literal, Optional


class TaskResponse(BaseModel):
    task_id: str
    title: str
    description: str
    client_id: str
    freelancer_id: Optional[str] = None
    payment_intent_id: str
    starting_bid: float
    auction_start_time: AwareDatetime
    auction_end_time: AwareDatetime
    auction_status: str

class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]


class TaskCreate(BaseModel):
    title: str
    description: str
    client_id: str
    freelancer_id: Optional[str] = None
    payment_intent_id: str
    starting_bid: float
    auction_status: Literal["pending", "in-progress", "completed", "cancelled"] = "pending"
    auction_start_time: AwareDatetime
    auction_end_time: AwareDatetime


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    freelancer_id: Optional[str] = None
    payment_intent_id: Optional[str] = None
    auction_status: Optional[Literal["pending", "in-progress", "completed", "cancelled", "no-bids"]] = None
    auction_start_time: Optional[AwareDatetime] = None
    auction_end_time: Optional[AwareDatetime] = None
