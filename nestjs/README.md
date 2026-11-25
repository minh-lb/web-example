# NestJS backend

Build with `npm install && npm run build` or `docker compose build nestjs`. Run `node dist/main.js` for the API, `node dist/worker.js` for the independent worker. The API initializes the MySQL schema and seeds missing demo records. Redis caches service lists with versioned invalidation and TTL.

- `src/domain`: validation, booking transitions, queue scenarios
- `src/application`: orchestration and role checks
- `src/infrastructure`: SQL repositories, cache and schema
- `src/http`: NestJS controllers and HMAC guard

The worker locks a pending job and commits its state atomically. Retry delays are one and two seconds; failed jobs can be manually retried. Simulated confirmations have no external side effects. Existing Laravel domain tables are compatible; legacy queue transport is not used. Test fixture commands reject non-test databases.
