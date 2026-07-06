import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface IUserRepository {
  findOneByEmail(email: string): Promise<User | null>;
  findOneById(id: string): Promise<User | null>;
  findOneBy(options: FindOptionsWhere<User>): Promise<User | null>;
  save(user: User): Promise<User>;
  create(data: Partial<User>): User;
}

@Injectable()
export class UserRepositoryImpl implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.repo.findOneBy({ email });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.repo.findOneBy({ id });
  }

  async findOneBy(options: FindOptionsWhere<User>): Promise<User | null> {
    return this.repo.findOneBy(options);
  }

  async save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  create(data: Partial<User>): User {
    return this.repo.create(data);
  }
}
