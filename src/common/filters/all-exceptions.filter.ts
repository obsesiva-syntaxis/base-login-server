import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { pino } from 'pino';

interface HttpExceptionResponse {
  message: string | string[];
  statusCode: number;
  error: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = pino();

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const url = ctx.getRequest().url;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        const responseBody = exceptionResponse as HttpExceptionResponse;
        message = Array.isArray(responseBody.message)
          ? responseBody.message.join(', ')
          : responseBody.message ?? exception.message;
      }
    } else {
      this.logger.error(exception, `Unhandled error on ${url}`);
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      data: { path: url },
    });
  }
}
