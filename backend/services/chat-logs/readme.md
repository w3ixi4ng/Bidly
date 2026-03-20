# Chat-Logs Service

Python/FastAPI · Port `8002`

Dependencies: Firebase Realtime Database

---

## `GET /`

Health check.

**Response**
```json
{ "status": "ok" }
```

---

## `POST /chat-logs/{chat_id}/messages`

Add a message to a chat. Timestamp is set server-side by Firebase.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `chat_id` | string | Chat session ID |

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `sender_id` | string | yes |
| `message` | string | yes |

**Response** `201`
```json
{
  "sender_id": "string",
  "message": "string",
  "timestamp": null
}
```

> `timestamp` is always `null` in the response — it is set by Firebase on write.

---

## `GET /chat-logs/{chat_id}/messages`

Get all messages in a chat, ordered by timestamp ascending.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `chat_id` | string | Chat session ID |

**Response**
```json
{
  "messages": [
    {
      "sender_id": "string",
      "message": "string",
      "timestamp": "ISO8601 datetime | null"
    }
  ]
}
```

---

## `DELETE /chat-logs/{chat_id}`

Delete an entire chat session and all its messages.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `chat_id` | string | Chat session ID |

**Response**
```json
{ "status": "deleted" }
```
