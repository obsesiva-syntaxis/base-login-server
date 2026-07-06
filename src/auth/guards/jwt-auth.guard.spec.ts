import { UserRoleGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

const mockReflector = {
  get: jest.fn(),
  getAll: jest.fn(),
  getAllAndMerge: jest.fn(),
  getAllAndOverride: jest.fn(),
};

const mockExecutionContext = {
  switchToHttp: jest.fn().mockReturnValue({
    getRequest: jest.fn().mockReturnValue({ user: null }),
  }),
  getHandler: jest.fn(),
  getClass: jest.fn(),
  getType: jest.fn(),
};

describe('UserRoleGuard', () => {
  let guard: UserRoleGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = mockReflector as any;
    guard = new UserRoleGuard(reflector);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true if no valid roles are defined (null)', () => {
    mockReflector.get.mockReturnValue(null);
    const result = guard.canActivate(mockExecutionContext as any);
    expect(result).toBe(true);
  });

  it('should return true if valid roles is an empty array', () => {
    mockReflector.get.mockReturnValue([]);
    const result = guard.canActivate(mockExecutionContext as any);
    expect(result).toBe(true);
  });

  it('should throw BadRequestException if user is not found', () => {
    mockReflector.get.mockReturnValue(['admin']);
    expect(() => guard.canActivate(mockExecutionContext as any)).toThrow(
      BadRequestException,
    );
  });

  it('should return true if user has a required role', () => {
    mockReflector.get.mockReturnValue(['admin', 'super-user']);
    const req = { user: { roles: ['admin'], fullname: 'Admin' } };
    mockExecutionContext.switchToHttp.mockReturnValue({
      getRequest: jest.fn().mockReturnValue(req),
    });
    const result = guard.canActivate(mockExecutionContext as any);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user does not have required role', () => {
    mockReflector.get.mockReturnValue(['super-user']);
    const req = { user: { roles: ['user'], fullname: 'Regular' } };
    mockExecutionContext.switchToHttp.mockReturnValue({
      getRequest: jest.fn().mockReturnValue(req),
    });
    expect(() => guard.canActivate(mockExecutionContext as any)).toThrow(
      ForbiddenException,
    );
  });
});
