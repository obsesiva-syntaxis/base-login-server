import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginUserDTO, RegisterUserDTO } from './dto';
import {
  USER_REPOSITORY,
  IUserRepository,
  USER_LOG_REPOSITORY,
  IUserLogRepository,
} from './repositories';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { instanceToPlain } from 'class-transformer';
import { JwtService } from '@nestjs/jwt';
import { AuthResponse } from './types/auth-response.type';
import { User } from './entities/user.entity';
import { UserLog } from './entities/userLog.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { DataSource } from 'typeorm';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(USER_LOG_REPOSITORY)
    private readonly userLogRepository: IUserLogRepository,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {
    this.saltRounds = +(process.env.BCRYPT_SALT_ROUNDS || 10);
  }

  async login({ email, password }: LoginUserDTO): Promise<AuthResponse> {
    const user = await this.userRepository.findOneByEmail(email);
    if (!user) throw new UnauthorizedException('Email/Password Do not match.');
    if (!(await bcrypt.compare(password, user.password)))
      throw new UnauthorizedException('Email/Password Do not match.');

    const token = this.getJwtToken({ id: user.id });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.dataSource.transaction(async (manager) => {
      await manager.upsert(
        UserLog,
        {
          userId: user.id,
          token: tokenHash,
          email: user.email,
          roles: user.roles,
        },
        ['userId'],
      );
    });

    return { token, user };
  }

  async register(registerInput: RegisterUserDTO): Promise<User> {
    try {
      const defaultRole = process.env.DEFAULT_ROLE || 'user';
      const hashedPassword = await bcrypt.hash(
        registerInput.password,
        this.saltRounds,
      );
      const newUser = this.userRepository.create({
        ...registerInput,
        password: hashedPassword,
        roles: [defaultRole],
      });
      const userCreated = await this.userRepository.save(newUser);
      return userCreated;
    } catch (err) {
      const error = err as { code?: string };
      this.handleDatabaseErrors(error.code);
    }
  }

  async logout(id: string) {
    try {
      await this.dataSource.transaction(async (manager) => {
        const user = await manager.findOneBy(User, { id });
        if (!user) throw new BadRequestException('User not found');
        const userLog = await manager.findOneBy(UserLog, { userId: user.id });
        if (userLog) {
          await manager.remove(userLog);
        }
      });
      return true;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const error = err as { code?: string };
      this.handleDatabaseErrors(error.code);
    }
  }

  private getJwtToken(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  async validateUser(id: string): Promise<User> {
    const user = await this.userRepository.findOneById(id);
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.active)
      throw new UnauthorizedException('User is inactive, talk with an admin.');
    return user;
  }

  async checkAuthStatus(user: User) {
    return {
      ...instanceToPlain(user),
      token: this.getJwtToken({ id: user.id }),
    };
  }

  private handleDatabaseErrors(code: string | undefined): never {
    if (code === '23505')
      throw new BadRequestException('Email already exists in database.');
    throw new InternalServerErrorException(
      'Internal server error. Please contact the administrator.',
    );
  }
}
