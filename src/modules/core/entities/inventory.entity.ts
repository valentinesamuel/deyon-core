import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { InventoryCategory } from './inventoryCategory.entity';
import { Supplier } from './supplier.entity';
import { PrescriptionItem } from './prescriptionItem.entity';
import { RestockRequestItem } from './restockRequestItem.entity';

@Entity()
export class Inventory extends BaseEntity {
  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => InventoryCategory, (c) => c.inventory)
  @JoinColumn({ name: 'category_id' })
  category: InventoryCategory;

  @Column({ type: 'uuid', nullable: true })
  supplierId: string;

  @ManyToOne(() => Supplier, (s) => s.inventory, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  unit: string;

  @Column({ type: 'int', default: 0 })
  currentStock: number;

  @Column({ type: 'int', default: 0 })
  reorderLevel: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  unitCost: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expiryDate: Date;

  @Column({ type: 'varchar', nullable: true })
  location: string;

  @OneToMany(() => PrescriptionItem, (item) => item.drug)
  prescriptionItems: PrescriptionItem[];

  @OneToMany(() => RestockRequestItem, (item) => item.inventory)
  restockRequestItems: RestockRequestItem[];
}
