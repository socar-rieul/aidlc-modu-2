import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SseService } from './sse.service';
import { CartItemDto, OrderDto } from '@table-order/shared';

@Injectable()
export class SseEventRouter {
  constructor(private readonly sse: SseService) {}

  @OnEvent('cart.updated')
  onCartUpdated(p: { sessionId: string; version: number; items: CartItemDto[]; total: number }): void {
    this.sse.emitToSession(p.sessionId, { type: 'cart.updated', version: p.version, items: p.items, total: p.total });
  }

  @OnEvent('cart.cleared')
  onCartCleared(p: { sessionId: string; version: number }): void {
    this.sse.emitToSession(p.sessionId, { type: 'cart.cleared', version: p.version });
  }

  @OnEvent('order.created')
  onOrderCreated(p: { sessionId: string; storeId: string; tableId: string; order: OrderDto }): void {
    this.sse.emitToSession(p.sessionId, { type: 'order.created', order: p.order });
    this.sse.emitToStore(p.storeId, { type: 'order.created', tableId: p.tableId, sessionId: p.sessionId, order: p.order });
  }

  @OnEvent('order.deleted')
  onOrderDeleted(p: { sessionId: string; storeId: string; tableId: string; orderId: string }): void {
    this.sse.emitToSession(p.sessionId, { type: 'order.deleted', orderId: p.orderId });
    this.sse.emitToStore(p.storeId, { type: 'order.deleted', tableId: p.tableId, sessionId: p.sessionId, orderId: p.orderId });
  }

  @OnEvent('session.started')
  onSessionStarted(p: { storeId: string; tableId: string; sessionId: string; startedAt: string }): void {
    this.sse.emitToStore(p.storeId, {
      type: 'session.started',
      tableId: p.tableId,
      sessionId: p.sessionId,
      startedAt: p.startedAt,
    });
  }

  @OnEvent('session.closed')
  onSessionClosed(p: { storeId: string; tableId: string; sessionId: string; reason: 'admin-closed' | 'qr-revoked' }): void {
    this.sse.emitToSession(p.sessionId, { type: 'session.closed', reason: p.reason });
    this.sse.emitToStore(p.storeId, {
      type: 'session.closed',
      tableId: p.tableId,
      sessionId: p.sessionId,
      closedAt: new Date().toISOString(),
    });
  }

  @OnEvent('menu.soldout')
  onMenuSoldout(p: { storeId: string; menuId: string; soldout: boolean; activeSessionIds: string[] }): void {
    for (const sid of p.activeSessionIds) {
      this.sse.emitToSession(sid, { type: 'menu.soldout.changed', menuId: p.menuId, soldout: p.soldout });
    }
    this.sse.emitToStore(p.storeId, { type: 'menu.soldout.changed', menuId: p.menuId, soldout: p.soldout });
  }
}
