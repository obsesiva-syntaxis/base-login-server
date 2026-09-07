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
- Opcional, solo para correr el proyecto sin Docker o ejecutar el seed desde el host: [Node.js 20+](https://nodejs.org/) y [Yarn](https://yarnpkg.com/)
- Una instancia de PostgreSQL (local o manejada, p. ej. Neon). La API se conecta vía `DATABASE_URL`.

## Quick start (Docker)

```bash
# 1. Clonar y entrar al proyecto
git clone <repo-url> base-login-server
cd base-login-server

# 2. Configurar variables de entorno
cp .env.template .env
# Completa los valores marcados como "---- COMPLETE THIS -----"
# (DATABASE_URL, JWT_SECRET)

# 3. Levantar la API
docker compose up -d --build

# 4. Verificar que funciona
curl -s http://localhost:3030/api/v1/auth/register -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@test.com","password":"Demo1234","fullname":"Demo"}'
```

La API queda disponible en `http://localhost:3030/api/v1`.

> **Nota:** `docker-compose.yaml` únicamente levanta el servicio `app`. La base de datos es externa y se configura con `DATABASE_URL`, la misma variable se pasa al contenedor.

Servicios que levanta `docker compose up`:

| Servicio | Contenedor | Puerto host | Descripción |
| --- | --- | --- | --- |
| `app` | `base-login-backend` | `${SERVER_PORT}` (3030 por defecto) | API NestJS |

## Desarrollo local (sin Docker)

Requiere [Node.js 20+](https://nodejs.org/), [Yarn](https://yarnpkg.com/), y una instancia de PostgreSQL accesible (local o manejada).

```bash
# 1. Instalar dependencias
yarn install

# 2. Copiar y configurar el .env
cp .env.template .env
# DATABASE_URL debe apuntar a tu PostgreSQL accesible desde tu máquina

# 3. Iniciar en modo watch
yarn start:dev
```

## Seed de usuarios

El repo incluye `docs/seed-users.js`, un script que inserta **5.000 usuarios** de prueba directamente en PostgreSQL (sin pasar por la API), pensado para probar rendimiento, paginación o carga de datos. Para más usuarios, edita la constante `TOTAL` en `docs/seed-users.js`.

```bash
yarn seed-users
```

Detalles de cómo funciona:

- Inserta los usuarios en **lotes de 1000** mediante `INSERT ... VALUES (...), (...), ...` para no saturar la conexión.
- Cada usuario se crea con:
  - Email: `user1@seed.com`, `user2@seed.com`, ... hasta `user5000@seed.com`
  - Password: `Seed1234` (igual para todos, hasheada una sola vez con `bcrypt` y reutilizada en todos los inserts para no recalcularla 5.000 veces)
  - `fullname`: `User 1`, `User 2`, etc.
  - `roles`: `{user}`
- Usa `ON CONFLICT (email) DO NOTHING`, por lo que **es seguro ejecutarlo más de una vez**: no duplica usuarios ya insertados.
- Imprime el progreso en consola cada 10.000 registros.
- Se conecta a la base usando `DATABASE_URL` de tu `.env` (vía `dotenv`), **no** a través del API.

Requisitos para ejecutarlo:

1. Tener el `.env` configurado en la raíz del proyecto.
2. Tener PostgreSQL accesible desde tu máquina host: `DATABASE_URL` debe apuntar a una instancia alcanzable por tu host.
3. Tener las dependencias instaladas (`yarn install`), ya que el script usa `pg` y `bcrypt`.
4. Que la tabla `user` exista (con `synchronize: true` en desarrollo se crea al iniciar la API, o bien aplicando migraciones):
   ```bash
   yarn migration:run
   ```

> Insertar miles de filas puede tardar varios minutos dependiendo de tu máquina. Si solo necesitas unos pocos usuarios de prueba, puedes editar la constante `TOTAL` en `docs/seed-users.js` antes de correrlo.

## Endpoints de la API

Todos los endpoints están bajo `http://localhost:3030/api/v1/auth`.

| Método | Ruta | Auth | Descripción |
| --- | --- | --- | --- |
| POST | `/register` | No | Crea un nuevo usuario |
| POST | `/login` | No | Autentica y devuelve un token JWT |
| GET | `/check-status` | Bearer token | Devuelve la información del usuario autenticado |
| DELETE | `/logout/:id` | Bearer token | Termina la sesión (solo la propia o como admin/super-user) |
| GET | `/private` | Bearer token | Ruta protegida de demostración |
| GET | `/private2` | Bearer token + rol admin/super-user | Ruta protegida por rol |
| GET | `/private3` | Bearer token + rol admin | Ruta protegida por rol |

Una colección de Postman lista para importar está disponible en [`docs/base-login-server.postman_collection.json`](./docs/base-login-server.postman_collection.json).

> **Nota:** `GET /api/v1/users` (admin/super-user) requiere **al menos un filtro** vía query string: `email`, `fullname` (ambos con coincidencia parcial, case-insensitive), `active`, `roles` o `createdAtFrom`/`createdAtTo` (fechas ISO). Sin ningún filtro devuelve `400`. Se combinan con AND y se paginan con `page`/`limit`.

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
| `yarn seed-users` | Puebla la base con usuarios de prueba (ver [Seed de usuarios](#seed-de-usuarios)) |
| `yarn migration:generate` | Genera una migración de TypeORM |
| `yarn migration:run` | Aplica las migraciones |
| `yarn migration:revert` | Revierte la última migración |
| `yarn docker-build` | Levanta y reconstruye el servicio `app` vía Docker Compose |

## Variables de entorno

Todas las variables están documentadas en `.env.template`. Estas son las principales:

| Variable | Valor por defecto | Propósito |
| --- | --- | --- |
| `DATABASE_URL` | — | Cadena de conexión PostgreSQL (p. ej. Neon) |
| `DB_SSL_REJECT_UNAUTHORIZED` | `false` (`true` en producción) | Verifica el certificado TLS del servidor PostgreSQL |
| `SERVER_PORT` | `3030` | Puerto de la API |
| `JWT_SECRET` | — | Clave secreta para firmar los tokens (usa una cadena aleatoria larga) |
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

> **Seguridad:** `super-user` no se puede asignar a través de la API; solo `user` y `admin` son asignables vía el endpoint de actualización de usuarios.

## Stack tecnológico

- **Runtime**: Node.js 20 (Alpine en Docker)
- **Framework**: NestJS 9
- **Lenguaje**: TypeScript 4.7
- **Base de datos**: PostgreSQL (local o manejada)
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
│   ├── guards/                 # Guards basados en roles y sesión
│   ├── interfaces/             # Enum ValidRoles, JwtPayload
│   ├── repositories/           # Patrón repository con tokens de DI
│   ├── strategies/             # Estrategia JWT de passport
│   └── types/                  # Tipos de respuesta
├── common/filters/             # Filtro global de excepciones
├── common/interceptors/        # Interceptor global de respuesta
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
yarn test:e2e     # E2E (requiere PostgreSQL corriendo)
yarn test:cov     # Cobertura
```