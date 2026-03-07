import json

def publish_end_auction_messages(ch, task_id: str, task_data: dict, winner: dict):
    ch.basic_publish(
        exchange="bidly",
        routing_key="end.auction.chat",
        body=json.dumps({
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
            "task_id": task_id,
            "client_id": task_data.get("client_id"),
            "freelancer_id": task_data.get("freelancer_id"),
            "amount": winner.get("bid_amount"),
            "payment_id": task_data.get("payment_id")
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
