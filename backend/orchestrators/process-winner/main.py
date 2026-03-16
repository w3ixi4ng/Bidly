import pika
import json
from schema import ProcessWinnerRequest
from service import update_task_with_winner, get_winner
import rabbitmq_publish



connection = pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq"))
channel = connection.channel()

channel.exchange_declare(exchange="bidly", exchange_type="topic", durable=True)
channel.queue_declare(queue="Process_Winner", durable=True)
channel.queue_bind(exchange="bidly", queue="Process_Winner", routing_key="process.winner")


def process_winner(ch, method, properties, body):
    try:
        request = ProcessWinnerRequest(**json.loads(body.decode()))
        response = get_winner(request.task_id)

        winner_data = response.json()

        if not winner_data.get("bidder_id"):
            # No bids placed, mark auction as completed without a winner
            response = update_task_with_winner(request.task_id, None, auction_status="no-bids")
        else:
            # Update task with winning bidder and mark auction as completed
            response = update_task_with_winner(request.task_id, winner_data["bidder_id"], auction_status="completed")
    

        # If there is no winner, we can skip the subsequent steps of notifying other services
        # In future, we might want to notify the client that the auction ended without any bids for retry
        if not winner_data.get("bidder_id"):
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        task_data = response.json()

        if winner_data.get("bidder_id"):
            rabbitmq_publish.publish_end_auction_messages(ch, request.task_id, task_data, winner_data)

        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        print(f"Failed to process message: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


channel.basic_qos(prefetch_count=10)
channel.basic_consume(queue="Process_Winner", on_message_callback=process_winner, auto_ack=False)
channel.start_consuming()
