# Bids Service

Python/FastAPI · Port `8003`

Dependencies: Redis (real-time), Supabase (persistence), RabbitMQ (events)

---

## `GET /`

Health check.

**Response**
```json
{ "status": "ok" }
```

---

## `POST /bids/auction`

Create an auction for a task.

**Request Body**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `task_id` | string | yes | |
| `auction_end_time` | datetime | yes | timezone-aware |
| `starting_bid` | float | yes | |

**Response** `201`
```json
{ "message": "Auction created successfully" }
```

---

## `POST /bids`

Place a bid on a task. New bids must be **lower** than the current bid (reverse auction). If this bid outbids a previous one, an event is published to RabbitMQ for notifications and WebSocket.

**Request Body**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `task_id` | string | yes | |
| `bidder_id` | string | yes | |
| `bid_amount` | float | yes | Must be ≤ current lowest bid (or ≤ starting bid if first bid) |
| `timestamp` | datetime | yes | timezone-aware |

**Response** `201`
```json
{
  "bid_id": "string",
  "task_id": "string",
  "bidder_id": "string",
  "bid_amount": 0.0,
  "timestamp": "ISO8601 datetime"
}
```

---

## `GET /bids/current/{task_id}`

Get the current lowest bid for a task.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `task_id` | string | Task ID |

**Response**
```json
{
  "bid_amount": 0.0,
  "bidder_id": "string"
}
```

---

## `GET /bids/task/{task_id}`

Get all bids for a task.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `task_id` | string | Task ID |

**Response**
```json
{
  "bids": [
    {
      "bid_id": "string",
      "task_id": "string",
      "bidder_id": "string",
      "bid_amount": 0.0,
      "timestamp": "ISO8601 datetime"
    }
  ]
}
```

---

## `GET /bids/user/{bidder_id}`

Get all bids placed by a user.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `bidder_id` | string | User ID |

**Response** — same shape as `GET /bids/task/{task_id}`
