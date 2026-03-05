import pika
import requests
import json


connection = pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq"))
channel = connection.channel()

CHATS_URL = "http://chats:8006"
CHAT_LOGS_URL = "http://chat-logs:8002"

def connect_chat(ch, method, properties, body):
    try:
        data = json.loads(body.decode())
        task_id = data["task_id"]
        client_id = data["client_id"]
        freelancer_id = data["freelancer_id"]

        # Step 9-10: Create chat and get chat_id
        chat_res = requests.post(f"{CHATS_URL}/chats", json={
            "task_id": task_id,
            "client_id": client_id,
            "freelancer_id": freelancer_id
        })

        if chat_res.status_code != 201:
            chat_res.raise_for_status()

        chat_id = chat_res.json()["chat_id"]

        # Step 11-12: Send initial message to chat logs
        log_res = requests.post(f"{CHAT_LOGS_URL}/chat-logs/{chat_id}/messages", json={
            "sender_id": client_id,
            "message": f"Chat started for task: {data.get('task_title', 'N/A')}"
        })

        if log_res.status_code != 201:
            log_res.raise_for_status()

        # Publish to WebSocket so frontend gets notified
        ch.basic_publish(
            exchange="bidly",
            routing_key="chat.connected.websocket",
            body=json.dumps({
                "chat_id": chat_id,
                "client_id": client_id,
                "freelancer_id": freelancer_id
            })
        )

        print(f"Chat connected: chat_id={chat_id}, client={client_id}, freelancer={freelancer_id}")
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"Failed to process message: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


channel.basic_qos(prefetch_count=10)
channel.basic_consume(queue="End_Auction_Chat", on_message_callback=connect_chat, auto_ack=False)
channel.start_consuming()