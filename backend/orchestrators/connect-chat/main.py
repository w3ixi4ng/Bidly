from fastapi import FastAPI, HTTPException
import httpx
import uvicorn
from schema import ConnectChatRequest, ConnectChatResponse

app = FastAPI()

CHATS_URL = "http://chats:8001"
CHAT_LOGS_URL = "http://chat-logs:8002"

@app.get("/")
async def health_check():
    return {"status": "ok"}

@app.post("/connect-chat", response_model=ConnectChatResponse, status_code=201)
async def connect_chat(body: ConnectChatRequest):
    async with httpx.AsyncClient() as client:
        chat_res = await client.post(f"{CHATS_URL}/chats", json={
            "task_id": body.task_id,
            "client_id": body.client_id,
            "freelancer_id": body.freelancer_id
        })
        if chat_res.status_code != 201:
            raise HTTPException(status_code=400, detail="Failed to create chat")

        chat_id = chat_res.json()["chat_id"]

        log_res = await client.post(f"{CHAT_LOGS_URL}/chat-logs/{chat_id}/messages", json={
            "sender_id": body.sender_id,
            "message": body.message
        })
        if log_res.status_code != 201:
            raise HTTPException(status_code=400, detail="Failed to create chat log")

    return ConnectChatResponse(
        chat_id=chat_id,
        sender_id=body.sender_id,
        message=body.message
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8010)