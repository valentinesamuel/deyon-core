import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase5LabPrescriptions1776500000000 implements MigrationInterface {
  name = 'Phase5LabPrescriptions1776500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create uploads directory tracking (no DB changes needed for local storage)
    // All entities (LabOrder, LabOrderItem, LabOrderResult, Prescription, PrescriptionItem)
    // are already fully defined in the existing entity files.
    // This migration is a no-op for schema since all tables exist from the initial migration.
    // Adding indexes for common query patterns:

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_lab_order_patient_id" ON "lab_order" ("patient_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_lab_order_status" ON "lab_order" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_lab_order_episode_id" ON "lab_order" ("episode_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_prescription_patient_id" ON "prescription" ("patient_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_prescription_status" ON "prescription" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_prescription_item_prescription_id" ON "prescription_item" ("prescription_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_prescription_item_prescription_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_prescription_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_prescription_patient_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lab_order_episode_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lab_order_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lab_order_patient_id"`);
  }
}
