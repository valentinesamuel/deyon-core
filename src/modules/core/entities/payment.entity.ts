import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Shift } from './shift.entity';
import { Bill } from './bill.entity';
import { Patient } from './patient.entity';
import { Staff } from './staff.entity';

export enum PaymentTransactionTypeEnum {
  PAYMENT = 'payment',
  REFUND = 'refund',
  WAIVER = 'waiver',
}

export enum PaymentMethodEnum {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
  HMO = 'hmo',
  CORPORATE = 'corporate',
}

@Entity()
export class Payment extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  shiftId: string;

  @ManyToOne(() => Shift, (s) => s.payments, { nullable: true })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @Column({ type: 'uuid' })
  billId: string;

  @ManyToOne(() => Bill, (b) => b.payments)
  @JoinColumn({ name: 'bill_id' })
  bill: Bill;

  @Column({ type: 'varchar', unique: true })
  receiptNumber: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'enum', enum: PaymentTransactionTypeEnum })
  type: PaymentTransactionTypeEnum;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentMethodEnum })
  paymentMethod: PaymentMethodEnum;

  @Column({ type: 'uuid' })
  staffId: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;
}
