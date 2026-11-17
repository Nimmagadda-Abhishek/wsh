# WSH Portal API

REST API reference for the Express backend.

## Base URL and setup

The default local base URL is `http://localhost:3000`. Set `PORT` to change it.
The server also requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`; configure
`SUPABASE_SERVICE_ROLE_KEY` for server-side admin database operations. See
[.env.example](./.env.example). Apply [supabase/schema.sql](./supabase/schema.sql)
to the Supabase project before using the API.

All request and response bodies use JSON unless an endpoint explicitly accepts
multipart form data. Dates are ISO-8601 timestamps.

## Authentication

Protected endpoints require a valid Supabase access token:

```http
Authorization: Bearer <access_token>
```

The following route groups require authentication for every endpoint:

- `/api/profile`
- `/api/home`
- `/api/search`
- `/api/events`
- `/api/subscriptions`

The `/api/auth/*` routes and `/health` do not require this header. Profile
updates and avatar uploads also require an active subscription. Event
registration requires an active subscription; creating events does not.

## Response conventions

Successful responses generally have this shape:

```json
{
  "success": true,
  "data": {}
}
```

Paginated list responses additionally include:

```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "total_pages": 0,
    "has_next": false
  }
}
```

Errors generally have this shape:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Description of the error"
}
```

## Health

### `GET /health`

Unauthenticated service and environment status check.

**Success `200`** — `data` contains `status`, `service`, `version`,
`timestamp`, and `environment`.

## Authentication

### `POST /api/auth/signup`

Create an account.

**JSON body**

| Field | Type | Required | Notes |
|---|---|---:|---|
| `email` | string | Yes | |
| `password` | string | Yes | At least 8 characters |
| `full_name` | string | Yes | |

**Success `201`** — `data.user` contains `id`, `email`, `full_name`, and
`email_confirmed`; `data.session` is a token object or `null` pending email
confirmation. `data.message` explains the account status.

### `POST /api/auth/login`

Sign in using email and password.

**JSON body:** `email` (string, required), `password` (string, required).

**Success `200`** — `data` contains `user`, `session` (`access_token`,
`refresh_token`, `expires_at`), and `subscription` (`is_active`, and, when
active, `plan_name` and `expires_at`).

### `POST /api/auth/logout`

Sign out of the current Supabase auth session.

**JSON body:** none.

**Success `200`** — `data.message`.

### `POST /api/auth/refresh`

Exchange a refresh token for a refreshed session.

**JSON body:** `refresh_token` (string, required).

**Success `200`** — `data.session` contains `access_token`, `refresh_token`,
and `expires_at`.

### `POST /api/auth/forgot-password`

Request a password reset email.

**JSON body:** `email` (string, required).

The redirect URL is `PASSWORD_RESET_REDIRECT_URL`, or
`FRONTEND_URL/reset-password`, falling back to
`http://localhost:3001/reset-password`.

**Success `200`** — `data.message`.

### `POST /api/auth/reset-password`

Set a new password using the access token provided through the reset flow.

**JSON body**

| Field | Type | Required | Notes |
|---|---|---:|---|
| `access_token` | string | Yes | Token from the reset email flow |
| `new_password` | string | Yes | At least 8 characters |

**Success `200`** — `data.message`.

## Profiles

All profile endpoints require authentication.

### `GET /api/profile`

Get the authenticated user's profile, including profile fields and the
subscription relation.

**Success `200`** — `data.profile`.

### `GET /api/profile/completion-status`

Get profile completion and current subscription status.

**Success `200`** — `data` contains `is_profile_complete`, `missing_fields`,
`has_active_subscription`, `subscription` (or `null`), and
`can_update_profile`. The missing-field check includes `username`,
`full_name`, `bio`, and `avatar_url`.

### `GET /api/profile/{userId}`

Get another user's public profile fields. Authentication is still required.

**Success `200`** — `data.profile`.

### `PUT /api/profile`

Update the authenticated user's profile. Requires an active subscription.
Only supplied fields are updated.

**JSON body** — any of `username`, `full_name`, `bio`, `phone`, `location`,
`website` (all strings).

**Success `200`** — `data.profile`.

### `POST /api/profile/avatar`

Upload an avatar. Requires an active subscription.

**Content type:** `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---:|---|
| `avatar` | file | Yes | `.jpg`, `.jpeg`, `.png`, `.webp`, or `.gif`; maximum 5 MB |

**Success `200`** — `data.avatar_url` and `data.message`.

## Home

All home endpoints require authentication.

### `GET /api/home/feed`

Get published posts, newest first.

**Query parameters**

| Parameter | Type | Default | Notes |
|---|---|---:|---|
| `page` | integer | `1` | Minimum 1 |
| `limit` | integer | `10` | Clamped to 1–50 |
| `type` | string | — | Optional post type: `announcement`, `article`, or `featured` |

**Success `200`** — `data` is a post array with `likes_count`; includes
`pagination`.

### `GET /api/home/featured`

Get up to 10 published featured posts.

**Success `200`** — `data` is a post array.

### `GET /api/home/stats`

Get counts of users, public events, published posts, and active subscriptions.

**Success `200`** — `data` contains `total_users`, `total_events`,
`total_posts`, and `active_subscribers`.

### `POST /api/home/posts/{postId}/like`

Like a published post.

**Success `200`** — `data.post_id` and updated `data.likes_count`.
Returns `404` if the published post does not exist and `409` if already liked.

### `DELETE /api/home/posts/{postId}/like`

Remove the authenticated user's like from a post.

**Success `200`** — `data.post_id` and updated `data.likes_count`.

## Search

All search endpoints require authentication. `page` defaults to `1`; `limit`
defaults to `10` and is clamped to 1–50.

### `GET /api/search`

Search users, public events, and published posts.

**Query parameters**

| Parameter | Type | Required | Notes |
|---|---|---:|---|
| `q` | string | Yes | Search text |
| `type` | string | No | `users`, `events`, or `posts`; omit to search all |
| `page` | integer | No | |
| `limit` | integer | No | |

**Success `200`** — `data.query`, `data.type`, and `data.results`. Each
requested result group contains `data` and `total`. Includes `pagination`
with `page` and `limit`.

### `GET /api/search/users`

Search users by username, full name, or bio.

**Query parameters:** `q` (required), `page`, `limit`.

**Success `200`** — user array in `data` and a `pagination` object.

### `GET /api/search/events`

Find public events, optionally filtered by text, category, and date range.

**Query parameters**

| Parameter | Type | Required | Notes |
|---|---|---:|---|
| `q` | string | No | Matches title, description, or location |
| `category` | string | No | Exact category filter |
| `date_from` | date/time | No | Inclusive lower bound on `event_date` |
| `date_to` | date/time | No | Inclusive upper bound on `event_date` |
| `page` | integer | No | |
| `limit` | integer | No | |

**Success `200`** — event array in `data` and a `pagination` object.

## Events

All event endpoints require authentication. List results include public events.
Page numbers are at least 1; limits are clamped to 1–100.

### `GET /api/events`

List public events.

**Query parameters:** `page` (default `1`), `limit` (default `10`),
`category`, `date_from`, `date_to`, `sort_by`.

`sort_by=created_at` sorts by creation time; all other values sort by
`event_date`. Date filters apply to `event_date`.

**Success `200`** — event array in `data`, including `attendees_count`, and
`pagination`.

### `GET /api/events/my`

List the authenticated user's event registrations, newest registration first.

**Success `200`** — registration array in `data`, with the related event.

### `GET /api/events/{id}`

Get event details and the authenticated user's registration, if any.

**Success `200`** — event object in `data`, including `attendees_count` and
`user_registration` (or `null`). Returns `404` if not found.

### `POST /api/events`

Create an event. No subscription is required.

**JSON body**

| Field | Type | Required | Notes |
|---|---|---:|---|
| `title` | string | Yes | |
| `event_date` | date/time | Yes | |
| `description` | string | No | |
| `cover_image_url` | string | No | |
| `location` | string | No | |
| `end_date` | date/time | No | |
| `category` | string | No | |
| `tags` | string array | No | Defaults to `[]` |
| `max_attendees` | integer | No | `null` means no capacity limit |
| `is_public` | boolean | No | Defaults to `true` |

The authenticated user becomes the organizer.

**Success `201`** — `data.event`.

### `PUT /api/events/{id}`

Update an event. Only its organizer can update it. Only supplied fields are
updated; accepted fields are the event fields listed for creation.

**Success `200`** — `data.event`. Returns `404` if not found and `403` if the
caller is not the organizer.

### `DELETE /api/events/{id}`

Delete an event. Only its organizer can delete it.

**Success `200`** — `data.message`. Returns `404` if not found and `403` if
the caller is not the organizer.

### `POST /api/events/{id}/register`

Register for a public, future event. Requires an active subscription. A
registration can be reactivated after cancellation.

**JSON body:** none.

**Success `201`** — `data.registration` and `data.event_title`; reactivating a
cancelled registration returns `200`. Returns `404` if the event is missing or
not public, `400` for a past or full event, and `409` if already registered.

### `DELETE /api/events/{id}/register`

Cancel the authenticated user's active registration.

**Success `200`** — `data.message`. Returns `404` if no active registration
exists.

### `GET /api/events/{id}/attendees`

List registered attendees for an event.

**Query parameters:** `page` (default `1`), `limit` (default `20`, clamped to
1–100).

**Success `200`** — attendee registration array in `data` and `pagination`.

## Subscriptions

All subscription endpoints require authentication.

### `GET /api/subscriptions/plans`

List active plans, ordered by price.

**Success `200`** — plan array in `data`. A plan contains `id`, `name`,
`description`, `price`, `currency`, `duration_days`, and `features`.

### `GET /api/subscriptions/status`

Get the current active subscription status.

**Success `200`** — when active, `data` includes `is_active`, `plan_name`,
`price`, `currency`, `expires_at`, and `days_remaining`. If inactive,
`is_active` is `false`, and `plan_name` and `expires_at` are `null`.

### `GET /api/subscriptions/my`

Get the current subscription and recent subscription history (up to five
records).

**Success `200`** — `data.current` is the current unexpired active subscription
or `null`; `data.history` is the subscription array.

### `POST /api/subscriptions/subscribe`

Create a subscription to an active plan.

**JSON body:** `plan_id` (string/UUID, required).

This endpoint currently creates the subscription directly and does not
integrate or verify a payment gateway. Handle payment verification outside this
endpoint before making it available in a production purchase flow.

**Success `201`** — `data.subscription` and `data.message`. Returns `404` if
the plan is missing or inactive.

### `POST /api/subscriptions/cancel`

Cancel the authenticated user's active subscription.

**JSON body:** none.

**Success `200`** — `data.message`. Returns `404` if there is no active
subscription.

## Common errors

| HTTP status | Typical error | Meaning |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | Required field or query parameter is missing or invalid |
| `401` | `UNAUTHORIZED` | Missing, malformed, invalid, or expired bearer token |
| `403` | `SUBSCRIPTION_REQUIRED` / `FORBIDDEN` | Subscription required or action not permitted |
| `404` | `NOT_FOUND` | Resource or route not found |
| `409` | `ALREADY_LIKED` / `ALREADY_REGISTERED` | Duplicate action |
| `500` | `INTERNAL_SERVER_ERROR` / `DB_ERROR` | Unexpected or database error |
