from pydantic import BaseModel, Field, model_validator

class ConnectChatRequest(BaseModel):
    task_id: str = Field(min_length=1)
    client_id: str = Field(min_length=1)
    freelancer_id: str = Field(min_length=1)
    sender_id: str = Field(min_length=1)
    message: str = Field(min_length=1)

    @model_validator(mode="after")
    def sender_must_be_participant(self):
        if self.sender_id not in (self.client_id, self.freelancer_id):
            raise ValueError("sender_id must be either client_id or freelancer_id")
        return self

# class ConnectChatResponse(BaseModel):
#     chat_id: str
#     sender_id: str
#     message: str

class EndAuctionChatMessage(BaseModel):
    task_id: str = Field(min_length=1)
    client_id: str = Field(min_length=1)
    freelancer_id: str = Field(min_length=1)
    task_title: str = Field(min_length=1)
    task_description: str = Field(min_length=1)
# from chats
# class ChatCreate(BaseModel):
#     task_id: str
#     client_id: str
#     freelancer_id: str

# from chat-logs
# class MessageCreate(BaseModel):
#     sender_id: str
#     message: str