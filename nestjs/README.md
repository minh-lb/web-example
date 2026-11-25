# NestJS backend

Feature modules follow the [official NestJS modules guide](https://docs.nestjs.com/modules). Each business feature owns its controller, service, repository and policies where applicable. Modules import only required dependencies and export only public providers.

```text
src/
  app.module.ts
  main.ts
  worker.module.ts
  worker.ts
  common/              Shared validation, HTTP errors, date formatting
  database/            Shared MySQL/Redis provider and schema
  modules/
    auth/              Signed requests and actor/role checks
    services/          Service catalog
    bookings/          Bookings and availability
    customers/         Customer directory and contact updates
    dashboard/         Read-only dashboard
    queue/             Queue API, retry policy and processor
    health/            Public readiness endpoint
```

DashboardModule imports BookingsModule and consumes its exported BookingsService; repositories stay private. DatabaseModule exports one Database provider per application context. Booking creation deliberately writes the confirmation job in the same MySQL transaction, preserving atomicity. The separate worker uses NestFactory.createApplicationContext(WorkerModule) without HTTP controllers. No global modules or circular dependencies.

Build: `npm install && npm run build` or `docker compose build nestjs`. API: `node dist/main.js`. Worker: `node dist/worker.js`. Unit tests: `npm run test:unit` after build. The API initializes MySQL and seeds missing fixtures. Redis caches service lists. Tests reset only databases ending in _test. Existing HTTP contracts and queue behavior remain unchanged.

See [API reference](API.md) for routes, access control and testing.
