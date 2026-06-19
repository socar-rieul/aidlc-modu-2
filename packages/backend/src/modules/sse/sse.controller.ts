import { Controller, MessageEvent, Param, Sse, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ApiTags } from '@nestjs/swagger';
import { SseService } from './sse.service';
import { QrTokenGuard } from '../../common/guards/qr-token.guard';
import { SessionScopeGuard } from '../../common/guards/session-scope.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StoreScopeGuard } from '../../common/guards/store-scope.guard';

@ApiTags('sse')
@Controller('sse')
export class SseController {
  constructor(private readonly sse: SseService) {}

  @Sse('sessions/:sessionId')
  @UseGuards(QrTokenGuard, SessionScopeGuard)
  session(@Param('sessionId') sid: string): Observable<MessageEvent> {
    return this.sse.subscribeSession(sid);
  }

  @Sse('stores/:storeId')
  @UseGuards(JwtAuthGuard, StoreScopeGuard)
  store(@Param('storeId') storeId: string): Observable<MessageEvent> {
    return this.sse.subscribeStore(storeId);
  }
}
