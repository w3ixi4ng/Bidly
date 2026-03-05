from pydantic import BaseModel, Field


class ChatCreate(BaseModel):
    user_1_id: str = Field(min_length=1)
    user_2_id: str = Field(min_length=1)


class ChatResponse(BaseModel):
    chat_id: str


class ChatListResponse(BaseModel):
    chats: list[ChatResponse]