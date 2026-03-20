# WebSocket Service

Node.js/Express + Socket.IO · Port `8007`

Dependencies: Socket.IO, RabbitMQ (AMQP)

Bridges RabbitMQ events to connected browser clients via Socket.IO. Room naming: `auction_{task_id}`, `user_{user_id}`.

---

## HTTP

| Method | Path | Response |
|--------|------|----------|
| GET | `/` | `{ status: "ok" }` |

---

## Socket.IO Events

### Client → Server

#### `join_auction`

Join an auction room to receive real-time bid updates.

**Payload**
```json
{ "task_id": "string" }
```

**Server Response** — emits `joined`
```json
{ "room": "auction_{task_id}" }
```

---

#### `join_user`

Join a user presence room for personal notifications and online/offline tracking.

**Payload**
```json
{ "user_id": "string" }
```

**Server Response** — emits `joined` + `user_online` for each currently online user, then broadcasts `user_online` globally
```json
{ "room": "user_{user_id}" }
```

---

### Server → Client

| Event | Scope | Payload |
|-------|-------|---------|
| `joined` | caller only | `{ room: string }` |
| `error` | caller only | `{ message: string }` |
| `bid_update` | auction room + global | `{ task_id, bid_amount, bidder_id, ... }` |
| `task_created` | global | full task object |
| `new_message` | user room(s) | `{ chat_id, sender_id, recipient_id, message, notify_sender }` |
| `task_started` | global | `{ task_id }` |
| `auction_ended` | global | `{ task_id, ... }` |
| `user_online` | global | `{ user_id }` |
| `user_offline` | global | `{ user_id }` |

> `new_message` is sent to `user_{recipient_id}`. If `notify_sender` is `true`, also sent to `user_{sender_id}`.

---

## RabbitMQ Consumers

All consumers use exchange `bidly` (topic, durable).

| Queue | Routing Key | Emits | Required Payload Field |
|-------|-------------|-------|------------------------|
| `Out_Bidded_WebSocket` | `out.bidded.websocket` | `bid_update` to auction room + global | `task_id` |
| `Task_Created_WebSocket` | `task.created.websocket` | `task_created` globally | — |
| `New_Message_WebSocket` | `new.message.websocket` | `new_message` to user room(s) | `recipient_id` |
| `Task_Started_WebSocket` | `task.started.websocket` | `task_started` globally | `task_id` |
| `End_Auction_WebSocket` | `process.winner` | `auction_ended` globally | `task_id` |
