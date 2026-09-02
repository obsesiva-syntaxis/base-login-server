# base-login-server

Plantilla de API REST con **NestJS**, autenticación **JWT**, base de datos **PostgreSQL** y setup completo con **Docker**.

Incluye registro/login de usuarios, rutas protegidas por rol, migraciones con TypeORM, rate limiting, logging estructurado y un script de seed para poblar la base con usuarios de prueba.

## Tabla de contenidos

- [Prerrequisitos](#prerrequisitos)
- [Quick start (Docker)](#quick-start-docker)
- [Desarrollo local (sin Docker)](#desarrollo-local-sin-docker)
- [Seed de usuarios](#seed-de-usuarios)
- [Endpoints de la API](#endpoints-de-la-api)
- [Comandos disponibles](#comandos-disponibles)
- [Variables de entorno](#variables-de-entorno)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Tests](#tests)

## Prerrequisitos

- [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) (Docker Engine + Compose)
- [Git](https://git-scm.com/downloads)
- Opcional, solo para correr el proyecto sin Docker o ejecutar el seed desde el host: [Node.js 18+](https://nodejs.org/) y [Yarn](https://yarnpkg.com/)

## Quick start (Docker)

```bash
# 1. Clonar y entrar al proyecto
git clone <repo-url> base-login-server
cd base-login-server

# 2. Configurar variables de entorno
cp .env.template .env
# Completa los valores marcados como "---- COMPLETE THIS -----"
# (DB_NAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_USERNAME, JWT_SECRET)
# Para desarrollo local con Docker, usa DB_HOST=localhost y DB_PORT=5432

# 3. Levantar todo (API + PostgreSQL)
docker compose up -d --build

# 4. Verificar que funciona
curl -s http://localhost:3030/api/v1/auth/register -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"Demo1234","fullname":"Demo"}'
```

La API queda disponible en `http://localhost:3030/api/v1`.

> **Nota:** dentro del contenedor `app`, `docker-compose.yaml` sobrescribe `DB_HOST` a `db` automáticamente (el nombre del servicio de PostgreSQL). El valor `DB_HOST` que pongas en tu `.env` solo aplica cuando corres procesos desde tu máquina host (desarrollo local o el script de seed).

Servicios que levanta `docker compose up`:

| Servicio | Contenedor | Puerto host | Descripción |
| --- | --- | --- | --- |
| `app` | `base-login-backend` | `${SERVER_PORT}` (3030 por defecto) | API NestJS |
| `db` | `auth-user-db` | `5432` | PostgreSQL 14.4, con healthcheck y volumen persistente `postgres-data` |

## Desarrollo local (sin Docker)

Requiere [Node.js 18+](https://nodejs.org/), [Yarn](https://yarnpkg.com/), y una instancia de PostgreSQL corriendo.

```bash
# 1. Instalar dependencias
yarn install

# 2. Levantar solo la base de datos con Docker
docker compose up -d db

# 3. Copiar y configurar el .env
cp .env.template .env
# DB_HOST debe ser "localhost" en este modo

# 4. Iniciar en modo watch
yarn start:dev
```

## Seed de usuarios

El repo incluye `docs/seed-users.js`, un script que inserta **500.000 usuarios** de prueba directamente en PostgreSQL (sin pasar por la API), pensado para probar rendimiento, paginación o carga de datos.

```bash
yarn seed-users
```

Detalles de cómo funciona:

- Inserta los usuarios en **lotes de 1000** mediante `INSERT ... VALUES (...), (...), ...` para no saturar la conexión.
- Cada usuario se crea con:
  - Email: `user1@seed.com`, `user2@seed.com`, ... hasta `user500000@seed.com`
  - Password: `Seed1234` (igual para todos, hasheada una sola vez con `bcrypt` y reutilizada en todos los inserts para no recalcularla 500.000 veces)
  - `fullname`: `User 1`, `User 2`, etc.
  - `roles`: `{user}`
- Usa `ON CONFLICT (email) DO NOTHING`, por lo que **es seguro ejecutarlo más de una vez**: no duplica usuarios ya insertados.
- Imprime el progreso en consola cada 10.000 registros.
- Se conecta a la base usando las variables `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` y `DB_NAME` de tu `.env` (vía `dotenv`), **no** a través del API.

Requisitos para ejecutarlo:

1. Tener el `.env` configurado en la raíz del proyecto.
2. Tener PostgreSQL accesible desde tu máquina host. Si la base corre en Docker (`docker compose up -d db` o el stack completo), asegúrate de que `DB_HOST=localhost` y `DB_PORT=5432` en tu `.env`, ya que el script corre en el host y no dentro del contenedor.
3. Tener las dependencias instaladas (`yarn install`), ya que el script usa `pg` y `bcrypt`.
4. Que las migraciones estén aplicadas (la tabla `user` debe existir antes de correr el seed):
   ```bash
   yarn migration:run
   ```

Ejemplo de flujo completo con Docker:

```bash
docker compose up -d --build   # levanta app + db
yarn install                   # dependencias en el host (para correr el seed)
yarn migration:run              # asegura que la tabla "user" exista
yarn seed-users                 # inserta los 500.000 usuarios
```

> Insertar 500.000 filas puede tardar varios minutos dependiendo de tu máquina. Si solo necesitas unos pocos usuarios de prueba, puedes editar la constante `TOTAL` en `docs/seed-users.js` antes de correrlo.

## Endpoints de la API

Todos los endpoints están bajo `http://localhost:3030/api/v1/auth`.

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| POST | `/register` | No | Crea un nuevo usuario |
| POST | `/login` | No | Autentica y devuelve un token JWT |
| GET | `/check-status` | Bearer token | Renueva el token y devuelve info del usuario |
| GET | `/logout/:id` | Bearer token | Termina la sesión del usuario |
| GET | `/private` | Bearer token | Ruta protegida de demostración |
| GET | `/private2` | Bearer token + rol admin/super-user | Ruta protegida por rol |
| GET | `/private3` | Bearer token + rol admin | Ruta protegida por rol |

Una colección de Postman lista para importar está disponible en [`docs/base-login-server.postman_collection.json`](./docs/base-login-server.postman_collection.json).

## Comandos disponibles

| Comando | Descripción |
| --- | --- |
| `yarn build` | Compila a `dist/` |
| `yarn start:dev` | Modo watch con hot-reload |
| `yarn start:prod` | Corre la versión compilada |
| `yarn lint` | ESLint con auto-fix |
| `yarn format` | Prettier |
| `yarn test` | Tests unitarios |
| `yarn test:e2e` | Tests E2E (requiere PostgreSQL) |
| `yarn seed-users` | Puebla la base con 500.000 usuarios de prueba (ver [Seed de usuarios](#seed-de-usuarios)) |
| `yarn migration:generate` | Genera una migración de TypeORM |
| `yarn migration:run` | Aplica las migraciones |
| `yarn migration:revert` | Revierte la última migración |
| `yarn docker-build` | Levanta y reconstruye solo el servicio `app` vía Docker Compose |

## Variables de entorno

Todas las variables están documentadas en `.env.template`. Estas son las principales:

| Variable | Valor por defecto | Propósito |
| --- | --- | --- |
| `DB_NAME` | — | Nombre de la base de datos PostgreSQL |
| `DB_USERNAME` | — | Usuario de PostgreSQL |
| `DB_PASSWORD` | — | Password de PostgreSQL |
| `DB_HOST` | — | Host de PostgreSQL (`localhost` fuera de Docker; dentro del contenedor `app`, `docker-compose.yaml` lo fuerza a `db`) |
| `DB_PORT` | — | Puerto de PostgreSQL |
| `SERVER_PORT` | `3030` | Puerto de la API |
| `JWT_SECRET` | — | Clave secreta para firmar los tokens |
| `JWT_EXPIRATION` | `4h` | Duración del token |
| `API_PREFIX` | `api` | Prefijo global de las rutas |
| `API_VERSION` | `1` | Versión de API por defecto |
| `CORS_ORIGIN` | `*` | Origen permitido para CORS |
| `THROTTLE_TTL` | `60000` | Ventana de rate limiting (ms) |
| `THROTTLE_LIMIT` | `10` | Máximo de requests por ventana |
| `BCRYPT_SALT_ROUNDS` | `10` | Rondas de sal para el hasheo de passwords en la app (el script de seed usa 10 fijo, independiente de esta variable) |
| `TYPEORM_MIGRATIONS_RUN` | `false` | Si es `true`, corre las migraciones automáticamente al iniciar |
| `DEFAULT_ROLE` | `user` | Rol asignado por defecto a los usuarios nuevos |
| `DEFAULT_TIMEZONE` | `America/Santiago` | Timezone por defecto de la aplicación |

## Stack tecnológico

- **Runtime**: Node.js 18 (Alpine en Docker)
- **Framework**: NestJS 9
- **Lenguaje**: TypeScript 4.7
- **Base de datos**: PostgreSQL 14.4
- **ORM**: TypeORM 0.3
- **Auth**: Passport.js + JWT + bcrypt
- **Validación**: class-validator + class-transformer
- **Rate limiting**: @nestjs/throttler
- **Logging**: Pino + nestjs-pino

## Estructura del proyecto

```
src/
├── auth/
│   ├── auth.controller.ts      # Route handlers
│   ├── auth.service.ts         # Lógica de negocio
│   ├── auth.module.ts          # Wiring del módulo
│   ├── auth.service.spec.ts    # Tests unitarios
│   ├── decorators/             # @Auth(), @GetUser(), etc.
│   ├── dto/                    # DTOs de validación de requests
│   ├── entities/               # Entidades User y UserLog
│   ├── guards/                 # Guard basado en roles
│   ├── interfaces/             # Enum ValidRoles, JwtPayload
│   ├── repositories/           # Patrón repository con tokens de DI
│   ├── strategies/             # Estrategia JWT de passport
│   └── types/                  # Tipos de respuesta
├── common/filters/             # Filtro global de excepciones
├── database/                   # Data source de migraciones TypeORM
├── app.module.ts               # Módulo raíz
└── main.ts                     # Entry point

docs/
├── seed-users.js                              # Script de seed (ver arriba)
└── base-login-server.postman_collection.json  # Colección de Postman
```

## Tests

```bash
yarn test        # Unitarios
yarn test:e2e     # E2E (requiere PostgreSQL corriendo, p. ej. docker compose up -d db)
yarn test:cov     # Cobertura
```
