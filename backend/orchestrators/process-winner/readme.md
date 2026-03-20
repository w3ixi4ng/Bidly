# Process-Winner Orchestrator

Python/RabbitMQ consumer

Determines the auction winner, updates the task, and fans out events to notifications, chat, and payment.

---

## RabbitMQ Consumer

**Queue:** `Process_Winner` - **Routing Key:** `process.winner`

Triggered automatically when the auction TTL expires (dead-lettered from `auction_in_progress`).

**Message Consumed**
```json
{ "task_id": "string" }
```

**Processing**
1. Fetch current lowest bid from Bids service
2. Update task `freelancer_id` and `auction_status` via Tasks service
3. Publish three downstream events (if a winner exists)

---

## RabbitMQ Published Messages

| Routing Key | Payload | Consumer |
|-------------|---------|----------|
| `end.auction.chat` | { client_id, freelancer_id, task_title, task_description } | Connect-Chat |
| `end.auction.payment` | { task_id, client_id, freelancer_id, amount, payment_id } | Handle-Payment |
| `end.auction.notifications` | { client_id, freelancer_id, task_title, task_description, amount } | Send-Notifications |
