from datetime import datetime, timezone
import requests
from schema import AuctionCreateRequest
import pika
import json


connection = pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq"))
channel = connection.channel()


def start_auction(ch, method, properties, body):
    try:
        request = AuctionCreateRequest(**json.loads(body.decode()))
        response = requests.post("http://bids:8003/bids/auction", json=request.model_dump(mode='json'))

        if response.status_code != 201:
            response.raise_for_status()

        response = requests.put(f"http://tasks:8005/tasks/{request.task_id}", json={"auction_status": "in-progress"})

        if response.status_code != 200:
            response.raise_for_status()

        # publish to waiting queue with TTL — when expired, dead-lettered to bidly/process.winner
        channel.basic_publish(
            exchange="",
            routing_key="auction_in_progress",
            body=str(request.task_id),
            properties=pika.BasicProperties(
                delivery_mode=2,  # make message persistent
                expiration=str(int((request.auction_end_time.timestamp() - datetime.now(timezone.utc).timestamp()) * 1000))
            )
        )

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except requests.exceptions.RequestException as e:
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        raise Exception(f"Failed to create auction: {str(e)}")

channel.basic_qos(prefetch_count=10)
channel.basic_consume(queue="Start_Auction", on_message_callback=start_auction, auto_ack=False)
channel.start_consuming()
    
