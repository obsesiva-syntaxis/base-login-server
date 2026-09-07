import {
  BadRequestException,
  ForbiddenException,
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
import { Logger } from 'nestjs-pino';
import { AuthResponse } from './types/auth-response.type';
import { User } from './entities/user.entity';
import { UserLog } from './entities/userLog.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ValidRoles } from './interfaces/valid-roles';
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
    private readonly logger: Logger,
  ) {
    this.saltRounds = +(process.env.BCRYPT_SALT_ROUNDS || 10);
  }

  async login({ email, password }: LoginUserDTO): Promise<AuthResponse> {
    const user = await this.userRepository.findOneByEmail(email);
    if (!user) throw new UnauthorizedException('Email/Password Do not match.');
    if (!(await bcrypt.compare(password, user.password)))
      throw new UnauthorizedException('Email/Password Do not match.');
    if (!user.active)
      throw new UnauthorizedException('User is inactive, talk with an admin.');

    const token = this.getJwtToken({ id: user.id });

    await this.registerSession(user, token);

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
      this.handleDatabaseErrors(err as { code?: string });
    }
  }

  async logout(id: string, currentUser: User) {
    if (
      currentUser.id !== id &&
      !currentUser.roles.some(
        (role) => role === ValidRoles.admin || role === ValidRoles.superUser,
      )
    ) {
      throw new ForbiddenException(
        'You are not allowed to end sessions of other users.',
      );
    }
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
      this.handleDatabaseErrors(err as { code?: string });
    }
  }

  private getJwtToken(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  private async registerSession(user: User, token: string): Promise<void> {
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
  }

  async validateUser(id: string): Promise<User> {
    const user = await this.userRepository.findOneByIdWithSession(id);
    if (!user) throw new UnauthorizedException('User not found');
    if (!user.active)
      throw new UnauthorizedException('User is inactive, talk with an admin.');
    return user;
  }

  async checkAuthStatus(user: User) {
    return instanceToPlain(user);
  }

  private handleDatabaseErrors(error: { code?: string } | undefined): never {
    if (error?.code === '23505')
      throw new BadRequestException('Email already exists in database.');
    this.logger.error(error, 'Unexpected database error');
    throw new InternalServerErrorException(
      'Internal server error. Please contact the administrator.',
    );
  }
}
