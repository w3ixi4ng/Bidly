# Chats Service

Python/FastAPI · Port `8006`

Dependencies: Supabase

---

## `GET /`

Health check.

**Response**
```json
{ "status": "ok" }
```

---

## `POST /chats`

Create a new chat between two users. If a chat already exists between them, returns the existing one.

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `user_1_id` | string | yes |
| `user_2_id` | string | yes |

**Response** `201`
```json
{ "chat_id": "string" }
```

---

## `GET /chats/{chat_id}`

Get chat details by ID.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `chat_id` | string | Chat ID |

**Response**
```json
{
  "chat_id": "string",
  "user_1_id": "string",
  "user_2_id": "string"
}
```

---

## `GET /chats/user/{user_id}`

Get all chats involving a user (as either participant).

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string | User ID |

**Response**
```json
{
  "chats": [
    {
      "chat_id": "string",
      "user_1_id": "string",
      "user_2_id": "string"
    }
  ]
}
```
