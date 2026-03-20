# Start-Auction Orchestrator

Python/RabbitMQ consumer

Starts the auction in Redis, updates task status, and schedules auction end via a TTL dead-letter queue.

---

## RabbitMQ Consumer

**Queue:** `Start_Auction` - **Routing Key:** `start.auction`

Triggered when the `auction_pending` TTL expires (dead-lettered from create-task).

**Message Consumed**
```json
{
  "task_id": "string",
  "starting_bid": 0.0,
  "auction_end_time": "ISO8601 datetime"
}
```

**Processing**
1. Create auction in Bids service (stores in Redis)
2. Update task `auction_status` to `"in-progress"` via Tasks service
3. Publish to `auction_in_progress` queue with TTL = `auction_end_time - now`

---

## RabbitMQ Published Messages

| Queue | Payload | Notes |
|-------|---------|-------|
| `auction_in_progress` | { task_id } | TTL expires and dead-letters to `process.winner` |
