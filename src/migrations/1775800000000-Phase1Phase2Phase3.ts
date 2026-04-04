import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase1Phase2Phase31775800000000 implements MigrationInterface {
  name = 'Phase1Phase2Phase31775800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Sequences ────────────────────────────────────────────────────────────
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "patient_mrn_seq" START 1 INCREMENT 1`);
    await queryRunner.query(
      `CREATE SEQUENCE IF NOT EXISTS "episode_number_seq" START 1 INCREMENT 1`,
    );

    // ─── Phase 1b: Roster ─────────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE TYPE "public"."roster_status_enum" AS ENUM('draft', 'published')`,
    );
    await queryRunner.query(
      `CREATE TABLE "roster" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "version" integer NOT NULL DEFAULT '0',
        "week_start_date" date NOT NULL,
        "status" "public"."roster_status_enum" NOT NULL DEFAULT 'draft',
        "published_at" TIMESTAMP WITH TIME ZONE,
        "published_by_id" uuid,
        "notes" text,
        CONSTRAINT "PK_roster" PRIMARY KEY ("id")
      )`,
    );

    // Add rosterId FK to staff_shift_schedule
    await queryRunner.query(`ALTER TABLE "staff_shift_schedule" ADD "roster_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "staff_shift_schedule" ADD CONSTRAINT "FK_staff_shift_schedule_roster_id"
       FOREIGN KEY ("roster_id") REFERENCES "roster"("id") ON DELETE SET NULL`,
    );

    // roster.published_by_id FK
    await queryRunner.query(
      `ALTER TABLE "roster" ADD CONSTRAINT "FK_roster_published_by"
       FOREIGN KEY ("published_by_id") REFERENCES "staff"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "roster" DROP CONSTRAINT "FK_roster_published_by"`);
    await queryRunner.query(
      `ALTER TABLE "staff_shift_schedule" DROP CONSTRAINT "FK_staff_shift_schedule_roster_id"`,
    );
    await queryRunner.query(`ALTER TABLE "staff_shift_schedule" DROP COLUMN "roster_id"`);
    await queryRunner.query(`DROP TABLE "roster"`);
    await queryRunner.query(`DROP TYPE "public"."roster_status_enum"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "episode_number_seq"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "patient_mrn_seq"`);
  }
}
