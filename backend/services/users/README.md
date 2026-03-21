# Users Service

Python/FastAPI · Port `8004`

---

## `GET /`

Health check.

**Response**
```json
{ "status": "ok" }
```

---

## `POST /users/auth/signup`

Register a new user.

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `email` | string | yes |
| `password` | string | yes |
| `name` | string | no |

**Response** — if email verification is pending:
```json
{ "message": "Confirmation email sent. Please verify your email to continue." }
```

**Response** — if session is created immediately:
```json
{
  "user": {
    "user_id": "uuid",
    "name": "string | null",
    "email": "string",
    "stripe_connected_account_id": "string | null"
  },
  "access_token": "string",
  "refresh_token": "string",
  "user_id": "uuid"
}
```

---

## `POST /users/auth/login`

Login with email and password.

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `email` | string | yes |
| `password` | string | yes |

**Response**
```json
{
  "user": {
    "user_id": "uuid",
    "name": "string | null",
    "email": "string",
    "stripe_connected_account_id": "string | null"
  },
  "access_token": "string",
  "refresh_token": "string",
  "user_id": "uuid"
}
```

---

## `POST /users/auth/refresh`

Exchange a refresh token for a new token pair.

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `refresh_token` | string | yes |

**Response**
```json
{
  "access_token": "string",
  "refresh_token": "string"
}
```

---

## `GET /users`

List all users.

**Response**
```json
[
  {
    "user_id": "uuid",
    "name": "string | null",
    "email": "string",
    "stripe_connected_account_id": "string | null"
  }
]
```

---

## `GET /users/{user_id}`

Get a user profile by ID.

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string (uuid) | User ID |

**Response**
```json
{
  "user_id": "uuid",
  "name": "string | null",
  "email": "string",
  "stripe_connected_account_id": "string | null"
}
```

---

## `PUT /users/{user_id}`

Update a user profile. Requires a valid Bearer token; users can only update their own profile.

**Headers**
```
Authorization: Bearer <access_token>
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string (uuid) | User ID |

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `name` | string | no |
| `stripe_connected_account_id` | string | no |

**Response**
```json
{
  "user_id": "uuid",
  "name": "string | null",
  "email": "string",
  "stripe_connected_account_id": "string | null"
}
```
