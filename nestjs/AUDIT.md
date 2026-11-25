# Global business audit log

Inspired by AWS CloudTrail event record and Event History:
- https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-record-contents.html
- https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events-console.html

Admin-only page: /audit-logs. Read API: GET /api/audit-logs (signed admin identity). Filters: eventSource, eventName, actor (exact email), outcome (SUCCESS/FAILURE), from/to (inclusive UTC dates, YYYY-MM-DD), page (25 records). Newest first. No update/delete API.

## Global policy
AuditModule registers a NestJS APP_INTERCEPTOR once. After authentication, every matched POST, PUT, PATCH or DELETE route under /api/ is captured automatically, except auth, health and audit-logs. No decorators or audit dependencies in business controllers, services or repositories. Names for existing routes are centralized in audit-policy.ts; new mutation routes use METHOD_handlerName automatically. Route source comes from the matched route template, never user-supplied raw URL. The background worker uses an audited runner outside the queue processor transaction.

## Failure isolation
Audit schema initialization runs separately after the business schema, using the audit pool. If initialization fails, the API still starts; restore database permissions and restart to initialize a missing table. Business transactions remain unchanged. The global interceptor observes the original Observable without replacing its emissions or delaying the response. AuditWriter enqueues metadata in a bounded in-memory FIFO (500 waiting events per process, one active write). A separate MySQL connection pool (2 connections, finite wait queue and query/connect timeouts) persists records asynchronously; it shares the same MySQL server but not the business pool. Worker events enqueue after the job transaction; unexpected processor exceptions are recorded as failures with unknown resource ID and rethrown unchanged. Metadata inspection and enqueue failures cannot replace the business result or exception. Event timestamps are captured at enqueue time in UTC. The UI is eventually consistent; use Refresh to see newly persisted events. Storage errors and overflow drop events with diagnostic logging; shutdown attempts to drain for up to three seconds before discarding queued events. A crash, prolonged outage or saturation can lose events. This is best-effort audit, not durable delivery. No outbox or external transport is configured.

## Data and scope
Event ID, time, source, name, actor, resource ID if available, outcome and HTTP status. Worker events use system identity and null HTTP status. No raw payloads, headers, customer contact fields, secrets or error messages. Login/logout, rejected signatures, reads, seed operations and non-HTTP actions other than the queue runner are out of scope. The table is append-only through application APIs, not tamper-proof against database administrators. No automatic expiry or backfill.
