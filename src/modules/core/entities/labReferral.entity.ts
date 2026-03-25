import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Patient } from './patient.entity';
import { PartnerLab } from './partnerLab.entity';
import { Staff } from './staff.entity';
import { LabReferralItem } from './labReferralItem.entity';
import { LabPriorityEnum } from './labOrder.entity';

export enum LabReferralDirectionEnum {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
  INTERNAL_TRANSFER = 'internal_transfer',
}

export enum LabReferralStatusEnum {
  PENDING = 'pending',
  SENT = 'sent',
  RECEIVED = 'received',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity()
export class LabReferral extends BaseEntity {
  @Column({ type: 'enum', enum: LabReferralDirectionEnum })
  direction: LabReferralDirectionEnum;

  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'varchar', nullable: true })
  patientPhoneNumber: string;

  @Column({ type: 'uuid', nullable: true })
  partnerLabId: string;

  @ManyToOne(() => PartnerLab, (pl) => pl.referrals, { nullable: true })
  @JoinColumn({ name: 'partner_lab_id' })
  partnerLab: PartnerLab;

  @Column({ type: 'enum', enum: LabReferralStatusEnum, default: LabReferralStatusEnum.PENDING })
  status: LabReferralStatusEnum;

  @Column({ type: 'varchar', unique: true })
  referenceNumber: string;

  @Column({ type: 'varchar', nullable: true })
  trackingId: string;

  @Column({ type: 'uuid' })
  referredBy: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'referred_by' })
  referredByStaff: Staff;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'enum', enum: LabPriorityEnum, default: LabPriorityEnum.ROUTINE })
  priority: LabPriorityEnum;

  @Column({ type: 'jsonb', nullable: true })
  attachments: Record<string, unknown>[];

  @OneToMany(() => LabReferralItem, (item) => item.labReferral)
  items: LabReferralItem[];
}
