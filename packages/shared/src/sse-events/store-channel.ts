import { OrderDto } from '../dto/order.dto';

export type StoreSseEvent =
  | { type: 'session.started'; tableId: string; sessionId: string; startedAt: string }
  | { type: 'session.closed'; tableId: string; sessionId: string; closedAt: string }
  | { type: 'order.created'; tableId: string; sessionId: string; order: OrderDto }
  | { type: 'order.deleted'; tableId: string; sessionId: string; orderId: string }
  | { type: 'menu.soldout.changed'; menuId: string; soldout: boolean }
  | { type: 'keep-alive' };
