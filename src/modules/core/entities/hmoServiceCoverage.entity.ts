import { Entity } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';

export enum HmoProviderServiceCoverageTypeEnum {
  FULL = 'full',
  PARTIAL_PERCENT = 'partial percent',
  PARTIAL_FLAT = 'partial flat',
  NONE = 'none',
}

export enum HmoServiceCategoryEnum {
  CONSULTATION = 'consultation',
  LABORATORY = 'laboratory',
  PHARMACY = 'pharmacy',
  PROCEDURE = 'procedure',
  ADMISSION = 'admission',
}

@Entity()
export class HmoServiceCoverage extends BaseEntity {
  hmoProviderId: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: HmoServiceCategoryEnum;
  coverageType: HmoProviderServiceCoverageTypeEnum;
  coveragePercentage?: number; // 0–100 if partial_percent
  coverageFlatAmount?: number; // NGN amount if partial_flat
  maxCoveredAmount?: number; // Cap for partial coverage
  requiresPreAuth: boolean;
  isActive: boolean;
  updatedBy: string;
}
