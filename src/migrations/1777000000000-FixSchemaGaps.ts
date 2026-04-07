import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixSchemaGaps1777000000000 implements MigrationInterface {
  name = 'FixSchemaGaps1777000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Fix price_change table ───────────────────────────────────────────────
    // The entity was updated to use requestedPrice/currentPrice but the DB still
    // has the old standard_price column. Rename and add the missing column.
    await queryRunner.query(
      `ALTER TABLE "price_change" RENAME COLUMN "standard_price" TO "requested_price"`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_change" ADD "current_price" numeric(10,2) NOT NULL DEFAULT '0'`,
    );

    // ─── Fix episode table ────────────────────────────────────────────────────
    // The Episode entity added a `type` field after the initial migration.
    // Create the enum type and add the column.
    await queryRunner.query(
      `CREATE TYPE "public"."episode_type_enum" AS ENUM('outpatient', 'inpatient', 'emergency')`,
    );
    await queryRunner.query(
      `ALTER TABLE "episode" ADD "type" "public"."episode_type_enum" NOT NULL DEFAULT 'outpatient'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse episode type column
    await queryRunner.query(`ALTER TABLE "episode" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."episode_type_enum"`);

    // Reverse price_change columns
    await queryRunner.query(`ALTER TABLE "price_change" DROP COLUMN "current_price"`);
    await queryRunner.query(
      `ALTER TABLE "price_change" RENAME COLUMN "requested_price" TO "standard_price"`,
    );
  }
}
