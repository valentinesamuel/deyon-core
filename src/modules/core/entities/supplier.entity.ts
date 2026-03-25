import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Inventory } from './inventory.entity';

@Entity()
export class Supplier extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  contactPhone: string;

  @Column({ type: 'varchar', nullable: true })
  contactEmail: string;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => Inventory, (inv) => inv.supplier)
  inventory: Inventory[];
}
