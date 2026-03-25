import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { State } from './state.entity';
import { Patient } from './patient.entity';

@Entity()
export class Lga extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  shortname: string;

  @Column({ type: 'numeric', nullable: true })
  minLatitude: number;

  @Column({ type: 'numeric', nullable: true })
  maxLatitude: number;

  @Column({ type: 'numeric', nullable: true })
  minLongitude: number;

  @Column({ type: 'numeric', nullable: true })
  maxLongitude: number;

  @Column({ type: 'numeric', nullable: true })
  latitude: number;

  @Column({ type: 'numeric', nullable: true })
  longitude: number;

  @Column({ type: 'varchar' })
  capital: string;

  @Column({ type: 'integer' })
  stateId: number;

  // Relations
  @ManyToOne(() => State, (state) => state.lgas)
  @JoinColumn({ name: 'state_id' })
  state: State;

  @OneToMany(() => Patient, (patients) => patients.lga)
  patients: Patient[];
}
