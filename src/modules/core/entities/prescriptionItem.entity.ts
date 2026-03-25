import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Prescription } from './prescription.entity';
import { Inventory } from './inventory.entity';

@Entity()
export class PrescriptionItem extends BaseEntity {
  @Column({ type: 'uuid' })
  prescriptionId: string;

  @ManyToOne(() => Prescription, (p) => p.items)
  @JoinColumn({ name: 'prescription_id' })
  prescription: Prescription;

  @Column({ type: 'uuid' })
  drugId: string;

  @ManyToOne(() => Inventory, (inv) => inv.prescriptionItems)
  @JoinColumn({ name: 'drug_id' })
  drug: Inventory;

  @Column({ type: 'numeric', precision: 8, scale: 2 })
  dosageValue: number;

  @Column({ type: 'varchar' })
  dosageUnit: string;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  frequencyValue: number;

  @Column({ type: 'varchar' })
  frequencyUnit: string;

  @Column({ type: 'int' })
  durationValue: number;

  @Column({ type: 'varchar' })
  durationUnit: string;

  @Column({ type: 'int' })
  prescribedQuantity: number;

  @Column({ type: 'int', default: 0 })
  dispensedQuantity: number;

  @Column({ type: 'jsonb', nullable: true })
  substitutedMetadata: Record<string, unknown>;

  @Column({ type: 'uuid', nullable: true })
  substitutedDrugId: string;

  @ManyToOne(() => Inventory, { nullable: true })
  @JoinColumn({ name: 'substituted_drug_id' })
  substitutedDrug: Inventory;
}
