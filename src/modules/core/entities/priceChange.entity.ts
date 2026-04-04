import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { MedicalService } from './medicalService.entity';
import { Staff } from './staff.entity';

export enum PriceChangeStatusEnum {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity()
export class PriceChange extends BaseEntity {
  @Column({ type: 'uuid' })
  serviceId: string;

  @ManyToOne(() => MedicalService, (s) => s.priceChanges)
  @JoinColumn({ name: 'service_id' })
  service: MedicalService;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  requestedPrice: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  currentPrice: number;

  @Column({ type: 'uuid' })
  requestedBy: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'requested_by' })
  requestedByStaff: Staff;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedByStaff: Staff;

  @Column({ type: 'enum', enum: PriceChangeStatusEnum, default: PriceChangeStatusEnum.PENDING })
  status: PriceChangeStatusEnum;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  @Column({ type: 'text' })
  reason: string;
}
