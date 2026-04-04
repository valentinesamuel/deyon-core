import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { HmoProvider } from './hmoProvider.entity';
import { MedicalService } from './medicalService.entity';
import { BillItem } from './billItem.entity';

export enum HMOContractCoverageTypeEnum {
  FULL = 'full',
  PARTIAL_PERCENT = 'partial_percent',
  PARTIAL_FLAT = 'partial_flat',
  NONE = 'none',
}

@Entity()
export class HmoContract extends BaseEntity {
  @Column({ type: 'enum', enum: HMOContractCoverageTypeEnum })
  coverageType: HMOContractCoverageTypeEnum;

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

  // HMO-negotiated price for this service. Null = fall back to MedicalService.defaultPrice
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  contractedPrice: number | null;

  // What percentage (0–100) the HMO covers. Used when coverageType = PARTIAL_PERCENT
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  coveragePercentage: number | null;

  // Flat NGN amount the HMO covers. Used when coverageType = PARTIAL_FLAT
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  coverageFlatAmount: number | null;

  // Cap on HMO coverage for partial coverage types
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  maxCoveredAmount: number | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  requiredPreAuthorization: boolean;

  @OneToMany(() => BillItem, (item) => item.hmoContract)
  billItems: BillItem[];
}
