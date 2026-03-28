import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Patient } from './patient.entity';
import { MedicalCatalog } from './medicalCatalog';
import { Staff } from './staff.entity';

@Entity()
export class PatientMedicalHistory extends BaseEntity {
  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'uuid' })
  catalogId: string;

  @ManyToOne(() => MedicalCatalog)
  @JoinColumn({ name: 'catalog_id' })
  catalog: MedicalCatalog;

  @Column({ type: 'varchar', nullable: true })
  customName: string;

  @Column({ type: 'varchar' })
  severity: string;

  @Column({ type: 'uuid' })
  addedBy: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'added_by' })
  addedByStaff: Staff;
}
