# AGENTS.md

## Quick start

```bash
# Local development
yarn install
docker compose up -d          # PostgreSQL on port 5432
# copy .env.template to .env, fill in values (or use the existing .env with dev defaults)
yarn start:dev                # nest start --watch, port from SERVER_PORT env (default 3030)

# Full stack in Docker (app + PostgreSQL)
docker compose up -d --build  # builds app image, starts both services
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
- **NestJS 9** + **TypeORM** (PostgreSQL) with `synchronize: true` in dev only (disabled when `NODE_ENV=production`). Migration CLI available at `src/database/data-source.ts`.
- **Repository pattern**: `src/auth/repositories/` defines `IUserRepository` / `IUserLogRepository` interfaces with injection tokens (`USER_REPOSITORY`, `USER_LOG_REPOSITORY`). Services inject via `@Inject(TOKEN)`, not `@InjectRepository()`.
- **Passport JWT** strategy extracts token from `Authorization: Bearer` header; expiry from `JWT_EXPIRATION` env (default 4h).
- All routes under `/{prefix}/{version}/` (from `API_PREFIX` and `API_VERSION` env vars, defaults `api` and `1`). Auth routes: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/logout/:id`, `GET /api/v1/auth/check-status`, `GET /api/v1/auth/private{2,3}`.
- Composite decorator `@Auth(...roles)` = `@RoleProtected` + `@UseGuards(AuthGuard(), UserRoleGuard)`. Roles: `user` (default), `admin`, `super-user`.
- Password: bcrypt, rounds from `BCRYPT_SALT_ROUNDS` env (default 10). DTO validation via `class-validator`. Global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`.
- **Rate limiting**: `@nestjs/throttler` (`THROTTLE_LIMIT` req per `THROTTLE_TTL` ms, defaults 10/60000). **Exception filter**: `AllExceptionsFilter` returns `{ statusCode, message, timestamp, path }`. **Logging**: `nestjs-pino` with pretty-print in dev.
- **Output sanitization**: `ClassSerializerInterceptor` global + `@Exclude()` on `User.password` (no more manual `password = undefined`).
- **Transactions**: `DataSource.transaction()` wraps session log creation (login) and session removal (logout).

## Quirks

- `.env` is gitignored but committed locally with dev defaults. See `.env.template` for all supported vars (server, CORS, JWT, throttler, bcrypt, entity defaults).
- `SERVER_PORT` is now read from env instead of hardcoded.
- E2E test (`test/app.e2e-spec.ts`) requires PostgreSQL running; mocks the DB layer to test validation layer only.
- ESLint disables `explicit-function-return-type`, `explicit-module-boundary-types`, `no-explicit-any`, `interface-name-prefix`.
- Timestamps use TypeORM `@CreateDateColumn` / `@UpdateDateColumn` / `@DeleteDateColumn` (database-level `NOW()`).
- `UserLog` entity tracks active sessions; logout removes the log row.
