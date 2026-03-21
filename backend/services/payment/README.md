# Payment Service

Python/FastAPI · Port `8011`

Dependencies: Stripe · Currency: SGD

---

## `GET /`

Health check.

**Response**
```json
{ "status": "ok" }
```

---

## `POST /payment/create-connected-account`

Create a Stripe connected account for a freelancer and return an onboarding link.

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `email` | string | yes |

**Response**
```json
{
  "url": "https://connect.stripe.com/...",
  "stripe_connected_account_id": "acct_..."
}
```

---

## `GET /payment/account-status/{account_id}`

Check the onboarding status of a Stripe connected account.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `account_id` | string | Stripe connected account ID |

**Response**
```json
{
  "account_id": "acct_...",
  "charges_enabled": true,
  "payouts_enabled": true,
  "details_submitted": true
}
```

---

## `POST /payment/onboarding-link/{account_id}`

Generate a new onboarding link for an existing connected account.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `account_id` | string | Stripe connected account ID |

**Response**
```json
{ "url": "https://connect.stripe.com/..." }
```

---

## `POST /payment/capture-payment`

Create a Stripe payment intent (holds funds). Returns the full Stripe PaymentIntent object.

**Request Body**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | yes | |
| `description` | string | yes | |
| `category` | string | no | `"Design"`, `"Development"`, `"Writing"`, `"Marketing"`, `"Other"` |
| `client_id` | string | yes | |
| `starting_bid` | float | yes | Amount in SGD |
| `auction_start_time` | datetime | yes | timezone-aware |
| `auction_end_time` | datetime | yes | timezone-aware |

**Response** — Stripe `PaymentIntent` object, key fields:
```json
{
  "id": "pi_...",
  "amount": 10000,
  "currency": "sgd",
  "status": "requires_capture",
  "metadata": {
    "client_id": "string",
    "title": "string",
    "description": "string",
    "category": "string",
    "starting_bid": "0.0",
    "auction_start_time": "ISO8601",
    "auction_end_time": "ISO8601",
    "auction_status": "string"
  }
}
```

---

## `POST /payment/release-payment`

Transfer the winning bid amount to the freelancer and refund the remainder to the client.

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `payment_intent_id` | string | yes |
| `stripe_connected_account_id` | string | yes |
| `amount` | float | yes | Winning bid in SGD |

**Response**
```json
{
  "transfer_id": "tr_...",
  "refund_id": "re_..."
}
```

---

## `POST /payment/refund-payment`

Full refund to the client.

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `payment_intent_id` | string | yes |

**Response**
```json
{ "refund_id": "re_..." }
```

---

## `GET /payment/verify/{payment_intent_id}`

Verify the status of a payment intent.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `payment_intent_id` | string | Stripe payment intent ID |

**Response**
```json
{
  "payment_intent_id": "pi_...",
  "status": "string",
  "amount": 10000,
  "metadata": {}
}
```
