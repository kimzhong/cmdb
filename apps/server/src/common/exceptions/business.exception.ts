import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorCodeMessages } from '@cmdb/shared/types/error-code';

/**
 * 业务异常
 *
 * 用法:
 *   throw new BusinessException(ErrorCode.IPAM_IP_CONFLICT, '10.0.0.5 已被占用', { ip: '10.0.0.5' });
 *
 * 配合 HttpExceptionFilter 输出 { code, error, message, data, path, timestamp }
 */
export class BusinessException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    public readonly customMessage?: string,
    public readonly data?: any,
    public readonly httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        code: errorCode,
        error: ErrorCode[errorCode] ?? 'BUSINESS_ERROR',
        message: customMessage ?? ErrorCodeMessages[errorCode] ?? 'Business error',
        data,
      },
      httpStatus,
    );
  }
}
