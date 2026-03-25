import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { LabOrderItem } from './labOrderItem.entity';

@Entity()
export class LabOrderResult extends BaseEntity {
  @Column({ type: 'uuid' })
  labOrderItemId: string;

  @OneToOne(() => LabOrderItem, (item) => item.result)
  @JoinColumn({ name: 'lab_order_item_id' })
  labOrderItem: LabOrderItem;

  @Column({ type: 'varchar' })
  value: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
