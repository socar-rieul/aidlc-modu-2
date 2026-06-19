import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { LoginRequest, LoginResponse } from '@table-order/shared';
import { StoreUser } from '../../db/entities/store-user.entity';
import { BusinessException } from '../../common/exceptions/business.exception';

const LOCK_THRESHOLD = 5;
const LOCK_MINUTES = 5;
const JWT_EXPIRES_IN = '30d';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(StoreUser) private readonly users: Repository<StoreUser>,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginRequest): Promise<LoginResponse> {
    const user = await this.users.findOne({ where: { storeId: dto.storeId, username: dto.username } });
    if (!user) throw new BusinessException('LOGIN_FAILED', '매장ID·사용자명·비밀번호를 확인해주세요.');

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new BusinessException('LOGIN_RATE_LIMITED', '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      user.failedAttempts = (user.failedAttempts ?? 0) + 1;
      if (user.failedAttempts >= LOCK_THRESHOLD) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
      }
      await this.users.save(user);
      throw new BusinessException('LOGIN_FAILED', '매장ID·사용자명·비밀번호를 확인해주세요.');
    }

    user.failedAttempts = 0;
    user.lockUntil = null;
    await this.users.save(user);

    const jwt = await this.jwt.signAsync(
      { storeId: user.storeId, userId: user.id },
      { expiresIn: JWT_EXPIRES_IN },
    );
    return { jwt, expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString() };
  }
}
