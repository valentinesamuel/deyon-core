import { Entity, OneToMany } from 'typeorm';
import { GeoBaseEntity } from './geo.base.entity';
import { Lga } from './lga.entity';

@Entity()
export class State extends GeoBaseEntity {
  // Relations
  @OneToMany(() => Lga, (lga) => lga.state)
  lgas: Lga[];
}
