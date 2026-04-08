import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Lga } from './lga.entity';

export type NextOfKinMetadata = {
  name: string;
  address: string;
  phoneNumber: string;
  relationship: string;
};

export enum PaymentTypeEnum {
  HMO = 'hmo',
  CASH = 'cash',
  CORPORATE = 'corporate',
}

export enum GenderEnum {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity()
export class Patient extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  mrn: string;

  @Column({ type: 'varchar' })
  firstname: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  email: string;

  @Column({ type: 'varchar', unique: true })
  phoneNumber: string;

  @Column({ type: 'varchar' })
  lastname: string;

  @Column({ type: 'varchar' })
  middlename: string;

  @Column({ type: 'timestamp with time zone' })
  dateOfBirth: string;

  @Column({ type: 'varchar' })
  gender: GenderEnum;

  @Column({ type: 'varchar' })
  bloodGroup: string;

  @Column({ type: 'varchar' })
  maritalStatus: string;

  @Column({ type: 'varchar' })
  address: string;

  @Column({ type: 'varchar' })
  nationality: string;

  @Column({ type: 'enum', enum: PaymentTypeEnum })
  paymentType: PaymentTypeEnum;

  @Column({ type: 'json' })
  nextOfKin: NextOfKinMetadata;

  @Column({ type: 'varchar', nullable: true })
  occupation: string;

  @Column({ type: 'boolean' })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  lgaId: string;

  @ManyToOne(() => Lga, (lga) => lga.patients)
  @JoinColumn({ name: 'lga_id' })
  lga: Lga;
}
