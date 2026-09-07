import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './health/health.controller';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';

const dbRejectUnauthorized =
  process.env.DB_SSL_REJECT_UNAUTHORIZED ??
  (process.env.NODE_ENV === 'production' ? 'true' : 'false');

@Module({
  imports: [
    ConfigModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: +(process.env.THROTTLE_TTL ?? 60000),
        limit: +(process.env.THROTTLE_LIMIT ?? 10),
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: dbRejectUnauthorized === 'true',
      },
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
      migrationsRun: process.env.TYPEORM_MIGRATIONS_RUN === 'true',
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
