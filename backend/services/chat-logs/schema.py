from pydantic import BaseModel
from datetime import datetime

class MessageCreate(BaseModel):
    sender_id: str
    message: str

class MessageResponse(BaseModel):
    sender_id: str
    message: str
    timestamp: datetime | None  # None because timestamp is set async-ly at the firebase db side (SERVER_TIMESTAMP)

class MessageListResponse(BaseModel):
    messages: list[MessageResponse]