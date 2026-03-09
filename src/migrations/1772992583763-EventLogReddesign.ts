import { MigrationInterface, QueryRunner } from "typeorm";

export class EventLogReddesign1772992583763 implements MigrationInterface {
  name = 'EventLogReddesign1772992583763';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "auth_audit_log" RENAME TO "event_log"`);
    await queryRunner.query(`ALTER TABLE "event_log" RENAME COLUMN "staff_id" TO "actor_id"`);
    // Drop FK constraint if exists
    try {
      await queryRunner.query(
        `ALTER TABLE "event_log" DROP CONSTRAINT "FK_4a7c347a4e01b25cc26d779870a"`,
      );
    } catch (e) {}
    // Drop staffs_id column if exists
    try {
      await queryRunner.query(`ALTER TABLE "event_log" DROP COLUMN "staffs_id"`);
    } catch (e) {}
    // Drop old index if exists
    try {
      await queryRunner.query(`DROP INDEX "IDX_8adbb41537a4c04ef0364bdb24"`);
    } catch (e) {}
    await queryRunner.query(`CREATE INDEX "IDX_event_log_actor_id" ON "event_log" ("actor_id")`);
    await queryRunner.query(`ALTER TABLE "event_log" ADD "module" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "event_log" DROP COLUMN "module"`);
    await queryRunner.query(`DROP INDEX "IDX_event_log_actor_id"`);
    await queryRunner.query(`ALTER TABLE "event_log" RENAME COLUMN "actor_id" TO "staff_id"`);
    await queryRunner.query(`ALTER TABLE "event_log" RENAME TO "auth_audit_log"`);
  }
}
