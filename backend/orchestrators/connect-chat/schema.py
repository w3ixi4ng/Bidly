from pydantic import BaseModel

class ConnectChatRequest(BaseModel):
    task_id: str
    client_id: str
    freelancer_id: str
    sender_id: str
    message: str

class ConnectChatResponse(BaseModel):
    chat_id: str
    sender_id: str
    message: str



# from chats
# class ChatCreate(BaseModel):
#     task_id: str
#     client_id: str
#     freelancer_id: str

# from chat-logs
# class MessageCreate(BaseModel):
#     sender_id: str
#     message: str