import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLog } from '../entities/userLog.entity';

export const USER_LOG_REPOSITORY = 'USER_LOG_REPOSITORY';

export interface IUserLogRepository {
  findByUserId(userId: string): Promise<UserLog | null>;
  save(log: UserLog): Promise<UserLog>;
  create(data: Partial<UserLog>): UserLog;
  remove(log: UserLog): Promise<UserLog>;
}

@Injectable()
export class UserLogRepositoryImpl implements IUserLogRepository {
  constructor(
    @InjectRepository(UserLog)
    private readonly repo: Repository<UserLog>,
  ) {}

  async findByUserId(userId: string): Promise<UserLog | null> {
    return this.repo.findOneBy({ userId });
  }

  async save(log: UserLog): Promise<UserLog> {
    return this.repo.save(log);
  }

  create(data: Partial<UserLog>): UserLog {
    return this.repo.create(data);
  }

  async remove(log: UserLog): Promise<UserLog> {
    return this.repo.remove(log);
  }
}
