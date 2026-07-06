import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginUserDTO, RegisterUserDTO } from './dto';
import { JwtService } from '@nestjs/jwt';
import { USER_REPOSITORY, USER_LOG_REPOSITORY } from './repositories';
import { DataSource } from 'typeorm';
import { PassportModule } from '@nestjs/passport';
import { User } from './entities/user.entity';

const mockUser = {
  id: 'uuid',
  email: 'test@example.com',
  password: 'hashed',
  fullname: 'Test User',
  roles: ['user'],
  active: true,
  created_at: new Date(),
  modified_at: new Date(),
} as User;

const mockAuthService = {
  register: jest.fn().mockResolvedValue(mockUser),
  login: jest.fn().mockResolvedValue({ token: 'token', user: mockUser }),
  logout: jest.fn().mockResolvedValue(true),
  checkAuthStatus: jest
    .fn()
    .mockResolvedValue({ ...mockUser, token: 'new-token' }),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: typeof mockAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
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

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register and return the user', async () => {
      const dto: RegisterUserDTO = {
        email: 'test@example.com',
        password: 'Valid1Pass',
        fullname: 'Test User',
      };
      const result = await controller.register(dto);
      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('login', () => {
    it('should call authService.login and return token + user', async () => {
      const dto: LoginUserDTO = {
        email: 'test@example.com',
        password: 'Valid1Pass',
      };
      const result = await controller.login(dto);
      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ token: 'token', user: mockUser });
    });
  });

  describe('logout', () => {
    it('should call authService.logout with the id', async () => {
      const result = await controller.logout('uuid-uuid-uuid');
      expect(authService.logout).toHaveBeenCalledWith('uuid-uuid-uuid');
      expect(result).toBe(true);
    });
  });

  describe('checkAuthStatus', () => {
    it('should return user with new token', async () => {
      const result = await controller.checkAuthStatus(mockUser);
      expect(authService.checkAuthStatus).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ ...mockUser, token: 'new-token' });
    });
  });
});
