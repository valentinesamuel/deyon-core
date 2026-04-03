import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Staff } from './staff.entity';
import { RestockRequestItem } from './restockRequestItem.entity';

export enum RestockRequestStatusEnum {
  PENDING = 'pending',
  APPROVED = 'approved',
  PARTIALLY_APPROVED = 'partially_approved',
  REJECTED = 'rejected',
  FORWARDED_TO_CMO = 'forwarded_to_cmo',
  INFO_REQUESTED = 'info_requested',
  FULFILLED = 'fulfilled',
}

export enum RestockRequestUrgencyEnum {
  NORMAL = 'normal',
  URGENT = 'urgent',
}

@Entity()
export class RestockRequest extends BaseEntity {
  @Column({
    type: 'enum',
    enum: RestockRequestUrgencyEnum,
    default: RestockRequestUrgencyEnum.NORMAL,
  })
  urgency: RestockRequestUrgencyEnum;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'uuid' })
  requestedBy: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'requested_by' })
  requestedByStaff: Staff;

  @Column({
    type: 'enum',
    enum: RestockRequestStatusEnum,
    default: RestockRequestStatusEnum.PENDING,
  })
  status: RestockRequestStatusEnum;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => RestockRequestItem, (item) => item.restockRequest)
  items: RestockRequestItem[];
}
