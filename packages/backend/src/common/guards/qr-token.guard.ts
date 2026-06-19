import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { SessionParticipant } from '../../db/entities/session-participant.entity';
import { TableSession } from '../../db/entities/table-session.entity';
import { Table } from '../../db/entities/table.entity';
import { SessionStatus } from '@table-order/shared';

@Injectable()
export class QrTokenGuard implements CanActivate {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers['x-session-token'] as string | undefined;
    if (!token) throw new UnauthorizedException('TOKEN_MISSING');
    const repo = this.ds.getRepository(SessionParticipant);
    const sp = await repo.findOne({ where: { token, revokedAt: IsNull() } });
    if (!sp) throw new UnauthorizedException('TOKEN_INVALID');
    const session = await this.ds.getRepository(TableSession).findOne({ where: { id: sp.sessionId } });
    if (!session || session.status !== SessionStatus.ACTIVE) throw new UnauthorizedException('SESSION_INACTIVE');
    const table = await this.ds.getRepository(Table).findOne({ where: { id: session.tableId } });
    if (!table) throw new UnauthorizedException('TABLE_GONE');
    req.session = { sessionId: sp.sessionId, tableId: session.tableId, storeId: table.storeId };
    return true;
  }
}
