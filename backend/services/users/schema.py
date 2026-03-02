from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserSignup(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UserResponse(BaseModel):
    user_id: str
    name: Optional[str] = None
    email: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str