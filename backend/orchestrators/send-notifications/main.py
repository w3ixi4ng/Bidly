import json
import asyncio
import aio_pika
import httpx

user_service_url = "http://users:8004"
task_service_url = "http://tasks:8005"
notification_service_url = "http://notifications:8008"


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


async def on_auction_end_message(message: aio_pika.IncomingMessage):
    async with message.process(requeue=False):
        try:
            data = json.loads(message.body.decode())
            print(f"Received auction end notification: {data}")

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
        except Exception as e:
            print(f"Failed to process auction end message: {str(e)}")
            raise


async def on_bid_outbid_message(message: aio_pika.IncomingMessage):
    async with message.process(requeue=False):
        try:
            data = json.loads(message.body.decode())
            print(f"Received bid outbid notification: {data}")

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
        except Exception as e:
            print(f"Failed to process bid outbid message: {str(e)}")
            raise


async def main():
    connection = await aio_pika.connect_robust("amqp://guest:guest@rabbitmq/")
    channel = await connection.channel()

    await channel.declare_exchange("bidly", aio_pika.ExchangeType.TOPIC, durable=True)

    auction_end_queue = await channel.declare_queue("End_Auction_Notifications", durable=True)
    await auction_end_queue.bind("bidly", routing_key="end.auction.notifications")

    outbid_queue = await channel.declare_queue("Out_Bidded_Notifications", durable=True)
    await outbid_queue.bind("bidly", routing_key="out.bidded.notifications")

    await channel.set_qos(prefetch_count=10)

    await auction_end_queue.consume(on_auction_end_message)
    await outbid_queue.consume(on_bid_outbid_message)

    print("send-notification consuming...")
    await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
