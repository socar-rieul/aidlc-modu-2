import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof BusinessException) {
      res.status(400).json({
        statusCode: 400,
        message: exception.message,
        errorCode: exception.errorCode,
        details: exception.details ?? undefined,
      });
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      res.status(status).json({
        statusCode: status,
        message: typeof payload === 'string' ? payload : (payload as any)?.message ?? exception.message,
        errorCode: this.mapErrorCode(status),
      });
      return;
    }
    this.logger.error('Unhandled exception', exception as Error);
    res.status(500).json({
      statusCode: 500,
      message: '잠시 후 다시 시도해주세요.',
      errorCode: 'INTERNAL',
    });
  }

  private mapErrorCode(status: number): string {
    if (status === 401) return 'UNAUTHENTICATED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    return `HTTP_${status}`;
  }
}
