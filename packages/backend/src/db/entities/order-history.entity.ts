import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Table } from './table.entity';

@Entity('order_history')
@Index(['tableId', 'closedAt'])
export class OrderHistory {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() tableId!: string;
  @ManyToOne(() => Table, { onDelete: 'RESTRICT' }) table!: Table;
  @Column() originalSessionId!: string;
  @Column({ type: 'datetime' }) closedAt!: Date;
  @Column({ type: 'text' }) summary!: string; // JSON string
}
