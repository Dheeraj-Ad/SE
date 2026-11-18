# Local API reference

Base URL: `http://127.0.0.1:3000/api`. JSON bodies and responses are used except multipart group upload and CSV downloads. Errors return `{ "error": "human-readable message" }` and an appropriate HTTP status.

Sign in using `POST /auth/login` with `{email,password}`. The response contains `{user,csrf,timezone}` and sets an HTTP-only session cookie. Send that cookie on subsequent calls and send `X-CSRF-Token: <csrf>` on every authenticated mutation. Login also rejects cross-origin requests. `GET /auth/me` refreshes the client’s identity and CSRF state.

| Method / path | Role | Behavior |
|---|---|---|
| GET `/health` | Public | Health status, without personal data |
| POST `/auth/login` | Public | Authenticate; throttled after repeated failed attempts |
| GET `/auth/me` | Signed in | Session identity, timezone, CSRF |
| POST `/auth/logout` | Signed in | Revoke current session |
| POST `/auth/password` | Signed in | `{current_password,password}`; revoke all own sessions |
| GET `/hosts` | Signed in | Active student/faculty names and departments for selection |
| GET `/dashboard` | Signed in | Role-scoped counts |
| GET `/records` | Signed in | Scoped search and pagination |
| GET `/records/:id` | Signed in | Scoped visitor/request/visit details |
| POST `/requests` | Student/Faculty | Create Pending request |
| POST `/requests/:id/decision` | Admin | `{decision:"Approved" or "Rejected", remarks?}` |
| POST `/gate/direct` | Security | Register approved walk-in with visiting window |
| POST `/gate/requests/:id/entry` | Security | `{verified:true}`; record approved entry |
| POST `/gate/visits/:id/exit` | Security | Record exit and overstay flag |
| POST `/gate/visits/:id/extend` | Security | `{ends_at}`; strictly extend active visit |
| GET `/codes` | Admin/Student/Faculty | Admin sees all; other creators see own |
| POST `/codes` | Admin/Student/Faculty | Create a code with validity window |
| POST `/codes/:id/revoke` | Admin/owner | Revoke future entry permission |
| POST `/gate/codes/verify` | Security | `{code}`; validate and show visitor |
| POST `/gate/codes/entry` | Security | `{code,ends_at,verified:true}`; record a new code visit |
| GET `/groups/template` | Admin | Download CSV column template |
| GET `/groups` | Admin | List import batches |
| POST `/groups` | Admin | Multipart `file` and `name`; stage review |
| GET `/groups/:id` | Admin | Return reviewed rows and per-row errors |
| PUT `/groups/:id` | Admin | `{rows:[visitorFields...]}`; validate corrections |
| POST `/groups/:id/approve` | Admin | Atomic group approval |
| GET `/reports` | Admin | Counts and source breakdown |
| GET `/reports/export` | Admin | Full matching visitor dataset as CSV |
| GET `/users` | Admin | Account list without password hashes |
| POST `/users` | Admin | `{name,email,password,role,department?}` |
| PATCH `/users/:id` | Admin | Update `name`, `department`, `role`, boolean `active`, optional `password` |
| GET `/notifications` | Signed in | Latest 200 own notifications |
| POST `/notifications/read` | Signed in | Mark all own notifications as read |
| GET `/admin/audit` | Admin | Latest 500 audit events |
| GET `/admin/outbox` | Admin | Delivery mode and latest 200 messages |
| POST `/admin/outbox/:id/retry` | Admin | Retry failed message if visitor has not exited |

## Visitor fields

```json
{
  "name": "Asha Visitor",
  "phone": "9876543210",
  "email": "asha@example.com",
  "affiliation": "Visiting college",
  "relation": "Guest",
  "id_proof": "College ID ending 1234",
  "host": "Computer Science",
  "purpose": "Research meeting",
  "starts_at": "2026-12-01T10:00:00+05:30",
  "ends_at": "2026-12-01T12:00:00+05:30"
}
```

`email`, `affiliation`, `relation`, and `id_proof` are optional. Start/end must be valid ISO datetime strings with `Z` or an explicit offset. The date cannot be in the past in campus time; end must be later than start and later than now. Phone accepts 10–15 digits with optional `+`, spaces, parentheses, or hyphens. A manual ID-verification confirmation is still required at entry, even when an ID reference is supplied.

Group files use the same field names. Required columns are `name,phone,host,purpose,starts_at,ends_at`. Excel phone cells should be text; date cells or ISO strings are accepted. CSV quoted fields are supported. Extra columns are ignored; duplicate header names are rejected.

## Search and reports

`q` searches literal name, phone, or host text; `status` filters the derived visit status; `from` and `to` are inclusive ISO datetime bounds on the planned visit start; `source` is `request`, `direct`, `group`, or `code`. Search supports `page` (starting at 1) and `limit` (1–1000, default 50). Its result is `{rows,total,page,limit}`. Reports use the same filters, excluding pagination.

The `visitors` report metric counts visitor/request records, including separate repeat visits, not distinct human identities. `approvals` includes approved and subsequently lapsed records; `entries` and `exits` count actual recorded timestamps. `inside` includes both Inside Campus and Time Expired.

## Important errors

- `400`: validation, malformed input, invalid time window, invalid upload.
- `401`: invalid credentials or missing/expired session.
- `403`: role/ownership/CSRF/origin check failed.
- `404`: record, visitor, or code not found.
- `409`: duplicate action or incompatible state, including expired/revoked code.
- `413`: oversized JSON body.
- `429`: login attempts temporarily throttled.
- `500`: generic unexpected server error; details are logged server-side.
