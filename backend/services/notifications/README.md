# Notifications Service

Python/FastAPI · Port `8008`

Dependencies: SendGrid · Sender: `esdbidly@proton.me`

---

## `GET /`

Health check.

**Response**
```json
{ "status": "ok" }
```

---

## `POST /notifications/send`

Send a templated email via SendGrid.

**Request Body**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `to_email` | string | yes | Recipient email address |
| `template_name` | string | yes | See templates below |
| `dynamic_template_data` | object | yes | Key-value pairs injected into the template |

**Available Templates**

| `template_name` | Variables |
|-----------------|-----------|
| `auction_end_freelancer` | `freelancer_name`, `task_name`, `winning_bid`, `client_name` |
| `auction_end_client` | `client_name`, `task_name`, `freelancer_name`, `winning_bid` |
| `bid_outbid_freelancer` | `freelancer_name`, `task_name`, `bid_price` |

**Response**
```json
{
  "status": "success",
  "message": "Email sent successfully",
  "status_code": 202
}
```

**Error Responses**
| Status | Description |
|--------|-------------|
| `404` | `template_name` not found |
| `500` | SendGrid send failure |
