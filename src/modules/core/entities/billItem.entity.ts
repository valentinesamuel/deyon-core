import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Bill } from './bill.entity';
import { MedicalService } from './medicalService.entity';

@Entity()
export class BillItem extends BaseEntity {
  @Column({ type: 'uuid' })
  billId: string;

  @ManyToOne(() => Bill, (b) => b.items)
  @JoinColumn({ name: 'bill_id' })
  bill: Bill;

  @Column({ type: 'uuid' })
  serviceId: string;

  @ManyToOne(() => MedicalService, (s) => s.billItems)
  @JoinColumn({ name: 'service_id' })
  service: MedicalService;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  totalAmount: number;
}
