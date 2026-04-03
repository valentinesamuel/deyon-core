import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { MedicalServiceCategory } from './medicalServiceCategory.entity';
import { BillItem } from './billItem.entity';
import { HmoContract } from './hmoContract.entity';
import { PriceChange } from './priceChange.entity';
import { HmoRules } from './hmoRules.entity';
import { ServiceCodeCatalog } from './serviceCodeCatalog.entity';

export enum MedicalServiceDepartmentEnum {
  FRONT_DESK = 'front_desk',
  LAB = 'lab',
  PHARMACY = 'pharmacy',
  NURSING = 'nursing',
  ALL = 'all',
}

export enum MedicalServiceStatusEnum {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity()
export class MedicalService extends BaseEntity {
  // Hospital-assigned human-readable code e.g. "CONS-001" (distinct from ServiceCodeCatalog)
  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'uuid' })
  medicalServiceCategoryId: string;

  @ManyToOne(() => MedicalServiceCategory, (c) => c.services)
  @JoinColumn({ name: 'medical_service_category_id' })
  medicalServiceCategory: MedicalServiceCategory;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  defaultPrice: number;

  @Column({ type: 'boolean', default: false })
  isTaxable: boolean;

  @Column({ type: 'boolean', default: false })
  isPremium: boolean;

  @Column({ type: 'boolean', default: false })
  isRestricted: boolean;

  @Column({ type: 'text', nullable: true })
  restrictionReason: string;

  @Column({ type: 'enum', enum: MedicalServiceDepartmentEnum, nullable: true })
  department: MedicalServiceDepartmentEnum;

  @Column({
    type: 'enum',
    enum: MedicalServiceStatusEnum,
    default: MedicalServiceStatusEnum.APPROVED,
  })
  status: MedicalServiceStatusEnum;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => BillItem, (item) => item.service)
  billItems: BillItem[];

  @OneToMany(() => HmoContract, (c) => c.service)
  hmoContracts: HmoContract[];

  @OneToMany(() => PriceChange, (p) => p.service)
  priceChanges: PriceChange[];

  @OneToMany(() => HmoRules, (r) => r.triggerService)
  hmoRules: HmoRules[];

  @OneToMany(() => ServiceCodeCatalog, (s) => s.service)
  serviceCodeCatalogs: ServiceCodeCatalog[];
}
