import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Encounter } from './encounter.entity';
import { Patient } from './patient.entity';
import { Episode } from './episode.entity';
import { Appointment } from './appointment.entity';

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

  @Column({ type: 'text' })
  chiefComplaint: string;

  @Column({ type: 'text', nullable: true })
  presentIllnessBrief: string;

  @Column({ type: 'text', nullable: true })
  treatmentPlan: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  followUpDate: Date;

  @Column({ type: 'boolean', default: false })
  isDraft: boolean;

  @Column({ type: 'jsonb', nullable: true })
  draftMetadata: Record<string, unknown>;
}
