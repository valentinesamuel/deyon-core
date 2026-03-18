import { MigrationInterface, QueryRunner } from 'typeorm';

export class SearchIndexes1773647489563 implements MigrationInterface {
  name = 'SearchIndexes1773647489563';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pg_trgm (required for % operator and set_limit)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // Trigram GIN indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_staff_first_name_trgm ON staff USING GIN (first_name gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_staff_last_name_trgm ON staff USING GIN (last_name gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_staff_email_trgm ON staff USING GIN (email gin_trgm_ops)`,
    );

    // FTS GIN indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_staff_first_name_fts ON staff USING GIN (to_tsvector('english', first_name))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_staff_last_name_fts ON staff USING GIN (to_tsvector('english', last_name))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_staff_last_name_fts`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_staff_first_name_fts`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_staff_email_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_staff_last_name_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_staff_first_name_trgm`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS pg_trgm`);
  }
}
