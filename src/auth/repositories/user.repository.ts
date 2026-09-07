import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsOrder, FindOptionsWhere, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserLog } from '../entities/userLog.entity';

const LIKE_ESCAPE_CHARACTERS = /[\\%_]/g;

const escapeLike = (term: string): string =>
  term.replace(LIKE_ESCAPE_CHARACTERS, (character) => `\\${character}`);

export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface UserFilters {
  email?: string;
  fullname?: string;
  active?: boolean;
  roles?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
}

export interface IUserRepository {
  findOneByEmail(email: string): Promise<User | null>;
  findOneById(id: string): Promise<User | null>;
  findOneByIdWithSession(id: string): Promise<User | null>;
  findOneBy(options: FindOptionsWhere<User>): Promise<User | null>;
  findAllAndCount(
    skip: number,
    take: number,
    order?: FindOptionsOrder<User>,
    filters?: UserFilters,
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

  async findOneByIdWithSession(id: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .leftJoinAndMapOne('user.userLog', UserLog, 'log', 'log.userId = user.id')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findOneBy(options: FindOptionsWhere<User>): Promise<User | null> {
    return this.repo.findOneBy(options);
  }

  async findAllAndCount(
    skip: number,
    take: number,
    order?: FindOptionsOrder<User>,
    filters?: UserFilters,
  ): Promise<[User[], number]> {
    const queryBuilder = this.repo.createQueryBuilder('user');
    queryBuilder.where('user.deleted_at IS NULL');

    if (filters?.email) {
      queryBuilder.andWhere('user.email ILIKE :email', {
        email: `%${escapeLike(filters.email)}%`,
      });
    }
    if (filters?.fullname) {
      queryBuilder.andWhere('user.fullname ILIKE :fullname', {
        fullname: `%${escapeLike(filters.fullname)}%`,
      });
    }
    if (filters?.active !== undefined) {
      queryBuilder.andWhere('user.active = :active', {
        active: filters.active,
      });
    }
    if (filters?.roles) {
      queryBuilder.andWhere(':role = ANY(user.roles)', {
        role: filters.roles,
      });
    }
    if (filters?.createdAtFrom) {
      queryBuilder.andWhere('user.created_at >= :createdAtFrom', {
        createdAtFrom: filters.createdAtFrom,
      });
    }
    if (filters?.createdAtTo) {
      queryBuilder.andWhere('user.created_at <= :createdAtTo', {
        createdAtTo: filters.createdAtTo,
      });
    }

    if (order) {
      Object.entries(order).forEach(([key, direction]) => {
        if (direction === 'ASC' || direction === 'DESC') {
          queryBuilder.addOrderBy(`user.${key}`, direction);
        }
      });
    }
    queryBuilder.skip(skip).take(take);

    return queryBuilder.getManyAndCount();
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
