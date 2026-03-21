# Send-Notifications Orchestrator

Python/RabbitMQ consumer

Listens for auction and bid events and sends templated emails via the Notifications service.

---

## RabbitMQ Consumers

### Auction End - `End_Auction_Notifications`

**Routing Key:** `end.auction.notifications`

**Message Consumed**
```json
{
  "client_id": "string",
  "freelancer_id": "string",
  "task_title": "string",
  "task_description": "string",
  "amount": 0.0
}
```

**Processing**
1. Fetch user details for both client and freelancer
2. Send `auction_end_freelancer` email to the winner
3. Send `auction_end_client` email to the client

---

### Outbid - `Out_Bidded_Notifications`

**Routing Key:** `out.bidded.notifications`

**Message Consumed**
```json
{
  "task_id": "string",
  "previous_bidder_id": "string",
  "bid_amount": 0.0
}
```

**Processing**
1. Fetch task and previous bidder details
2. Send `bid_outbid_freelancer` email to the outbid user
