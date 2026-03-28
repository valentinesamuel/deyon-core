import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { RestockRequest } from './restockRequest.entity';
import { Inventory } from './inventory.entity';

@Entity()
export class RestockRequestItem extends BaseEntity {
  @Column({ type: 'uuid' })
  restockRequestId: string;

  @ManyToOne(() => RestockRequest, (r) => r.items)
  @JoinColumn({ name: 'restock_request_id' })
  restockRequest: RestockRequest;

  @Column({ type: 'uuid' })
  inventoryId: string;

  @ManyToOne(() => Inventory, (inv) => inv.restockRequestItems)
  @JoinColumn({ name: 'inventory_id' })
  inventory: Inventory;

  @Column({ type: 'int' })
  requestedQuantity: number;

  @Column({ type: 'int', nullable: true })
  approvedQuantity: number;
}
