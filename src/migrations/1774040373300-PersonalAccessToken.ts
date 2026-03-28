import { MigrationInterface, QueryRunner } from 'typeorm';

export class PersonalAccessToken1774040373300 implements MigrationInterface {
  name = 'PersonalAccessToken1774040373300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── DDL ─────────────────────────────────────────────────────────────────

    // 1. Create personal_access_token table
    await queryRunner.query(`
      CREATE TABLE "personal_access_token" (
        "id"           uuid                     NOT NULL DEFAULT uuid_generate_v4(),
        "created_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at"   TIMESTAMP,
        "version"      integer                  NOT NULL DEFAULT '0',
        "token_hash"   character varying        NOT NULL,
        "staff_id"     uuid                     NOT NULL,
        "name"         character varying        NOT NULL,
        "expires_at"   TIMESTAMP WITH TIME ZONE,
        "is_revoked"   boolean                  NOT NULL DEFAULT false,
        "last_used_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "UQ_pat_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "PK_pat"           PRIMARY KEY ("id")
      )
    `);

    // 2. Indexes
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_pat_token_hash" ON "personal_access_token" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pat_staff_id" ON "personal_access_token" ("staff_id")`,
    );

    // 3. FK to staff with ON DELETE CASCADE
    await queryRunner.query(`
      ALTER TABLE "personal_access_token"
        ADD CONSTRAINT "FK_pat_staff"
        FOREIGN KEY ("staff_id") REFERENCES "staff" ("id") ON DELETE CASCADE
    `);

    // ── DML ─────────────────────────────────────────────────────────────────

    // 4. Seed pat:generate permission
    await queryRunner.query(`
      INSERT INTO "permission" ("code", "description")
      VALUES ('pat:generate', 'Generate personal access tokens')
      ON CONFLICT ("code") DO NOTHING
    `);

    // 5. Seed system_admin role (if it doesn't exist)
    await queryRunner.query(`
      INSERT INTO "role" ("name", "alias", "is_active", "is_system_role")
      SELECT 'System Admin', 'system_admin', true, false
      WHERE NOT EXISTS (
        SELECT 1 FROM "role" WHERE "alias" = 'system_admin'
      )
    `);

    // 6. Grant pat:generate to system_admin role
    await queryRunner.query(`
      INSERT INTO "role_permission" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "role" r, "permission" p
      WHERE r.alias = 'system_admin'
        AND p.code  = 'pat:generate'
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Reverse DML ──────────────────────────────────────────────────────────

    // 6. Remove pat:generate from system_admin role
    await queryRunner.query(`
      DELETE FROM "role_permission"
      WHERE "role_id"       = (SELECT id FROM "role"       WHERE alias = 'system_admin')
        AND "permission_id" = (SELECT id FROM "permission" WHERE code  = 'pat:generate')
    `);

    // 5. Remove system_admin role (only if it was seeded by this migration)
    await queryRunner.query(`
      DELETE FROM "role" WHERE "alias" = 'system_admin' AND "is_system_role" = false
    `);

    // 4. Remove pat:generate permission
    await queryRunner.query(`DELETE FROM "permission" WHERE "code" = 'pat:generate'`);

    // ── Reverse DDL ──────────────────────────────────────────────────────────

    // 3. Drop FK
    await queryRunner.query(`ALTER TABLE "personal_access_token" DROP CONSTRAINT "FK_pat_staff"`);

    // 2. Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_pat_staff_id"`);
    await queryRunner.query(`DROP INDEX "IDX_pat_token_hash"`);

    // 1. Drop table
    await queryRunner.query(`DROP TABLE "personal_access_token"`);
  }
}
