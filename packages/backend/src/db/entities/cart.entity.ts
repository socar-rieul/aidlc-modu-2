import { Column, Entity, OneToMany, OneToOne, JoinColumn, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { TableSession } from './table-session.entity';
import { CartItem } from './cart-item.entity';

@Entity('carts')
export class Cart {
  @PrimaryColumn() sessionId!: string;
  @OneToOne(() => TableSession, (s) => s.cart, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' }) session!: TableSession;

  @Column({ default: 0 }) version!: number;
  @UpdateDateColumn() updatedAt!: Date;

  @OneToMany(() => CartItem, (i) => i.cart) items!: CartItem[];
}
