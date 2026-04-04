import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Inventory } from './inventory.entity';

export enum StockAdjustmentTypeEnum {
  RESTOCK = 'restock',
  DISPENSE = 'dispense',
  WRITE_OFF = 'write_off',
  TRANSFER = 'transfer',
}

@Entity()
export class StockAdjustment extends BaseEntity {
  @Column({ type: 'uuid' })
  inventoryId: string;

  @ManyToOne(() => Inventory)
  @JoinColumn({ name: 'inventory_id' })
  inventory: Inventory;

  @Column({ type: 'enum', enum: StockAdjustmentTypeEnum })
  adjustmentType: StockAdjustmentTypeEnum;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'uuid', nullable: true })
  referenceId: string;

  @Column({ type: 'uuid' })
  performedBy: string;
}
