import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBaseEntity1774462120371 implements MigrationInterface {
  name = 'CreateBaseEntity1774462120371';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "personal_access_token" DROP CONSTRAINT "FK_pat_staff"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_pat_token_hash"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_pat_staff_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_staff_first_name_trgm"`);
    await queryRunner.query(`DROP INDEX "public"."idx_staff_last_name_trgm"`);
    await queryRunner.query(`DROP INDEX "public"."idx_staff_email_trgm"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_event_log_actor_id"`);
    await queryRunner.query(
      `CREATE TABLE "coding_standard" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "name" character varying NOT NULL, "description" text, CONSTRAINT "UQ_bcdab801995b712e14ce2314e3e" UNIQUE ("name"), CONSTRAINT "PK_eb7d6ffc655ee269f7614539bca" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."protocol_bundle_items_service_type_enum" AS ENUM('consultation', 'lab', 'pharmacy', 'procedure', 'admission', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "protocol_bundle_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "bundle_id" uuid NOT NULL, "service_type" "public"."protocol_bundle_items_service_type_enum" NOT NULL, "service_id" uuid NOT NULL, "is_compulsory" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_52711368ee9f1de5c6140ddc68c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "protocol_bundle" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "name" character varying NOT NULL, "medical_code_id" uuid NOT NULL, CONSTRAINT "PK_719b307e8f1feb71a2b0e99ceff" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "medical_code" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "standard_id" uuid NOT NULL, "code_value" character varying NOT NULL, "description" text NOT NULL, CONSTRAINT "PK_f3d1079589b23636516496a916c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "medical_service_category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "name" character varying NOT NULL, CONSTRAINT "UQ_ed69a1b441ccbbdaba14b4ade84" UNIQUE ("name"), CONSTRAINT "PK_976e5ffb5230371af298321b9a5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "state" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "name" character varying NOT NULL, "shortname" character varying, "min_latitude" numeric, "max_latitude" numeric, "min_longitude" numeric, "max_longitude" numeric, "latitude" numeric, "longitude" numeric, "capital" character varying NOT NULL, CONSTRAINT "PK_549ffd046ebab1336c3a8030a12" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lga" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "name" character varying NOT NULL, "shortname" character varying, "min_latitude" numeric, "max_latitude" numeric, "min_longitude" numeric, "max_longitude" numeric, "latitude" numeric, "longitude" numeric, "capital" character varying NOT NULL, "state_id" uuid NOT NULL, CONSTRAINT "PK_732755837379a4fff12c6b0f412" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."patient_payment_type_enum" AS ENUM('hmo', 'cash', 'corporate')`,
    );
    await queryRunner.query(
      `CREATE TABLE "patient" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "mrn" character varying NOT NULL, "email" character varying NOT NULL, "phone_number" character varying NOT NULL, "lastname" character varying NOT NULL, "middlename" character varying NOT NULL, "date_of_birth" TIMESTAMP WITH TIME ZONE NOT NULL, "gender" character varying NOT NULL, "blood_group" character varying NOT NULL, "marital_status" character varying NOT NULL, "address" character varying NOT NULL, "nationality" character varying NOT NULL, "payment_type" "public"."patient_payment_type_enum" NOT NULL, "next_of_kin" json NOT NULL, "is_active" boolean NOT NULL, "lga_id" uuid, CONSTRAINT "UQ_c8bc2b0a51476455c837a10ba78" UNIQUE ("mrn"), CONSTRAINT "UQ_2c56e61f9e1afb07f28882fcebb" UNIQUE ("email"), CONSTRAINT "UQ_695ad9605c02e61178645e10447" UNIQUE ("phone_number"), CONSTRAINT "PK_8dfa510bb29ad31ab2139fbfb99" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payment_type_enum" AS ENUM('payment', 'refund', 'waiver')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payment_payment_method_enum" AS ENUM('cash', 'card', 'transfer', 'hmo', 'corporate')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "shift_id" uuid, "bill_id" uuid NOT NULL, "receipt_number" character varying NOT NULL, "patient_id" uuid NOT NULL, "type" "public"."payment_type_enum" NOT NULL, "amount" numeric(10,2) NOT NULL, "payment_method" "public"."payment_payment_method_enum" NOT NULL, "staff_id" uuid NOT NULL, CONSTRAINT "UQ_e72b1ec9b5edfd8960456d25e5c" UNIQUE ("receipt_number"), CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shift_status_enum" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shift_station_enum" AS ENUM('reception', 'lab', 'pharmacy', 'nursing_station', 'imaging', 'triage')`,
    );
    await queryRunner.query(
      `CREATE TABLE "shift" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "staff_id" uuid NOT NULL, "status" "public"."shift_status_enum" NOT NULL, "station" "public"."shift_station_enum" NOT NULL, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ended_at" TIMESTAMP WITH TIME ZONE, "department_id" uuid NOT NULL, CONSTRAINT "PK_53071a6485a1e9dc75ec3db54b9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "patient_vital" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "episode_id" uuid NOT NULL, "celsius_temperature" numeric(5,2) NOT NULL, "systolic_blood_pressure" integer NOT NULL, "diastolic_blood_pressure" integer NOT NULL, "heart_rate" integer NOT NULL, "respiratory_rate" integer NOT NULL, "oxygen_saturation" numeric(5,2) NOT NULL, "kilogram_weight" numeric(5,2) NOT NULL, "centimetre_height" numeric(5,2) NOT NULL, CONSTRAINT "PK_731c671728d93d0056311ceb9ea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."appointment_appointment_type_enum" AS ENUM('consultation', 'follow_up', 'emergency', 'procedure', 'lab_only')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."appointment_status_enum" AS ENUM('scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show')`,
    );
    await queryRunner.query(
      `CREATE TABLE "appointment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "patient_id" uuid NOT NULL, "doctor_id" uuid NOT NULL, "appointment_type" "public"."appointment_appointment_type_enum" NOT NULL, "status" "public"."appointment_status_enum" NOT NULL, "reason_for_visit" text NOT NULL, "booked_by" uuid, "checked_in_by" uuid, "scheduled_duration" integer NOT NULL, "checked_in_at" TIMESTAMP WITH TIME ZONE, "started_at" TIMESTAMP WITH TIME ZONE, "started_by" uuid, "ended_at" TIMESTAMP WITH TIME ZONE, "ended_by" uuid, "schedule_date" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_e8be1a53027415e709ce8a2db74" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "consultation" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "encounter_id" uuid NOT NULL, "patient_id" uuid NOT NULL, "episode_id" uuid NOT NULL, "appointment_id" uuid, "chief_complaint" text NOT NULL, "present_illness_brief" text, "treatment_plan" text, "follow_up_date" TIMESTAMP WITH TIME ZONE, "is_draft" boolean NOT NULL DEFAULT false, "draft_metadata" jsonb, CONSTRAINT "REL_7f77b425068c46222645ded1b9" UNIQUE ("encounter_id"), CONSTRAINT "PK_5203569fac28a4a626c42abe70b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lab_order_result" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "lab_order_item_id" uuid NOT NULL, "value" character varying NOT NULL, "metadata" jsonb, "notes" text, CONSTRAINT "REL_6b4ce2025f2eddb3b52c0bd9bb" UNIQUE ("lab_order_item_id"), CONSTRAINT "PK_71ab9b3ea5d325b18742099720d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."lab_order_item_status_enum" AS ENUM('pending', 'collected', 'processing', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "lab_order_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "lab_order_id" uuid NOT NULL, "service_code_id" uuid NOT NULL, "status" "public"."lab_order_item_status_enum" NOT NULL DEFAULT 'pending', CONSTRAINT "PK_6c6ea1ee4c46a1fd6ae1219780d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."lab_order_type_enum" AS ENUM('internal', 'external')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."lab_order_status_enum" AS ENUM('pending', 'collected', 'processing', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."lab_order_priority_enum" AS ENUM('routine', 'urgent', 'stat')`,
    );
    await queryRunner.query(
      `CREATE TABLE "lab_order" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "patient_id" uuid NOT NULL, "doctor_id" uuid NOT NULL, "episode_id" uuid, "encounter_id" uuid, "type" "public"."lab_order_type_enum" NOT NULL, "status" "public"."lab_order_status_enum" NOT NULL DEFAULT 'pending', "priority" "public"."lab_order_priority_enum" NOT NULL DEFAULT 'routine', "collected_at" TIMESTAMP WITH TIME ZONE, "processed_by" uuid, "completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_151ead3c2ddca80deb3787946d0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."episode_log_event_type_enum" AS ENUM('episode_opened', 'episode_closed', 'episode_locked', 'vitals_recorded', 'consultation_started', 'consultation_completed', 'lab_ordered', 'lab_resulted', 'prescription_issued', 'prescription_dispensed', 'bill_created', 'payment_received', 'claim_submitted')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."episode_log_actor_type_enum" AS ENUM('staff', 'patient', 'system')`,
    );
    await queryRunner.query(
      `CREATE TABLE "episode_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "episode_id" uuid NOT NULL, "event_type" "public"."episode_log_event_type_enum" NOT NULL, "description" text NOT NULL, "actor_id" uuid, "actor_type" "public"."episode_log_actor_type_enum" NOT NULL, "metadata" jsonb, CONSTRAINT "PK_bcd006e866a97291b8e37d3c41d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "hmo_provider" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "name" character varying NOT NULL, "code" character varying NOT NULL, "contact_phone" character varying NOT NULL, "contact_email" character varying NOT NULL, "address" character varying NOT NULL, "default_copay" numeric(10,2) NOT NULL, "is_active" boolean NOT NULL, "portal_url" character varying NOT NULL, "claims_email" character varying NOT NULL, "retraction_email" character varying NOT NULL, CONSTRAINT "PK_d020c168ce7a438f7c9b38208e4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."claim_status_enum" AS ENUM('draft', 'submitted', 'processing', 'approved', 'denied', 'paid', 'withdrawn', 'retracted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "claim" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "episode_id" uuid NOT NULL, "hmo_provider_id" uuid NOT NULL, "status" "public"."claim_status_enum" NOT NULL DEFAULT 'draft', "total_billed_amount" numeric(10,2) NOT NULL, "primary_diagnosis_code" character varying NOT NULL, "attachments" jsonb, CONSTRAINT "PK_466b305cc2e591047fa1ce58f81" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."episode_status_enum" AS ENUM('open', 'closed', 'locked', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TABLE "episode" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "patient_id" uuid NOT NULL, "episode_number" character varying NOT NULL, "status" "public"."episode_status_enum" NOT NULL, "total_billed" numeric(10,2) NOT NULL DEFAULT '0', "total_paid" numeric(10,2) NOT NULL DEFAULT '0', "total_balance" numeric(10,2) NOT NULL DEFAULT '0', "is_locked_for_audit" boolean NOT NULL DEFAULT false, "notes" text, CONSTRAINT "UQ_db5a3efc1e8f934022f3587d57a" UNIQUE ("episode_number"), CONSTRAINT "PK_7258b95d6d2bf7f621845a0e143" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."encounter_type_enum" AS ENUM('triage', 'consultation', 'lab', 'imaging', 'pharmacy', 'discharge')`,
    );
    await queryRunner.query(
      `CREATE TABLE "encounter" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "episode_id" uuid NOT NULL, "type" "public"."encounter_type_enum" NOT NULL, "staff_id" uuid NOT NULL, "data" jsonb, CONSTRAINT "PK_1cf9e15e693ff9f0ef9b9061372" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE TYPE "public"."bill_type_enum" AS ENUM('walk_in', 'episode')`);
    await queryRunner.query(
      `CREATE TYPE "public"."bill_status_enum" AS ENUM('pending', 'partial', 'paid', 'waived', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "bill" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "bill_number" character varying NOT NULL, "code" character varying, "patient_id" uuid NOT NULL, "shift_id" uuid, "encounter_id" uuid, "type" "public"."bill_type_enum" NOT NULL, "status" "public"."bill_status_enum" NOT NULL DEFAULT 'pending', "episode_id" uuid, "claim_id" uuid, "department_id" uuid NOT NULL, "created_by" uuid NOT NULL, CONSTRAINT "UQ_e897f48daabe3b9132f93432327" UNIQUE ("bill_number"), CONSTRAINT "PK_683b47912b8b30fe71d1fa22199" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "bill_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "bill_id" uuid NOT NULL, "service_id" uuid NOT NULL, "description" character varying NOT NULL, "unit_price" numeric(10,2) NOT NULL, "quantity" integer NOT NULL, "tax_amount" numeric(10,2) NOT NULL DEFAULT '0', "discount" numeric(10,2) NOT NULL DEFAULT '0', "total_amount" numeric(10,2) NOT NULL, CONSTRAINT "PK_34a040e2ceb4a3e52250fc4244c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."hmo_contract_coverage_type_enum" AS ENUM('full', 'partial_percent', 'partial_flat', 'none')`,
    );
    await queryRunner.query(
      `CREATE TABLE "hmo_contract" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "coverage_type" "public"."hmo_contract_coverage_type_enum" NOT NULL, "hmo_provider_id" uuid NOT NULL, "service_id" uuid NOT NULL, "contracted_price" numeric(10,2), "copay_percentage" numeric(5,2), "is_fully_covered" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "required_pre_authorization" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_a2f385f826c5ae99e667a4004ba" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."price_change_status_enum" AS ENUM('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "price_change" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "service_id" uuid NOT NULL, "description" text NOT NULL, "standard_price" numeric(10,2) NOT NULL, "requested_by" uuid NOT NULL, "approved_by" uuid, "status" "public"."price_change_status_enum" NOT NULL DEFAULT 'pending', "is_active" boolean NOT NULL DEFAULT false, "reason" text NOT NULL, CONSTRAINT "PK_bd582fe9e20930d358a85b18d49" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "hmo_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "hmo_provider_id" uuid NOT NULL, "trigger_service_id" uuid NOT NULL, "logic" jsonb NOT NULL, "error_message" character varying NOT NULL, CONSTRAINT "PK_b0496af214273bee02b55bc4cf7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "medical_service" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "name" character varying NOT NULL, "medical_service_category_id" uuid NOT NULL, "default_price" numeric(10,2) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_66933e54c5740c22e8508fce480" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "service_code_catalog" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "medical_code_id" uuid NOT NULL, "service_id" uuid NOT NULL, "hmo_provider_id" uuid, CONSTRAINT "PK_8dec94b4eea3a7f66b8140fb59c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reference_range_gender_enum" AS ENUM('male', 'female', 'both')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reference_range" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "test_id" uuid NOT NULL, "gender" "public"."reference_range_gender_enum" NOT NULL, "min_age_years" integer, "max_age_years" integer, "lower_bound" numeric(10,4) NOT NULL, "upper_bound" numeric(10,4) NOT NULL, "critical_lower_bound" numeric(10,4), "critical_upper_bound" numeric(10,4), CONSTRAINT "PK_127ded273204e03d674a1776474" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "test_catalog" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "service_code_id" uuid NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "sample_type" character varying NOT NULL, "methodology" character varying, "preparation_instructions" text, "default_unit" character varying NOT NULL, CONSTRAINT "UQ_a3413346d462792adf0031dc819" UNIQUE ("code"), CONSTRAINT "REL_8ab06e0a6ebc798e84e5dd6b41" UNIQUE ("service_code_id"), CONSTRAINT "PK_439197ea3967f7b1420409486ee" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "name" character varying NOT NULL, CONSTRAINT "UQ_361ee1de7f7ae20fae28020ae47" UNIQUE ("name"), CONSTRAINT "PK_697de7a94023ebb8a8e62c14f0a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."prescription_status_enum" AS ENUM('pending', 'partial', 'fully_dispensed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "prescription" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "patient_id" uuid NOT NULL, "doctor_id" uuid NOT NULL, "status" "public"."prescription_status_enum" NOT NULL DEFAULT 'pending', "dispensed_at" TIMESTAMP WITH TIME ZONE, "dispensed_by" uuid, "notes" text, "audit_log" jsonb, CONSTRAINT "PK_eaba5e4414e5382781e08467b51" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "prescription_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "prescription_id" uuid NOT NULL, "drug_id" uuid NOT NULL, "dosage_value" numeric(8,2) NOT NULL, "dosage_unit" character varying NOT NULL, "frequency_value" numeric(5,2) NOT NULL, "frequency_unit" character varying NOT NULL, "duration_value" integer NOT NULL, "duration_unit" character varying NOT NULL, "prescribed_quantity" integer NOT NULL, "dispensed_quantity" integer NOT NULL DEFAULT '0', "substituted_metadata" jsonb, "substituted_drug_id" uuid, CONSTRAINT "PK_c6da8fb39ffdf05567203293520" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."restock_request_status_enum" AS ENUM('pending', 'approved', 'rejected', 'fulfilled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "restock_request" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "reason" text NOT NULL, "requested_by" uuid NOT NULL, "status" "public"."restock_request_status_enum" NOT NULL DEFAULT 'pending', "notes" text, CONSTRAINT "PK_d6875890fd7e2792009a66c6360" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "restock_request_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "restock_request_id" uuid NOT NULL, "inventory_id" uuid NOT NULL, "requested_quantity" integer NOT NULL, "approved_quantity" integer, CONSTRAINT "PK_d06f3f10957f7597a455dc98517" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "category_id" uuid NOT NULL, "supplier_id" uuid, "name" character varying NOT NULL, "unit" character varying NOT NULL, "current_stock" integer NOT NULL DEFAULT '0', "reorder_level" integer NOT NULL DEFAULT '0', "unit_cost" numeric(10,2) NOT NULL, "expiry_date" TIMESTAMP WITH TIME ZONE, "location" character varying, CONSTRAINT "PK_82aa5da437c5bbfb80703b08309" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "supplier" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "name" character varying NOT NULL, "contact_phone" character varying, "contact_email" character varying, "address" character varying, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_2bc0d2cab6276144d2ff98a2828" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shift_schedule_time_of_day_enum" AS ENUM('morning', 'afternoon', 'night')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shift_schedule_day_enum" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')`,
    );
    await queryRunner.query(
      `CREATE TABLE "shift_schedule" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "time_of_day" "public"."shift_schedule_time_of_day_enum" NOT NULL, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "day" "public"."shift_schedule_day_enum" NOT NULL, CONSTRAINT "PK_2f6fdb84d4580107ffeec6f34d6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "staff_shift_schedule" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "shift_schedule_id" uuid NOT NULL, "staff_id" uuid NOT NULL, CONSTRAINT "PK_4d88d1628f4ee6c5415d0ba8743" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "patient_hmo" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "patient_id" uuid NOT NULL, "hmo_provider_id" uuid NOT NULL, "provider_name" character varying NOT NULL, "enrollment_id" character varying NOT NULL, "plan_type" character varying NOT NULL, "expiry_date" TIMESTAMP WITH TIME ZONE NOT NULL, "copay_amount" numeric(10,2) NOT NULL, "is_active" boolean NOT NULL, CONSTRAINT "PK_e5abd804773d73bd6b8b49705d3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "lab_referral_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "lab_referral_id" uuid NOT NULL, "test_name" character varying NOT NULL, "result" character varying, "unit" character varying, "is_abnormal" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_3c6d9dcc1bbf40e0d8acb29765b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."lab_referral_direction_enum" AS ENUM('inbound', 'outbound', 'internal_transfer')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."lab_referral_status_enum" AS ENUM('pending', 'sent', 'received', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."lab_referral_priority_enum" AS ENUM('routine', 'urgent', 'stat')`,
    );
    await queryRunner.query(
      `CREATE TABLE "lab_referral" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "direction" "public"."lab_referral_direction_enum" NOT NULL, "patient_id" uuid NOT NULL, "patient_phone_number" character varying, "partner_lab_id" uuid, "status" "public"."lab_referral_status_enum" NOT NULL DEFAULT 'pending', "reference_number" character varying NOT NULL, "tracking_id" character varying, "referred_by" uuid NOT NULL, "notes" text, "priority" "public"."lab_referral_priority_enum" NOT NULL DEFAULT 'routine', "attachments" jsonb, CONSTRAINT "UQ_248319954f23212193575770bf4" UNIQUE ("reference_number"), CONSTRAINT "PK_9d54059f1d12cbb4eecfecca46e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."partner_lab_status_enum" AS ENUM('active', 'inactive')`,
    );
    await queryRunner.query(
      `CREATE TABLE "partner_lab" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "version" integer NOT NULL DEFAULT '0', "name" character varying NOT NULL, "code" character varying NOT NULL, "address" character varying, "status" "public"."partner_lab_status_enum" NOT NULL DEFAULT 'active', "contact_phone" character varying NOT NULL, "specializations" jsonb NOT NULL, "contact_email" character varying, CONSTRAINT "UQ_87b42dbc7e5b71e5c08f3251be8" UNIQUE ("code"), CONSTRAINT "PK_b16a8acad6626473547d26f7d92" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "department" DROP CONSTRAINT "UQ_department_alias"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_22275d1f7e19d9efc2182db4e6" ON "personal_access_token" ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2d997e1b5b4d96a00c052f2f6d" ON "personal_access_token" ("staff_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2ad099887e65b7dc2c7c76948e" ON "event_log" ("actor_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "protocol_bundle_items" ADD CONSTRAINT "FK_ef6b50de18309be6b308ddf9f14" FOREIGN KEY ("bundle_id") REFERENCES "protocol_bundle"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "protocol_bundle" ADD CONSTRAINT "FK_81603c713e5be8ab49b14106b59" FOREIGN KEY ("medical_code_id") REFERENCES "medical_code"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_code" ADD CONSTRAINT "FK_e3aa5d589cd15f97d2b17fe58a5" FOREIGN KEY ("standard_id") REFERENCES "coding_standard"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lga" ADD CONSTRAINT "FK_b91c4c5215f0e4e21c641d7c2d4" FOREIGN KEY ("state_id") REFERENCES "state"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient" ADD CONSTRAINT "FK_8e14b6f92cc6b4ba30099605734" FOREIGN KEY ("lga_id") REFERENCES "lga"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "personal_access_token" ADD CONSTRAINT "FK_2d997e1b5b4d96a00c052f2f6d1" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_465052ea9590c3deab94610d63f" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_bd6e1adc29607b591acd798995c" FOREIGN KEY ("bill_id") REFERENCES "bill"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_a4b5ef3a2debad4cf4a21764fe2" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_3a8586e01dd9993b7df293eb586" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift" ADD CONSTRAINT "FK_d030acf2e7099f931d515237ecb" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shift" ADD CONSTRAINT "FK_a587227dfd7f665985e63cb97f2" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_vital" ADD CONSTRAINT "FK_89c4129f2c48e8494e825bd7389" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment" ADD CONSTRAINT "FK_86b3e35a97e289071b4785a1402" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment" ADD CONSTRAINT "FK_9a9c484aa4a944eaec632e00a81" FOREIGN KEY ("doctor_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment" ADD CONSTRAINT "FK_1f816c0857e60746b8a7d5bf224" FOREIGN KEY ("booked_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment" ADD CONSTRAINT "FK_b9fd267c201b953fc8f1282b61a" FOREIGN KEY ("checked_in_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment" ADD CONSTRAINT "FK_5c2bf5e337ff42fdc005bf635dc" FOREIGN KEY ("started_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment" ADD CONSTRAINT "FK_6ba1b3286279cd0700f07138bbf" FOREIGN KEY ("ended_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation" ADD CONSTRAINT "FK_7f77b425068c46222645ded1b91" FOREIGN KEY ("encounter_id") REFERENCES "encounter"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation" ADD CONSTRAINT "FK_b8e02af7396968f02a9266cc7d5" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation" ADD CONSTRAINT "FK_1bf68d4fcbc5a3a7e1a4d6c443e" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation" ADD CONSTRAINT "FK_0aa1d27dba50dc2b9781bf2252e" FOREIGN KEY ("appointment_id") REFERENCES "appointment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order_result" ADD CONSTRAINT "FK_6b4ce2025f2eddb3b52c0bd9bb0" FOREIGN KEY ("lab_order_item_id") REFERENCES "lab_order_item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order_item" ADD CONSTRAINT "FK_20e5f2a937aefb61d319b32b8df" FOREIGN KEY ("lab_order_id") REFERENCES "lab_order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order_item" ADD CONSTRAINT "FK_0032860b14bb13a5e41e6d719cc" FOREIGN KEY ("service_code_id") REFERENCES "service_code_catalog"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order" ADD CONSTRAINT "FK_ae79597e5e8038d403463944897" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order" ADD CONSTRAINT "FK_36b70d1084e4a9987bbea113951" FOREIGN KEY ("doctor_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order" ADD CONSTRAINT "FK_bace6ad4813086e916461f86045" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order" ADD CONSTRAINT "FK_7f7472c27c55a64aaabe7c684e0" FOREIGN KEY ("encounter_id") REFERENCES "encounter"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order" ADD CONSTRAINT "FK_c5f154dd1e08c1fa26727a08ccf" FOREIGN KEY ("processed_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "episode_log" ADD CONSTRAINT "FK_b5af1942778e2ef872390add7fd" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "claim" ADD CONSTRAINT "FK_23bdc41cbf0af4b188292859eeb" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "claim" ADD CONSTRAINT "FK_a67da853eec92289083d5d45217" FOREIGN KEY ("hmo_provider_id") REFERENCES "hmo_provider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "episode" ADD CONSTRAINT "FK_ad05a407d495d902d934e86dd60" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "encounter" ADD CONSTRAINT "FK_6c89d351c4f6ddc06ecc2fe617b" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "encounter" ADD CONSTRAINT "FK_92a94baf387f21785beac3d286e" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill" ADD CONSTRAINT "FK_d9962ee37addc6155076867529b" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill" ADD CONSTRAINT "FK_1806cfe5f025bad29b7ce7109ee" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill" ADD CONSTRAINT "FK_43b92294693354ef3a98c65a167" FOREIGN KEY ("encounter_id") REFERENCES "encounter"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill" ADD CONSTRAINT "FK_e680a66866114279eac6e1525b0" FOREIGN KEY ("episode_id") REFERENCES "episode"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill" ADD CONSTRAINT "FK_9ee883e134ce2b610c092a33ec3" FOREIGN KEY ("claim_id") REFERENCES "claim"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill" ADD CONSTRAINT "FK_997c3eba63b263a6564996ecff3" FOREIGN KEY ("department_id") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill" ADD CONSTRAINT "FK_7ce99824f0d22ca88b96ab2f7d5" FOREIGN KEY ("created_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill_item" ADD CONSTRAINT "FK_fe0fba0a43c5182491a8e6cb103" FOREIGN KEY ("bill_id") REFERENCES "bill"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill_item" ADD CONSTRAINT "FK_d5f24d74362813ce74face2baaf" FOREIGN KEY ("service_id") REFERENCES "medical_service"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hmo_contract" ADD CONSTRAINT "FK_60e673d86a9ebe478465ff86c1a" FOREIGN KEY ("hmo_provider_id") REFERENCES "hmo_provider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hmo_contract" ADD CONSTRAINT "FK_6a35a82942a1772ffc6bc7a6a76" FOREIGN KEY ("service_id") REFERENCES "medical_service"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_change" ADD CONSTRAINT "FK_4ab4a88f4808e49658f0546bb8b" FOREIGN KEY ("service_id") REFERENCES "medical_service"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_change" ADD CONSTRAINT "FK_68425b834b5a8a2137b18ccf163" FOREIGN KEY ("requested_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_change" ADD CONSTRAINT "FK_280b36c69163b117e0adce6e096" FOREIGN KEY ("approved_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hmo_rules" ADD CONSTRAINT "FK_701935ee70605e79a484bf7ca14" FOREIGN KEY ("hmo_provider_id") REFERENCES "hmo_provider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hmo_rules" ADD CONSTRAINT "FK_d37785d47c9ca9e8e752c372eeb" FOREIGN KEY ("trigger_service_id") REFERENCES "medical_service"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_service" ADD CONSTRAINT "FK_61cb824e4bfa4ab2c9f1a55b78e" FOREIGN KEY ("medical_service_category_id") REFERENCES "medical_service_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_code_catalog" ADD CONSTRAINT "FK_6f5c89d7839d0f22a3c35809fbd" FOREIGN KEY ("medical_code_id") REFERENCES "medical_code"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_code_catalog" ADD CONSTRAINT "FK_cd98550241f3b4420bb99584ed4" FOREIGN KEY ("service_id") REFERENCES "medical_service"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_code_catalog" ADD CONSTRAINT "FK_265ac18c1ed09695c6a5fd0e6b4" FOREIGN KEY ("hmo_provider_id") REFERENCES "hmo_provider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reference_range" ADD CONSTRAINT "FK_779fbd7e472b0fe30008b1c1df6" FOREIGN KEY ("test_id") REFERENCES "test_catalog"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_catalog" ADD CONSTRAINT "FK_8ab06e0a6ebc798e84e5dd6b417" FOREIGN KEY ("service_code_id") REFERENCES "service_code_catalog"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription" ADD CONSTRAINT "FK_b5b0de11e942201024ee9f32be7" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription" ADD CONSTRAINT "FK_e2f19093b7d00398cc14db8b076" FOREIGN KEY ("doctor_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription" ADD CONSTRAINT "FK_bc192c636c1660b84e8d126ee8c" FOREIGN KEY ("dispensed_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription_item" ADD CONSTRAINT "FK_dc8e212287b4eca96f5453e3045" FOREIGN KEY ("prescription_id") REFERENCES "prescription"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription_item" ADD CONSTRAINT "FK_b9be07e46bd475e60ff958a01fc" FOREIGN KEY ("drug_id") REFERENCES "inventory"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription_item" ADD CONSTRAINT "FK_e60c9d335b822c150066b0d26fe" FOREIGN KEY ("substituted_drug_id") REFERENCES "inventory"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "restock_request" ADD CONSTRAINT "FK_bdc79fa22ae81db9d60d97e0cd0" FOREIGN KEY ("requested_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "restock_request_item" ADD CONSTRAINT "FK_f57c579468c74127aa1500781d8" FOREIGN KEY ("restock_request_id") REFERENCES "restock_request"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "restock_request_item" ADD CONSTRAINT "FK_fe99b063206577613a79177b0c2" FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory" ADD CONSTRAINT "FK_697de7a94023ebb8a8e62c14f0a" FOREIGN KEY ("category_id") REFERENCES "inventory_category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory" ADD CONSTRAINT "FK_fca3dd9ef220d3b42e2884116ea" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff_shift_schedule" ADD CONSTRAINT "FK_d7c3bc9721de5356ddb80c35075" FOREIGN KEY ("shift_schedule_id") REFERENCES "shift_schedule"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff_shift_schedule" ADD CONSTRAINT "FK_e6934b078f92cefb49bcbd30bf1" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_hmo" ADD CONSTRAINT "FK_963b484b92bdfd38a3d8f7499c6" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_hmo" ADD CONSTRAINT "FK_c903cdae9c519082bcbf3a4f5d7" FOREIGN KEY ("hmo_provider_id") REFERENCES "hmo_provider"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_referral_item" ADD CONSTRAINT "FK_f89df3d3863450ed4a955fd8335" FOREIGN KEY ("lab_referral_id") REFERENCES "lab_referral"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_referral" ADD CONSTRAINT "FK_28a64a2efc2cc9bf7075194372e" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_referral" ADD CONSTRAINT "FK_69a70f83736e4cbad041f20f0f8" FOREIGN KEY ("partner_lab_id") REFERENCES "partner_lab"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_referral" ADD CONSTRAINT "FK_364a51ecaf9d6fc61c4c8897a5f" FOREIGN KEY ("referred_by") REFERENCES "staff"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lab_referral" DROP CONSTRAINT "FK_364a51ecaf9d6fc61c4c8897a5f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_referral" DROP CONSTRAINT "FK_69a70f83736e4cbad041f20f0f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_referral" DROP CONSTRAINT "FK_28a64a2efc2cc9bf7075194372e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_referral_item" DROP CONSTRAINT "FK_f89df3d3863450ed4a955fd8335"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_hmo" DROP CONSTRAINT "FK_c903cdae9c519082bcbf3a4f5d7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_hmo" DROP CONSTRAINT "FK_963b484b92bdfd38a3d8f7499c6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff_shift_schedule" DROP CONSTRAINT "FK_e6934b078f92cefb49bcbd30bf1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff_shift_schedule" DROP CONSTRAINT "FK_d7c3bc9721de5356ddb80c35075"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory" DROP CONSTRAINT "FK_fca3dd9ef220d3b42e2884116ea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory" DROP CONSTRAINT "FK_697de7a94023ebb8a8e62c14f0a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restock_request_item" DROP CONSTRAINT "FK_fe99b063206577613a79177b0c2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restock_request_item" DROP CONSTRAINT "FK_f57c579468c74127aa1500781d8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restock_request" DROP CONSTRAINT "FK_bdc79fa22ae81db9d60d97e0cd0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription_item" DROP CONSTRAINT "FK_e60c9d335b822c150066b0d26fe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription_item" DROP CONSTRAINT "FK_b9be07e46bd475e60ff958a01fc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription_item" DROP CONSTRAINT "FK_dc8e212287b4eca96f5453e3045"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription" DROP CONSTRAINT "FK_bc192c636c1660b84e8d126ee8c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription" DROP CONSTRAINT "FK_e2f19093b7d00398cc14db8b076"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescription" DROP CONSTRAINT "FK_b5b0de11e942201024ee9f32be7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_catalog" DROP CONSTRAINT "FK_8ab06e0a6ebc798e84e5dd6b417"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reference_range" DROP CONSTRAINT "FK_779fbd7e472b0fe30008b1c1df6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_code_catalog" DROP CONSTRAINT "FK_265ac18c1ed09695c6a5fd0e6b4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_code_catalog" DROP CONSTRAINT "FK_cd98550241f3b4420bb99584ed4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_code_catalog" DROP CONSTRAINT "FK_6f5c89d7839d0f22a3c35809fbd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_service" DROP CONSTRAINT "FK_61cb824e4bfa4ab2c9f1a55b78e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hmo_rules" DROP CONSTRAINT "FK_d37785d47c9ca9e8e752c372eeb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hmo_rules" DROP CONSTRAINT "FK_701935ee70605e79a484bf7ca14"`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_change" DROP CONSTRAINT "FK_280b36c69163b117e0adce6e096"`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_change" DROP CONSTRAINT "FK_68425b834b5a8a2137b18ccf163"`,
    );
    await queryRunner.query(
      `ALTER TABLE "price_change" DROP CONSTRAINT "FK_4ab4a88f4808e49658f0546bb8b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hmo_contract" DROP CONSTRAINT "FK_6a35a82942a1772ffc6bc7a6a76"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hmo_contract" DROP CONSTRAINT "FK_60e673d86a9ebe478465ff86c1a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill_item" DROP CONSTRAINT "FK_d5f24d74362813ce74face2baaf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bill_item" DROP CONSTRAINT "FK_fe0fba0a43c5182491a8e6cb103"`,
    );
    await queryRunner.query(`ALTER TABLE "bill" DROP CONSTRAINT "FK_7ce99824f0d22ca88b96ab2f7d5"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP CONSTRAINT "FK_997c3eba63b263a6564996ecff3"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP CONSTRAINT "FK_9ee883e134ce2b610c092a33ec3"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP CONSTRAINT "FK_e680a66866114279eac6e1525b0"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP CONSTRAINT "FK_43b92294693354ef3a98c65a167"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP CONSTRAINT "FK_1806cfe5f025bad29b7ce7109ee"`);
    await queryRunner.query(`ALTER TABLE "bill" DROP CONSTRAINT "FK_d9962ee37addc6155076867529b"`);
    await queryRunner.query(
      `ALTER TABLE "encounter" DROP CONSTRAINT "FK_92a94baf387f21785beac3d286e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "encounter" DROP CONSTRAINT "FK_6c89d351c4f6ddc06ecc2fe617b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "episode" DROP CONSTRAINT "FK_ad05a407d495d902d934e86dd60"`,
    );
    await queryRunner.query(`ALTER TABLE "claim" DROP CONSTRAINT "FK_a67da853eec92289083d5d45217"`);
    await queryRunner.query(`ALTER TABLE "claim" DROP CONSTRAINT "FK_23bdc41cbf0af4b188292859eeb"`);
    await queryRunner.query(
      `ALTER TABLE "episode_log" DROP CONSTRAINT "FK_b5af1942778e2ef872390add7fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order" DROP CONSTRAINT "FK_c5f154dd1e08c1fa26727a08ccf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order" DROP CONSTRAINT "FK_7f7472c27c55a64aaabe7c684e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order" DROP CONSTRAINT "FK_bace6ad4813086e916461f86045"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order" DROP CONSTRAINT "FK_36b70d1084e4a9987bbea113951"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order" DROP CONSTRAINT "FK_ae79597e5e8038d403463944897"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order_item" DROP CONSTRAINT "FK_0032860b14bb13a5e41e6d719cc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order_item" DROP CONSTRAINT "FK_20e5f2a937aefb61d319b32b8df"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lab_order_result" DROP CONSTRAINT "FK_6b4ce2025f2eddb3b52c0bd9bb0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation" DROP CONSTRAINT "FK_0aa1d27dba50dc2b9781bf2252e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation" DROP CONSTRAINT "FK_1bf68d4fcbc5a3a7e1a4d6c443e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation" DROP CONSTRAINT "FK_b8e02af7396968f02a9266cc7d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "consultation" DROP CONSTRAINT "FK_7f77b425068c46222645ded1b91"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment" DROP CONSTRAINT "FK_6ba1b3286279cd0700f07138bbf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment" DROP CONSTRAINT "FK_5c2bf5e337ff42fdc005bf635dc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment" DROP CONSTRAINT "FK_b9fd267c201b953fc8f1282b61a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment" DROP CONSTRAINT "FK_1f816c0857e60746b8a7d5bf224"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment" DROP CONSTRAINT "FK_9a9c484aa4a944eaec632e00a81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointment" DROP CONSTRAINT "FK_86b3e35a97e289071b4785a1402"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_vital" DROP CONSTRAINT "FK_89c4129f2c48e8494e825bd7389"`,
    );
    await queryRunner.query(`ALTER TABLE "shift" DROP CONSTRAINT "FK_a587227dfd7f665985e63cb97f2"`);
    await queryRunner.query(`ALTER TABLE "shift" DROP CONSTRAINT "FK_d030acf2e7099f931d515237ecb"`);
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_3a8586e01dd9993b7df293eb586"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_a4b5ef3a2debad4cf4a21764fe2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_bd6e1adc29607b591acd798995c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_465052ea9590c3deab94610d63f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "personal_access_token" DROP CONSTRAINT "FK_2d997e1b5b4d96a00c052f2f6d1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient" DROP CONSTRAINT "FK_8e14b6f92cc6b4ba30099605734"`,
    );
    await queryRunner.query(`ALTER TABLE "lga" DROP CONSTRAINT "FK_b91c4c5215f0e4e21c641d7c2d4"`);
    await queryRunner.query(
      `ALTER TABLE "medical_code" DROP CONSTRAINT "FK_e3aa5d589cd15f97d2b17fe58a5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "protocol_bundle" DROP CONSTRAINT "FK_81603c713e5be8ab49b14106b59"`,
    );
    await queryRunner.query(
      `ALTER TABLE "protocol_bundle_items" DROP CONSTRAINT "FK_ef6b50de18309be6b308ddf9f14"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_2ad099887e65b7dc2c7c76948e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2d997e1b5b4d96a00c052f2f6d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_22275d1f7e19d9efc2182db4e6"`);
    await queryRunner.query(
      `ALTER TABLE "department" ADD CONSTRAINT "UQ_department_alias" UNIQUE ("alias")`,
    );
    await queryRunner.query(`DROP TABLE "partner_lab"`);
    await queryRunner.query(`DROP TYPE "public"."partner_lab_status_enum"`);
    await queryRunner.query(`DROP TABLE "lab_referral"`);
    await queryRunner.query(`DROP TYPE "public"."lab_referral_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."lab_referral_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."lab_referral_direction_enum"`);
    await queryRunner.query(`DROP TABLE "lab_referral_item"`);
    await queryRunner.query(`DROP TABLE "patient_hmo"`);
    await queryRunner.query(`DROP TABLE "staff_shift_schedule"`);
    await queryRunner.query(`DROP TABLE "shift_schedule"`);
    await queryRunner.query(`DROP TYPE "public"."shift_schedule_day_enum"`);
    await queryRunner.query(`DROP TYPE "public"."shift_schedule_time_of_day_enum"`);
    await queryRunner.query(`DROP TABLE "supplier"`);
    await queryRunner.query(`DROP TABLE "inventory"`);
    await queryRunner.query(`DROP TABLE "restock_request_item"`);
    await queryRunner.query(`DROP TABLE "restock_request"`);
    await queryRunner.query(`DROP TYPE "public"."restock_request_status_enum"`);
    await queryRunner.query(`DROP TABLE "prescription_item"`);
    await queryRunner.query(`DROP TABLE "prescription"`);
    await queryRunner.query(`DROP TYPE "public"."prescription_status_enum"`);
    await queryRunner.query(`DROP TABLE "inventory_category"`);
    await queryRunner.query(`DROP TABLE "test_catalog"`);
    await queryRunner.query(`DROP TABLE "reference_range"`);
    await queryRunner.query(`DROP TYPE "public"."reference_range_gender_enum"`);
    await queryRunner.query(`DROP TABLE "service_code_catalog"`);
    await queryRunner.query(`DROP TABLE "medical_service"`);
    await queryRunner.query(`DROP TABLE "hmo_rules"`);
    await queryRunner.query(`DROP TABLE "price_change"`);
    await queryRunner.query(`DROP TYPE "public"."price_change_status_enum"`);
    await queryRunner.query(`DROP TABLE "hmo_contract"`);
    await queryRunner.query(`DROP TYPE "public"."hmo_contract_coverage_type_enum"`);
    await queryRunner.query(`DROP TABLE "bill_item"`);
    await queryRunner.query(`DROP TABLE "bill"`);
    await queryRunner.query(`DROP TYPE "public"."bill_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."bill_type_enum"`);
    await queryRunner.query(`DROP TABLE "encounter"`);
    await queryRunner.query(`DROP TYPE "public"."encounter_type_enum"`);
    await queryRunner.query(`DROP TABLE "episode"`);
    await queryRunner.query(`DROP TYPE "public"."episode_status_enum"`);
    await queryRunner.query(`DROP TABLE "claim"`);
    await queryRunner.query(`DROP TYPE "public"."claim_status_enum"`);
    await queryRunner.query(`DROP TABLE "hmo_provider"`);
    await queryRunner.query(`DROP TABLE "episode_log"`);
    await queryRunner.query(`DROP TYPE "public"."episode_log_actor_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."episode_log_event_type_enum"`);
    await queryRunner.query(`DROP TABLE "lab_order"`);
    await queryRunner.query(`DROP TYPE "public"."lab_order_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."lab_order_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."lab_order_type_enum"`);
    await queryRunner.query(`DROP TABLE "lab_order_item"`);
    await queryRunner.query(`DROP TYPE "public"."lab_order_item_status_enum"`);
    await queryRunner.query(`DROP TABLE "lab_order_result"`);
    await queryRunner.query(`DROP TABLE "consultation"`);
    await queryRunner.query(`DROP TABLE "appointment"`);
    await queryRunner.query(`DROP TYPE "public"."appointment_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."appointment_appointment_type_enum"`);
    await queryRunner.query(`DROP TABLE "patient_vital"`);
    await queryRunner.query(`DROP TABLE "shift"`);
    await queryRunner.query(`DROP TYPE "public"."shift_station_enum"`);
    await queryRunner.query(`DROP TYPE "public"."shift_status_enum"`);
    await queryRunner.query(`DROP TABLE "payment"`);
    await queryRunner.query(`DROP TYPE "public"."payment_payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payment_type_enum"`);
    await queryRunner.query(`DROP TABLE "patient"`);
    await queryRunner.query(`DROP TYPE "public"."patient_payment_type_enum"`);
    await queryRunner.query(`DROP TABLE "lga"`);
    await queryRunner.query(`DROP TABLE "state"`);
    await queryRunner.query(`DROP TABLE "medical_service_category"`);
    await queryRunner.query(`DROP TABLE "medical_code"`);
    await queryRunner.query(`DROP TABLE "protocol_bundle"`);
    await queryRunner.query(`DROP TABLE "protocol_bundle_items"`);
    await queryRunner.query(`DROP TYPE "public"."protocol_bundle_items_service_type_enum"`);
    await queryRunner.query(`DROP TABLE "coding_standard"`);
    await queryRunner.query(`CREATE INDEX "IDX_event_log_actor_id" ON "event_log" ("actor_id") `);
    await queryRunner.query(`CREATE INDEX "idx_staff_email_trgm" ON "staff" ("email") `);
    await queryRunner.query(`CREATE INDEX "idx_staff_last_name_trgm" ON "staff" ("last_name") `);
    await queryRunner.query(`CREATE INDEX "idx_staff_first_name_trgm" ON "staff" ("first_name") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_pat_staff_id" ON "personal_access_token" ("staff_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_pat_token_hash" ON "personal_access_token" ("token_hash") `,
    );
    await queryRunner.query(
      `ALTER TABLE "personal_access_token" ADD CONSTRAINT "FK_pat_staff" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
