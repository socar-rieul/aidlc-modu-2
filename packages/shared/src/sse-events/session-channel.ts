import { CartItemDto } from '../dto/cart.dto';
import { OrderDto } from '../dto/order.dto';

export type SessionSseEvent =
  | { type: 'cart.updated'; version: number; items: CartItemDto[]; total: number }
  | { type: 'cart.cleared'; version: number }
  | { type: 'order.created'; order: OrderDto }
  | { type: 'order.deleted'; orderId: string }
  | { type: 'menu.soldout.changed'; menuId: string; soldout: boolean }
  | { type: 'session.closed'; reason: 'admin-closed' | 'qr-revoked' }
  | { type: 'keep-alive' };
