import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4Consultations1776400000000 implements MigrationInterface {
  name = 'Phase4Consultations1776400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add AMENDMENT value to consultation_status_enum
    await queryRunner.query(
      `ALTER TYPE "public"."consultation_status_enum" ADD VALUE IF NOT EXISTS 'amendment'`,
    );

    // Add new columns to consultation
    await queryRunner.query(
      `ALTER TABLE "consultation" ADD COLUMN IF NOT EXISTS "amendment_reason" text`,
    );
    await queryRunner.query(`ALTER TABLE "consultation" ADD COLUMN IF NOT EXISTS "versions" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "consultation" ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation" ADD COLUMN IF NOT EXISTS "finalized_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "consultation" DROP COLUMN IF EXISTS "finalized_at"`);
    await queryRunner.query(`ALTER TABLE "consultation" DROP COLUMN IF EXISTS "started_at"`);
    await queryRunner.query(`ALTER TABLE "consultation" DROP COLUMN IF EXISTS "versions"`);
    await queryRunner.query(`ALTER TABLE "consultation" DROP COLUMN IF EXISTS "amendment_reason"`);
    // Note: PostgreSQL does not support dropping enum values — manual step required if rollback needed
  }
}
