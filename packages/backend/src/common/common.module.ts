import { Global, Module } from '@nestjs/common';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { StoreScopeGuard } from './guards/store-scope.guard';
import { QrTokenGuard } from './guards/qr-token.guard';
import { SessionScopeGuard } from './guards/session-scope.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Global()
@Module({
  providers: [
    HttpExceptionFilter,
    LoggingInterceptor,
    JwtAuthGuard,
    StoreScopeGuard,
    QrTokenGuard,
    SessionScopeGuard,
    RateLimitGuard,
  ],
  exports: [
    HttpExceptionFilter,
    LoggingInterceptor,
    JwtAuthGuard,
    StoreScopeGuard,
    QrTokenGuard,
    SessionScopeGuard,
    RateLimitGuard,
  ],
})
export class CommonModule {}
