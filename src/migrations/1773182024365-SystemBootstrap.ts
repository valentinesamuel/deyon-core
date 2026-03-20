import { MigrationInterface, QueryRunner } from 'typeorm';

export class SystemBootstrap1773182024365 implements MigrationInterface {
  name = 'SystemBootstrap1773182024365';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── DDL ─────────────────────────────────────────────────────────────────

    // 1. Add missing columns to role table
    await queryRunner.query(`ALTER TABLE "role" ADD "is_active" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(
      `ALTER TABLE "role" ADD "is_system_role" boolean NOT NULL DEFAULT false`,
    );

    // 2. Create system_config table
    await queryRunner.query(`
      CREATE TABLE "system_config" (
        "id"         uuid                     NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "version"    integer                  NOT NULL DEFAULT '0',
        "key"        character varying        NOT NULL,
        "value"      jsonb                    NOT NULL,
        CONSTRAINT "UQ_system_config_key" UNIQUE ("key"),
        CONSTRAINT "PK_system_config"     PRIMARY KEY ("id")
      )
    `);

    // 3. Add UNIQUE constraint on department.alias
    await queryRunner.query(
      `ALTER TABLE "department" ADD CONSTRAINT "UQ_department_alias" UNIQUE ("alias")`,
    );

    // ── DML ─────────────────────────────────────────────────────────────────

    // 4. Seed 14 permissions
    await queryRunner.query(`
      INSERT INTO "permission" ("code", "description") VALUES
        ('*:*',               'Cmo wildcard — grants all permissions'),
        ('role:create',       'Create roles'),
        ('role:read',         'Read roles'),
        ('role:update',       'Update roles'),
        ('role:delete',       'Delete roles'),
        ('staff:invite',      'Invite staff'),
        ('staff:read',        'Read staff'),
        ('staff:list',        'List staff'),
        ('staff:update',      'Update staff'),
        ('staff:deactivate',  'Deactivate staff'),
        ('department:create', 'Create departments'),
        ('department:read',   'Read departments'),
        ('department:update', 'Update departments'),
        ('department:delete', 'Delete departments'),
        ('permission:read',   'Read permissions')
      ON CONFLICT ("code") DO NOTHING
    `);

    // 5. Seed cmo role
    await queryRunner.query(`
      INSERT INTO "role" ("name", "alias", "is_active", "is_system_role")
      SELECT 'Cmo', 'cmo', true, true
      WHERE NOT EXISTS (
        SELECT 1 FROM "role" WHERE "alias" = 'cmo'
      )
    `);

    // 6. Link *:* permission to cmo role
    await queryRunner.query(`
      INSERT INTO "role_permission" ("role_id", "permission_id")
      SELECT r.id, p.id
      FROM "role" r, "permission" p
      WHERE r.alias = 'cmo'
        AND p.code = '*:*'
      ON CONFLICT DO NOTHING
    `);

    // 7. Seed 5 default departments
    await queryRunner.query(`
      INSERT INTO "department" ("name", "alias") VALUES
        ('Administration', 'administration'),
        ('Clinical',       'clinical'),
        ('Pharmacy',       'pharmacy'),
        ('HR',             'hr'),
        ('Finance',        'finance')
      ON CONFLICT ("alias") DO NOTHING
    `);

    // 8. Insert setup_complete config row
    await queryRunner.query(`
      INSERT INTO "system_config" ("key", "value")
      VALUES ('setup_complete', '{"completed":false}')
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Reverse DML ──────────────────────────────────────────────────────────

    // 8. Remove setup_complete config row
    await queryRunner.query(`DELETE FROM "system_config" WHERE "key" = 'setup_complete'`);

    // 7. Remove seeded departments
    await queryRunner.query(`
      DELETE FROM "department"
      WHERE "alias" IN ('administration', 'clinical', 'pharmacy', 'hr', 'finance')
    `);

    // 6. Remove role_permission link for cmo/*:*
    await queryRunner.query(`
      DELETE FROM "role_permission"
      WHERE "role_id"       = (SELECT id FROM "role"       WHERE alias = 'cmo')
        AND "permission_id" = (SELECT id FROM "permission" WHERE code  = '*:*')
    `);

    // 5. Remove cmo role
    await queryRunner.query(`DELETE FROM "role" WHERE "alias" = 'cmo'`);

    // 4. Remove seeded permissions
    await queryRunner.query(`
      DELETE FROM "permission" WHERE "code" IN (
        '*:*', 'role:create', 'role:read', 'role:update', 'role:delete',
        'staff:invite', 'staff:read', 'staff:list', 'staff:update', 'staff:deactivate',
        'department:create', 'department:read', 'department:update', 'department:delete',
        'permission:read'
      )
    `);

    // ── Reverse DDL ──────────────────────────────────────────────────────────

    // 3. Remove UNIQUE constraint on department.alias
    await queryRunner.query(`ALTER TABLE "department" DROP CONSTRAINT "UQ_department_alias"`);

    // 2. Drop system_config table
    await queryRunner.query(`DROP TABLE "system_config"`);

    // 1. Remove columns added to role table
    await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "is_system_role"`);
    await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "is_active"`);
  }
}
