# Handle-Payment Orchestrator

Python/FastAPI · Port `8012`

Orchestrates the full payment lifecycle and handles Stripe webhooks.

---

## `POST /handle-payment/capture`

Initiate a payment hold via Stripe. Returns the client secret for frontend confirmation.

**Request Body**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | yes | |
| `description` | string | yes | |
| `category` | string | no | Design, Development, Writing, Marketing, Other |
| `client_id` | string | yes | |
| `starting_bid` | float | yes | |
| `auction_start_time` | datetime | yes | timezone-aware |
| `auction_end_time` | datetime | yes | timezone-aware |

**Response**
```json
{ "client_secret": "pi_..._secret_..." }
```

---

## `POST /handle-payment/release`

Release payment to the auction winner and refund the remainder to the client.

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `payment_id` | string | yes |
| `freelancer_id` | string | yes |
| `amount` | float | yes |
| `client_id` | string | yes |

**Response**
```json
{ "status": "released" }
```

**Internal Flow**
1. Retrieve `payment_intent_id` from payment log
2. Get freelancer Stripe account from Users service
3. Call Payment service to release funds
4. Update payment log status to "released"

---

## `POST /handle-payment/refund`

Full refund to the client.

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `payment_id` | string | yes |

**Response**
```json
{ "status": "refunded" }
```

**Internal Flow**
1. Retrieve `payment_intent_id` from payment log
2. Call Payment service to refund
3. Update payment log status to "refunded"

---

## `POST /handle-payment/stripe/webhook`

Stripe webhook handler. Processes `payment_intent.succeeded` events.

**Headers**
```
stripe-signature: <webhook signature>
```

**Request Body** — raw Stripe webhook event payload

**Response**
```json
{ "status": "success" }
```

**Internal Flow** (on `payment_intent.succeeded`)
1. Create payment log
2. POST to `/create-task` to trigger task creation (idempotency-safe)
