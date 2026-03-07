from fastapi import FastAPI, HTTPException
from schema import MessageCreate, MessageResponse, MessageListResponse
from firebase_client import FirebaseService
import uvicorn


app = FastAPI()
firebase = FirebaseService()


@app.get("/")
async def health_check():
    return {"status": "ok"}


@app.post("/chat-logs/{chat_id}/messages", response_model=MessageResponse, status_code=201)
async def add_message(chat_id: str, body: MessageCreate):
    firebase.add_message(chat_id, body.sender_id, body.message)
    return MessageResponse(**body.model_dump(), timestamp=None)


@app.get("/chat-logs/{chat_id}/messages", response_model=MessageListResponse, status_code=200)
async def get_messages(chat_id: str):
    messages = firebase.get_messages(chat_id)
    if not messages:
        raise HTTPException(status_code=404, detail="Chat not found")
    return MessageListResponse(messages=messages)

@app.delete("/chat-logs/{chat_id}", status_code=200)
async def delete_session(chat_id: str):
    if not firebase.delete_session(chat_id):
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"status": "deleted"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002)
