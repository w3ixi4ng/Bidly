import aio_pika
import httpx
import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from schema import CreateTaskRequest
import uvicorn

TASKS_URL = "http://tasks:8005"

rabbitmq_connection = None
bidly_exchange = None


async def setup_rabbitmq():
    global rabbitmq_connection, bidly_exchange
    rabbitmq_connection = await aio_pika.connect_robust("amqp://rabbitmq")
    channel = await rabbitmq_connection.channel()
    bidly_exchange = await channel.declare_exchange("bidly", aio_pika.ExchangeType.TOPIC, durable=True)
    await channel.declare_queue("auction_pending", durable=True, arguments={
        "x-dead-letter-exchange": "bidly",
        "x-dead-letter-routing-key": "start.auction",
    })


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await setup_rabbitmq()
    yield
    if rabbitmq_connection:
        await rabbitmq_connection.close()


app = FastAPI(lifespan=lifespan)


@app.get("/")
async def health_check():
    return {"status": "ok"}


@app.post("/create-task", status_code=201)
async def create_task(body: CreateTaskRequest):
    async with httpx.AsyncClient() as client:
        # Idempotency: check if task already exists for this payment_id
        check = await client.get(f"{TASKS_URL}/tasks/payment_id/{body.payment_id}")
        existing = check.json().get("tasks", []) if check.status_code == 200 else []
        if existing:
            return {**existing[0], "already_exists": True}

        # No task yet — create it
        task_res = await client.post(f"{TASKS_URL}/tasks", json={
            "title": body.title,
            "description": body.description,
            "requirements": body.requirements,
            "category": body.category,
            "client_id": body.client_id,
            "payment_id": body.payment_id,
            "starting_bid": body.starting_bid,
            "auction_start_time": body.auction_start_time.isoformat(),
            "auction_end_time": body.auction_end_time.isoformat(),
            "auction_status": "pending",
        })

        if task_res.status_code != 201:
            raise HTTPException(status_code=task_res.status_code, detail="Failed to create task")

        task = task_res.json()

    # Schedule auction start
    delay_ms = int(
        (body.auction_start_time.timestamp() - datetime.now(timezone.utc).timestamp()) * 1000
    )

    auction_payload = json.dumps({
        "task_id": task["task_id"],
        "starting_bid": body.starting_bid,
        "auction_end_time": body.auction_end_time.isoformat(),
    }).encode()

    if delay_ms > 0:
        channel = await rabbitmq_connection.channel()
        await channel.default_exchange.publish(
            aio_pika.Message(
                body=auction_payload,
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                expiration=str(delay_ms),
            ),
            routing_key="auction_pending",
        )
    else:
        await bidly_exchange.publish(
            aio_pika.Message(
                body=auction_payload,
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key="start.auction",
        )

    # Notify WebSocket for live home feed
    await bidly_exchange.publish(
        aio_pika.Message(body=json.dumps(task).encode()),
        routing_key="task.created.websocket",
    )

    return task


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8009)