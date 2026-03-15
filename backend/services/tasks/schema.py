from pydantic import BaseModel, AwareDatetime
from typing import Literal, Optional

CATEGORY_LITERAL = Literal["Design", "Development", "Writing", "Marketing", "Other"]


class TaskResponse(BaseModel):
    task_id: str
    title: str
    description: str
    requirements: list[str] = []
    category: str = "Other"
    client_id: str
    freelancer_id: Optional[str] = None
    payment_id: str
    starting_bid: float
    auction_start_time: AwareDatetime
    auction_end_time: AwareDatetime
    auction_status: str

class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]


class TaskCreate(BaseModel):
    title: str
    description: str
    requirements: list[str] = []
    category: CATEGORY_LITERAL = "Other"
    client_id: str
    freelancer_id: Optional[str] = None
    payment_id: str
    starting_bid: float
    auction_status: Literal["pending", "in-progress", "completed", "cancelled"] = "pending"
    auction_start_time: AwareDatetime
    auction_end_time: AwareDatetime


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[list[str]] = None
    category: Optional[CATEGORY_LITERAL] = None
    freelancer_id: Optional[str] = None
    payment_id: Optional[str] = None
    auction_status: Optional[Literal["pending", "in-progress", "completed", "cancelled", "no-bids", "pending-review", "accepted", "disputed"]] = None
    auction_start_time: Optional[AwareDatetime] = None
    auction_end_time: Optional[AwareDatetime] = None