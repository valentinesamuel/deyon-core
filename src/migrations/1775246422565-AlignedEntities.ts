import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignedEntities1775246422565 implements MigrationInterface {
  name = 'AlignedEntities1775246422565';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."claim_item_category_enum" AS ENUM('consultation', 'lab', 'pharmacy', 'procedure', 'admission', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."claim_item_status_enum" AS ENUM('pending', 'approved', 'denied')`,
    );
    await queryRunner.query(
      `CREATE TABLE "claim_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "claim_id" uuid NOT NULL, "bill_item_id" uuid, "description" character varying NOT NULL, "category" "public"."claim_item_category_enum" NOT NULL, "quantity" integer NOT NULL DEFAULT '1', "unit_price" numeric(10,2) NOT NULL, "claimed_amount" numeric(10,2) NOT NULL, "is_excluded" boolean NOT NULL DEFAULT false, "clinical_justification" text, "is_off_protocol" boolean NOT NULL DEFAULT false, "status" "public"."claim_item_status_enum" NOT NULL DEFAULT 'pending', "denial_reason" text, CONSTRAINT "PK_5679662039bc4c7c6bc7fa1be2d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."queue_entry_queue_type_enum" AS ENUM('triage', 'doctor_new', 'doctor_review', 'lab', 'pharmacy')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."queue_entry_priority_enum" AS ENUM('normal', 'high', 'emergency')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."queue_entry_payment_status_enum" AS ENUM('pending', 'cleared', 'hmo_verified', 'emergency_override')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."queue_entry_exit_reason_enum" AS ENUM('completed', 'cancelled', 'no_show', 'transferred')`,
    );
    await queryRunner.query(
      `CREATE TABLE "queue_entry" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "patient_id" uuid NOT NULL, "episode_id" uuid, "queue_type" "public"."queue_entry_queue_type_enum" NOT NULL, "priority" "public"."queue_entry_priority_enum" NOT NULL DEFAULT 'normal', "payment_status" "public"."queue_entry_payment_status_enum" NOT NULL DEFAULT 'pending', "entered_at" TIMESTAMP WITH TIME ZONE NOT NULL, "exited_at" TIMESTAMP WITH TIME ZONE, "total_wait_minutes" integer, "exit_reason" "public"."queue_entry_exit_reason_enum", "assigned_to" uuid, "chief_complaint" text, "notes" text, CONSTRAINT "PK_885c673f67b27b737a7c13bd4df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "medical_catalog" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "type" character varying NOT NULL, "official_name" character varying NOT NULL, "code" character varying NOT NULL, "search_keywords" jsonb, "is_verified" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_a748c55f858ef9abc5efd633548" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "patient_medical_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "patient_id" uuid NOT NULL, "catalog_id" uuid NOT NULL, "custom_name" character varying, "severity" character varying NOT NULL, "added_by" uuid NOT NULL, CONSTRAINT "PK_c296156f13e19846a99a3502008" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "episode_diagnosis" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "episode_id" uuid NOT NULL, "medical_code_id" uuid NOT NULL, "diagnosis_type" character varying NOT NULL, "diagnosed_by" uuid NOT NULL, CONSTRAINT "PK_92fae734714cd4e8ba6f0b5f62d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."emergency_override_scope_enum" AS ENUM('consultation', 'consultation_emergency', 'full_visit')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."emergency_override_status_enum" AS ENUM('active', 'cleared', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "emergency_override" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "patient_id" uuid NOT NULL, "episode_id" uuid, "reason" text NOT NULL, "scope" "public"."emergency_override_scope_enum" NOT NULL, "estimated_amount" numeric(10,2) NOT NULL, "authorized_by" uuid NOT NULL, "authorized_by_role" character varying NOT NULL, "status" "public"."emergency_override_status_enum" NOT NULL DEFAULT 'active', "cleared_at" TIMESTAMP WITH TIME ZONE, "cleared_by" uuid, CONSTRAINT "PK_3cb9c9a950d1877a2561910884c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."billing_code_department_enum" AS ENUM('front_desk', 'lab', 'pharmacy', 'nursing', 'all')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."billing_code_status_enum" AS ENUM('generated', 'paid', 'expired', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "billing_code" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "code" character varying NOT NULL, "bill_id" uuid, "patient_id" uuid NOT NULL, "department" "public"."billing_code_department_enum" NOT NULL, "amount" numeric(10,2) NOT NULL, "hmo_coverage" numeric(10,2), "patient_liability" numeric(10,2), "status" "public"."billing_code_status_enum" NOT NULL DEFAULT 'generated', "generated_by" uuid NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "paid_at" TIMESTAMP WITH TIME ZONE, "receipt_number" character varying, CONSTRAINT "UQ_eee7dbe3181c96d4a273c872d31" UNIQUE ("code"), CONSTRAINT "PK_ae5145ed393e3af2a08b2954b67" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "consultation" DROP COLUMN "present_illness_brief"`);
    await queryRunner.query(`ALTER TABLE "consultation" DROP COLUMN "draft_metadata"`);
    await queryRunner.query(`ALTER TABLE "consultation" DROP COLUMN "is_draft"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "primary_diagnosis_code"`);
    await queryRunner.query(`ALTER TABLE "hmo_contract" DROP COLUMN "copay_percentage"`);
    await queryRunner.query(`ALTER TABLE "hmo_contract" DROP COLUMN "is_fully_covered"`);
    await queryRunner.query(`ALTER TABLE "patient" ADD "firstname" character varying NOT NULL`);
    await queryRunner.query(`ALTER TABLE "patient" ADD "occupation" character varying`);
    await queryRunner.query(`ALTER TABLE "shift" ADD "opening_balance" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "shift" ADD "closing_balance" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "shift" ADD "expected_balance" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "shift" ADD "variance" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "shift" ADD "notes" text`);
    await queryRunner.query(`ALTER TABLE "consultation" ADD "doctor_id" uuid NOT NULL`);
    await queryRunner.query(
      `CREATE TYPE "public"."consultation_status_enum" AS ENUM('draft', 'in_progress', 'finalized')`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation" ADD "status" "public"."consultation_status_enum" NOT NULL DEFAULT 'draft'`,
    );
    await queryRunner.query(`ALTER TABLE "consultation" ADD "history_of_present_illness" text`);
    await queryRunner.query(`ALTER TABLE "consultation" ADD "physical_examination" text`);
    await queryRunner.query(`ALTER TABLE "consultation" ADD "selected_diagnoses" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "hmo_provider" ADD "default_copay_percentage" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "hmo_provider" ADD "relationship_manager_phone" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "claim" ADD "claim_number" character varying NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "claim" ADD CONSTRAINT "UQ_7d4065470cdfca1cab570052f17" UNIQUE ("claim_number")`,
    );
    await queryRunner.query(`ALTER TABLE "claim" ADD "approved_amount" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "claim" ADD "enrollment_id" character varying`);
    await queryRunner.query(`ALTER TABLE "claim" ADD "policy_number" character varying`);
    await queryRunner.query(`ALTER TABLE "claim" ADD "pre_auth_code" character varying`);
    await queryRunner.query(`ALTER TABLE "claim" ADD "diagnoses" jsonb`);
    await queryRunner.query(`ALTER TABLE "claim" ADD "denial_reason" text`);
    await queryRunner.query(`ALTER TABLE "claim" ADD "resubmission_notes" text`);
    await queryRunner.query(`ALTER TABLE "claim" ADD "withdrawn_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(
      `CREATE TYPE "public"."claim_withdrawn_reason_enum" AS ENUM('patient_self_pay', 'hospital_cancelled', 'claim_error', 'treatment_changed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "claim" ADD "withdrawn_reason" "public"."claim_withdrawn_reason_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "claim" ADD "retraction_notes" text`);
    await queryRunner.query(`ALTER TABLE "claim" ADD "private_bill_id" uuid`);
    await queryRunner.query(`ALTER TABLE "claim" ADD "private_payment_id" uuid`);
    await queryRunner.query(`ALTER TABLE "claim" ADD "versions" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "claim" ADD "current_version" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(`ALTER TABLE "bill" ADD "subtotal" numeric(10,2) NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "bill" ADD "discount" numeric(10,2) NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "bill" ADD "tax" numeric(10,2) NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "bill" ADD "total" numeric(10,2) NOT NULL DEFAULT '0'`);
    await queryRunner.query(
      `ALTER TABLE "bill" ADD "amount_paid" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "bill" ADD "balance" numeric(10,2) NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "bill" ADD "hmo_total_coverage" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "bill" ADD "patient_total_liability" numeric(10,2)`);
    await queryRunner.query(
      `CREATE TYPE "public"."bill_payment_method_enum" AS ENUM('cash', 'card', 'transfer', 'hmo', 'corporate')`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill" ADD "payment_method" "public"."bill_payment_method_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "bill" ADD "is_walk_in" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "bill" ADD "walk_in_customer_name" character varying`);
    await queryRunner.query(`ALTER TABLE "bill" ADD "walk_in_phone" character varying`);
    await queryRunner.query(`ALTER TABLE "bill" ADD "notes" text`);
    await queryRunner.query(`ALTER TABLE "bill" ADD "paid_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "hmo_contract" ADD "coverage_percentage" numeric(5,2)`);
    await queryRunner.query(`ALTER TABLE "hmo_contract" ADD "coverage_flat_amount" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "hmo_contract" ADD "max_covered_amount" numeric(10,2)`);
    await queryRunner.query(
      `CREATE TYPE "public"."bill_item_hmo_status_enum" AS ENUM('covered', 'partial', 'not_covered', 'opted_out')`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill_item" ADD "hmo_status" "public"."bill_item_hmo_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "bill_item" ADD "hmo_covered_amount" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "bill_item" ADD "patient_liability_amount" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "bill_item" ADD "hmo_contract_id" uuid`);
    await queryRunner.query(
      `ALTER TABLE "bill_item" ADD "is_opted_out_of_hmo" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "medical_service" ADD "code" character varying NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "medical_service" ADD CONSTRAINT "UQ_46cb246138c54c9fa9491b2b4e6" UNIQUE ("code")`,
    );
    await queryRunner.query(`ALTER TABLE "medical_service" ADD "description" text`);
    await queryRunner.query(
      `ALTER TABLE "medical_service" ADD "is_taxable" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_service" ADD "is_premium" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_service" ADD "is_restricted" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "medical_service" ADD "restriction_reason" text`);
    await queryRunner.query(
      `CREATE TYPE "public"."medical_service_department_enum" AS ENUM('front_desk', 'lab', 'pharmacy', 'nursing', 'all')`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_service" ADD "department" "public"."medical_service_department_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."medical_service_status_enum" AS ENUM('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_service" ADD "status" "public"."medical_service_status_enum" NOT NULL DEFAULT 'approved'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."restock_request_urgency_enum" AS ENUM('normal', 'urgent')`,
    );
    await queryRunner.query(
      `ALTER TABLE "restock_request" ADD "urgency" "public"."restock_request_urgency_enum" NOT NULL DEFAULT 'normal'`,
    );
    await queryRunner.query(`ALTER TABLE "patient" ALTER COLUMN "email" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "bill" DROP CONSTRAINT "FK_d9962ee37addc6155076867529b"`);
    await queryRunner.query(`ALTER TABLE "bill" ALTER COLUMN "patient_id" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TYPE "public"."restock_request_status_enum" RENAME TO "restock_request_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."restock_request_status_enum" AS ENUM('pending', 'approved', 'partially_approved', 'rejected', 'forwarded_to_cmo', 'info_requested', 'fulfilled')`,
    );
    await queryRunner.query(`ALTER TABLE "restock_request" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "restock_request" ALTER COLUMN "status" TYPE "public"."restock_request_status_enum" USING "status"::"text"::"public"."restock_request_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restock_request" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."restock_request_status_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "consultation" ADD CONSTRAINT "FK_3c1aa99759fa972f6a4a20227cf" FOREIGN KEY ("doctor_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "claim_item" ADD CONSTRAINT "FK_fbfbb858cd94e640a823b49661a" FOREIGN KEY ("claim_id") REFERENCES "claim"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "claim_item" ADD CONSTRAINT "FK_4fc861787456d88784e7e862b3c" FOREIGN KEY ("bill_item_id") REFERENCES "bill_item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "claim" ADD CONSTRAINT "FK_f80e9da1dd66d6ecd2b89ad97fc" FOREIGN KEY ("private_bill_id") REFERENCES "bill"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill" ADD CONSTRAINT "FK_d9962ee37addc6155076867529b" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill_item" ADD CONSTRAINT "FK_b58941e9bd9915a30450a0eb50d" FOREIGN KEY ("hmo_contract_id") REFERENCES "hmo_contract"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "queue_entry" ADD CONSTRAINT "FK_1c7e12d044db0dfa5bfc70384db" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "queue_entry" ADD CONSTRAINT "FK_9fad60112a6f53a540c60122585" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "queue_entry" ADD CONSTRAINT "FK_ea7284c809bcd5aed348f0e95cf" FOREIGN KEY ("assigned_to") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_history" ADD CONSTRAINT "FK_bc1ad0296e7db8e0aef47d1e4dd" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_history" ADD CONSTRAINT "FK_912882c315ad3aea74befe99c11" FOREIGN KEY ("catalog_id") REFERENCES "medical_catalog"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_history" ADD CONSTRAINT "FK_c861c7cfe194c180c23e03a5df6" FOREIGN KEY ("added_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "episode_diagnosis" ADD CONSTRAINT "FK_dcad99d7338de9ffa79d718aea3" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "episode_diagnosis" ADD CONSTRAINT "FK_a06f381a8ebca161f5945f697e0" FOREIGN KEY ("medical_code_id") REFERENCES "medical_code"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "episode_diagnosis" ADD CONSTRAINT "FK_dbc000ff67c059bb4fa957a4872" FOREIGN KEY ("diagnosed_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "emergency_override" ADD CONSTRAINT "FK_a7c2c0ab0b1a9f073e2d4deb8f9" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "emergency_override" ADD CONSTRAINT "FK_cb08955b8beae4ff6b33c5e9b12" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "emergency_override" ADD CONSTRAINT "FK_7f9a291ee0b23fc34e0e6c9b2b2" FOREIGN KEY ("authorized_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "emergency_override" ADD CONSTRAINT "FK_f40aa39d142fe079463ab6ce2df" FOREIGN KEY ("cleared_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "billing_code" ADD CONSTRAINT "FK_7895c11ff2b7e0a796a62581f8c" FOREIGN KEY ("bill_id") REFERENCES "bill"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "billing_code" ADD CONSTRAINT "FK_e74237fdb2644e37a31c40d2208" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "billing_code" ADD CONSTRAINT "FK_847c1c19ae9365ef83eb46e4183" FOREIGN KEY ("generated_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "billing_code" DROP CONSTRAINT "FK_847c1c19ae9365ef83eb46e4183"`,
    );
    await queryRunner.query(
      `ALTER TABLE "billing_code" DROP CONSTRAINT "FK_e74237fdb2644e37a31c40d2208"`,
    );
    await queryRunner.query(
      `ALTER TABLE "billing_code" DROP CONSTRAINT "FK_7895c11ff2b7e0a796a62581f8c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "emergency_override" DROP CONSTRAINT "FK_f40aa39d142fe079463ab6ce2df"`,
    );
    await queryRunner.query(
      `ALTER TABLE "emergency_override" DROP CONSTRAINT "FK_7f9a291ee0b23fc34e0e6c9b2b2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "emergency_override" DROP CONSTRAINT "FK_cb08955b8beae4ff6b33c5e9b12"`,
    );
    await queryRunner.query(
      `ALTER TABLE "emergency_override" DROP CONSTRAINT "FK_a7c2c0ab0b1a9f073e2d4deb8f9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "episode_diagnosis" DROP CONSTRAINT "FK_dbc000ff67c059bb4fa957a4872"`,
    );
    await queryRunner.query(
      `ALTER TABLE "episode_diagnosis" DROP CONSTRAINT "FK_a06f381a8ebca161f5945f697e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "episode_diagnosis" DROP CONSTRAINT "FK_dcad99d7338de9ffa79d718aea3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_history" DROP CONSTRAINT "FK_c861c7cfe194c180c23e03a5df6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_history" DROP CONSTRAINT "FK_912882c315ad3aea74befe99c11"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_medical_history" DROP CONSTRAINT "FK_bc1ad0296e7db8e0aef47d1e4dd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "queue_entry" DROP CONSTRAINT "FK_ea7284c809bcd5aed348f0e95cf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "queue_entry" DROP CONSTRAINT "FK_9fad60112a6f53a540c60122585"`,
    );
    await queryRunner.query(
      `ALTER TABLE "queue_entry" DROP CONSTRAINT "FK_1c7e12d044db0dfa5bfc70384db"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill_item" DROP CONSTRAINT "FK_b58941e9bd9915a30450a0eb50d"`,
    );
    await queryRunner.query(`ALTER TABLE "bill" DROP CONSTRAINT "FK_d9962ee37addc6155076867529b"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP CONSTRAINT "FK_f80e9da1dd66d6ecd2b89ad97fc"`);
    await queryRunner.query(
      `ALTER TABLE "claim_item" DROP CONSTRAINT "FK_4fc861787456d88784e7e862b3c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "claim_item" DROP CONSTRAINT "FK_fbfbb858cd94e640a823b49661a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation" DROP CONSTRAINT "FK_3c1aa99759fa972f6a4a20227cf"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."restock_request_status_enum_old" AS ENUM('pending', 'approved', 'rejected', 'fulfilled')`,
    );
    await queryRunner.query(`ALTER TABLE "restock_request" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "restock_request" ALTER COLUMN "status" TYPE "public"."restock_request_status_enum_old" USING "status"::"text"::"public"."restock_request_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restock_request" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."restock_request_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."restock_request_status_enum_old" RENAME TO "restock_request_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "bill" ALTER COLUMN "patient_id" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "bill" ADD CONSTRAINT "FK_d9962ee37addc6155076867529b" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "patient" ALTER COLUMN "email" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "restock_request" DROP COLUMN "urgency"`);
    await queryRunner.query(`DROP TYPE "public"."restock_request_urgency_enum"`);
    await queryRunner.query(`ALTER TABLE "medical_service" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."medical_service_status_enum"`);
    await queryRunner.query(`ALTER TABLE "medical_service" DROP COLUMN "department"`);
    await queryRunner.query(`DROP TYPE "public"."medical_service_department_enum"`);
    await queryRunner.query(`ALTER TABLE "medical_service" DROP COLUMN "restriction_reason"`);
    await queryRunner.query(`ALTER TABLE "medical_service" DROP COLUMN "is_restricted"`);
    await queryRunner.query(`ALTER TABLE "medical_service" DROP COLUMN "is_premium"`);
    await queryRunner.query(`ALTER TABLE "medical_service" DROP COLUMN "is_taxable"`);
    await queryRunner.query(`ALTER TABLE "medical_service" DROP COLUMN "description"`);
    await queryRunner.query(
      `ALTER TABLE "medical_service" DROP CONSTRAINT "UQ_46cb246138c54c9fa9491b2b4e6"`,
    );
    await queryRunner.query(`ALTER TABLE "medical_service" DROP COLUMN "code"`);
    await queryRunner.query(`ALTER TABLE "bill_item" DROP COLUMN "is_opted_out_of_hmo"`);
    await queryRunner.query(`ALTER TABLE "bill_item" DROP COLUMN "hmo_contract_id"`);
    await queryRunner.query(`ALTER TABLE "bill_item" DROP COLUMN "patient_liability_amount"`);
    await queryRunner.query(`ALTER TABLE "bill_item" DROP COLUMN "hmo_covered_amount"`);
    await queryRunner.query(`ALTER TABLE "bill_item" DROP COLUMN "hmo_status"`);
    await queryRunner.query(`DROP TYPE "public"."bill_item_hmo_status_enum"`);
    await queryRunner.query(`ALTER TABLE "hmo_contract" DROP COLUMN "max_covered_amount"`);
    await queryRunner.query(`ALTER TABLE "hmo_contract" DROP COLUMN "coverage_flat_amount"`);
    await queryRunner.query(`ALTER TABLE "hmo_contract" DROP COLUMN "coverage_percentage"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP COLUMN "paid_at"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP COLUMN "notes"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP COLUMN "walk_in_phone"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP COLUMN "walk_in_customer_name"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP COLUMN "is_walk_in"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP COLUMN "payment_method"`);
    await queryRunner.query(`DROP TYPE "public"."bill_payment_method_enum"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP COLUMN "patient_total_liability"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP COLUMN "hmo_total_coverage"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP COLUMN "balance"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP COLUMN "amount_paid"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP COLUMN "total"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP COLUMN "tax"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP COLUMN "discount"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP COLUMN "subtotal"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "current_version"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "versions"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "private_payment_id"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "private_bill_id"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "retraction_notes"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "withdrawn_reason"`);
    await queryRunner.query(`DROP TYPE "public"."claim_withdrawn_reason_enum"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "withdrawn_at"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "resubmission_notes"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "denial_reason"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "diagnoses"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "pre_auth_code"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "policy_number"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "enrollment_id"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "approved_amount"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP CONSTRAINT "UQ_7d4065470cdfca1cab570052f17"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP COLUMN "claim_number"`);
    await queryRunner.query(`ALTER TABLE "hmo_provider" DROP COLUMN "relationship_manager_phone"`);
    await queryRunner.query(`ALTER TABLE "hmo_provider" DROP COLUMN "default_copay_percentage"`);
    await queryRunner.query(`ALTER TABLE "consultation" DROP COLUMN "selected_diagnoses"`);
    await queryRunner.query(`ALTER TABLE "consultation" DROP COLUMN "physical_examination"`);
    await queryRunner.query(`ALTER TABLE "consultation" DROP COLUMN "history_of_present_illness"`);
    await queryRunner.query(`ALTER TABLE "consultation" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."consultation_status_enum"`);
    await queryRunner.query(`ALTER TABLE "consultation" DROP COLUMN "doctor_id"`);
    await queryRunner.query(`ALTER TABLE "shift" DROP COLUMN "notes"`);
    await queryRunner.query(`ALTER TABLE "shift" DROP COLUMN "variance"`);
    await queryRunner.query(`ALTER TABLE "shift" DROP COLUMN "expected_balance"`);
    await queryRunner.query(`ALTER TABLE "shift" DROP COLUMN "closing_balance"`);
    await queryRunner.query(`ALTER TABLE "shift" DROP COLUMN "opening_balance"`);
    await queryRunner.query(`ALTER TABLE "patient" DROP COLUMN "occupation"`);
    await queryRunner.query(`ALTER TABLE "patient" DROP COLUMN "firstname"`);
    await queryRunner.query(
      `ALTER TABLE "hmo_contract" ADD "is_fully_covered" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "hmo_contract" ADD "copay_percentage" numeric(5,2)`);
    await queryRunner.query(
      `ALTER TABLE "claim" ADD "primary_diagnosis_code" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation" ADD "is_draft" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "consultation" ADD "draft_metadata" jsonb`);
    await queryRunner.query(`ALTER TABLE "consultation" ADD "present_illness_brief" text`);
    await queryRunner.query(`DROP TABLE "billing_code"`);
    await queryRunner.query(`DROP TYPE "public"."billing_code_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."billing_code_department_enum"`);
    await queryRunner.query(`DROP TABLE "emergency_override"`);
    await queryRunner.query(`DROP TYPE "public"."emergency_override_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."emergency_override_scope_enum"`);
    await queryRunner.query(`DROP TABLE "episode_diagnosis"`);
    await queryRunner.query(`DROP TABLE "patient_medical_history"`);
    await queryRunner.query(`DROP TABLE "medical_catalog"`);
    await queryRunner.query(`DROP TABLE "queue_entry"`);
    await queryRunner.query(`DROP TYPE "public"."queue_entry_exit_reason_enum"`);
    await queryRunner.query(`DROP TYPE "public"."queue_entry_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."queue_entry_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."queue_entry_queue_type_enum"`);
    await queryRunner.query(`DROP TABLE "claim_item"`);
    await queryRunner.query(`DROP TYPE "public"."claim_item_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."claim_item_category_enum"`);
  }
}
