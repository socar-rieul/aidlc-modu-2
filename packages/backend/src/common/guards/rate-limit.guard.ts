import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StoreUser } from '../../db/entities/store-user.entity';
import { BusinessException } from '../exceptions/business.exception';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const { storeId, username } = req.body ?? {};
    if (!storeId || !username) return true;
    const user = await this.ds.getRepository(StoreUser).findOne({ where: { storeId, username } });
    if (user?.lockUntil && user.lockUntil > new Date()) {
      throw new BusinessException(
        'LOGIN_RATE_LIMITED',
        '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
      );
    }
    return true;
  }
}
