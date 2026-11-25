# Global business audit log

Inspired by AWS CloudTrail event record and Event History:
- https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-record-contents.html
- https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events-console.html

Admin-only page: /audit-logs. Read API: GET /api/audit-logs (signed admin identity). Filters: eventSource, eventName, actor (exact email), outcome (SUCCESS/FAILURE), from/to (inclusive UTC dates, YYYY-MM-DD), page (25 records). Newest first. No update/delete API.

## Global policy
AuditModule registers a NestJS APP_INTERCEPTOR once. After authentication, every matched POST, PUT, PATCH or DELETE route under /api/ is captured automatically, except auth, health and audit-logs. No decorators or audit dependencies in business controllers, services or repositories. Names for existing routes are centralized in audit-policy.ts; new mutation routes use METHOD_handlerName automatically. Route source comes from the matched route template, never user-supplied raw URL. The background worker uses an audited runner outside the queue processor transaction.

## Failure isolation
Business transactions remain unchanged. AuditWriter attempts a separate database insert after business completion (including rejection), catches storage errors and preserves the original response or exception. Worker audit runs after its transaction. The write is awaited for predictable visibility, so it can add latency or compete for database resources, but a failed insert does not roll back a business change. A crash or database outage can lose events; this is best-effort audit, not guaranteed delivery. No outbox or durable transport is configured.

## Data and scope
Event ID, time, source, name, actor, resource ID if available, outcome and HTTP status. Worker events use system identity and null HTTP status. No raw payloads, headers, customer contact fields, secrets or error messages. Login/logout, rejected signatures, reads, seed operations and non-HTTP actions other than the queue runner are out of scope. The table is append-only through application APIs, not tamper-proof against database administrators. No automatic expiry or backfill.
