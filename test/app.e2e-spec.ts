import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/auth/entities/user.entity';
import { UserLog } from '../src/auth/entities/userLog.entity';
import { Reflector } from '@nestjs/core';
import { ResponseInterceptor } from '../src/common/interceptors';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const tokenHash = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

describe('Auth (e2e)', () => {
  let app: INestApplication;

  const mockRepo = {
    findOneBy: jest.fn(),
    findOneByEmail: jest.fn(),
    findOneById: jest.fn(),
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
  };

  const mockManager = {
    upsert: jest.fn().mockResolvedValue({}),
    findOneBy: jest.fn().mockResolvedValue(null),
    remove: jest.fn().mockResolvedValue({}),
  };

  const mockDataSource = {
    transaction: jest.fn(async (cb) => cb(mockManager)),
    createEntityManager: jest.fn(),
    destroy: jest.fn(),
  };

  const mockUser = {
    id: 'uuid-user',
    email: 'test@example.com',
    fullname: 'Test User',
    roles: ['user'],
    active: true,
    password: bcrypt.hashSync('Valid1Pass', 10),
  };

  const mockQueryBuilder = (user: any) => ({
    leftJoinAndMapOne: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(user),
  });

  const mockFindAllQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getRepositoryToken(User))
      .useValue(mockRepo)
      .overrideProvider(getRepositoryToken(UserLog))
      .useValue(mockRepo)
      .overrideProvider(DataSource)
      .useValue(mockDataSource)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(
      new ResponseInterceptor(),
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should return 400 with empty body', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);
    });

    it('should return 400 with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'invalid', password: 'Valid1Pass', fullname: 'Test' })
        .expect(400);
    });

    it('should return 400 with weak password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'test@test.com', password: 'weak', fullname: 'Test' })
        .expect(400);
    });

    it('should create a user and return the standard envelope', async () => {
      mockRepo.create.mockReturnValue({ ...mockUser });
      mockRepo.save.mockResolvedValue({
        id: 'uuid-user',
        email: 'test@example.com',
        fullname: 'Test User',
        roles: ['user'],
        active: true,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Valid1Pass',
          fullname: 'Test User',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        statusCode: 201,
        data: { email: 'test@example.com' },
      });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 400 with empty body', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);
    });

    it('should return 400 with invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'password' })
        .expect(400);
    });

    it('should return a token and user on valid credentials', async () => {
      mockRepo.findOneByEmail.mockResolvedValue(mockUser);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Valid1Pass' })
        .expect(200);

      expect(res.body.data.token).toEqual(expect.any(String));
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should return 401 with wrong password', async () => {
      mockRepo.findOneByEmail.mockResolvedValue(mockUser);

      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPass1' })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/check-status', () => {
    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/check-status')
        .expect(401);
    });

    it('should return the authenticated user with a valid session', async () => {
      const token = 'valid-token';
      const userWithSession = {
        ...mockUser,
        userLog: { token: tokenHash(token) },
      };
      mockRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder(userWithSession),
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/check-status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data.email).toBe('test@example.com');
    });
  });

  describe('GET /api/v1/auth/private3 (admin only)', () => {
    it('should deny a user with role "user"', async () => {
      const token = 'valid-token';
      mockRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder({
          ...mockUser,
          userLog: { token: tokenHash(token) },
        }),
      );

      return request(app.getHttpServer())
        .get('/api/v1/auth/private3')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /api/v1/users', () => {
    const adminUserWithSession = (token: string) => ({
      ...mockUser,
      roles: ['admin'],
      userLog: { token: tokenHash(token) },
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });

    it('should return 400 when no filter parameter is present', async () => {
      const token = 'valid-token';
      mockRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder(adminUserWithSession(token)),
      );

      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(res.body.message).toEqual(expect.any(String));
    });

    it('should return filtered users with the standard envelope', async () => {
      const token = 'valid-token';
      const rows = [{ id: 'uuid-user', email: 'test@example.com' }];
      mockFindAllQueryBuilder.getManyAndCount.mockResolvedValue([rows, 1]);
      mockRepo.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder(adminUserWithSession(token)))
        .mockReturnValueOnce(mockFindAllQueryBuilder);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .query({ email: 'test' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toMatchObject({
        rows,
        total: 1,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('DELETE /api/v1/auth/logout/:id', () => {
    it('should end the current user session', async () => {
      const token = 'valid-token';
      const userWithSession = {
        ...mockUser,
        id: 'uuid-owner',
        userLog: { token: tokenHash(token) },
      };
      mockRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder(userWithSession),
      );
      mockManager.findOneBy
        .mockResolvedValueOnce({ id: 'uuid-owner' })
        .mockResolvedValueOnce({
          userId: 'uuid-owner',
          token: tokenHash(token),
        });

      const res = await request(app.getHttpServer())
        .delete('/api/v1/auth/logout/uuid-owner')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.data).toBe(true);
    });

    it('should deny a non-admin ending another user session', async () => {
      const token = 'valid-token';
      const userWithSession = {
        ...mockUser,
        id: 'uuid-self',
        userLog: { token: tokenHash(token) },
      };
      mockRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder(userWithSession),
      );

      const res = await request(app.getHttpServer())
        .delete('/api/v1/auth/logout/uuid-other')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(res.body.message).toEqual(expect.any(String));
    });
  });
});
