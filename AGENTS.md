# AGENTS.md

## Quick start

```bash
# Local development
yarn install
# set DATABASE_URL (and JWT_SECRET) in .env — see .env.template
yarn start:dev                # nest start --watch, port from SERVER_PORT env (default 3030)

# App only in Docker (DB is external/managed, configured via DATABASE_URL)
docker compose up -d --build  # builds and starts the app image only
```

## Commands

| Command | Notes |
|---|---|---|
| `yarn build` | `nest build`, outputs to `dist/` |
| `yarn start:dev` | watch mode |
| `yarn start:prod` | `node dist/main` |
| `yarn lint` | ESLint with `--fix` |
| `yarn format` | Prettier (`singleQuote`, `trailingComma: all`) |
| `yarn test` | Jest, rootDir=`src/`, matches `*.spec.ts` |
| `yarn test:e2e` | Jest config `test/jest-e2e.json`, matches `*.e2e-spec.ts`; requires PostgreSQL running |
| `yarn test:cov` | coverage in `coverage/` |
| `yarn migration:generate` | `typeorm migration:generate -d src/database/data-source.ts` |
| `yarn migration:run` | `typeorm migration:run -d src/database/data-source.ts` |
| `yarn migration:revert` | `typeorm migration:revert -d src/database/data-source.ts` |

## Architecture

- Single `AuthModule` in `src/auth/` — no monorepo, no package boundaries.
- **NestJS 9** + **TypeORM** (PostgreSQL) configured via `DATABASE_URL` (external/managed DB, e.g. Neon). `synchronize: true` in dev only (disabled when `NODE_ENV=production`). TLS certificate verification is controlled by `DB_SSL_REJECT_UNAUTHORIZED` (default `false` in dev, `true` in production). Migration CLI available at `src/database/data-source.ts`.
- **Repository pattern**: `src/auth/repositories/` defines `IUserRepository` / `IUserLogRepository` interfaces with injection tokens (`USER_REPOSITORY`, `USER_LOG_REPOSITORY`). Services inject via `@Inject(TOKEN)`, not `@InjectRepository()`.
- **Passport JWT** strategy extracts token from `Authorization: Bearer` header; expiry from `JWT_EXPIRATION` env (default 4h). It loads the user **and its session** (`user_log`) in a single JOIN query (see `IUserRepository.findOneByIdWithSession`).
- All routes under `/{prefix}/{version}/` (from `API_PREFIX` and `API_VERSION` env vars, defaults `api` and `1`). Auth routes: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `DELETE /api/v1/auth/logout/:id`, `GET /api/v1/auth/check-status`, `GET /api/v1/auth/private{2,3}`.
- Composite decorator `@Auth(...roles)` = `@RoleProtected` + `@UseGuards(AuthGuard(), UserRoleGuard, SessionGuard)`. Roles: `user` (default), `admin`, `super-user`. Only `user` and `admin` are assignable via the users API (`UpdateUserDTO.roles`).
- `GET /users` (admin/super-user) requires **at least one** filter query param — `email`, `fullname` (partial ILIKE contains), `active`, `roles`, `createdAtFrom`, `createdAtTo` (ISO dates). Enforced by reusable `AtLeastOneConstraint` (`src/common/validators/at-least-one.validator.ts`) via a deliberately non-optional hidden DTO property, because `@IsOptional` skips all validators of an empty property. Filters combine with AND.
- Password: bcrypt, rounds from `BCRYPT_SALT_ROUNDS` env (default 10). DTO validation via `class-validator`. Global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`.
- **Rate limiting**: `@nestjs/throttler` (`THROTTLE_LIMIT` req per `THROTTLE_TTL` ms, defaults 10/60000). **Exception filter**: `AllExceptionsFilter` returns `{ statusCode, message, timestamp, path }` and logs the original error. **Logging**: `nestjs-pino` with pretty-print in dev.
- **Output sanitization**: `ClassSerializerInterceptor` global + `@Exclude()` on `User.password` and the transient `User.userLog` (no more manual `password = undefined`).
- **Transactions**: `DataSource.transaction()` wraps session log creation (login) and session removal (logout).
- **Sessions**: one active session per user (`user_log.userId` UNIQUE). `SessionGuard` validates the presented token against the loaded session using a constant-time comparison. `checkAuthStatus` does **not** rotate the token.

## Quirks

- `.env` is gitignored but committed locally with dev defaults. See `.env.template` for all supported vars (server, CORS, JWT, throttler, bcrypt, entity defaults).
- `SERVER_PORT` is now read from env instead of hardcoded.
- E2E test (`test/app.e2e-spec.ts`) requires PostgreSQL running; mocks the DB layer to test validation layer only.
- ESLint disables `explicit-function-return-type`, `explicit-module-boundary-types`, `no-explicit-any`, `interface-name-prefix`.
- Timestamps use TypeORM `@CreateDateColumn` / `@UpdateDateColumn` / `@DeleteDateColumn` (database-level `NOW()`).
- `UserLog` entity tracks active sessions; logout removes the log row.

## Response format

All endpoints must return the standard envelope defined by `ResponseInterceptor`:

**Success** (`src/common/interceptors/response.interceptor.ts`):
```json
{ "statusCode": 200, "message": "OK", "data": { ... }, "timestamp": "2026-07-27T..." }
```

**Error** (global `AllExceptionsFilter`):
```json
{ "statusCode": 400, "message": "...", "timestamp": "...", "path": "/api/v1/..." }
```

- `data` preserves the controller's return value as-is.
- For paginated endpoints, use `rows` for the items array: `{ rows: T[], total, page, limit }`.
- Never return the raw entity or a primitive directly; the interceptor wraps it automatically.
- No need to manually set statusCode, message, or timestamp in controllers.
