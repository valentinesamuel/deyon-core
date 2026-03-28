import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Patient } from './patient.entity';
import { Staff } from './staff.entity';
import { Consultation } from './consultation.entity';

export enum AppointmentTypeEnum {
  CONSULTATION = 'consultation',
  FOLLOW_UP = 'follow_up',
  EMERGENCY = 'emergency',
  PROCEDURE = 'procedure',
  LAB_ONLY = 'lab_only',
}

export enum AppointmentStatusEnum {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

@Entity()
export class Appointment extends BaseEntity {
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

  @Column({ type: 'enum', enum: AppointmentTypeEnum })
  appointmentType: AppointmentTypeEnum;

  @Column({ type: 'enum', enum: AppointmentStatusEnum })
  status: AppointmentStatusEnum;

  @Column({ type: 'text' })
  reasonForVisit: string;

  @Column({ type: 'uuid', nullable: true })
  bookedBy: string;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'booked_by' })
  bookedByStaff: Staff;

  @Column({ type: 'uuid', nullable: true })
  checkedInBy: string;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'checked_in_by' })
  checkedInByStaff: Staff;

  @Column({ type: 'int' })
  scheduledDuration: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  checkedInAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  startedBy: string;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'started_by' })
  startedByStaff: Staff;

  @Column({ type: 'timestamp with time zone', nullable: true })
  endedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  endedBy: string;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'ended_by' })
  endedByStaff: Staff;

  @Column({ type: 'timestamp with time zone' })
  scheduleDate: Date;

  @OneToMany(() => Consultation, (c) => c.appointment)
  consultations: Consultation[];
}
