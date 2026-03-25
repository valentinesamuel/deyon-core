import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Staff } from './staff.entity';
import { RestockRequestItem } from './restockRequestItem.entity';

export enum RestockRequestStatusEnum {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FULFILLED = 'fulfilled',
}

@Entity()
export class RestockRequest extends BaseEntity {
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
