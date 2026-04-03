import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Episode } from './episode.entity';
import { MedicalCode } from './medicalCode.entity';
import { Staff } from './staff.entity';

@Entity()
export class EpisodeDiagnosis extends BaseEntity {
  @Column({ type: 'uuid' })
  episodeId: string;

  @ManyToOne(() => Episode)
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;

  // References ICD-10 entry in MedicalCode (not ServiceCodeCatalog which is a billing bridge)
  @Column({ type: 'uuid' })
  medicalCodeId: string;

  @ManyToOne(() => MedicalCode)
  @JoinColumn({ name: 'medical_code_id' })
  medicalCode: MedicalCode;

  @Column({ type: 'varchar' })
  diagnosisType: string;

  @Column({ type: 'uuid' })
  diagnosedBy: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'diagnosed_by' })
  diagnosedByStaff: Staff;
}
