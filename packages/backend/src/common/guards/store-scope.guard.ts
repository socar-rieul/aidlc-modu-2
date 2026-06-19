import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class StoreScopeGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const userStoreId: string | undefined = req.user?.storeId;
    const target: string | undefined =
      req.params?.storeId ?? req.body?.storeId ?? req.session?.storeId ?? req.query?.storeId;
    if (target && userStoreId && target !== userStoreId) throw new ForbiddenException('STORE_SCOPE');
    return true;
  }
}
