import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpException, HttpStatus, BadRequestException } from '@nestjs/common';

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

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.clearAllMocks();
  });

  it('should handle HttpException with string message', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    filter.catch(exception, mockArgumentsHost);
    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Forbidden',
        statusCode: HttpStatus.FORBIDDEN,
      }),
    );
  });

  it('should handle HttpException with object message (string)', () => {
    const exception = new BadRequestException('Bad Request');
    filter.catch(exception, mockArgumentsHost);
    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Bad Request' }),
    );
  });

  it('should handle HttpException with array message', () => {
    const exception = new BadRequestException([
      'email must be valid',
      'password too short',
    ]);
    filter.catch(exception, mockArgumentsHost);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'email must be valid, password too short',
      }),
    );
  });

  it('should handle non-HttpException as 500', () => {
    const exception = new Error('Unexpected error');
    filter.catch(exception, mockArgumentsHost);
    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
  });

  it('should include timestamp and path in response', () => {
    const exception = new HttpException('error', HttpStatus.BAD_REQUEST);
    filter.catch(exception, mockArgumentsHost);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
        path: '/test',
      }),
    );
  });
});
