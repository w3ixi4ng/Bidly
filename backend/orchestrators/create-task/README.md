# Create-Task Orchestrator

Python/FastAPI · Port `8009`

Verifies Stripe payment, creates the task, and schedules auction start via RabbitMQ TTL queue.

---

## `GET /`

Health check.

**Response**
```json
{ "status": "ok" }
```

---

## `POST /create-task`

Create a task with idempotency. If a task with the same `payment_id` already exists, returns it without creating a duplicate.

**Request Body**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | yes | |
| `description` | string | yes | |
| `requirements` | string[] | no | default [] |
| `category` | string | no | Design, Development, Writing, Marketing, Other |
| `client_id` | string | yes | |
| `payment_id` | string | yes | Used for idempotency check |
| `payment_intent_id` | string | yes | Verified against Stripe before creation |
| `starting_bid` | float | yes | |
| `auction_start_time` | datetime | yes | timezone-aware |
| `auction_end_time` | datetime | yes | timezone-aware |

**Response** `201` - created task object. If already exists, includes `"already_exists": true`.

**Internal Flow**
1. Check if task with `payment_id` already exists — return early if so
2. Verify `payment_intent_id` with Stripe via Payment service
3. Create task via Tasks service
4. Publish to `auction_pending` queue with TTL = `auction_start_time - now` — dead-letters to `start.auction`
5. Publish task to WebSocket via `task.created.websocket` routing key

## RabbitMQ Published Messages

| Exchange | Routing Key | Payload | Notes |
|----------|-------------|---------|-------|
| `bidly` | `auction_pending` | { task_id, starting_bid, auction_end_time } | TTL delays until auction start |
| `bidly` | `task.created.websocket` | Full task object | Broadcast to all clients |
