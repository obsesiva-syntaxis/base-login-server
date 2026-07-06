import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { User } from './entities/user.entity';
import { UserLog } from './entities/userLog.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import {
  USER_REPOSITORY,
  UserRepositoryImpl,
  USER_LOG_REPOSITORY,
  UserLogRepositoryImpl,
} from './repositories';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, UserLog]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION', '4h'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: USER_REPOSITORY, useClass: UserRepositoryImpl },
    { provide: USER_LOG_REPOSITORY, useClass: UserLogRepositoryImpl },
  ],
  exports: [
    TypeOrmModule,
    JwtStrategy,
    PassportModule,
    JwtModule,
    USER_REPOSITORY,
    USER_LOG_REPOSITORY,
  ],
})
export class AuthModule {}
