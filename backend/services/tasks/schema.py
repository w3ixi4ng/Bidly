from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime


class TaskResponse(BaseModel):
    task_id: str
    title: str
    description: str
    client_id: str
    freelancer_id: Optional[str] = None
    payment_id: Optional[str] = None

class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]


class TaskCreate(BaseModel):
    title: str
    description: str
    client_id: str
    freelancer_id: Optional[str] = None
    payment_id: str


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    freelancer_id: Optional[str] = None
    payment_id: Optional[str] = None





