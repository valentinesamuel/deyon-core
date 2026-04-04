import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase9CrossCutting1776900000000 implements MigrationInterface {
  name = 'Phase9CrossCutting1776900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Notification table ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification" (
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMP WITH TIME ZONE,
        "version"     integer NOT NULL DEFAULT 0,
        "staff_id"    uuid NOT NULL,
        "type"        varchar NOT NULL,
        "title"       varchar NOT NULL,
        "body"        text NOT NULL,
        "metadata"    jsonb,
        "is_read"     boolean NOT NULL DEFAULT false,
        "read_at"     TIMESTAMP WITH TIME ZONE,
        "expires_at"  TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_notification" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_staff_id" ON "notification" ("staff_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_is_read" ON "notification" ("is_read")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_expires_at" ON "notification" ("expires_at")`,
    );

    // ─── StaffPermissionOverride table ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_permission_override" (
        "id"               uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at"       TIMESTAMP WITH TIME ZONE,
        "version"          integer NOT NULL DEFAULT 0,
        "staff_id"         uuid NOT NULL,
        "permission_code"  varchar NOT NULL,
        "granted"          boolean NOT NULL,
        "granted_by"       uuid NOT NULL,
        "granted_at"       TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "PK_staff_permission_override" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_staff_perm_override_staff_id" ON "staff_permission_override" ("staff_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_staff_perm_override_permission_code" ON "staff_permission_override" ("permission_code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_staff_perm_override_permission_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_staff_perm_override_staff_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_permission_override"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_expires_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_is_read"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_staff_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification"`);
  }
}
