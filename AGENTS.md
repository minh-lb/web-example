# web-example — local Next.js + NestJS monorepo

- `nextjs/`: Next.js frontend, Keycloak/NextAuth, server-side signed BFF, Playwright and component tests.
- `nestjs/`: NestJS API, Domain/Application/Infrastructure/HTTP layers, MySQL and Redis; separate durable MySQL queue worker.
- Keep domain rules in Domain, orchestration in Application and SQL in Infrastructure. Controllers delegate to use cases. Preserve API response contracts and HMAC authentication; never trust browser-provided identity or role.
- Every reusable Next.js component has a colocated test. Read installed Next.js docs before UI edits.
- CI runs on pull requests: frontend unit/component, frontend build, backend unit, backend integration and Playwright E2E in parallel. Fixtures may only reset a database ending in _test.
- Local-only demo secrets must not be used in production.
