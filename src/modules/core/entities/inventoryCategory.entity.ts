import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Inventory } from './inventory.entity';

@Entity()
export class InventoryCategory extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  name: string;

  @OneToMany(() => Inventory, (inv) => inv.category)
  inventory: Inventory[];
}
