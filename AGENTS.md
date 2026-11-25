# web-example — local Next.js + NestJS monorepo

- `nextjs/`: Next.js frontend, Keycloak/NextAuth, server-side signed BFF, Playwright and component tests.
- `nestjs/`: NestJS API, feature modules (auth, services, bookings, dashboard, queue, health), MySQL and Redis; separate durable MySQL queue worker.
- Organize NestJS by business feature; colocate controllers, services, repositories, policies and tests. Use explicit imports/exports, keep providers private by default, and share database connections through DatabaseModule. Controllers delegate to services; SQL belongs in repositories or dedicated read models. Preserve API response contracts and HMAC authentication; never trust browser-provided identity or role.
- Every reusable Next.js component has a colocated test. Read installed Next.js docs before UI edits.
- CI runs on pull requests: frontend unit/component, frontend build, backend unit, backend integration and Playwright E2E in parallel. Fixtures may only reset a database ending in _test.
- Local-only demo secrets must not be used in production.
