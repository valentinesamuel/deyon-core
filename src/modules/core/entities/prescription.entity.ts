import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Patient } from './patient.entity';
import { Staff } from './staff.entity';
import { PrescriptionItem } from './prescriptionItem.entity';

export enum PrescriptionStatusEnum {
  PENDING = 'pending',
  PARTIAL = 'partial',
  FULLY_DISPENSED = 'fully_dispensed',
  CANCELLED = 'cancelled',
}

@Entity()
export class Prescription extends BaseEntity {
  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Staff;

  @Column({ type: 'enum', enum: PrescriptionStatusEnum, default: PrescriptionStatusEnum.PENDING })
  status: PrescriptionStatusEnum;

  @Column({ type: 'timestamp with time zone', nullable: true })
  dispensedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  dispensedBy: string;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'dispensed_by' })
  dispensedByStaff: Staff;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  auditLog: Record<string, unknown>[];

  @OneToMany(() => PrescriptionItem, (item) => item.prescription)
  items: PrescriptionItem[];
}
