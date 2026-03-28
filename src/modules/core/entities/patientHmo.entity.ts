import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Patient } from './patient.entity';
import { HmoProvider } from './hmoProvider.entity';

@Entity()
export class PatientHmo extends BaseEntity {
  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'uuid' })
  hmoProviderId: string;

  @ManyToOne(() => HmoProvider)
  @JoinColumn({ name: 'hmo_provider_id' })
  hmoProvider: HmoProvider;

  @Column({ type: 'varchar' })
  providerName: string;

  @Column({ type: 'varchar' })
  enrollmentId: string;

  @Column({ type: 'varchar' })
  planType: string;

  @Column({ type: 'timestamp with time zone' })
  expiryDate: Date;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  copayAmount: number;

  @Column({ type: 'boolean' })
  isActive: boolean;
}
