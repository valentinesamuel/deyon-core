import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Episode } from './episode.entity';
import { HmoProvider } from './hmoProvider.entity';
import { Bill } from './bill.entity';
import { ClaimItem } from './claimItem.entity';

export enum ClaimStatusEnum {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  PROCESSING = 'processing',
  APPROVED = 'approved',
  DENIED = 'denied',
  PAID = 'paid',
  WITHDRAWN = 'withdrawn',
  RETRACTED = 'retracted',
}

export enum ClaimWithdrawalReasonEnum {
  PATIENT_SELF_PAY = 'patient_self_pay',
  HOSPITAL_CANCELLED = 'hospital_cancelled',
  CLAIM_ERROR = 'claim_error',
  TREATMENT_CHANGED = 'treatment_changed',
}

export type TClaimDiagnosis = {
  code: string;
  description: string;
  isPrimary: boolean;
};

export type TClaimVersion = {
  version: number;
  amendedAt: string;
  amendedBy: string;
  amendedByName: string;
  reason: string;
  reasonDetail?: string;
  snapshot: Record<string, unknown>;
};

@Entity()
export class Claim extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  claimNumber: string;

  @Column({ type: 'uuid' })
  episodeId: string;

  @ManyToOne(() => Episode, (ep) => ep.claims)
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;

  @Column({ type: 'uuid' })
  hmoProviderId: string;

  @ManyToOne(() => HmoProvider)
  @JoinColumn({ name: 'hmo_provider_id' })
  hmoProvider: HmoProvider;

  @Column({ type: 'enum', enum: ClaimStatusEnum, default: ClaimStatusEnum.DRAFT })
  status: ClaimStatusEnum;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  totalBilledAmount: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  approvedAmount: number | null;

  // Patient's HMO enrollment details at time of claim (denormalized for HMO submission)
  @Column({ type: 'varchar', nullable: true })
  enrollmentId: string | null;

  @Column({ type: 'varchar', nullable: true })
  policyNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  preAuthCode: string | null;

  // Diagnoses array: { code, description, isPrimary }[]
  @Column({ type: 'jsonb', nullable: true })
  diagnoses: TClaimDiagnosis[];

  @Column({ type: 'jsonb', nullable: true })
  attachments: Record<string, unknown>[];

  // Denial / resubmission
  @Column({ type: 'text', nullable: true })
  denialReason: string | null;

  @Column({ type: 'text', nullable: true })
  resubmissionNotes: string | null;

  // Withdrawal
  @Column({ type: 'timestamp with time zone', nullable: true })
  withdrawnAt: Date | null;

  @Column({ type: 'enum', enum: ClaimWithdrawalReasonEnum, nullable: true })
  withdrawnReason: ClaimWithdrawalReasonEnum | null;

  // Retraction — after retraction, a private bill + payment may be created
  @Column({ type: 'text', nullable: true })
  retractionNotes: string | null;

  @Column({ type: 'uuid', nullable: true })
  privateBillId: string | null;

  @ManyToOne(() => Bill, { nullable: true })
  @JoinColumn({ name: 'private_bill_id' })
  privateBill: Bill | null;

  @Column({ type: 'uuid', nullable: true })
  privatePaymentId: string | null;

  // Amendment history
  @Column({ type: 'jsonb', nullable: true })
  versions: TClaimVersion[];

  @Column({ type: 'integer', default: 1 })
  currentVersion: number;

  @OneToMany(() => Bill, (b) => b.claim)
  bills: Bill[];

  @OneToMany(() => ClaimItem, (ci) => ci.claim)
  claimItems: ClaimItem[];
}
