import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * 全局响应转换：把 Controller 返回值包成统一结构
 * { code: 0, message: 'ok', data: <原返回值>, timestamp }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResult<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResult<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'ok',
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
