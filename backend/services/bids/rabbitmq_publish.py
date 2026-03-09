import json
import pika


def publish_out_bidded_message(task_id: str, bid_amount: float, previous_bidder_id: str = None):
    connection = pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq"))
    channel = connection.channel()
    print("Publishing out bidded message to websocket...")
    channel.basic_publish(
        exchange="bidly",
        routing_key="out.bidded.websocket",
        body=json.dumps({
            "task_id": task_id,
            "bid_amount": bid_amount,
        }),
        properties=pika.BasicProperties(
            delivery_mode=2,  
        )
    )

    print("Publishing out bidded message to notifications...")
    if previous_bidder_id:
        channel.basic_publish(
            exchange="bidly",
            routing_key="out.bidded.notifications",
            body=json.dumps({
                "task_id": task_id,
                "previous_bidder_id": previous_bidder_id,
                "bid_amount": bid_amount,
            }),
            properties=pika.BasicProperties(
                delivery_mode=2,  
            )
        )
    connection.close()


