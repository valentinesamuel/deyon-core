import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Patient } from './patient.entity';
import { Episode } from './episode.entity';
import { Staff } from './staff.entity';

export enum QueueTypeEnum {
  TRIAGE = 'triage',
  DOCTOR_NEW = 'doctor_new',
  DOCTOR_REVIEW = 'doctor_review',
  LAB = 'lab',
  PHARMACY = 'pharmacy',
}

export enum QueuePriorityEnum {
  NORMAL = 'normal',
  HIGH = 'high',
  EMERGENCY = 'emergency',
}

export enum QueuePaymentStatusEnum {
  PENDING = 'pending',
  CLEARED = 'cleared',
  HMO_VERIFIED = 'hmo_verified',
  EMERGENCY_OVERRIDE = 'emergency_override',
}

export enum QueueExitReasonEnum {
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  TRANSFERRED = 'transferred',
}

@Entity()
export class QueueEntry extends BaseEntity {
  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'uuid', nullable: true })
  episodeId: string;

  @ManyToOne(() => Episode, { nullable: true })
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;

  @Column({ type: 'enum', enum: QueueTypeEnum })
  queueType: QueueTypeEnum;

  @Column({ type: 'enum', enum: QueuePriorityEnum, default: QueuePriorityEnum.NORMAL })
  priority: QueuePriorityEnum;

  @Column({ type: 'enum', enum: QueuePaymentStatusEnum, default: QueuePaymentStatusEnum.PENDING })
  paymentStatus: QueuePaymentStatusEnum;

  @Column({ type: 'timestamp with time zone' })
  enteredAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  exitedAt: Date;

  @Column({ type: 'integer', nullable: true })
  totalWaitMinutes: number;

  @Column({ type: 'enum', enum: QueueExitReasonEnum, nullable: true })
  exitReason: QueueExitReasonEnum;

  @Column({ type: 'uuid', nullable: true })
  assignedTo: string;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedStaff: Staff;

  @Column({ type: 'text', nullable: true })
  chiefComplaint: string;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
