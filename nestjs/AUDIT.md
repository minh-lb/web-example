# Business audit log

Inspired by AWS CloudTrail event record and Event History:
- https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-record-contents.html
- https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events-console.html

Admin-only page: /audit-logs. Read API: GET /api/audit-logs (signed admin identity). Filters: eventSource, eventName, actor (exact email), outcome (SUCCESS/FAILURE), from/to (inclusive UTC dates, YYYY-MM-DD), page (25 records). Newest first. No update/delete API.

Coverage: CreateBooking, ChangeBookingStatus, UpdateCustomer, CreateService, UpdateService, ArchiveService, EnqueueJob, RetryJob; ProcessJob per worker attempt, including retryable failures. Booking creation represents associated customer upsert and confirmation enqueue as one business operation. Each authenticated HTTP event carries actor identity, event ID, timestamp, resource ID if known, source, action, outcome, HTTP status. Worker events use system actor and null HTTP status. No raw payloads, headers, credentials, customer contact fields or error messages are persisted. Source IP is intentionally excluded because the API sees the BFF rather than a verified client IP.

Successful HTTP mutations and their audit event commit together in MySQL; nested repository transactions join the audited transaction and Redis invalidation happens after commit. Worker audit records share the job transaction. Rejected authenticated operations are recorded after rollback; persistence of rejected events is best effort if the database is unavailable. Invalid signatures, login/logout, reads and seed operations are outside this business-event scope. The table is append-only through application APIs, not tamper-proof against database administrators. No automatic expiry or backfill is configured.
