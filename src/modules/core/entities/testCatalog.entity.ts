import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { ServiceCodeCatalog } from './serviceCodeCatalog.entity';
import { ReferenceRange } from './referenceRange.entity';

@Entity()
export class TestCatalog extends BaseEntity {
  @Column({ type: 'uuid' })
  serviceCodeId: string;

  @OneToOne(() => ServiceCodeCatalog, (s) => s.testCatalog)
  @JoinColumn({ name: 'service_code_id' })
  serviceCode: ServiceCodeCatalog;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  sampleType: string;

  @Column({ type: 'varchar', nullable: true })
  methodology: string;

  @Column({ type: 'text', nullable: true })
  preparationInstructions: string;

  @Column({ type: 'varchar' })
  defaultUnit: string;

  @OneToMany(() => ReferenceRange, (r) => r.testCatalog)
  referenceRanges: ReferenceRange[];
}
