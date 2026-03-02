from pydantic import BaseModel, Field
from datetime import datetime

class MessageCreate(BaseModel):
    sender_id: str = Field(min_length=1)
    message: str = Field(min_length=1)

class MessageResponse(BaseModel):
    sender_id: str
    message: str
    timestamp: datetime | None  # None because timestamp is set async-ly at the firebase db side (SERVER_TIMESTAMP)

class MessageListResponse(BaseModel):
    messages: list[MessageResponse]