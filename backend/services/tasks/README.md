# Tasks Service

Python/FastAPI · Port `8005`

---

## `GET /`

Health check.

**Response**
```json
{ "status": "ok" }
```

---

## `GET /tasks`

List all tasks.

**Response**
```json
{
  "tasks": [
    {
      "task_id": "string",
      "title": "string",
      "description": "string",
      "requirements": ["string"],
      "category": "Design | Development | Writing | Marketing | Other",
      "client_id": "string",
      "freelancer_id": "string | null",
      "payment_id": "string",
      "starting_bid": 0.0,
      "auction_start_time": "ISO8601 datetime",
      "auction_end_time": "ISO8601 datetime",
      "auction_status": "string"
    }
  ]
}
```

---

## `POST /tasks`

Create a new task.

**Request Body**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | yes | |
| `description` | string | yes | |
| `requirements` | string[] | no | default `[]` |
| `category` | string | no | `"Design"`, `"Development"`, `"Writing"`, `"Marketing"`, `"Other"` — default `"Other"` |
| `client_id` | string | yes | |
| `freelancer_id` | string | no | |
| `payment_id` | string | yes | |
| `starting_bid` | float | yes | |
| `auction_status` | string | no | `"pending"`, `"in-progress"`, `"completed"`, `"cancelled"` — default `"pending"` |
| `auction_start_time` | datetime | yes | timezone-aware |
| `auction_end_time` | datetime | yes | timezone-aware |

**Response** `201`
```json
{
  "task_id": "string",
  "title": "string",
  "description": "string",
  "requirements": ["string"],
  "category": "string",
  "client_id": "string",
  "freelancer_id": "string | null",
  "payment_id": "string",
  "starting_bid": 0.0,
  "auction_start_time": "ISO8601 datetime",
  "auction_end_time": "ISO8601 datetime",
  "auction_status": "string"
}
```

---

## `GET /tasks/{task_id}`

Get a task by ID.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `task_id` | string | Task ID |

**Response**
```json
{
  "task_id": "string",
  "title": "string",
  "description": "string",
  "requirements": ["string"],
  "category": "string",
  "client_id": "string",
  "freelancer_id": "string | null",
  "payment_id": "string",
  "starting_bid": 0.0,
  "auction_start_time": "ISO8601 datetime",
  "auction_end_time": "ISO8601 datetime",
  "auction_status": "string"
}
```

---

## `PUT /tasks/{task_id}`

Update a task. Only provided fields are updated.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `task_id` | string | Task ID |

**Request Body** (all fields optional)
| Field | Type | Notes |
|-------|------|-------|
| `title` | string | |
| `description` | string | |
| `requirements` | string[] | |
| `category` | string | `"Design"`, `"Development"`, `"Writing"`, `"Marketing"`, `"Other"` |
| `freelancer_id` | string | |
| `payment_id` | string | |
| `auction_status` | string | `"pending"`, `"in-progress"`, `"completed"`, `"cancelled"`, `"no-bids"`, `"pending-review"`, `"accepted"`, `"disputed"` |
| `auction_start_time` | datetime | timezone-aware |
| `auction_end_time` | datetime | timezone-aware |

**Response** — updated `TaskResponse` (same shape as `GET /tasks/{task_id}`)

---

## `DELETE /tasks/{task_id}`

Delete a task.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `task_id` | string | Task ID |

**Response**
```json
{ "message": "Task deleted successfully" }
```

---

## `GET /tasks/client/{client_id}`

Get all tasks by client.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `client_id` | string | Client user ID |

**Response** — `{ "tasks": [ TaskResponse ] }`

---

## `GET /tasks/freelancer/{freelancer_id}`

Get all tasks assigned to a freelancer.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `freelancer_id` | string | Freelancer user ID |

**Response** — `{ "tasks": [ TaskResponse ] }`

---

## `GET /tasks/payment_id/{payment_id}`

Get task(s) associated with a payment.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `payment_id` | string | Payment ID |

**Response** — `{ "tasks": [ TaskResponse ] }`
