import { Test, TestingModule } from '@nestjs/testing';
import { SessionGuard } from './session.guard';
import { USER_LOG_REPOSITORY } from '../repositories';
import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

const mockUserLogRepository = {
  findByUserId: jest.fn(),
};

const buildContext = (req: any) => ({
  switchToHttp: () => ({
    getRequest: () => req,
  }),
});

const tokenHash = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

describe('SessionGuard', () => {
  let guard: SessionGuard;
  let userLogRepository: typeof mockUserLogRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionGuard,
        { provide: USER_LOG_REPOSITORY, useValue: mockUserLogRepository },
      ],
    }).compile();

    guard = module.get<SessionGuard>(SessionGuard);
    userLogRepository = module.get(USER_LOG_REPOSITORY);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should return true when the session token matches', async () => {
    const token = 'valid-token';
    userLogRepository.findByUserId.mockResolvedValue({
      token: tokenHash(token),
    });
    const context: any = buildContext({
      user: { id: 'uuid' },
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
    const context: any = buildContext({ user: { id: 'uuid' }, headers: {} });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw when Authorization header is malformed', async () => {
    const context: any = buildContext({
      user: { id: 'uuid' },
      headers: { authorization: 'Basic abc123' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw when no active session exists', async () => {
    userLogRepository.findByUserId.mockResolvedValue(null);
    const context: any = buildContext({
      user: { id: 'uuid' },
      headers: { authorization: 'Bearer valid-token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw when the token hash does not match the stored session', async () => {
    userLogRepository.findByUserId.mockResolvedValue({
      token: tokenHash('other-token'),
    });
    const context: any = buildContext({
      user: { id: 'uuid' },
      headers: { authorization: 'Bearer valid-token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should look up the session for the authenticated user id', async () => {
    userLogRepository.findByUserId.mockResolvedValue({
      token: tokenHash('valid-token'),
    });
    const context: any = buildContext({
      user: { id: 'uuid-123' },
      headers: { authorization: 'Bearer valid-token' },
    });

    await guard.canActivate(context);

    expect(userLogRepository.findByUserId).toHaveBeenCalledWith('uuid-123');
  });
});
