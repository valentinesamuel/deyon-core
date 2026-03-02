import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthandPermission1772406099933 implements MigrationInterface {
  name = 'AuthandPermission1772406099933';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "permission" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "code" character varying NOT NULL, "description" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_30e166e8c6359970755c5727a23" UNIQUE ("code"), CONSTRAINT "PK_3b8b97af9d9d8807e41e6f48362" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "token_hash" character varying NOT NULL, "staff_id" uuid NOT NULL, "family_id" uuid NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "is_revoked" boolean NOT NULL DEFAULT false, "user_agent" character varying, "ip_address" character varying, CONSTRAINT "PK_b575dd3c21fb0831013c909e7fe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eb31f2a7917404a46e17f539f1" ON "refresh_token" ("family_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "mfa_config" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "staff_id" uuid NOT NULL, "encrypted_secret" character varying NOT NULL, "backup_code_hashes" text, "used_backup_codes" text, CONSTRAINT "UQ_ce05ac3be5e49f7340935c53396" UNIQUE ("staff_id"), CONSTRAINT "REL_ce05ac3be5e49f7340935c5339" UNIQUE ("staff_id"), CONSTRAINT "PK_8bdf98004e5d9d051c74c733fc3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_audit_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "staff_id" uuid, "event" character varying NOT NULL, "ip_address" character varying, "user_agent" character varying, "metadata" jsonb, "success" boolean NOT NULL DEFAULT true, "staffs_id" uuid, CONSTRAINT "PK_c2bea14d33e356cd1dad229be41" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8adbb41537a4c04ef0364bdb24" ON "auth_audit_log" ("staff_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "invite_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "token_hash" character varying NOT NULL, "email" character varying NOT NULL, "role_id" uuid, "department_id" uuid, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "is_used" boolean NOT NULL DEFAULT false, "invited_by_id" uuid, CONSTRAINT "UQ_ec46b3bf33249e303a1d7168621" UNIQUE ("token_hash"), CONSTRAINT "PK_48db6bdcb94d88472dd4d80d795" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permission" ("role_id" uuid NOT NULL, "permission_id" uuid NOT NULL, CONSTRAINT "PK_19a94c31d4960ded0dcd0397759" PRIMARY KEY ("role_id", "permission_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3d0a7155eafd75ddba5a701336" ON "role_permission" ("role_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e3a3ba47b7ca00fd23be4ebd6c" ON "role_permission" ("permission_id") `,
    );
    await queryRunner.query(`ALTER TABLE "staff" ADD "password_hash" character varying`);
    await queryRunner.query(
      `ALTER TABLE "staff" ADD "failed_login_attempts" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "staff" ADD "locked_until" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(
      `ALTER TABLE "staff" ADD "password_must_change" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff" ADD "last_password_change" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "staff" ADD "mfa_enabled" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "staff" DROP CONSTRAINT "FK_c3fe01125c99573751fe5e55666"`);
    await queryRunner.query(`ALTER TABLE "staff" DROP CONSTRAINT "FK_51b371508b14db31bee80fded0a"`);
    await queryRunner.query(`ALTER TABLE "staff" ALTER COLUMN "is_approved" SET DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "staff" ALTER COLUMN "role_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "staff" ALTER COLUMN "department_id" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD CONSTRAINT "FK_dc75d28d3538957acca07200102" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mfa_config" ADD CONSTRAINT "FK_ce05ac3be5e49f7340935c53396" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_audit_log" ADD CONSTRAINT "FK_4a7c347a4e01b25cc26d779870a" FOREIGN KEY ("staffs_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff" ADD CONSTRAINT "FK_c3fe01125c99573751fe5e55666" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff" ADD CONSTRAINT "FK_51b371508b14db31bee80fded0a" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invite_token" ADD CONSTRAINT "FK_735d8f1d18f8aa924dae6c53426" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" ADD CONSTRAINT "FK_3d0a7155eafd75ddba5a7013368" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" ADD CONSTRAINT "FK_e3a3ba47b7ca00fd23be4ebd6cf" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "role_permission" DROP CONSTRAINT "FK_e3a3ba47b7ca00fd23be4ebd6cf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permission" DROP CONSTRAINT "FK_3d0a7155eafd75ddba5a7013368"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invite_token" DROP CONSTRAINT "FK_735d8f1d18f8aa924dae6c53426"`,
    );
    await queryRunner.query(`ALTER TABLE "staff" DROP CONSTRAINT "FK_51b371508b14db31bee80fded0a"`);
    await queryRunner.query(`ALTER TABLE "staff" DROP CONSTRAINT "FK_c3fe01125c99573751fe5e55666"`);
    await queryRunner.query(
      `ALTER TABLE "auth_audit_log" DROP CONSTRAINT "FK_4a7c347a4e01b25cc26d779870a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mfa_config" DROP CONSTRAINT "FK_ce05ac3be5e49f7340935c53396"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP CONSTRAINT "FK_dc75d28d3538957acca07200102"`,
    );
    await queryRunner.query(`ALTER TABLE "staff" ALTER COLUMN "department_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "staff" ALTER COLUMN "role_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "staff" ALTER COLUMN "is_approved" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "staff" ADD CONSTRAINT "FK_51b371508b14db31bee80fded0a" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff" ADD CONSTRAINT "FK_c3fe01125c99573751fe5e55666" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN "mfa_enabled"`);
    await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN "last_password_change"`);
    await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN "password_must_change"`);
    await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN "locked_until"`);
    await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN "failed_login_attempts"`);
    await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN "password_hash"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e3a3ba47b7ca00fd23be4ebd6c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3d0a7155eafd75ddba5a701336"`);
    await queryRunner.query(`DROP TABLE "role_permission"`);
    await queryRunner.query(`DROP TABLE "invite_token"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8adbb41537a4c04ef0364bdb24"`);
    await queryRunner.query(`DROP TABLE "auth_audit_log"`);
    await queryRunner.query(`DROP TABLE "mfa_config"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_eb31f2a7917404a46e17f539f1"`);
    await queryRunner.query(`DROP TABLE "refresh_token"`);
    await queryRunner.query(`DROP TABLE "permission"`);
  }
}
