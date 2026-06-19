import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TableSession } from './table-session.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
@Index(['sessionId', 'createdAt'])
@Index(['sessionId', 'deletedAt'])
export class Order {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() sessionId!: string;
  @ManyToOne(() => TableSession, (s) => s.orders, { onDelete: 'RESTRICT' }) session!: TableSession;
  @Column() total!: number;
  @CreateDateColumn() createdAt!: Date;
  @Column({ type: 'datetime', nullable: true }) deletedAt!: Date | null;

  @OneToMany(() => OrderItem, (i) => i.order) items!: OrderItem[];
}
