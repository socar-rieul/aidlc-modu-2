import { Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Store } from './store.entity';
import { Menu } from './menu.entity';

@Entity('menu_categories')
@Index(['storeId', 'sortOrder'])
export class MenuCategory {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() storeId!: string;
  @ManyToOne(() => Store, (s) => s.categories, { onDelete: 'CASCADE' }) store!: Store;
  @Column() name!: string;
  @Column({ default: 0 }) sortOrder!: number;

  @OneToMany(() => Menu, (m) => m.category) menus!: Menu[];
}
