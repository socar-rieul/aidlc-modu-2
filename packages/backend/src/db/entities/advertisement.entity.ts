import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AdSlot } from '@table-order/shared';

@Entity('advertisements')
@Index(['slot', 'active'])
export class Advertisement {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar' }) slot!: AdSlot;
  @Column() imageUrl!: string;
  @Column() clickUrl!: string;
  @Column({ default: true }) active!: boolean;
  @CreateDateColumn() createdAt!: Date;
}
