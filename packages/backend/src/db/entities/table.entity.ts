import { Column, CreateDateColumn, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Store } from './store.entity';
import { TableSession } from './table-session.entity';

@Entity('tables')
@Index(['storeId', 'number'], { unique: true })
@Index(['qrToken'], { unique: true })
export class Table {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() storeId!: string;
  @ManyToOne(() => Store, (s) => s.tables, { onDelete: 'CASCADE' }) store!: Store;
  @Column() number!: number;
  @Column() qrToken!: string;
  @Column({ default: true }) active!: boolean;
  @CreateDateColumn() createdAt!: Date;

  @OneToMany(() => TableSession, (s) => s.table) sessions!: TableSession[];
}
