import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { ProtocolBundle } from './protocolBundles.entity';

export enum ServiceCategoryEnum {
  CONSULTATION = 'consultation',
  LAB = 'lab',
  PHARMACY = 'pharmacy',
  PROCEDURE = 'procedure',
  ADMISSION = 'admission',
  OTHER = 'other',
}

@Entity()
export class ProtocolBundleItems extends BaseEntity {
  @Column({ type: 'uuid' })
  bundleId: string;

  @ManyToOne(() => ProtocolBundle, (b) => b.items)
  @JoinColumn({ name: 'bundle_id' })
  bundle: ProtocolBundle;

  @Column({ type: 'enum', enum: ServiceCategoryEnum })
  serviceType: ServiceCategoryEnum;

  @Column({ type: 'uuid' })
  serviceId: string;

  @Column({ type: 'boolean', default: false })
  isCompulsory: boolean;
}
