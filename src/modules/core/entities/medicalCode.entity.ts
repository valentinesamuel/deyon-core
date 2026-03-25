import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { CodingStandard } from './codingStandard.entity';
import { ServiceCodeCatalog } from './serviceCodeCatalog.entity';
import { ProtocolBundle } from './protocolBundles.entity';

@Entity()
export class MedicalCode extends BaseEntity {
  @Column({ type: 'uuid' })
  standardId: string;

  @ManyToOne(() => CodingStandard, (s) => s.medicalCodes)
  @JoinColumn({ name: 'standard_id' })
  standard: CodingStandard;

  @Column({ type: 'varchar' })
  codeValue: string;

  @Column({ type: 'text' })
  description: string;

  @OneToMany(() => ServiceCodeCatalog, (s) => s.medicalCode)
  serviceCodeCatalogs: ServiceCodeCatalog[];

  @OneToMany(() => ProtocolBundle, (p) => p.medicalCode)
  protocolBundles: ProtocolBundle[];
}
