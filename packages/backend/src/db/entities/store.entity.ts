import { Column, Entity, OneToMany, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { StoreUser } from './store-user.entity';
import { Table } from './table.entity';
import { Menu } from './menu.entity';
import { MenuCategory } from './menu-category.entity';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() name!: string;
  @Column({ default: true }) active!: boolean;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;

  @OneToMany(() => StoreUser, (u) => u.store) users!: StoreUser[];
  @OneToMany(() => Table, (t) => t.store) tables!: Table[];
  @OneToMany(() => Menu, (m) => m.store) menus!: Menu[];
  @OneToMany(() => MenuCategory, (c) => c.store) categories!: MenuCategory[];
}
