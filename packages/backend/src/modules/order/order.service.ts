import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, IsNull } from 'typeorm';
import { CreateOrderResponse, HistoryQueryDto, OrderDto, OrderHistoryDto, SessionStatus } from '@table-order/shared';
import { Order } from '../../db/entities/order.entity';
import { OrderItem } from '../../db/entities/order-item.entity';
import { OrderHistory } from '../../db/entities/order-history.entity';
import { TableSession } from '../../db/entities/table-session.entity';
import { Table } from '../../db/entities/table.entity';
import { Cart } from '../../db/entities/cart.entity';
import { CartItem } from '../../db/entities/cart-item.entity';
import { BusinessException } from '../../common/exceptions/business.exception';
import { MenuService } from '../menu/menu.service';
import { CartService } from '../cart/cart.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly menuService: MenuService,
    private readonly cartService: CartService,
    private readonly eventBus: EventEmitter2,
  ) {}

  async listForSession(sessionId: string): Promise<OrderDto[]> {
    const rows = await this.ds.getRepository(Order).find({
      where: { sessionId, deletedAt: IsNull() },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
    return rows.map((o) => this.toDto(o));
  }

  async createOrder(sessionId: string): Promise<CreateOrderResponse> {
    const result = await this.ds.transaction(async (m) => {
      const session = await m.getRepository(TableSession).findOne({ where: { id: sessionId } });
      if (!session || session.status !== SessionStatus.ACTIVE) {
        throw new BusinessException('SESSION_INACTIVE', '세션이 활성 상태가 아닙니다.');
      }
      const table = await m.getRepository(Table).findOne({ where: { id: session.tableId } });
      if (!table) throw new BusinessException('TABLE_NOT_FOUND', '테이블을 찾을 수 없습니다.');

      const snapshot = await this.cartService.snapshotForOrder(sessionId, m);
      if (snapshot.length === 0) throw new BusinessException('CART_EMPTY', '장바구니가 비어 있습니다.');
      for (const item of snapshot) {
        if (item.menu.soldout) {
          throw new BusinessException(
            'CART_HAS_DELETED_MENU',
            '장바구니에 더 이상 판매하지 않는 메뉴가 있어요.',
          );
        }
      }
      const total = snapshot.reduce((s, i) => s + i.menu.price * i.quantity, 0);
      const order = m.getRepository(Order).create({ sessionId, total });
      const savedOrder = await m.getRepository(Order).save(order);
      const items = snapshot.map((i) =>
        m.getRepository(OrderItem).create({
          orderId: savedOrder.id,
          menuId: i.menu.id,
          menuNameSnapshot: i.menu.name,
          unitPriceSnapshot: i.menu.price,
          quantity: i.quantity,
        }),
      );
      const savedItems = await m.getRepository(OrderItem).save(items);
      savedOrder.items = savedItems;

      // Cart clear (트랜잭션 내부)
      await m.getRepository(CartItem).delete({ cartSessionId: sessionId });
      const cart = await m.getRepository(Cart).findOne({ where: { sessionId } });
      const newVersion = (cart?.version ?? 0) + 1;
      if (cart) {
        cart.version = newVersion;
        await m.getRepository(Cart).save(cart);
      }

      return {
        order: this.toDto(savedOrder),
        version: newVersion,
        storeId: table.storeId,
        tableId: table.id,
      };
    });

    this.eventBus.emit('cart.cleared', { sessionId, version: result.version });
    this.eventBus.emit('order.created', {
      sessionId,
      storeId: result.storeId,
      tableId: result.tableId,
      order: result.order,
    });

    return {
      order: result.order,
      cart: { sessionId, version: result.version, items: [], total: 0 },
    };
  }

  async deleteByAdmin(storeId: string, orderId: string): Promise<void> {
    await this.ds.transaction(async (m) => {
      const order = await m.getRepository(Order).findOne({
        where: { id: orderId, deletedAt: IsNull() },
      });
      if (!order) throw new BusinessException('ORDER_NOT_FOUND', '주문을 찾을 수 없습니다.');
      const session = await m.getRepository(TableSession).findOne({ where: { id: order.sessionId } });
      if (!session) throw new BusinessException('ORDER_NOT_FOUND', '주문을 찾을 수 없습니다.');
      if (session.status !== SessionStatus.ACTIVE) {
        throw new BusinessException('ORDER_IN_HISTORY', '이미 종료된 테이블의 주문은 수정할 수 없습니다.');
      }
      const table = await m.getRepository(Table).findOne({ where: { id: session.tableId } });
      if (!table || table.storeId !== storeId) throw new BusinessException('ORDER_NOT_FOUND', '주문을 찾을 수 없습니다.');

      order.deletedAt = new Date();
      await m.getRepository(Order).save(order);

      this.eventBus.emit('order.deleted', {
        sessionId: session.id,
        storeId: table.storeId,
        tableId: table.id,
        orderId,
      });
    });
  }

  async listHistory(storeId: string, query: HistoryQueryDto): Promise<OrderHistoryDto[]> {
    const table = await this.ds.getRepository(Table).findOne({ where: { id: query.tableId, storeId } });
    if (!table) throw new BusinessException('TABLE_NOT_FOUND', '테이블을 찾을 수 없습니다.');
    const where: any = { tableId: query.tableId };
    if (query.from && query.to) {
      where.closedAt = Between(new Date(query.from), new Date(query.to));
    }
    const rows = await this.ds.getRepository(OrderHistory).find({
      where,
      order: { closedAt: 'DESC' },
    });
    return rows.map((h) => ({
      id: h.id,
      tableId: h.tableId,
      originalSessionId: h.originalSessionId,
      closedAt: h.closedAt.toISOString(),
      summary: JSON.parse(h.summary),
    }));
  }

  private toDto(order: Order): OrderDto {
    return {
      id: order.id,
      sessionId: order.sessionId,
      total: order.total,
      createdAt: order.createdAt.toISOString(),
      items: (order.items ?? []).map((i) => ({
        menuId: i.menuId,
        menuName: i.menuNameSnapshot,
        unitPrice: i.unitPriceSnapshot,
        quantity: i.quantity,
      })),
    };
  }
}
