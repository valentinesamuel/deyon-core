import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase6Billing1776600000000 implements MigrationInterface {
  name = 'Phase6Billing1776600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Sequences ────────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "bill_number_seq" START 1 INCREMENT 1`);
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "receipt_number_seq" START 1 INCREMENT 1`,
    );
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "billing_code_seq" START 1 INCREMENT 1`);

    // ─── Indexes for common query patterns ────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bill_patient_id" ON "bill" ("patient_id")`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bill_status" ON "bill" ("status")`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bill_episode_id" ON "bill" ("episode_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_bill_number" ON "bill" ("bill_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payment_bill_id" ON "payment" ("bill_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_billing_code_code" ON "billing_code" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_billing_code_patient_id" ON "billing_code" ("patient_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_billing_code_status" ON "billing_code" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_billing_code_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_billing_code_patient_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_billing_code_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_bill_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bill_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bill_episode_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bill_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bill_patient_id"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "billing_code_seq"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "receipt_number_seq"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "bill_number_seq"`);
  }
}
