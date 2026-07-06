import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/auth/entities/user.entity';
import { UserLog } from '../src/auth/entities/userLog.entity';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  const mockRepo = {
    findOneBy: jest.fn(),
    findOneByEmail: jest.fn(),
    findOneById: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
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
      .useValue({
        transaction: jest.fn(),
        createEntityManager: jest.fn(),
        destroy: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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
  });

  describe('GET /api/v1/auth/check-status', () => {
    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/check-status')
        .expect(401);
    });
  });
});
