import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsOrder, FindOptionsWhere, Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface IUserRepository {
  findOneByEmail(email: string): Promise<User | null>;
  findOneById(id: string): Promise<User | null>;
  findOneBy(options: FindOptionsWhere<User>): Promise<User | null>;
  findAllAndCount(
    skip: number,
    take: number,
    order?: FindOptionsOrder<User>,
  ): Promise<[User[], number]>;
  save(user: User): Promise<User>;
  create(data: Partial<User>): User;
  update(id: string, data: Partial<User>): Promise<User>;
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

  async findAllAndCount(
    skip: number,
    take: number,
    order?: FindOptionsOrder<User>,
  ): Promise<[User[], number]> {
    return this.repo.findAndCount({ skip, take, order });
  }

  async save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  create(data: Partial<User>): User {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.repo.preload({ id, ...data });
    if (!user) throw new NotFoundException('User not found');
    return this.repo.save(user);
  }
}
