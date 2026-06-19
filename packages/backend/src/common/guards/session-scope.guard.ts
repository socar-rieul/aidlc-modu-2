import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class SessionScopeGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const pathSid = req.params?.sessionId;
    const reqSid = req.session?.sessionId;
    if (pathSid && reqSid && pathSid !== reqSid) throw new ForbiddenException('SESSION_SCOPE');
    return true;
  }
}
