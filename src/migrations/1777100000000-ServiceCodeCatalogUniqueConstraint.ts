import { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceCodeCatalogUniqueConstraint1777100000000 implements MigrationInterface {
  name = 'ServiceCodeCatalogUniqueConstraint1777100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove duplicate null-hmo entries, keeping the earliest created record per (medical_code_id, service_id) pair
    await queryRunner.query(`
      DELETE FROM "service_code_catalog"
      WHERE "hmo_provider_id" IS NULL
        AND "id" NOT IN (
          SELECT DISTINCT ON ("medical_code_id", "service_id") "id"
          FROM "service_code_catalog"
          WHERE "hmo_provider_id" IS NULL
          ORDER BY "medical_code_id", "service_id", "created_at" ASC
        )
    `);
    // Constraint for non-null hmo_provider_id combinations
    await queryRunner.query(
      `ALTER TABLE "service_code_catalog" ADD CONSTRAINT "UQ_scc_medical_code_service_hmo" UNIQUE ("medical_code_id", "service_id", "hmo_provider_id")`,
    );
    // Partial unique index for null hmo_provider_id
    // PostgreSQL treats NULL != NULL in standard UNIQUE constraints, so this handles the NULL case
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_scc_medical_code_service_no_hmo" ON "service_code_catalog" ("medical_code_id", "service_id") WHERE "hmo_provider_id" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_scc_medical_code_service_no_hmo"`);
    await queryRunner.query(
      `ALTER TABLE "service_code_catalog" DROP CONSTRAINT "UQ_scc_medical_code_service_hmo"`,
    );
  }
}
