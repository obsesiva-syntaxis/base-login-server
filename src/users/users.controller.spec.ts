import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DataSource } from 'typeorm';
import { USER_REPOSITORY, USER_LOG_REPOSITORY } from '../auth/repositories';
import { PassportModule } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

const mockUsersService = {
  findAll: jest.fn().mockResolvedValue({
    rows: [],
    total: 0,
    page: 1,
    limit: 10,
  }),
  findOne: jest.fn().mockResolvedValue({ id: 'uuid', email: 'test@test.com' }),
  update: jest.fn().mockResolvedValue({ id: 'uuid', fullname: 'Updated' }),
  remove: jest.fn().mockResolvedValue(true),
};

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: typeof mockUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        {
          provide: USER_REPOSITORY,
          useValue: { findOneByEmail: jest.fn(), findOneById: jest.fn() },
        },
        {
          provide: USER_LOG_REPOSITORY,
          useValue: { findByUserId: jest.fn() },
        },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call usersService.findAll with the query', async () => {
      const query = { page: 1, limit: 10, email: 'test@test.com' };
      const result = await controller.findAll(query);

      expect(usersService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual({ rows: [], total: 0, page: 1, limit: 10 });
    });
  });

  describe('findOne', () => {
    it('should call usersService.findOne with id', async () => {
      const result = await controller.findOne('uuid-uuid');

      expect(usersService.findOne).toHaveBeenCalledWith('uuid-uuid');
      expect(result).toEqual({ id: 'uuid', email: 'test@test.com' });
    });
  });

  describe('update', () => {
    it('should call usersService.update with id and dto', async () => {
      const dto = { fullname: 'Updated' };
      const result = await controller.update('uuid-uuid', dto);

      expect(usersService.update).toHaveBeenCalledWith('uuid-uuid', dto);
      expect(result).toEqual({ id: 'uuid', fullname: 'Updated' });
    });
  });

  describe('remove', () => {
    it('should call usersService.remove with id', async () => {
      const result = await controller.remove('uuid-uuid');

      expect(usersService.remove).toHaveBeenCalledWith('uuid-uuid');
      expect(result).toBe(true);
    });
  });
});
