import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Table } from '../../db/entities/table.entity';
import { TableSession } from '../../db/entities/table-session.entity';
import { Order } from '../../db/entities/order.entity';
import { OrderItem } from '../../db/entities/order-item.entity';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Table, TableSession, Order, OrderItem])],
  providers: [AdminDashboardService],
  controllers: [AdminDashboardController],
})
export class AdminModule {}
