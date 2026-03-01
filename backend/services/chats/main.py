from fastapi import FastAPI, HTTPException
from schema import ChatCreate, ChatListResponse, ChatResponse
from supabase_client import SupabaseService
import uvicorn

app = FastAPI()
supabase = SupabaseService()


@app.get("/")
async def health_check():
    return {"status": "ok"}


@app.post("/chats", response_model=ChatResponse, status_code=201)
async def create_chat(chat: ChatCreate):
    chat_data = chat.model_dump(mode='json')
    created_chat = supabase.create_chat(chat_data)
    if not created_chat:
        raise HTTPException(status_code=400, detail="Failed to create chat")
    return ChatResponse(**created_chat[0])


@app.get("/chats/user/{user_id}", response_model=ChatListResponse)
async def get_chats_by_user(user_id: str):
    chats = supabase.get_chats_by_user(user_id)
    if not chats:
        raise HTTPException(status_code=404, detail="No chats found for this user")
    return ChatListResponse(chats=chats)


@app.get("/chats/task/{task_id}", response_model=ChatResponse)
async def get_chat_by_task(task_id: str):
    chat = supabase.get_chat_by_task(task_id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return ChatResponse(**chat[0])


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001)