import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Episode } from './episode.entity';
import { ServiceCodeCatalog } from './serviceCodeCatalog.entity';
import { Staff } from './staff.entity';

@Entity()
export class EpisodeDiagnosis extends BaseEntity {
  @Column({ type: 'uuid' })
  episodeId: string;

  @ManyToOne(() => Episode)
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;

  @Column({ type: 'uuid' })
  serviceCodeId: string;

  @ManyToOne(() => ServiceCodeCatalog)
  @JoinColumn({ name: 'service_code_id' })
  serviceCode: ServiceCodeCatalog;

  @Column({ type: 'varchar' })
  diagnosisType: string;

  @Column({ type: 'uuid' })
  diagnosedBy: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'diagnosed_by' })
  diagnosedByStaff: Staff;
}
