import pika
import requests
import json
from schema import ProcessWinnerRequest, UpdateTaskRequest



connection = pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq"))
channel = connection.channel()



def process_winner(ch, method, properties, body):
    try:
        request = ProcessWinnerRequest(**json.loads(body.decode()))
        response = requests.get(f"http://bids:8003/bids/current/{request.task_id}")

        if response.status_code != 200:
            response.raise_for_status()

        winner = response.json()

        if not winner.get("bidder_id"):
            # No bids placed, mark auction as completed without a winner
            update_task_request = UpdateTaskRequest(
                auction_status="no-bids",
                freelancer_id=None
            )
            response = requests.put(f"http://tasks:8005/tasks/{request.task_id}", json=update_task_request.model_dump(mode='json'))
        else:
            # Update task with winning bidder and mark auction as completed
            update_task_request = UpdateTaskRequest(
                auction_status="completed",
                freelancer_id=winner["bidder_id"]
            )
            response = requests.put(f"http://tasks:8005/tasks/{request.task_id}", json=update_task_request.model_dump(mode='json'))

        if response.status_code != 200:
            response.raise_for_status()

        # If there is no winner, we can skip the notifications and payment processing
        # (for now - we can always notify the client about the auction result in the future)
        # or request a new auction to be created if the client wants to try again
        if not winner.get("bidder_id"):
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        task_data = response.json()

        ch.basic_publish(
            exchange="bidly",
            routing_key="end.auction.chat",
            body=json.dumps({
                "task_id": request.task_id, # joshua added this for it create a chat 
                "client_id": task_data.get("client_id"),
                "freelancer_id": task_data.get("freelancer_id"),
                "task_title": task_data.get("title"),
                "task_description": task_data.get("description"),
            })
        )

        ch.basic_publish(
            exchange="bidly",
            routing_key="end.auction.payment",
            body=json.dumps({
                "task_id": request.task_id,
                "client_id": task_data.get("client_id"),
                "freelancer_id": task_data.get("freelancer_id"),
                "amount": winner.get("bid_amount")
            })
        )

        ch.basic_publish(
            exchange="bidly",
            routing_key="end.auction.notifications",
            body=json.dumps({
                "client_id": task_data.get("client_id"),
                "freelancer_id": task_data.get("freelancer_id"),
                "task_title": task_data.get("title"),
                "task_description": task_data.get("description"),
                "amount": winner.get("bid_amount")
            })
        )

        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        print(f"Failed to process message: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


channel.basic_qos(prefetch_count=10)
channel.basic_consume(queue="Process_Winner", on_message_callback=process_winner, auto_ack=False)
channel.start_consuming()
