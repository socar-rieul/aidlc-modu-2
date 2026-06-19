import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { DashboardDto, OrderPreviewDto, SessionStatus, TableCardDto } from '@table-order/shared';
import { Table } from '../../db/entities/table.entity';
import { TableSession } from '../../db/entities/table-session.entity';
import { Order } from '../../db/entities/order.entity';
import { OrderItem } from '../../db/entities/order-item.entity';

const PREVIEW_LIMIT = 3;

@Injectable()
export class AdminDashboardService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async getDashboard(storeId: string): Promise<DashboardDto> {
    const tables = await this.ds
      .getRepository(Table)
      .find({ where: { storeId }, order: { number: 'ASC' } });
    const cards: TableCardDto[] = await Promise.all(
      tables.map(async (t) => {
        const session = await this.ds
          .getRepository(TableSession)
          .findOne({ where: { tableId: t.id, status: SessionStatus.ACTIVE } });
        if (!session) {
          return {
            tableId: t.id,
            tableNumber: t.number,
            activeSessionId: null,
            totalAmount: 0,
            recentOrders: [],
          };
        }
        const orders = await this.ds.getRepository(Order).find({
          where: { sessionId: session.id, deletedAt: IsNull() },
          order: { createdAt: 'DESC' },
          take: PREVIEW_LIMIT,
        });
        const recent: OrderPreviewDto[] = await Promise.all(
          orders.map(async (o) => {
            const items = await this.ds.getRepository(OrderItem).find({ where: { orderId: o.id } });
            const top = items[0];
            return {
              id: o.id,
              total: o.total,
              createdAt: o.createdAt.toISOString(),
              topItem: top
                ? { menuName: top.menuNameSnapshot, quantity: top.quantity }
                : undefined,
            };
          }),
        );
        const totalAmount = (
          await this.ds.getRepository(Order).find({
            where: { sessionId: session.id, deletedAt: IsNull() },
          })
        ).reduce((s, o) => s + o.total, 0);
        return {
          tableId: t.id,
          tableNumber: t.number,
          activeSessionId: session.id,
          totalAmount,
          recentOrders: recent,
        };
      }),
    );
    return { storeId, tables: cards };
  }
}
