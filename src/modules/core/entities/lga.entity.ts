import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { GeoBaseEntity } from './geo.base.entity';
import { State } from './state.entity';
import { Patient } from './patient.entity';

@Entity()
export class Lga extends GeoBaseEntity {
  @Column({ type: 'string' })
  stateId: string;

  // Relations
  @ManyToOne(() => State, (state) => state.lgas)
  @JoinColumn({ name: 'state_id' })
  state: State;

  @OneToMany(() => Patient, (patients) => patients.lga)
  patients: Patient[];
}
