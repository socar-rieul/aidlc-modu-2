import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Table } from '../../db/entities/table.entity';
import { TableSession } from '../../db/entities/table-session.entity';
import { SessionParticipant } from '../../db/entities/session-participant.entity';
import { Cart } from '../../db/entities/cart.entity';
import { CartItem } from '../../db/entities/cart-item.entity';
import { Order } from '../../db/entities/order.entity';
import { OrderItem } from '../../db/entities/order-item.entity';
import { OrderHistory } from '../../db/entities/order-history.entity';
import { Store } from '../../db/entities/store.entity';
import { TableService } from './table.service';
import { TableController } from './table.controller';
import { AdminTableController } from './admin-table.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Table, TableSession, SessionParticipant, Cart, CartItem, Order, OrderItem, OrderHistory, Store,
    ]),
  ],
  providers: [TableService],
  controllers: [TableController, AdminTableController],
  exports: [TableService],
})
export class TableModule {}
