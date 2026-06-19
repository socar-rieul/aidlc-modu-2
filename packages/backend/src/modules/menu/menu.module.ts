import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menu } from '../../db/entities/menu.entity';
import { MenuCategory } from '../../db/entities/menu-category.entity';
import { CartItem } from '../../db/entities/cart-item.entity';
import { Cart } from '../../db/entities/cart.entity';
import { TableSession } from '../../db/entities/table-session.entity';
import { Table } from '../../db/entities/table.entity';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { AdminMenuController } from './admin-menu.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Menu, MenuCategory, CartItem, Cart, TableSession, Table])],
  providers: [MenuService],
  controllers: [MenuController, AdminMenuController],
  exports: [MenuService],
})
export class MenuModule {}
