import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoginRequest, LoginResponse } from '@table-order/shared';
import { AuthService } from './auth.service';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';

@ApiTags('admin/auth')
@Controller('admin/auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('login')
  @UseGuards(RateLimitGuard)
  @HttpCode(200)
  login(@Body() dto: LoginRequest): Promise<LoginResponse> {
    return this.service.login(dto);
  }

  @Post('logout')
  @HttpCode(204)
  logout(): void {
    // 클라이언트가 로컬 토큰 폐기. 서버 in-memory blacklist는 워크샵 PoC 생략.
  }
}
