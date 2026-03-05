import json
import logging
from contextlib import asynccontextmanager

import aio_pika
from fastapi import FastAPI, HTTPException
import httpx
import uvicorn
from schema import ConnectChatRequest, EndAuctionChatMessage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CHATS_URL = "http://chats:8006"
CHAT_LOGS_URL = "http://chat-logs:8002"
RABBITMQ_URL = "amqp://guest:guest@rabbitmq/"
EXCHANGE = "bidly"


async def publish_chat_connected(client_id: str, freelancer_id: str, chat_id: str):
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        exchange = await channel.get_exchange(EXCHANGE)
        await exchange.publish(
            aio_pika.Message(
                body=json.dumps({
                    "client_id": client_id,
                    "freelancer_id": freelancer_id,
                    "chat_id": chat_id,
                }).encode()
            ),
            routing_key="chat.connected.websocket",
        )


async def handle_end_auction_chat(message: aio_pika.IncomingMessage):
    async with message.process(requeue=False):
        try:
            msg = EndAuctionChatMessage(**json.loads(message.body.decode()))
            async with httpx.AsyncClient(timeout=10.0) as client:
                chat_res = await client.post(f"{CHATS_URL}/chats", json={
                    "task_id": msg.task_id,
                    "client_id": msg.client_id,
                    "freelancer_id": msg.freelancer_id,
                })
                chat_res.raise_for_status()
                chat_id = chat_res.json()["chat_id"]
            await publish_chat_connected(msg.client_id, msg.freelancer_id, chat_id)
        except Exception:
            logger.exception("[connect-chat] failed to process end_auction_chat")
            raise


@asynccontextmanager
async def lifespan(_: FastAPI):
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=5)
    queue = await channel.declare_queue("End_Auction_Chat", passive=True)
    await queue.consume(handle_end_auction_chat)
    logger.info("[connect-chat] AMQP consumer started on End_Auction_Chat")
    yield
    await connection.close()


app = FastAPI(lifespan=lifespan)


@app.get("/")
async def health_check():
    return {"status": "ok"}


@app.post("/connect-chat", status_code=201)
async def connect_chat(body: ConnectChatRequest):
    async with httpx.AsyncClient(timeout=10.0) as client:
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

    try:
        await publish_chat_connected(body.client_id, body.freelancer_id, chat_id)
    except Exception:
        logger.exception("[connect-chat] failed to publish chat.connected event")
        raise HTTPException(status_code=500, detail="Chat created but notification failed")
    return {"chat_id": chat_id, "client_id": body.client_id, "freelancer_id": body.freelancer_id}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8010)