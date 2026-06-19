import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';
import { Menu } from './menu.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() orderId!: string;
  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' }) order!: Order;
  @Column() menuId!: string;
  @ManyToOne(() => Menu, { onDelete: 'NO ACTION' }) menu!: Menu;
  @Column() menuNameSnapshot!: string;
  @Column() unitPriceSnapshot!: number;
  @Column() quantity!: number;
}
