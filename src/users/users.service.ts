import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  USER_REPOSITORY,
  IUserRepository,
  USER_LOG_REPOSITORY,
  IUserLogRepository,
} from '../auth/repositories';
import { User } from '../auth/entities/user.entity';
import { UserLog } from '../auth/entities/userLog.entity';
import { UpdateUserDTO, QueryUsersDTO } from './dto';
import { DataSource } from 'typeorm';
import { Logger } from 'nestjs-pino';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(USER_LOG_REPOSITORY)
    private readonly userLogRepository: IUserLogRepository,
    private readonly dataSource: DataSource,
    private readonly logger: Logger,
  ) {}

  async findAll(
    query: QueryUsersDTO,
  ): Promise<{ rows: User[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 10, ...filters } = query;
    const skip = (page - 1) * limit;
    const [rows, total] = await this.userRepository.findAllAndCount(
      skip,
      limit,
      {
        created_at: 'DESC',
      },
      filters,
    );
    return { rows, total, page, limit };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOneById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDTO): Promise<User> {
    if (dto.email) {
      const existing = await this.userRepository.findOneByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new BadRequestException('Email already exists');
      }
    }
    try {
      return await this.userRepository.update(id, dto);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const error = err as { code?: string };
      if (error.code === '23505')
        throw new BadRequestException('Email already exists');
      this.logger.error(error, 'Unexpected error while updating user');
      throw new InternalServerErrorException(
        'Internal server error. Please contact the administrator.',
      );
    }
  }

  async remove(id: string): Promise<boolean> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const user = await manager.findOneBy(User, { id });
        if (!user) throw new NotFoundException('User not found');
        await manager.softDelete(User, { id });
        await manager.delete(UserLog, { userId: id });
      });
      return true;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      this.logger.error(err, 'Unexpected error while removing user');
      throw new InternalServerErrorException(
        'Internal server error. Please contact the administrator.',
      );
    }
  }
}
