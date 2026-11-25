# web-example

Local Playwright learning monorepo.

- `nextjs/`: Next.js frontend, Keycloak BFF and Playwright.
- `nestjs/`: NestJS REST API, domain policies, application services, MySQL repositories and independent database queue worker.
- `docker-compose.yml`: MySQL 8.4, Redis 7.4, NestJS, worker, Next.js and Keycloak.

```sh
docker compose up -d --build
docker compose ps
```

UI: http://localhost:3000 · API health: http://localhost:8000/api/health · Keycloak: http://localhost:8080/idp

Local demo credentials: admin / Admin123!, staff / Staff123!.

Next.js signs server-to-server API requests with HMAC; Redis caches service lists; MySQL stores bookings and durable job state. Jobs and bookings commit in the same transaction. Worker retries use MySQL row locks. No real emails are sent.

## Tests

```sh
docker compose build nestjs
docker run --rm web-example-nestjs:local npm run test:unit
DB_DATABASE=web_example_test docker compose up -d --build --wait nestjs
DB_DATABASE=web_example_test docker compose exec -T nestjs npm run test:integration
DB_DATABASE=web_example_test docker compose up -d --build
cd nextjs && npm ci && npm run test:unit && npm run typecheck && npm run test:e2e
```

CI runs five independent jobs on pull requests. The fixtures refuse to reset non-test databases.

## Migration

Stop the previous Laravel API and worker before switching (`docker compose down --remove-orphans` without `-v`). The NestJS initializer creates missing tables and seeds missing demo records; existing MySQL domain tables are retained. The Laravel internal `jobs` table is no longer used; pending domain jobs are picked up from `background_jobs`. Review any legacy PROCESSING jobs before switching. Prisma/SQLite data is not automatically migrated. Local demo secrets are not production credentials.

Admin users can search, inspect and update existing customer contacts from the Customers page. Customer records are created through bookings; staff cannot access the customer directory.

Backend endpoint and permission reference: [NestJS API](nestjs/API.md).
