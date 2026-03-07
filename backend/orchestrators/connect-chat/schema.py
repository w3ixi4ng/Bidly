from pydantic import BaseModel, Field


class SendMessageRequest(BaseModel):
    chat_id: str = Field(min_length=1)
    sender_id: str = Field(min_length=1)
    recipient_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
