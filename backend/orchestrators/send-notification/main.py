import json
import asyncio
import pika
import httpx

user_service_url = "http://users:8004"
task_service_url = "http://tasks:8000"
notification_service_url = "http://notifications:8005"


async def send_template_email(to_email: str, template_name: str, dynamic_template_data: dict):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{notification_service_url}/notifications/send",
                json={
                    "to_email": to_email,
                    "template_name": template_name,
                    "dynamic_template_data": dynamic_template_data
                }
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise Exception(f"Failed to send email via notification service: {str(e)}")


async def fetch_user(user_id: str):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{user_service_url}/users/{user_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise Exception(f"Failed to fetch user: {str(e)}")


async def fetch_task(task_id: str):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{task_service_url}/tasks/{task_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise Exception(f"Failed to fetch task: {str(e)}")


def on_auction_end_message(ch, method, properties, body):
    try:
        data = json.loads(body.decode())
        print(f"Received auction end notification: {data}")
        
        async def process():
            client_id = data.get("client_id")
            freelancer_id = data.get("freelancer_id")
            task_title = data.get("task_title")
            amount = data.get("amount")
            
            client, freelancer = await asyncio.gather(
                fetch_user(client_id),
                fetch_user(freelancer_id)
            )
            
            await asyncio.gather(
                send_template_email(
                    to_email=freelancer["email"],
                    template_name="auction_end_freelancer",
                    dynamic_template_data={
                        "freelancer_name": freelancer["name"],
                        "task_name": task_title,
                        "winning_bid": amount,
                        "client_name": client["name"]
                    }
                ),
                send_template_email(
                    to_email=client["email"],
                    template_name="auction_end_client",
                    dynamic_template_data={
                        "client_name": client["name"],
                        "task_name": task_title,
                        "freelancer_name": freelancer["name"],
                        "winning_bid": amount
                    }
                )
            )
            print(f"Auction end notifications sent - Freelancer: {freelancer['email']}, Client: {client['email']}")
        
        asyncio.run(process())
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        print(f"Failed to process auction end message: {str(e)}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def on_bid_outbid_message(ch, method, properties, body):
    try:
        data = json.loads(body.decode())
        print(f"Received bid outbid notification: {data}")
        
        async def process():
            task_id = data.get("task_id")
            previous_bidder_id = data.get("previous_bidder_id")
            bid_amount = data.get("bid_amount")
            
            task, old_freelancer = await asyncio.gather(
                fetch_task(task_id),
                fetch_user(previous_bidder_id)
            )
            
            await send_template_email(
                to_email=old_freelancer["email"],
                template_name="bid_outbid_freelancer",
                dynamic_template_data={
                    "freelancer_name": old_freelancer["name"],
                    "task_name": task["title"],
                    "bid_price": bid_amount
                }
            )
            print(f"Outbid notification sent - Freelancer: {old_freelancer['email']}")
        
        asyncio.run(process())
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        print(f"Failed to process bid outbid message: {str(e)}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


connection = pika.BlockingConnection(pika.ConnectionParameters(host="rabbitmq"))
channel = connection.channel()

channel.exchange_declare(exchange="bidly", exchange_type="topic", durable=True)
channel.queue_declare(queue="End_Auction_Notifications", durable=True)
channel.queue_bind(exchange="bidly", queue="End_Auction_Notifications", routing_key="end.auction.notifications")
channel.queue_declare(queue="Out_Bidded_Notifications", durable=True)
channel.queue_bind(exchange="bidly", queue="Out_Bidded_Notifications", routing_key="out.bidded.notifications")

channel.basic_qos(prefetch_count=10)
channel.basic_consume(queue="End_Auction_Notifications", on_message_callback=on_auction_end_message, auto_ack=False)
channel.basic_consume(queue="Out_Bidded_Notifications", on_message_callback=on_bid_outbid_message, auto_ack=False)
channel.start_consuming()
