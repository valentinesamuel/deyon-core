import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { TestCatalog } from './testCatalog.entity';

export enum ReferenceGenderEnum {
  MALE = 'male',
  FEMALE = 'female',
  BOTH = 'both',
}

@Entity()
export class ReferenceRange extends BaseEntity {
  @Column({ type: 'uuid' })
  testId: string;

  @ManyToOne(() => TestCatalog, (t) => t.referenceRanges)
  @JoinColumn({ name: 'test_id' })
  testCatalog: TestCatalog;

  @Column({ type: 'enum', enum: ReferenceGenderEnum })
  gender: ReferenceGenderEnum;

  @Column({ type: 'int', nullable: true })
  minAgeYears: number;

  @Column({ type: 'int', nullable: true })
  maxAgeYears: number;

  @Column({ type: 'numeric', precision: 10, scale: 4 })
  lowerBound: number;

  @Column({ type: 'numeric', precision: 10, scale: 4 })
  upperBound: number;

  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  criticalLowerBound: number;

  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  criticalUpperBound: number;
}
