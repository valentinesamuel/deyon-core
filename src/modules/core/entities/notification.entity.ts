import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Staff } from './staff.entity';

export enum NotificationTypeEnum {
  QUEUE_UPDATE = 'queue_update',
  LAB_RESULT = 'lab_result',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  CLAIM_STATUS = 'claim_status',
  STOCK_ALERT = 'stock_alert',
  SHIFT_REMINDER = 'shift_reminder',
  SYSTEM = 'system',
}

@Entity()
export class Notification extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  staffId: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @Column({ type: 'enum', enum: NotificationTypeEnum })
  type: NotificationTypeEnum;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  readAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expiresAt: Date | null;
}
