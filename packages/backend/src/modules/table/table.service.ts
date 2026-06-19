import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import * as crypto from 'node:crypto';
import * as QRCode from 'qrcode';
import {
  CreateTableDto,
  QrRegenerateResponse,
  QrScanResponse,
  SessionStatus,
  TableDto,
} from '@table-order/shared';
import { Table } from '../../db/entities/table.entity';
import { TableSession } from '../../db/entities/table-session.entity';
import { SessionParticipant } from '../../db/entities/session-participant.entity';
import { Cart } from '../../db/entities/cart.entity';
import { CartItem } from '../../db/entities/cart-item.entity';
import { Order } from '../../db/entities/order.entity';
import { OrderItem } from '../../db/entities/order-item.entity';
import { OrderHistory } from '../../db/entities/order-history.entity';
import { Store } from '../../db/entities/store.entity';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class TableService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly eventBus: EventEmitter2,
  ) {}

  async scanQr(token: string, existingSessionToken?: string): Promise<QrScanResponse> {
    return this.ds.transaction(async (m) => {
      const table = await m.getRepository(Table).findOne({ where: { qrToken: token } });
      if (!table) throw new BusinessException('QR_REVOKED', 'QR이 만료되었어요. 직원을 호출해주세요.');
      const store = await m.getRepository(Store).findOne({ where: { id: table.storeId } });
      if (!store?.active) throw new BusinessException('STORE_CLOSED', '매장이 영업 중이 아닙니다.');

      let session = await m
        .getRepository(TableSession)
        .findOne({ where: { tableId: table.id, status: SessionStatus.ACTIVE } });
      let sessionCreated = false;
      if (!session) {
        session = m.getRepository(TableSession).create({ tableId: table.id, status: SessionStatus.ACTIVE });
        session = await m.getRepository(TableSession).save(session);
        await m.getRepository(Cart).save(m.getRepository(Cart).create({ sessionId: session.id, version: 0 }));
        sessionCreated = true;
      }

      let sp: SessionParticipant | null = null;
      if (existingSessionToken) {
        sp = await m
          .getRepository(SessionParticipant)
          .findOne({ where: { token: existingSessionToken, sessionId: session.id, revokedAt: IsNull() } });
      }
      if (!sp) {
        sp = m.getRepository(SessionParticipant).create({
          sessionId: session.id,
          token: crypto.randomUUID(),
        });
        sp = await m.getRepository(SessionParticipant).save(sp);
      }

      if (sessionCreated) {
        this.eventBus.emit('session.started', {
          storeId: table.storeId,
          tableId: table.id,
          sessionId: session.id,
          startedAt: session.startedAt.toISOString(),
        });
      }

      return {
        sessionToken: sp.token,
        sessionId: session.id,
        storeId: table.storeId,
        storeName: store.name,
        tableNumber: table.number,
      };
    });
  }

  async createTable(storeId: string, dto: CreateTableDto): Promise<TableDto> {
    const repo = this.ds.getRepository(Table);
    const existing = await repo.findOne({ where: { storeId, number: dto.number } });
    if (existing) throw new BusinessException('TABLE_NUMBER_DUPLICATE', '이미 같은 번호의 테이블이 있습니다.');
    const t = await repo.save(repo.create({ storeId, number: dto.number, qrToken: crypto.randomUUID() }));
    return { id: t.id, storeId: t.storeId, number: t.number, qrToken: t.qrToken, active: t.active };
  }

  async listTables(storeId: string): Promise<TableDto[]> {
    const rows = await this.ds.getRepository(Table).find({ where: { storeId }, order: { number: 'ASC' } });
    return rows.map((t) => ({ id: t.id, storeId: t.storeId, number: t.number, qrToken: t.qrToken, active: t.active }));
  }

  async regenerateQr(storeId: string, tableId: string): Promise<QrRegenerateResponse> {
    const table = await this.ds.getRepository(Table).findOne({ where: { id: tableId, storeId } });
    if (!table) throw new BusinessException('TABLE_NOT_FOUND', '테이블을 찾을 수 없습니다.');
    // 활성 세션 강제 종료 (UC-6 cascade)
    try {
      await this.closeActiveSession(storeId, tableId, 'qr-revoked');
    } catch (e) {
      if (!(e instanceof BusinessException) || e.errorCode !== 'SESSION_INACTIVE') throw e;
      // 활성 세션 없음은 무시 (재발급은 진행)
    }
    table.qrToken = crypto.randomUUID();
    await this.ds.getRepository(Table).save(table);
    return {
      tableId: table.id,
      qrToken: table.qrToken,
      imageUrl: `/admin/tables/${table.id}/qr.png`,
      pdfUrl: `/admin/tables/${table.id}/qr.pdf`,
    };
  }

  async closeActiveSession(
    storeId: string,
    tableId: string,
    reason: 'admin-closed' | 'qr-revoked' = 'admin-closed',
  ): Promise<{ closedSessionId: string; movedOrders: number }> {
    return this.ds.transaction(async (m) => {
      const table = await m.getRepository(Table).findOne({ where: { id: tableId, storeId } });
      if (!table) throw new BusinessException('TABLE_NOT_FOUND', '테이블을 찾을 수 없습니다.');
      const session = await m
        .getRepository(TableSession)
        .findOne({ where: { tableId, status: SessionStatus.ACTIVE } });
      if (!session) throw new BusinessException('SESSION_INACTIVE', '종료할 활성 세션이 없습니다.');

      const orders = await m.getRepository(Order).find({
        where: { sessionId: session.id, deletedAt: IsNull() },
        relations: ['items'],
      });

      session.status = SessionStatus.CLOSED;
      session.endedAt = new Date();
      await m.getRepository(TableSession).save(session);

      let movedOrders = 0;
      if (orders.length > 0) {
        const summary = {
          orders: orders.map((o) => ({
            id: o.id,
            total: o.total,
            createdAt: o.createdAt.toISOString(),
            items: o.items.map((i) => ({
              menuName: i.menuNameSnapshot,
              unitPrice: i.unitPriceSnapshot,
              quantity: i.quantity,
            })),
          })),
          total: orders.reduce((s, o) => s + o.total, 0),
        };
        const history = m.getRepository(OrderHistory).create({
          tableId,
          originalSessionId: session.id,
          closedAt: new Date(),
          summary: JSON.stringify(summary),
        });
        await m.getRepository(OrderHistory).save(history);
        movedOrders = orders.length;
      }

      // Cart clear
      await m.getRepository(CartItem).delete({ cartSessionId: session.id });
      const cart = await m.getRepository(Cart).findOne({ where: { sessionId: session.id } });
      if (cart) {
        cart.version += 1;
        await m.getRepository(Cart).save(cart);
      }
      // Participant revoke
      await m
        .createQueryBuilder()
        .update(SessionParticipant)
        .set({ revokedAt: new Date() })
        .where('sessionId = :sid AND revokedAt IS NULL', { sid: session.id })
        .execute();

      this.eventBus.emit('session.closed', {
        storeId,
        tableId,
        sessionId: session.id,
        reason,
      });

      return { closedSessionId: session.id, movedOrders };
    });
  }

  async getActiveSession(tableId: string, manager?: EntityManager): Promise<TableSession | null> {
    const repo = (manager ?? this.ds.manager).getRepository(TableSession);
    return repo.findOne({ where: { tableId, status: SessionStatus.ACTIVE } });
  }

  async generateQrImage(tableId: string, format: 'png' | 'svg', storeId: string): Promise<Buffer | string> {
    const table = await this.ds.getRepository(Table).findOne({ where: { id: tableId, storeId } });
    if (!table) throw new BusinessException('TABLE_NOT_FOUND', '테이블을 찾을 수 없습니다.');
    const payload = `parkingshare://table?storeId=${storeId}&token=${table.qrToken}`;
    if (format === 'svg') return QRCode.toString(payload, { type: 'svg' });
    return QRCode.toBuffer(payload, { type: 'png', width: 512 });
  }
}
