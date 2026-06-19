import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Store } from './store.entity';
import { MenuCategory } from './menu-category.entity';

@Entity('menus')
@Index(['storeId', 'categoryId', 'sortOrder'])
@Index(['storeId', 'deletedAt'])
export class Menu {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() storeId!: string;
  @ManyToOne(() => Store, (s) => s.menus, { onDelete: 'CASCADE' }) store!: Store;
  @Column() categoryId!: string;
  @ManyToOne(() => MenuCategory, { onDelete: 'RESTRICT' }) category!: MenuCategory;
  @Column() name!: string;
  @Column() price!: number;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ type: 'text', nullable: true }) imageUrl!: string | null;
  @Column({ default: 0 }) sortOrder!: number;
  @Column({ default: false }) soldout!: boolean;
  @Column({ type: 'datetime', nullable: true }) deletedAt!: Date | null;
  @CreateDateColumn() createdAt!: Date;
}
