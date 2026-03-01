from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


class Task(BaseModel):
    task_id: Optional[str] = None
    title: str
    description: str
    client_id: str
    freelancer_id: Optional[str] = None
    auction_status: str = "pending"
    auction_start_time: Optional[datetime] = None
    auction_end_time: Optional[datetime] = None
    payment_id: Optional[str] = None


class TaskListResponse(BaseModel):
    tasks: list[Task]


class TaskCreate(BaseModel):
    title: str
    description: str
    client_id: str
    freelancer_id: Optional[str] = None
    auction_status: str = "pending"
    auction_start_time: Optional[datetime] = None
    auction_end_time: Optional[datetime] = None
    payment_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    freelancer_id: Optional[str] = None
    auction_status: Optional[Literal["pending", "in-progress", "end"]] = None
    auction_start_time: Optional[datetime] = None
    auction_end_time: Optional[datetime] = None
    payment_id: Optional[str] = None


class TaskResponse(BaseModel):
    task_id: Optional[str] = None
    title: Optional[str] = None
    auction_start_time: Optional[datetime] = None
    auction_end_time: Optional[datetime] = None


