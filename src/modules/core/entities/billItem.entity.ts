import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Bill } from './bill.entity';
import { MedicalService } from './medicalService.entity';
import { HmoContract } from './hmoContract.entity';
import { ClaimItem } from './claimItem.entity';

export enum BillItemHmoStatusEnum {
  COVERED = 'covered',
  PARTIAL = 'partial',
  NOT_COVERED = 'not_covered',
  OPTED_OUT = 'opted_out',
}

@Entity()
export class BillItem extends BaseEntity {
  @Column({ type: 'uuid' })
  billId: string;

  @ManyToOne(() => Bill, (b) => b.items)
  @JoinColumn({ name: 'bill_id' })
  bill: Bill;

  @Column({ type: 'uuid' })
  serviceId: string;

  @ManyToOne(() => MedicalService, (s) => s.billItems)
  @JoinColumn({ name: 'service_id' })
  service: MedicalService;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  totalAmount: number;

  // HMO coverage tracking per line item
  @Column({ type: 'enum', enum: BillItemHmoStatusEnum, nullable: true })
  hmoStatus: BillItemHmoStatusEnum | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  hmoCoveredAmount: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  patientLiabilityAmount: number | null;

  @Column({ type: 'uuid', nullable: true })
  hmoContractId: string | null;

  @ManyToOne(() => HmoContract, (c) => c.billItems, { nullable: true })
  @JoinColumn({ name: 'hmo_contract_id' })
  hmoContract: HmoContract | null;

  // Patient opted to pay cash for this item instead of using HMO
  @Column({ type: 'boolean', default: false })
  isOptedOutOfHMO: boolean;

  @OneToMany(() => ClaimItem, (ci) => ci.billItem)
  claimItems: ClaimItem[];
}
