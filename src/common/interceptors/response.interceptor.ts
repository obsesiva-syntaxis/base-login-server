import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const statusCode = context.switchToHttp().getResponse().statusCode;
    const message = HttpStatus[statusCode] || 'Success';

    return next.handle().pipe(
      map((data) => ({
        statusCode,
        message,
        data: data ?? null,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
