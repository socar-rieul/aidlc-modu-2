import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryColumn } from 'typeorm';
import { Cart } from './cart.entity';
import { Menu } from './menu.entity';

@Entity('cart_items')
@Index(['cartSessionId', 'menuId'], { unique: true })
export class CartItem {
  @PrimaryColumn('uuid') id!: string;
  @Column() cartSessionId!: string;
  @ManyToOne(() => Cart, (c) => c.items, { onDelete: 'CASCADE' }) cart!: Cart;
  @Column() menuId!: string;
  @ManyToOne(() => Menu, { onDelete: 'RESTRICT' }) menu!: Menu;
  @Column() quantity!: number;
  @CreateDateColumn() addedAt!: Date;
}
