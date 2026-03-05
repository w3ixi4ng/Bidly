import aio_pika
import httpx
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from schema import SendMessageRequest
import uvicorn

CHATS_URL = "http://chats:8006"
CHAT_LOGS_URL = "http://chat-logs:8002"

rabbitmq_connection = None
bidly_exchange = None


async def publish_to_websocket(chat_id: str, sender_id: str, message: str):
    await bidly_exchange.publish(
        aio_pika.Message(body=json.dumps({
            "chat_id": chat_id,
            "sender_id": sender_id,
            "message": message
        }).encode()),
        routing_key="new.message.websocket"
    )


async def process_auction_end(message: aio_pika.IncomingMessage):
    async with message.process():
        try:
            data = json.loads(message.body.decode())
            user_1_id = data["user_1_id"]
            user_2_id = data["user_2_id"]
            task_title = data.get("task_title", "N/A")

            async with httpx.AsyncClient() as client:
                # Create chat (or get existing) between the two users
                chat_res = await client.post(f"{CHATS_URL}/chats", json={
                    "user_1_id": user_1_id,
                    "user_2_id": user_2_id
                })
                chat_res.raise_for_status()
                chat_id = chat_res.json()["chat_id"]

                # Send template message from the client to inform the winner
                template_message = f"Congratulations! You've won the bid for '{task_title}'."
                log_res = await client.post(f"{CHAT_LOGS_URL}/chat-logs/{chat_id}/messages", json={
                    "sender_id": user_1_id,
                    "message": template_message
                })
                log_res.raise_for_status()

            await publish_to_websocket(chat_id, user_1_id, template_message)
            print(f"Chat connected: chat_id={chat_id}, user_1={user_1_id}, user_2={user_2_id}")

        except Exception as e:
            print(f"Failed to process auction end message: {e}")


async def start_consumer():
    global rabbitmq_connection, bidly_exchange
    rabbitmq_connection = await aio_pika.connect_robust("amqp://rabbitmq")
    channel = await rabbitmq_connection.channel()
    await channel.set_qos(prefetch_count=10)

    bidly_exchange = await channel.declare_exchange("bidly", aio_pika.ExchangeType.TOPIC, durable=True)

    queue = await channel.declare_queue("End_Auction_Chat", durable=True)
    await queue.consume(process_auction_end)
    print("RabbitMQ consumer started on End_Auction_Chat")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await start_consumer()
    yield
    if rabbitmq_connection:
        await rabbitmq_connection.close()


app = FastAPI(lifespan=lifespan)


@app.post("/connect-chat/send", status_code=201)
async def send_message(body: SendMessageRequest):
    async with httpx.AsyncClient() as client:
        log_res = await client.post(f"{CHAT_LOGS_URL}/chat-logs/{body.chat_id}/messages", json={
            "sender_id": body.sender_id,
            "message": body.message
        })

    if log_res.status_code != 201:
        raise HTTPException(status_code=log_res.status_code, detail="Failed to store message")

    await publish_to_websocket(body.chat_id, body.sender_id, body.message)

    return {"status": "sent"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8010)
