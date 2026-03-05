from pydantic import BaseModel, Field


class ConnectChatMessage(BaseModel):
    user_1_id: str = Field(min_length=1)
    user_2_id: str = Field(min_length=1)
    task_title: str = Field(default="")


class SendMessageRequest(BaseModel):
    chat_id: str = Field(min_length=1)
    sender_id: str = Field(min_length=1)
    recipient_id: str = Field(min_length=1)
    message: str = Field(min_length=1)
