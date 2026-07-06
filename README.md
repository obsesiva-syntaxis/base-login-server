# base-login-server

NestJS REST API template with JWT authentication, PostgreSQL, and full Docker setup.

## Prerequisites

- [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) (Docker Engine + Compose)
- [Git](https://git-scm.com/downloads)

## Quick start (Docker)

```bash
# 1. Clone and enter the project
git clone <repo-url> base-login-server
cd base-login-server

# 2. Configure environment
copy .env.template .env
# Edit .env if needed (defaults work for local development)

# 3. Build and start everything
docker compose up -d --build

# 4. Verify it works
curl -s http://localhost:3030/api/v1/auth/register -X POST ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"demo@test.com\",\"password\":\"Demo1234\",\"fullname\":\"Demo\"}"
```

The API is now running at `http://localhost:3030/api/v1`.

## Local development (without Docker)

Requires [Node.js 18+](https://nodejs.org/), [Yarn](https://yarnpkg.com/), and a running PostgreSQL instance.

```bash
# 1. Install dependencies
yarn install

# 2. Start PostgreSQL (Docker only for the database)
docker compose up -d db

# 3. Copy and configure env
copy .env.template .env

# 4. Start in watch mode
yarn start:dev
```

## API endpoints

All endpoints are under `http://localhost:3030/api/v1/auth`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Create a new user |
| POST | `/login` | No | Authenticate and get JWT token |
| GET | `/check-status` | Bearer token | Renew token and get user info |
| GET | `/logout/:id` | Bearer token | End user session |
| GET | `/private` | Bearer token | Demo protected route |
| GET | `/private2` | Bearer token + admin/super-user | Role-guarded route |
| GET | `/private3` | Bearer token + admin | Role-guarded route |

## Available commands

| Command | Description |
|---|---|
| `yarn build` | Compile to `dist/` |
| `yarn start:dev` | Watch mode with hot-reload |
| `yarn start:prod` | Run compiled version |
| `yarn lint` | ESLint with auto-fix |
| `yarn format` | Prettier |
| `yarn test` | Unit tests |
| `yarn test:e2e` | E2E tests (requires PostgreSQL) |
| `yarn migration:generate` | Generate TypeORM migration |
| `yarn migration:run` | Apply migrations |
| `yarn migration:revert` | Rollback last migration |

## Environment variables

All variables are documented in `.env.template`. Key ones:

| Variable | Default | Purpose |
|---|---|---|
| `SERVER_PORT` | `3030` | API port |
| `DB_HOST` | `localhost` | PostgreSQL host (set to `db` inside Docker) |
| `JWT_SECRET` | — | Secret key for signing tokens |
| `JWT_EXPIRATION` | `4h` | Token expiry duration |
| `API_PREFIX` | `api` | Global URL prefix |
| `API_VERSION` | `1` | Default API version |

## Tech stack

- **Runtime**: Node.js 18 (Alpine in Docker)
- **Framework**: NestJS 9
- **Language**: TypeScript 4.7
- **Database**: PostgreSQL 14.4
- **ORM**: TypeORM 0.3
- **Auth**: Passport.js + JWT + bcrypt
- **Validation**: class-validator + class-transformer
- **Rate limiting**: @nestjs/throttler
- **Logging**: Pino + nestjs-pino

## Project structure

```
src/
├── auth/
│   ├── auth.controller.ts      # Route handlers
│   ├── auth.service.ts         # Business logic
│   ├── auth.module.ts          # Module wiring
│   ├── auth.service.spec.ts    # Unit tests
│   ├── decorators/             # @Auth(), @GetUser(), etc.
│   ├── dto/                    # Request validation DTOs
│   ├── entities/               # User and UserLog entities
│   ├── guards/                 # Role-based guard
│   ├── interfaces/             # ValidRoles enum, JwtPayload
│   ├── repositories/           # Repository pattern with DI tokens
│   ├── strategies/             # JWT passport strategy
│   └── types/                  # Response types
├── common/filters/             # Global exception filter
├── database/                   # TypeORM migration data source
├── app.module.ts               # Root module
└── main.ts                     # Entrypoint
```
