import { JwtStrategy } from './jwt.strategy';
import { UnauthorizedException } from '@nestjs/common';

const mockAuthService = {
  validateUser: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-secret'),
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: typeof mockAuthService;

  beforeEach(() => {
    authService = mockAuthService;
    strategy = new JwtStrategy(authService as any, mockConfigService as any);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should call authService.validateUser with payload id', async () => {
    const mockUser = {
      id: 'uuid',
      email: 'test@test.com',
      active: true,
      roles: ['user'],
    };
    authService.validateUser.mockResolvedValue(mockUser);
    const result = await strategy.validate({ id: 'uuid' });
    expect(authService.validateUser).toHaveBeenCalledWith('uuid');
    expect(result).toEqual(mockUser);
  });

  it('should throw if authService.validateUser throws', async () => {
    authService.validateUser.mockRejectedValue(
      new UnauthorizedException('User not found'),
    );
    await expect(strategy.validate({ id: 'bad-id' })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
