import { ResponseInterceptor } from './response.interceptor';
import { HttpStatus } from '@nestjs/common';
import { of } from 'rxjs';

const mockJson = jest.fn();
const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
const mockHttpArgumentsHost = jest.fn().mockReturnValue({
  getResponse: mockGetResponse,
  getRequest: jest.fn().mockReturnValue({ url: '/test' }),
});
const mockArgumentsHost = {
  switchToHttp: mockHttpArgumentsHost,
  getArgByIndex: jest.fn(),
  getArgs: jest.fn(),
  getType: jest.fn(),
  switchToRpc: jest.fn(),
  switchToWs: jest.fn(),
};

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
    jest.clearAllMocks();
  });

  it('should wrap response with statusCode, message, data and timestamp', (done) => {
    const mockData = { id: 'uuid', email: 'test@test.com' };
    const mockCallHandler = {
      handle: () => of(mockData),
    };

    mockGetResponse.mockReturnValue({ statusCode: 200 });

    interceptor.intercept(mockArgumentsHost as any, mockCallHandler).subscribe({
      next: (result) => {
        expect(result.statusCode).toBe(200);
        expect(result.message).toBe(HttpStatus[200]);
        expect(result.data).toEqual(mockData);
        expect(result.timestamp).toBeDefined();
        expect(typeof result.timestamp).toBe('string');
        done();
      },
    });
  });

  it('should convert null data to null', (done) => {
    const mockCallHandler = {
      handle: () => of(null),
    };

    mockGetResponse.mockReturnValue({ statusCode: 200 });

    interceptor.intercept(mockArgumentsHost as any, mockCallHandler).subscribe({
      next: (result) => {
        expect(result.data).toBeNull();
        done();
      },
    });
  });

  it('should use correct status code message for 201', (done) => {
    const mockCallHandler = {
      handle: () => of({ id: 'uuid' }),
    };

    mockGetResponse.mockReturnValue({ statusCode: 201 });

    interceptor.intercept(mockArgumentsHost as any, mockCallHandler).subscribe({
      next: (result) => {
        expect(result.statusCode).toBe(201);
        expect(result.message).toBe('CREATED');
        done();
      },
    });
  });
});
