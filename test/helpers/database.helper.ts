import { DataSource } from 'typeorm';

export async function truncateAllTables(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  try {
    await queryRunner.query('SET session_replication_role = replica');
    // Truncate in FK-safe order
    const tables = [
      'event_log',
      'refresh_token',
      'mfa_config',
      'invite_token',
      'staff_permissions',
      'staff',
      'role_permission',
      'permission',
      'role',
      'department',
      'system_config',
    ];
    for (const table of tables) {
      await queryRunner.query(`TRUNCATE TABLE "${table}" CASCADE`).catch(() => {
        // ignore if table doesn't exist yet
      });
    }
    await queryRunner.query('SET session_replication_role = DEFAULT');
  } finally {
    await queryRunner.release();
  }
}

export async function seedSystemConfig(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `INSERT INTO system_config (key, value) VALUES ('setup_complete', '{"completed":false}') ON CONFLICT (key) DO NOTHING`,
  );
}

/**
 * Seeds the baseline permissions, Super Admin role, and default departments that the
 * SystemBootstrap migration (1773182024365) would normally apply.
 * Required for role and setup integration tests.
 */
export async function seedPermissionsAndRoles(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO "permission" ("code", "description") VALUES
      ('*:*',               'Superadmin wildcard — grants all permissions'),
      ('role:create',       'Create roles'),
      ('role:read',         'Read roles'),
      ('role:update',       'Update roles'),
      ('role:delete',       'Delete roles'),
      ('staff:invite',      'Invite staff'),
      ('staff:read',        'Read staff'),
      ('staff:update',      'Update staff'),
      ('staff:deactivate',  'Deactivate staff'),
      ('department:create', 'Create departments'),
      ('department:read',   'Read departments'),
      ('department:update', 'Update departments'),
      ('department:delete', 'Delete departments'),
      ('permission:read',   'Read permissions')
    ON CONFLICT ("code") DO NOTHING
  `);

  await dataSource.query(`
    INSERT INTO "role" ("name", "alias", "is_active", "is_system_role")
    SELECT 'Super Admin', 'super_admin', true, true
    WHERE NOT EXISTS (SELECT 1 FROM "role" WHERE "alias" = 'super_admin')
  `);

  await dataSource.query(`
    INSERT INTO "role_permission" ("role_id", "permission_id")
    SELECT r.id, p.id
    FROM "role" r, "permission" p
    WHERE r.alias = 'super_admin' AND p.code = '*:*'
    ON CONFLICT DO NOTHING
  `);

  await dataSource.query(`
    INSERT INTO "department" ("name", "alias") VALUES
      ('Administration', 'administration'),
      ('Clinical',       'clinical'),
      ('Pharmacy',       'pharmacy'),
      ('HR',             'hr'),
      ('Finance',        'finance')
    ON CONFLICT ("alias") DO NOTHING
  `);

  await dataSource.query(`
    INSERT INTO "system_config" ("key", "value")
    VALUES ('setup_complete', '{"completed":false}')
    ON CONFLICT ("key") DO NOTHING
  `);
}
