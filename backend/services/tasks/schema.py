from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


class TaskResponse(BaseModel):
    task_id: str
    title: str
    description: str
    client_id: str
    freelancer_id: Optional[str] = None
    payment_id: str
    auction_start_time: datetime
    auction_end_time: datetime
    auction_status: str

class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]


class TaskCreate(BaseModel):
    title: str
    description: str
    client_id: str
    freelancer_id: Optional[str] = None
    payment_id: str
    auction_status: Literal["in-progress", "completed", "cancelled"] = "in-progress"
    auction_start_time: datetime
    auction_end_time: datetime



class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    freelancer_id: Optional[str] = None
    payment_id: Optional[str] = None
    auction_status: Optional[Literal["in-progress", "completed", "cancelled"]] = "in-progress"
    auction_start_time: Optional[datetime] = None
    auction_end_time: Optional[datetime] = None






