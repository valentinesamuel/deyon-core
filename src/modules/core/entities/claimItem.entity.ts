import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Claim } from './claim.entity';
import { BillItem } from './billItem.entity';

export enum ClaimItemCategoryEnum {
  CONSULTATION = 'consultation',
  LAB = 'lab',
  PHARMACY = 'pharmacy',
  PROCEDURE = 'procedure',
  ADMISSION = 'admission',
  OTHER = 'other',
}

export enum ClaimItemStatusEnum {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
}

@Entity()
export class ClaimItem extends BaseEntity {
  @Column({ type: 'uuid' })
  claimId: string;

  @ManyToOne(() => Claim, (c) => c.claimItems)
  @JoinColumn({ name: 'claim_id' })
  claim: Claim;

  // The original bill line item this claim item is derived from
  @Column({ type: 'uuid', nullable: true })
  billItemId: string | null;

  @ManyToOne(() => BillItem, (bi) => bi.claimItems, { nullable: true })
  @JoinColumn({ name: 'bill_item_id' })
  billItem: BillItem | null;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'enum', enum: ClaimItemCategoryEnum })
  category: ClaimItemCategoryEnum;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  claimedAmount: number;

  // Excluded from this claim submission (e.g. patient opted to self-pay for this item)
  @Column({ type: 'boolean', default: false })
  isExcluded: boolean;

  // Clinical justification required when isOffProtocol = true
  @Column({ type: 'text', nullable: true })
  clinicalJustification: string | null;

  // Service not in HMO's approved protocol — requires clinical justification
  @Column({ type: 'boolean', default: false })
  isOffProtocol: boolean;

  @Column({ type: 'enum', enum: ClaimItemStatusEnum, default: ClaimItemStatusEnum.PENDING })
  status: ClaimItemStatusEnum;

  @Column({ type: 'text', nullable: true })
  denialReason: string | null;
}
