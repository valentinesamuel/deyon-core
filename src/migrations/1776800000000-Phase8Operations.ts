import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase8Operations1776800000000 implements MigrationInterface {
  name = 'Phase8Operations1776800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Lab Referral Sequence ────────────────────────────────────────────────
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "lab_referral_seq" START 1 INCREMENT 1`);

    // ─── Shift Indexes ────────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_shift_staff_id" ON "shift" ("staff_id")`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_shift_status" ON "shift" ("status")`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_shift_station" ON "shift" ("station")`,
    );

    // ─── Restock Request Indexes ──────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_restock_request_status" ON "restock_request" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_restock_request_requested_by" ON "restock_request" ("requested_by")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_restock_request_item_request_id" ON "restock_request_item" ("restock_request_id")`,
    );

    // ─── Lab Referral Indexes ─────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_lab_referral_patient_id" ON "lab_referral" ("patient_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_lab_referral_status" ON "lab_referral" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_lab_referral_reference_number" ON "lab_referral" ("reference_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_lab_referral_item_referral_id" ON "lab_referral_item" ("lab_referral_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lab_referral_item_referral_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lab_referral_reference_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lab_referral_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lab_referral_patient_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_restock_request_item_request_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_restock_request_requested_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_restock_request_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_shift_station"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_shift_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_shift_staff_id"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "lab_referral_seq"`);
  }
}
