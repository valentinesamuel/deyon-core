import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Episode } from './episode.entity';

@Entity()
export class PatientVital extends BaseEntity {
  @Column({ type: 'uuid' })
  episodeId: string;

  @ManyToOne(() => Episode, (ep) => ep.vitals)
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  celsiusTemperature: number;

  @Column({ type: 'int' })
  systolicBloodPressure: number;

  @Column({ type: 'int' })
  diastolicBloodPressure: number;

  @Column({ type: 'int' })
  heartRate: number;

  @Column({ type: 'int' })
  respiratoryRate: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  oxygenSaturation: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  kilogramWeight: number;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  centimetreHeight: number;
}
