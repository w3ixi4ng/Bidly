from pydantic import BaseModel, Field


class ChatCreate(BaseModel):
    task_id: str = Field(min_length=1)
    client_id: str = Field(min_length=1)
    freelancer_id: str = Field(min_length=1)


class ChatResponse(BaseModel):
    chat_id: str


class ChatListResponse(BaseModel):
    chats: list[ChatResponse]