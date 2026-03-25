import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { LabReferral } from './labReferral.entity';

@Entity()
export class LabReferralItem extends BaseEntity {
  @Column({ type: 'uuid' })
  labReferralId: string;

  @ManyToOne(() => LabReferral, (r) => r.items)
  @JoinColumn({ name: 'lab_referral_id' })
  labReferral: LabReferral;

  @Column({ type: 'varchar' })
  testName: string;

  @Column({ type: 'varchar', nullable: true })
  result: string;

  @Column({ type: 'varchar', nullable: true })
  unit: string;

  @Column({ type: 'boolean', default: false })
  isAbnormal: boolean;
}
