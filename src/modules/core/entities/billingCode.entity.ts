import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Patient } from './patient.entity';
import { Bill } from './bill.entity';
import { Staff } from './staff.entity';
import { MedicalServiceDepartmentEnum } from './medicalService.entity';

export enum BillingCodeStatusEnum {
  GENERATED = 'generated',
  PAID = 'paid',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity()
export class BillingCode extends BaseEntity {
  // Alphanumeric lookup code generated for cashier to look up and process payment
  @Column({ type: 'varchar', unique: true })
  code: string;

  // Linked to a bill once payment is processed (null until then)
  @Column({ type: 'uuid', nullable: true })
  billId: string | null;

  @ManyToOne(() => Bill, { nullable: true })
  @JoinColumn({ name: 'bill_id' })
  bill: Bill | null;

  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'enum', enum: MedicalServiceDepartmentEnum })
  department: MedicalServiceDepartmentEnum;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  hmoCoverage: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  patientLiability: number | null;

  @Column({ type: 'enum', enum: BillingCodeStatusEnum, default: BillingCodeStatusEnum.GENERATED })
  status: BillingCodeStatusEnum;

  @Column({ type: 'uuid' })
  generatedBy: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'generated_by' })
  generatedByStaff: Staff;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  receiptNumber: string | null;
}
