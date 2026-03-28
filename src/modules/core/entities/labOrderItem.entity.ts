import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { LabOrder } from './labOrder.entity';
import { LabOrderStatusEnum } from './labOrder.enums';
import { ServiceCodeCatalog } from './serviceCodeCatalog.entity';
import { LabOrderResult } from './labOrderResult.entity';

@Entity()
export class LabOrderItem extends BaseEntity {
  @Column({ type: 'uuid' })
  labOrderId: string;

  @ManyToOne(() => LabOrder, (o) => o.items)
  @JoinColumn({ name: 'lab_order_id' })
  labOrder: LabOrder;

  @Column({ type: 'uuid' })
  serviceCodeId: string;

  @ManyToOne(() => ServiceCodeCatalog, (s) => s.labOrderItems)
  @JoinColumn({ name: 'service_code_id' })
  serviceCode: ServiceCodeCatalog;

  @Column({ type: 'enum', enum: LabOrderStatusEnum, default: LabOrderStatusEnum.PENDING })
  status: LabOrderStatusEnum;

  @OneToOne(() => LabOrderResult, (r) => r.labOrderItem)
  result: LabOrderResult;
}
