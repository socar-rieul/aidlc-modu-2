import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Table } from './table.entity';
import { SessionParticipant } from './session-participant.entity';
import { Cart } from './cart.entity';
import { Order } from './order.entity';
import { SessionStatus } from '@table-order/shared';

// 테이블당 활성 1개 unique는 partial index — 마이그레이션에서 raw SQL로 보강
@Entity('table_sessions')
@Index(['tableId', 'status'])
@Index(['startedAt'])
export class TableSession {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() tableId!: string;
  @ManyToOne(() => Table, (t) => t.sessions, { onDelete: 'RESTRICT' }) table!: Table;
  @CreateDateColumn() startedAt!: Date;
  @Column({ type: 'datetime', nullable: true }) endedAt!: Date | null;
  @Column({ type: 'varchar', default: SessionStatus.ACTIVE }) status!: SessionStatus;

  @OneToMany(() => SessionParticipant, (p) => p.session) participants!: SessionParticipant[];
  @OneToOne(() => Cart, (c) => c.session) cart!: Cart;
  @OneToMany(() => Order, (o) => o.session) orders!: Order[];
}
