import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Encounter } from './encounter.entity';
import { Patient } from './patient.entity';
import { Episode } from './episode.entity';
import { Appointment } from './appointment.entity';
import { Staff } from './staff.entity';

export enum ConsultationStatusEnum {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  FINALIZED = 'finalized',
  AMENDMENT = 'amendment',
}

export type TSelectedDiagnosis = {
  code: string;
  description: string;
  isPrimary: boolean;
};

@Entity()
export class Consultation extends BaseEntity {
  @Column({ type: 'uuid' })
  encounterId: string;

  @OneToOne(() => Encounter, (e) => e.consultation)
  @JoinColumn({ name: 'encounter_id' })
  encounter: Encounter;

  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'uuid' })
  episodeId: string;

  @ManyToOne(() => Episode, (ep) => ep.consultations)
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;

  @Column({ type: 'uuid', nullable: true })
  appointmentId: string;

  @ManyToOne(() => Appointment, (a) => a.consultations, { nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({ type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Staff;

  @Column({ type: 'enum', enum: ConsultationStatusEnum, default: ConsultationStatusEnum.DRAFT })
  status: ConsultationStatusEnum;

  @Column({ type: 'text' })
  chiefComplaint: string;

  @Column({ type: 'text', nullable: true })
  historyOfPresentIllness: string;

  @Column({ type: 'text', nullable: true })
  physicalExamination: string;

  @Column({ type: 'text', nullable: true })
  treatmentPlan: string;

  @Column({ type: 'jsonb', nullable: true })
  selectedDiagnoses: TSelectedDiagnosis[];

  @Column({ type: 'timestamp with time zone', nullable: true })
  followUpDate: Date;

  @Column({ type: 'text', nullable: true })
  amendmentReason: string | null;

  @Column({ type: 'jsonb', nullable: true })
  versions: Record<string, unknown>[] | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  finalizedAt: Date | null;
}
