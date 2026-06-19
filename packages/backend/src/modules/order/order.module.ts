import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../db/entities/order.entity';
import { OrderItem } from '../../db/entities/order-item.entity';
import { OrderHistory } from '../../db/entities/order-history.entity';
import { TableSession } from '../../db/entities/table-session.entity';
import { Table } from '../../db/entities/table.entity';
import { Cart } from '../../db/entities/cart.entity';
import { CartItem } from '../../db/entities/cart-item.entity';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { AdminOrderController } from './admin-order.controller';
import { MenuModule } from '../menu/menu.module';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderHistory, TableSession, Table, Cart, CartItem]),
    MenuModule,
    CartModule,
  ],
  providers: [OrderService],
  controllers: [OrderController, AdminOrderController],
  exports: [OrderService],
})
export class OrderModule {}
