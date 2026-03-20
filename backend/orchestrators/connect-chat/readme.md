# Connect-Chat Orchestrator

Python/FastAPI · Port `8010`

Orchestrates chat creation when an auction ends and routes messages with WebSocket publishing.

---

## `POST /connect-chat/send`

Send a message between chat participants. Validates the sender, logs the message, and publishes to WebSocket.

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `chat_id` | string | yes |
| `sender_id` | string | yes |
| `recipient_id` | string | yes |
| `message` | string | yes |

**Response** `201`
```json
{ "status": "sent" }
```

**Internal Flow**
1. Verify chat exists and sender is a participant (via Chats service)
2. Store message (via Chat-Logs service)
3. Publish to `new.message.websocket` routing key

---

## RabbitMQ Consumer

**Queue:** `End_Auction_Chat` - **Routing Key:** `end.auction.chat`

Triggered when an auction ends. Creates a chat between the client and winner, then sends a congratulations message.

**Message Consumed**
```json
{
  "client_id": "string",
  "freelancer_id": "string",
  "task_title": "string"
}
```

**Processing**
1. Create (or retrieve existing) chat between client and freelancer
2. Send message: "Congratulations! You have won the bid for '{task_title}'."
3. Publish to `new.message.websocket`

**Message Published to WebSocket**

| Routing Key | Payload |
|-------------|---------|
| `new.message.websocket` | { chat_id, sender_id, recipient_id, message, notify_sender } |
