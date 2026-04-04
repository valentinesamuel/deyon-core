import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase7Claims1776700000000 implements MigrationInterface {
  name = 'Phase7Claims1776700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Sequences ────────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "claim_number_seq" START 1 INCREMENT 1`);

    // ─── Indexes for common query patterns ────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_claim_episode_id" ON "claim" ("episode_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_claim_hmo_provider_id" ON "claim" ("hmo_provider_id")`,
    );
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_claim_status" ON "claim" ("status")`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_claim_number" ON "claim" ("claim_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_claim_item_claim_id" ON "claim_item" ("claim_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_claim_item_claim_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_claim_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_claim_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_claim_hmo_provider_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_claim_episode_id"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "claim_number_seq"`);
  }
}
