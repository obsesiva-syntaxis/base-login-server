import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { USER_LOG_REPOSITORY, IUserLogRepository } from '../repositories';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(USER_LOG_REPOSITORY)
    private readonly userLogRepository: IUserLogRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as User;

    if (!user) throw new UnauthorizedException('User not found');

    const token = this.extractBearerToken(req);
    if (!token)
      throw new UnauthorizedException(
        'Token not provided in Authorization header',
      );

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const userLog = await this.userLogRepository.findByUserId(user.id);
    if (!userLog || userLog.token !== tokenHash) {
      throw new UnauthorizedException(
        'Invalid or expired session, please login again.',
      );
    }
    return true;
  }

  private extractBearerToken(req: {
    headers?: Record<string, string | string[] | undefined>;
  }): string | undefined {
    const header = req.headers?.authorization;
    if (!header || typeof header !== 'string') return undefined;
    const parts = header.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return undefined;
    }
    return parts[1];
  }
}
