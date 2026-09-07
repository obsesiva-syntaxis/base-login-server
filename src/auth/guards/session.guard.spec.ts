import { Test, TestingModule } from '@nestjs/testing';
import { SessionGuard } from './session.guard';
import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

const buildContext = (req: any) => ({
  switchToHttp: () => ({
    getRequest: () => req,
  }),
});

const tokenHash = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

describe('SessionGuard', () => {
  let guard: SessionGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionGuard],
    }).compile();

    guard = module.get<SessionGuard>(SessionGuard);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true when the session token matches', async () => {
    const token = 'valid-token';
    const context: any = buildContext({
      user: { id: 'uuid', userLog: { token: tokenHash(token) } },
      headers: { authorization: `Bearer ${token}` },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should throw when user is not present in the request', async () => {
    const context: any = buildContext({
      headers: { authorization: 'Bearer token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw when Authorization header is missing', async () => {
    const context: any = buildContext({
      user: { id: 'uuid', userLog: null },
      headers: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw when Authorization header is malformed', async () => {
    const context: any = buildContext({
      user: { id: 'uuid', userLog: { token: tokenHash('tok') } },
      headers: { authorization: 'Basic abc123' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw when no active session exists', async () => {
    const context: any = buildContext({
      user: { id: 'uuid', userLog: null },
      headers: { authorization: 'Bearer valid-token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw when the token hash does not match the stored session', async () => {
    const context: any = buildContext({
      user: { id: 'uuid', userLog: { token: tokenHash('other-token') } },
      headers: { authorization: 'Bearer valid-token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
