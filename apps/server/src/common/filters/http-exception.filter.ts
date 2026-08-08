import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '@cmdb/shared/types/error-code';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let httpStatus: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: number = ErrorCode.INTERNAL_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'INTERNAL_ERROR';
    let data: any = undefined;

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        if (typeof r.code === 'number') code = r.code as number;
        message = (r.message as string | string[]) ?? exception.message;
        if (typeof r.error === 'string') error = r.error as string;
        if ('data' in r) data = r.data;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.stack);
    }

    response.status(httpStatus).json({
      code,
      error,
      message,
      data,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
