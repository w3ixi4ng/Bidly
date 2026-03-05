from pydantic import BaseModel, Field


class ConnectChatMessage(BaseModel):
    client_id: str = Field(min_length=1)
    freelancer_id: str = Field(min_length=1)
    task_title: str = Field(default="")
    task_description: str = Field(default="")
