import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { USER_REPOSITORY, USER_LOG_REPOSITORY } from '../auth/repositories';
import { ValidRoles } from '../auth/interfaces/valid-roles';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Logger } from 'nestjs-pino';

const mockUserRepository = {
  findOneByEmail: jest.fn(),
  findOneById: jest.fn(),
  findAllAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockUserLogRepository = {
  findByUserId: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
};

const mockLogger = {
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: typeof mockUserRepository;
  let dataSource: typeof mockDataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: USER_LOG_REPOSITORY, useValue: mockUserLogRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(USER_REPOSITORY);
    dataSource = module.get(DataSource);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should pass filters to the repository and return paginated users', async () => {
      const users = [{ id: 'uuid', email: 'test@test.com' }];
      userRepository.findAllAndCount.mockResolvedValue([users, 1]);

      const result = await service.findAll({
        page: 2,
        limit: 5,
        email: 'test',
      });

      expect(userRepository.findAllAndCount).toHaveBeenCalledWith(
        5,
        5,
        {
          created_at: 'DESC',
        },
        {
          email: 'test',
        },
      );
      expect(result).toEqual({ rows: users, total: 1, page: 2, limit: 5 });
    });

    it('should forward age and role based filters', async () => {
      userRepository.findAllAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        fullname: 'john',
        active: false,
        roles: ValidRoles.user,
      });

      expect(userRepository.findAllAndCount).toHaveBeenCalledWith(
        0,
        10,
        { created_at: 'DESC' },
        { fullname: 'john', active: false, roles: ValidRoles.user },
      );
    });

    it('should forward date range filters', async () => {
      userRepository.findAllAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        createdAtFrom: '2024-01-01T00:00:00.000Z',
        createdAtTo: '2024-12-31T23:59:59.999Z',
      });

      expect(userRepository.findAllAndCount).toHaveBeenCalledWith(
        0,
        10,
        { created_at: 'DESC' },
        {
          createdAtFrom: '2024-01-01T00:00:00.000Z',
          createdAtTo: '2024-12-31T23:59:59.999Z',
        },
      );
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const user = { id: 'uuid', email: 'test@test.com' };
      userRepository.findOneById.mockResolvedValue(user);

      const result = await service.findOne('uuid');

      expect(result).toEqual(user);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOneById.mockResolvedValue(null);

      await expect(service.findOne('uuid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const dto = { fullname: 'Updated Name' };

    it('should update and return the user', async () => {
      const updated = { id: 'uuid', fullname: 'Updated Name' };
      userRepository.update.mockResolvedValue(updated);

      const result = await service.update('uuid', dto);

      expect(userRepository.update).toHaveBeenCalledWith('uuid', dto);
      expect(result).toEqual(updated);
    });

    it('should check for email conflict if email is provided', async () => {
      const dtoWithEmail = { email: 'taken@test.com' };
      userRepository.findOneByEmail.mockResolvedValue({
        id: 'other-id',
        email: 'taken@test.com',
      });

      await expect(service.update('uuid', dtoWithEmail)).rejects.toThrow(
        BadRequestException,
      );
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should allow updating to the same email', async () => {
      const dtoWithEmail = { email: 'mine@test.com' };
      userRepository.findOneByEmail.mockResolvedValue({
        id: 'uuid',
        email: 'mine@test.com',
      });
      userRepository.update.mockResolvedValue({ id: 'uuid', ...dtoWithEmail });

      const result = await service.update('uuid', dtoWithEmail);

      expect(result.email).toBe('mine@test.com');
    });
  });

  describe('remove', () => {
    it('should soft-delete user and remove sessions', async () => {
      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          findOneBy: jest.fn().mockResolvedValue({ id: 'uuid' }),
          softDelete: jest.fn().mockResolvedValue({}),
          delete: jest.fn().mockResolvedValue({}),
        };
        return cb(manager);
      });

      const result = await service.remove('uuid');

      expect(result).toBe(true);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          findOneBy: jest.fn().mockResolvedValue(null),
          softDelete: jest.fn(),
          delete: jest.fn(),
        };
        return cb(manager);
      });

      await expect(service.remove('uuid')).rejects.toThrow(NotFoundException);
    });
  });
});
