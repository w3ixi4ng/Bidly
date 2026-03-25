from datetime import datetime, timezone
import requests
from schema import AuctionCreateRequest
import pika
import json


connection = pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq"))
channel = connection.channel()

channel.exchange_declare(exchange="bidly", exchange_type="topic", durable=True)
channel.queue_declare(queue="Start_Auction", durable=True)
channel.queue_bind(exchange="bidly", queue="Start_Auction", routing_key="start.auction")
channel.queue_declare(queue="auction_in_progress", durable=True, arguments={
    "x-dead-letter-exchange": "bidly",
    "x-dead-letter-routing-key": "process.winner",
})


def reconnect_channel():
    global connection, channel
    try:
        connection.close()
    except Exception:
        pass
    connection = pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq"))
    channel = connection.channel()
    channel.exchange_declare(exchange="bidly", exchange_type="topic", durable=True)
    channel.queue_declare(queue="Start_Auction", durable=True)
    channel.queue_bind(exchange="bidly", queue="Start_Auction", routing_key="start.auction")
    channel.queue_declare(queue="auction_in_progress", durable=True, arguments={
        "x-dead-letter-exchange": "bidly",
        "x-dead-letter-routing-key": "process.winner",
    })
    channel.basic_qos(prefetch_count=10)
    channel.basic_consume(queue="Start_Auction", on_message_callback=start_auction, auto_ack=False)


def start_auction(ch, method, properties, body):
    try:
        request = AuctionCreateRequest(**json.loads(body.decode()))
        response = requests.post("http://bids:8003/bids/auction", json=request.model_dump(mode='json'))

        if response.status_code != 201:
            response.raise_for_status()

        response = requests.put(f"http://tasks:8005/tasks/{request.task_id}", json={"auction_status": "in-progress"})

        if response.status_code != 200:
            response.raise_for_status()

        channel.basic_publish(
            exchange="bidly",
            routing_key="task.started.websocket",
            body=json.dumps({"task_id": str(request.task_id)}),
            properties=pika.BasicProperties(delivery_mode=2),
        )

        ttl_ms = int((request.auction_end_time.timestamp() - datetime.now(timezone.utc).timestamp()) * 1000)

        if ttl_ms <= 0:
            # auction already ended — skip the waiting queue and go straight to process.winner
            channel.basic_publish(
                exchange="bidly",
                routing_key="process.winner",
                body=json.dumps({"task_id": str(request.task_id)}),
                properties=pika.BasicProperties(delivery_mode=2),
            )
        else:
            # publish to waiting queue with TTL — when expired, dead-lettered to bidly/process.winner
            channel.basic_publish(
                exchange="",
                routing_key="auction_in_progress",
                body=json.dumps({"task_id": str(request.task_id)}),
                properties=pika.BasicProperties(
                    delivery_mode=2,
                    expiration=str(ttl_ms),
                ),
            )

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except pika.exceptions.ChannelClosedByBroker as e:
        print(f"Channel closed by broker, reconnecting: {e}")
        reconnect_channel()
        # Message will be redelivered on the new channel's consumer; stop processing here
        return

    except Exception as e:
        print(f"Failed to process message: {e}")
        try:
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except Exception as nack_err:
            print(f"Failed to nack message: {nack_err}")

channel.basic_qos(prefetch_count=10)
channel.basic_consume(queue="Start_Auction", on_message_callback=start_auction, auto_ack=False)
channel.start_consuming()

    
