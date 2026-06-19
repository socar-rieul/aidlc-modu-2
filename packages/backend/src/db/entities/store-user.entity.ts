import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Store } from './store.entity';

@Entity('store_users')
@Index(['storeId', 'username'], { unique: true })
export class StoreUser {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() storeId!: string;
  @ManyToOne(() => Store, (s) => s.users, { onDelete: 'CASCADE' }) store!: Store;
  @Column() username!: string;
  @Column() passwordHash!: string;
  @Column({ default: 0 }) failedAttempts!: number;
  @Column({ type: 'datetime', nullable: true }) lockUntil!: Date | null;
  @CreateDateColumn() createdAt!: Date;
}
