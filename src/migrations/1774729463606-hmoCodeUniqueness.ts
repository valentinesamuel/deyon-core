import { MigrationInterface, QueryRunner } from 'typeorm';

export class HmoCodeUniqueness1774729463606 implements MigrationInterface {
  name = 'HmoCodeUniqueness1774729463606';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "hmo_provider" ADD CONSTRAINT "UQ_a3d3f2ae4d719e040baa8d738c4" UNIQUE ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a3d3f2ae4d719e040baa8d738c" ON "hmo_provider" ("code") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_a3d3f2ae4d719e040baa8d738c"`);
    await queryRunner.query(
      `ALTER TABLE "hmo_provider" DROP CONSTRAINT "UQ_a3d3f2ae4d719e040baa8d738c4"`,
    );
  }
}
