import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { USER_REPOSITORY, USER_LOG_REPOSITORY } from './repositories';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

const mockUserRepository = {
  findOneByEmail: jest.fn(),
  findOneById: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const mockUserLogRepository = {
  findByUserId: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('test-token'),
};

const mockDataSource = {
  transaction: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: typeof mockUserRepository;
  let jwtService: typeof mockJwtService;
  let dataSource: typeof mockDataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: USER_LOG_REPOSITORY, useValue: mockUserLogRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(USER_REPOSITORY);
    jwtService = module.get(JwtService);
    dataSource = module.get(DataSource);

    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      password: 'Valid1Pass',
      fullname: 'Test User',
    };

    it('should create a user successfully', async () => {
      const hashedPassword = bcrypt.hashSync(registerDto.password, 10);
      userRepository.create.mockReturnValue({
        ...registerDto,
        password: hashedPassword,
      });
      userRepository.save.mockResolvedValue({
        id: 'uuid',
        ...registerDto,
        password: hashedPassword,
      });

      const result = await service.register(registerDto);

      expect(userRepository.create).toHaveBeenCalledWith({
        ...registerDto,
        password: expect.any(String),
        roles: ['user'],
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(result.email).toBe(registerDto.email);
    });

    it('should throw on duplicate email', async () => {
      userRepository.create.mockReturnValue({ ...registerDto });
      userRepository.save.mockRejectedValue({ code: '23505' });

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'Valid1Pass' };
    const mockUser = {
      id: 'uuid',
      email: 'test@example.com',
      password: bcrypt.hashSync('Valid1Pass', 10),
      fullname: 'Test User',
      roles: ['user'],
      active: true,
    };

    it('should return token and user on valid credentials', async () => {
      userRepository.findOneByEmail.mockResolvedValue(mockUser);
      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          upsert: jest.fn().mockResolvedValue({}),
        };
        return cb(manager);
      });

      const result = await service.login(loginDto);

      expect(result.token).toBe('test-token');
      expect(result.user.email).toBe(loginDto.email);
      expect(jwtService.sign).toHaveBeenCalledWith({ id: mockUser.id });
    });

    it('should throw on invalid email', async () => {
      userRepository.findOneByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw on invalid password', async () => {
      userRepository.findOneByEmail.mockResolvedValue(mockUser);

      await expect(
        service.login({ ...loginDto, password: 'WrongPass1' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    const mockUser = {
      id: 'uuid',
      email: 'test@example.com',
      password: 'hashed',
      fullname: 'Test User',
      roles: ['user'],
      active: true,
    };

    it('should return user when active', async () => {
      userRepository.findOneById.mockResolvedValue(mockUser);

      const result = await service.validateUser('uuid');

      expect(result.id).toBe('uuid');
    });

    it('should throw when user is inactive', async () => {
      userRepository.findOneById.mockResolvedValue({
        ...mockUser,
        active: false,
      });

      await expect(service.validateUser('uuid')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('checkAuthStatus', () => {
    const mockUser = {
      id: 'uuid',
      email: 'test@example.com',
      fullname: 'Test User',
      roles: ['user'],
    };

    it('should return user with new token and register the session', async () => {
      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          upsert: jest.fn().mockResolvedValue({}),
        };
        return cb(manager);
      });

      const result: any = await service.checkAuthStatus(mockUser as any);

      expect(result.token).toBe('test-token');
      expect(result.id).toBe('uuid');
      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should remove user log successfully', async () => {
      dataSource.transaction.mockImplementation(async (cb) => {
        const manager = {
          findOneBy: jest
            .fn()
            .mockResolvedValueOnce({ id: 'uuid' })
            .mockResolvedValueOnce({ userId: 'uuid', token: 'tok' }),
          remove: jest.fn().mockResolvedValue({}),
        };
        return cb(manager);
      });

      const result = await service.logout('uuid');

      expect(result).toBe(true);
    });
  });
});
