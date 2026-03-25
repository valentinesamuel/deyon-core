import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { HmoProvider } from './hmoProvider.entity';
import { MedicalService } from './medicalService.entity';

export enum HMOCoverageTypeEnum {
  FULL = 'full',
  PARTIAL_PERCENT = 'partial_percent',
  PARTIAL_FLAT = 'partial_flat',
  NONE = 'none',
}

@Entity()
export class HmoContract extends BaseEntity {
  @Column({ type: 'enum', enum: HMOCoverageTypeEnum })
  coverageType: HMOCoverageTypeEnum;

  @Column({ type: 'uuid' })
  hmoProviderId: string;

  @ManyToOne(() => HmoProvider)
  @JoinColumn({ name: 'hmo_provider_id' })
  hmoProvider: HmoProvider;

  @Column({ type: 'uuid' })
  serviceId: string;

  @ManyToOne(() => MedicalService, (s) => s.hmoContracts)
  @JoinColumn({ name: 'service_id' })
  service: MedicalService;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  contractedPrice: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  copayPercentage: number;

  @Column({ type: 'boolean', default: false })
  isFullyCovered: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  requiredPreAuthorization: boolean;
}
