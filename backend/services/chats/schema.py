from pydantic import BaseModel


class ChatCreate(BaseModel):
    task_id: str
    client_id: str
    freelancer_id: str


class ChatResponse(BaseModel):
    chat_id: str


class ChatListResponse(BaseModel):
    chats: list[ChatResponse]