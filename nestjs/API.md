# Backend API
All endpoints are under /api. Except health, requests require a valid HMAC signature from the Next.js BFF (timestamp, identity, role and body hash). Browser role headers are never trusted by the BFF.

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| GET | /health | Public | Database readiness |
| GET | /dashboard | Admin, staff | Summary and recent bookings |
| GET | /services | Admin, staff | Search, category, pagination; staff see active services only |
| GET | /services/:id | Admin, staff | Service details; inactive services hidden from staff |
| POST | /services | Admin | Create service |
| PATCH | /services/:id | Admin | Edit or reactivate service |
| DELETE | /services/:id | Admin | Archive (soft delete) |
| GET | /bookings | Admin, staff | Search, status, sorting, pagination |
| GET | /bookings/:id | Admin, staff | Booking detail |
| POST | /bookings | Admin, staff | Create booking and confirmation job atomically |
| PATCH | /bookings/:id | Admin, staff | Change booking status |
| GET | /availability | Admin, staff | Occupied slots by serviceId and date |
| GET | /customers | Admin | Search contact directory (page, limit, search) |
| GET | /customers/:id | Admin | Customer and booking count |
| PATCH | /customers/:id | Admin | Update name, email or phone; duplicate email returns 409 |
| GET | /queue | Admin | Queue state, counts and pagination |
| GET | /queue/:id | Admin | Job details |
| POST | /queue | Admin | Enqueue demo scenario |
| PATCH | /queue/:id | Admin | Retry failed job |

Customer records are created or reused through booking creation; no standalone create/delete route is provided because bookings reference customers. Customer updates affect the contact data displayed for existing bookings. Queue and booking history are retained. No real email is sent. Existing frontend contracts and MySQL schema are unchanged.

Errors: 400 invalid input, 401 invalid signature, 403 insufficient role, 404 unknown/hidden resource, 409 conflicting booking/status/email. Successful creation returns 201; updates and reads return 200.

Run backend unit and integration suites as described in the root README. CI uses an isolated database ending in _test.
