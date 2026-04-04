# ClinicFlow Backend — Remaining Features Implementation Plan

## Context

Tier 1 (Configuration Layer) is complete: auth, roles, staff, departments, HMO providers/contracts/rules, lab catalog, protocols, coding standards, inventory, partner labs, shift schedules, medical services, service code catalog, suppliers.

This plan covers everything from Tier 1 completion (missing gaps) through Tier 8, organized into small, independently shippable phases. Each phase can be reviewed and merged before the next begins.

All audit logging uses the existing `EventLog` entity + `EventLogService`. All pagination uses the existing `QueryEngineService` / `findAndPaginate`. All modules follow the established NestJS pattern: controller → usecase → service → repository.

---

## Architectural Decisions

| Decision | Choice | Reason |
|---|---|---|
| Reference Data (ICD-10) | Delegate to existing MedicalCode queries | Already built in Tier 1; no new DB table needed |
| Reference Data (banks/names) | Static JSON files bundled in project | No external API dependency; rarely changes |
| Roster | Extend `shiftSchedule` module with new `Roster` entity | ShiftSchedule = templates; Roster = published weekly assignment |
| Formatted IDs (MRN, EP, etc.) | PostgreSQL sequences per entity type | Safe under concurrent inserts; atomic; no Redis dependency |
| File Storage | Adapter pattern (factory-based token) mirroring email adapter | Swap S3/Supabase/R2 via env var; no code changes |
| Notifications (real-time) | NestJS `@Sse()` for Server-Sent Events | No new packages; works for server-to-client push |

---

## Phase 0 — Tier 1 Completion

### 0a. Auth: Password Change Endpoint

**New files:**
- `src/modules/auth/usecases/changePassword.uc.ts`
- `src/modules/auth/dto/changePassword.dto.ts` — `{ currentPassword: string, newPassword: string }`

**Modified files:**
- `src/modules/auth/controller/staffAuth.controller.ts` — add `PATCH /staff/auth/password/change` (requires `@JwtAuthGuard`)
- `src/modules/auth/services/auth.service.ts` — add `changePassword(staffId, dto)`: verify current password via argon2/bcrypt, hash new password, update staff record, invalidate all refresh tokens
- `src/modules/auth/auth.module.ts` — register `ChangePasswordUsecase`
- `src/modules/core/entities/eventLog.entity.ts` — add `PASSWORD_CHANGED` to `EventType` enum
- `src/shared/constants/permissions.ts` — no new permission needed (self-service action)

**Audit event:** `PASSWORD_CHANGED` (module: `AUTH`, actorId = self)

---

### 0b. Reference Data Module (Feature 2)

**New module:** `src/modules/reference/`

```
src/modules/reference/
  reference.module.ts
  controllers/
    reference.controller.ts      # all endpoints below
  usecases/
    fetchStates.uc.ts
    fetchLgas.uc.ts
  data/
    banks.json                   # CBN bank list (static)
    firstNames.json              # Nigerian first names (static)
    lastNames.json               # Nigerian last names (static)
```

**Endpoints:**
| Method | Path | Source |
|---|---|---|
| GET | `/reference/locations/states` | DB — `State` entity |
| GET | `/reference/locations/lgas?stateId=` | DB — `Lga` entity |
| GET | `/reference/icd10?q=&page=&limit=` | Delegate → query `MedicalCode` where `codingStandard.code=ICD10` |
| GET | `/reference/banks` | Static `banks.json` |
| GET | `/reference/names/first` | Static `firstNames.json` |
| GET | `/reference/names/last` | Static `lastNames.json` |

**New repositories:**
- `src/adapters/repositories/state.repository.ts`
- `src/adapters/repositories/lga.repository.ts`

**app.module.ts:** import `ReferenceModule`

**Note:** All reference endpoints are `@Public()` (no auth required).

---

## Phase 1 — Patient Management + Roster ✅

### 1a. Patient Management (Tier 2, Feature 17)

**New migration:** Add `patient_mrn_seq` PostgreSQL sequence. MRN format: `CF-{YYYY}-{NNNNN}`.

**New module:** `src/modules/patient/`

```
src/modules/patient/
  patient.module.ts
  controllers/
    patient.controller.ts
    patientHistory.controller.ts
  usecases/
    createPatient.uc.ts
    fetchAllPatients.uc.ts
    fetchPatientById.uc.ts
    updatePatient.uc.ts
    deletePatient.uc.ts
    searchPatients.uc.ts
    enrollPatientHmo.uc.ts
    fetchPatientHistory.uc.ts
    addPatientHistoryItem.uc.ts
    removePatientHistoryItem.uc.ts
  services/
    patient.service.ts
    patientHistory.service.ts
    patientHmo.service.ts
  dto/
    createPatient.dto.ts
    updatePatient.dto.ts
    enrollPatientHmo.dto.ts
    addPatientHistory.dto.ts
```

**Repositories (new):**
- `src/adapters/repositories/patient.repository.ts`
- `src/adapters/repositories/patientMedicalHistory.repository.ts`
- `src/adapters/repositories/patientHmo.repository.ts`

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| POST | `/patients` | Register patient (generate MRN) |
| GET | `/patients` | List with queryEngine |
| GET | `/patients/search?q=` | Search by name/MRN/phone |
| GET | `/patients/:id` | Fetch patient |
| PATCH | `/patients/:id` | Update patient |
| DELETE | `/patients/:id` | Soft delete |
| PATCH | `/patients/:id/hmo` | Enroll/update HMO |
| GET | `/patients/:id/history` | Medical history |
| POST | `/patients/:id/history` | Add history item (allergy/condition/surgery) |
| DELETE | `/patients/:id/history/:historyId` | Remove history item |

**Audit events:** `PATIENT_REGISTERED`, `PATIENT_UPDATED`, `PATIENT_DELETED`, `PATIENT_HMO_ENROLLED`, `PATIENT_HISTORY_ADDED`, `PATIENT_HISTORY_REMOVED`

**Permissions:** Add `PATIENT` module to `src/shared/constants/permissions.ts` with ops: `CREATE`, `READ`, `LIST`, `UPDATE`, `DELETE`

---

### 1b. Staff Roster (Tier 2, Feature 18) — extend shiftSchedule module

**New migration:** 
- Add `Roster` entity: `id`, `weekStartDate` (date), `status` (draft/published), `publishedAt`, `publishedById`, `notes`
- Add `rosterId` (nullable FK) to `StaffShiftSchedule`

**New entity:** `src/modules/core/entities/roster.entity.ts`

**New files within existing `shiftSchedule` module:**
```
src/modules/shiftSchedule/
  controllers/
    roster.controller.ts          # new
  usecases/
    createRoster.uc.ts
    fetchAllRosters.uc.ts
    fetchRosterById.uc.ts
    updateRoster.uc.ts
    publishRoster.uc.ts
    deleteRoster.uc.ts
    addRosterAssignment.uc.ts
    removeRosterAssignment.uc.ts
  services/
    roster.service.ts             # new
  dto/
    createRoster.dto.ts
    addRosterAssignment.dto.ts
```

**New repository:**
- `src/adapters/repositories/roster.repository.ts`

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| POST | `/roster` | Create draft roster for a week |
| GET | `/roster` | List rosters |
| GET | `/roster/:id` | Get roster with staff assignments |
| PATCH | `/roster/:id` | Update draft roster |
| PATCH | `/roster/:id/publish` | Publish roster |
| DELETE | `/roster/:id` | Delete draft roster only |
| POST | `/roster/:id/assignments` | Add staff assignment |
| DELETE | `/roster/:id/assignments/:assignmentId` | Remove assignment |

**Audit events:** `ROSTER_CREATED`, `ROSTER_PUBLISHED`, `ROSTER_UPDATED`, `ROSTER_DELETED`, `ROSTER_ASSIGNMENT_ADDED`, `ROSTER_ASSIGNMENT_REMOVED`

---

## Phase 2 — Appointments + Episodes ✅

### 2a. Appointments (Tier 3, Feature 19)

**New module:** `src/modules/appointments/`

**Existing entity:** `Appointment` (type, status, patientId, doctorId, scheduledAt, etc.)

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| POST | `/appointments` | Book appointment |
| GET | `/appointments` | List appointments |
| GET | `/appointments/:id` | Get appointment |
| PATCH | `/appointments/:id` | Update appointment |
| PATCH | `/appointments/:id/confirm` | Confirm (scheduled → confirmed) |
| PATCH | `/appointments/:id/check-in` | Check in → creates QueueEntry atomically |
| PATCH | `/appointments/:id/cancel` | Cancel |
| PATCH | `/appointments/:id/no-show` | Mark no-show |
| GET | `/appointments/doctor/:doctorId/slots` | Doctor availability slots (derived from ShiftSchedule) |

**Key logic:** `check-in` use case must atomically: set appointment status = `checked_in`, create a `QueueEntry` (triage queue), and open an `Episode`.

**New migration:** Add `episode_number_seq` PostgreSQL sequence. Episode format: `EP-{YYYY}-{NNNNN}`.

**Audit events:** `APPOINTMENT_BOOKED`, `APPOINTMENT_CONFIRMED`, `APPOINTMENT_CHECKED_IN`, `APPOINTMENT_CANCELLED`, `APPOINTMENT_NO_SHOW`

---

### 2b. Episodes (Tier 3, Feature 20)

**New module:** `src/modules/episodes/`

**Existing entities:** `Episode`, `EpisodeDiagnosis`, `EpisodeLog`

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| POST | `/episodes` | Open episode manually (auto-opened on check-in) |
| GET | `/episodes` | List episodes |
| GET | `/episodes/:id` | Get episode + diagnoses + timeline |
| PATCH | `/episodes/:id` | Update episode |
| PATCH | `/episodes/:id/close` | Close episode |
| PATCH | `/episodes/:id/lock` | Lock for audit |
| PATCH | `/episodes/:id/unlock` | Unlock (CMO only) |
| POST | `/episodes/:id/diagnoses` | Add diagnosis (ICD-10 code) |
| DELETE | `/episodes/:id/diagnoses/:diagId` | Remove diagnosis |
| POST | `/episodes/:id/followup` | Schedule follow-up (creates appointment) |
| GET | `/episodes/:id/timeline` | All events in episode |

**Audit events:** `EPISODE_OPENED`, `EPISODE_CLOSED`, `EPISODE_LOCKED`, `EPISODE_UNLOCKED`, `EPISODE_DIAGNOSIS_ADDED`, `EPISODE_DIAGNOSIS_REMOVED`

---

## Phase 3 — Queue Management + Vital Signs ✅

### 3a. Queue Management (Tier 4, Feature 21)

**New module:** `src/modules/queue/`

**Existing entity:** `QueueEntry`

**Architecture:** Redis sorted set per queue type for real-time position tracking. DB `QueueEntry` for persistence and analytics. On state change, update both.

**Queue types:** `triage`, `doctor_new`, `doctor_review`, `lab`, `pharmacy`

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| POST | `/queue` | Add to queue (requires payment clearance check for non-triage) |
| GET | `/queue` | List queue entries |
| GET | `/queue/:id` | Get entry |
| PATCH | `/queue/:id/call` | Call patient |
| PATCH | `/queue/:id/start` | Start service |
| PATCH | `/queue/:id/complete` | Complete |
| PATCH | `/queue/:id/pause` | Pause with reason |
| PATCH | `/queue/:id/resume` | Resume |
| PATCH | `/queue/:id/skip` | Skip to back of queue |
| DELETE | `/queue/:id` | Remove from queue |
| GET | `/queue/stats` | Queue statistics per type |
| GET | `/queue/stream/:queueType` | **SSE stream** (real-time updates via `@Sse()`) |

**New Redis operations:** `zadd`, `zrank`, `zrem`, `zrange` on `queue:{queueType}` keys

**Audit events:** `QUEUE_PATIENT_ADDED`, `QUEUE_PATIENT_CALLED`, `QUEUE_SERVICE_STARTED`, `QUEUE_SERVICE_COMPLETED`, `QUEUE_PATIENT_REMOVED`

---

### 3b. Vital Signs (Tier 4, Feature 22)

**New module:** `src/modules/vitals/`

**Existing entity:** `PatientVital` (episodeId, temperature, systolicBP, diastolicBP, heartRate, respiratoryRate, oxygenSaturation, weight, height)

**Key rules:**
- Immutable: no UPDATE or DELETE endpoints
- BMI auto-calculated server-side: `weight(kg) / (height(m))²` — stored in a computed field or returned in response
- WHO/clinical alert thresholds evaluated on creation; returned in response as `alerts: string[]`

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| POST | `/vitals` | Record vitals (nurse only) |
| GET | `/vitals` | List vitals (filter by episodeId) |
| GET | `/vitals/:id` | Get vital record |

**New repository:** `src/adapters/repositories/patientVital.repository.ts`

**Audit events:** `VITALS_RECORDED`

---

## Phase 4 — Consultations

### Consultations (Tier 5, Feature 23)

**New module:** `src/modules/consultations/`

**Existing entity:** `Consultation` (check entity fields before implementing)

**Status workflow:** `draft` → `in_progress` → `finalized` → `amendment`

**Finalization validation:** Must have chiefComplaint, HPI, physicalExam, at least one diagnosis, treatment plan.

**Amendment:** Creates a version snapshot before changes; stores amendment reason.

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| POST | `/consultations` | Create consultation (draft) |
| GET | `/consultations` | List |
| GET | `/consultations/:id` | Get with version history |
| PATCH | `/consultations/:id` | Update (draft/in_progress only) |
| PATCH | `/consultations/:id/start` | Start (draft → in_progress) |
| PATCH | `/consultations/:id/finalize` | Finalize (validates required fields) |
| PATCH | `/consultations/:id/amend` | Amend finalized (requires reason) |
| DELETE | `/consultations/:id` | Delete draft only |

**Audit events:** `CONSULTATION_CREATED`, `CONSULTATION_STARTED`, `CONSULTATION_FINALIZED`, `CONSULTATION_AMENDED`, `CONSULTATION_DELETED`

---

## Phase 5 — Storage Adapter + Lab Orders + Prescriptions

### 5-pre. File Storage Adapter (prerequisite for 5a & 5b)

**New files:**
```
src/adapters/storage/
  storage.constants.ts          # STORAGE_PROVIDER_TOKEN, StorageProviderEnum
  istorage.interface.ts         # IStorageProvider: upload(), delete(), getSignedUrl()
  storage.module.ts             # useFactory pattern (mirrors email.module.ts)
  providers/
    s3.provider.ts              # @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner
    supabase.provider.ts        # @supabase/supabase-js
    r2.provider.ts              # @aws-sdk/client-s3 (R2 is S3-compatible endpoint)

src/configs/storage.config.ts   # registerAs('storageConfig', ...)
```

**Modified files:**
- `src/configs/schema.config.ts` — add Joi validation for `STORAGE_PROVIDER`, `AWS_S3_*`, `SUPABASE_*`, `R2_*`
- `src/app.module.ts` — import `StorageModule`, load `storageConfig`

**Interface:**
```typescript
interface IStorageProvider {
  upload(file: Buffer | Readable, path: string, options?: StorageUploadOptions): Promise<StorageUploadResult>;
  delete(path: string): Promise<void>;
  getSignedUrl(path: string, expiresIn: number): Promise<string>;
}
```

**New packages:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@supabase/supabase-js`

---

### 5a. Lab Orders & Results (Tier 5, Feature 24)

**New module:** `src/modules/labOrders/`

**Existing entities:** `LabOrder`, `LabOrderItem`, `LabOrderResult`

**Order lifecycle:** `ordered` → `sample_collected` → `processing` → `completed` | `cancelled`

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| POST | `/lab/orders` | Create lab order (doctor) |
| GET | `/lab/orders` | List orders |
| GET | `/lab/orders/:id` | Get order with items + results |
| PATCH | `/lab/orders/:id/collect-sample` | Mark sample collected (lab tech) |
| PATCH | `/lab/orders/:id/start-processing` | Start processing |
| POST | `/lab/orders/:id/results` | Enter results (multipart: JSON + optional file upload) |
| PATCH | `/lab/orders/:id/complete` | Complete order |
| DELETE | `/lab/orders/:id` | Cancel order |
| GET | `/lab/sample-queue` | All samples awaiting collection |

**File uploads:** result images (JPEG, PNG, PDF) stored via `StorageModule`. Key format: `lab-results/{orderId}/{resultId}.{ext}`

**Audit events:** `LAB_ORDER_CREATED`, `LAB_SAMPLE_COLLECTED`, `LAB_RESULT_ENTERED`, `LAB_ORDER_COMPLETED`, `LAB_ORDER_CANCELLED`

---

### 5b. Prescriptions & Dispensing (Tier 5, Feature 25)

**New module:** `src/modules/prescriptions/`

**Existing entities:** `Prescription`, `PrescriptionItem`

**Status:** `pending` → `dispensed` | `partially_dispensed` | `unfulfillable`

**Dispense logic:** Auto-deduct from `Inventory.currentStock` in same transaction. Record substitution if generic/therapeutic swap (store original + substituted item).

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| POST | `/prescriptions` | Create prescription (doctor) |
| GET | `/prescriptions` | List prescriptions |
| GET | `/prescriptions/:id` | Get with items and dispense history |
| POST | `/prescriptions/:id/dispense` | Full dispense |
| POST | `/prescriptions/:id/partial-dispense` | Partial (per-item quantities) |
| PATCH | `/prescriptions/:id/mark-unfulfillable` | Mark unfulfillable with reason |

**Audit events:** `PRESCRIPTION_CREATED`, `PRESCRIPTION_DISPENSED`, `PRESCRIPTION_PARTIALLY_DISPENSED`, `PRESCRIPTION_UNFULFILLABLE`

---

## Phase 6 — Billing & Payments

### Billing & Payments (Tier 6, Feature 26)

**New module:** `src/modules/billing/`

**Existing entities:** `Bill`, `BillItem`, `Payment`, `BillingCode`

**New migration:** Add `bill_number_seq` PostgreSQL sequence. Bill format: `BILL-{YYYY}-{NNNNN}`.

**Walk-in support:** `Bill.type = WALK_IN` — patient name/phone stored directly on bill (no Patient FK required).

**Billing codes:** Department-specific codes with 6-hour expiry. Format: `{DEPT_PREFIX}-{YYYY}-{NNNNNN}`.

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| POST | `/bills` | Create bill |
| GET | `/bills` | List bills |
| GET | `/bills/:id` | Get bill with line items |
| PATCH | `/bills/:id/items` | Add/update line items |
| POST | `/bills/:id/payments` | Record payment (cash/card/transfer/HMO/corporate/split) |
| POST | `/bills/:id/refund` | Initiate refund |
| GET | `/billing-codes/generate` | Generate billing code for department |
| GET | `/billing-codes/:code/validate` | Validate billing code (check expiry) |

**Audit events:** `BILL_CREATED`, `BILL_PAID`, `BILL_PARTIALLY_PAID`, `BILL_REFUNDED`, `BILLING_CODE_GENERATED`

---

## Phase 7 — HMO Claims

### HMO Claims (Tier 6, Feature 27)

**New module:** `src/modules/claims/`

**Existing entities:** `Claim`, `ClaimItem`

**New migration:** Add `claim_number_seq`. Claim format: `CLM-{YYYY}-{NNNNN}`.

**Status workflow:** `draft` → `submitted` → `processing` → `approved` | `denied` → `paid` | `withdrawn` | `retracted`

**Retraction:** Auto-creates a private bill for the retracted amount.

**File uploads:** Supporting documents (PDF, JPG, PNG, max 10MB) via `StorageModule`. Key: `claims/{claimId}/docs/{filename}`

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| POST | `/claims` | Create claim (bundle multiple bills) |
| GET | `/claims` | List claims |
| GET | `/claims/:id` | Get claim with items + documents |
| PATCH | `/claims/:id` | Update draft claim |
| PATCH | `/claims/:id/submit` | Submit claim |
| POST | `/claims/:id/documents` | Upload supporting document |
| PATCH | `/claims/:id/approve` | Approve claim |
| PATCH | `/claims/:id/deny` | Deny claim with reason |
| PATCH | `/claims/:id/mark-paid` | Mark as paid |
| PATCH | `/claims/:id/withdraw` | Withdraw claim |
| PATCH | `/claims/:id/retract` | Retract + auto-create private bill |
| PATCH | `/claims/:id/resubmit` | Resubmit denied claim |
| GET | `/claims/:id/versions` | Version history |

**Audit events:** `CLAIM_CREATED`, `CLAIM_SUBMITTED`, `CLAIM_APPROVED`, `CLAIM_DENIED`, `CLAIM_PAID`, `CLAIM_RETRACTED`, `CLAIM_RESUBMITTED`

---

## Phase 8 — Operations

### 8a. Cashier Shift Management (Tier 7, Feature 28)

**New module:** `src/modules/shifts/`

**Existing entity:** `Shift` (staffId, status, station, startedAt, endedAt, departmentId, openingBalance, closingBalance, expectedBalance, variance, notes)

**Rules:**
- Lab station: only one active shift at a time
- Other stations: multiple concurrent shifts allowed
- Closing: calculates variance (closingBalance - expectedBalance)

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| POST | `/shifts` | Open shift |
| GET | `/shifts` | List shifts |
| GET | `/shifts/:id` | Get shift with transactions |
| PATCH | `/shifts/:id/close` | Close shift (record closing balance) |
| GET | `/shifts/active` | My active shift |

**Audit events:** `SHIFT_OPENED`, `SHIFT_CLOSED`

---

### 8b. Stock Requests (Tier 7, Feature 29)

**New module:** `src/modules/stockRequests/`

**Existing entities:** `RestockRequest`, `RestockRequestItem`

**Status workflow:** `pending` → `approved` | `partially_approved` | `rejected` | `forwarded_to_cmo` | `info_requested`

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| POST | `/stock-requests` | Create restock request |
| GET | `/stock-requests` | List requests |
| GET | `/stock-requests/:id` | Get request with items |
| PATCH | `/stock-requests/:id/approve` | Approve (full or partial) |
| PATCH | `/stock-requests/:id/reject` | Reject with reason |
| PATCH | `/stock-requests/:id/forward-to-cmo` | Escalate to CMO |
| PATCH | `/stock-requests/:id/request-info` | Put on hold pending info |
| PATCH | `/stock-requests/:id/provide-info` | Respond to info request |

**Audit events:** `STOCK_REQUEST_CREATED`, `STOCK_REQUEST_APPROVED`, `STOCK_REQUEST_REJECTED`, `STOCK_REQUEST_ESCALATED`

---

### 8c. Lab Referrals (Tier 7, Feature 30)

**New module:** `src/modules/labReferrals/`

**Existing entities:** `LabReferral`, `LabReferralItem`

**New migration:** Add `lab_referral_seq`. Tracking format: `REF-{YYYY}-{SYNL}-{NNNNN}`.

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| POST | `/lab/referrals` | Create outbound referral |
| GET | `/lab/referrals` | List referrals |
| GET | `/lab/referrals/:id` | Get referral with items |
| PATCH | `/lab/referrals/:id/dispatch` | Mark dispatched |
| POST | `/lab/referrals/:id/results` | Receive results from partner |
| PATCH | `/lab/referrals/:id/complete` | Complete referral |

**Audit events:** `LAB_REFERRAL_CREATED`, `LAB_REFERRAL_DISPATCHED`, `LAB_REFERRAL_RESULTS_RECEIVED`, `LAB_REFERRAL_COMPLETED`

---

## Phase 9 — Cross-Cutting Features

### 9a. Notifications (Tier 8, Feature 31)

**New module:** `src/modules/notifications/`

**New entity:** `Notification` (staffId, type, title, body, metadata: JSONB, isRead, readAt, expiresAt) — 30-day auto-purge via a cron/scheduled cleanup.

**New migration:** Add `notification` table.

**Real-time:** SSE via `@Sse('/notifications/stream')` — streams to the authenticated staff member. Other modules call `NotificationService.send(staffId, event)` to push.

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | List my notifications |
| PATCH | `/notifications/:id/read` | Mark as read |
| PATCH | `/notifications/read-all` | Mark all as read |
| DELETE | `/notifications/:id` | Delete notification |
| GET | `/notifications/stream` | SSE stream (real-time) |

---

### 9b. Audit Log Endpoint (Tier 8, Feature 32)

**New controller only** (no new entity — uses existing `EventLog`):

```
src/modules/audit/
  audit.module.ts
  controllers/
    audit.controller.ts
  usecases/
    fetchAuditLogs.uc.ts
```

**Endpoints:**
| Method | Path | Description |
|---|---|---|
| GET | `/audit` | List audit logs (CMO/hospital_admin only, queryEngine) |
| GET | `/audit/:id` | Get single audit log entry |

**Permission:** Read-only. Gate with `@RequirePermissions([AUDIT.READ])`.

---

### 9c. Permissions Management (Tier 8, Feature 34)

**Extends existing role/permission system** with user-level overrides:

**New entity:** `StaffPermissionOverride` (staffId, permissionId, granted: boolean, grantedBy, grantedAt)

**New endpoints on role module:**
| Method | Path | Description |
|---|---|---|
| GET | `/permissions/staff/:staffId` | Get staff's effective permissions (role + overrides) |
| POST | `/permissions/staff/:staffId/grant` | Grant permission override |
| DELETE | `/permissions/staff/:staffId/revoke/:permissionId` | Revoke override |

**Permission guard update:** When checking permissions, query: staff role permissions UNION granted overrides MINUS revoked overrides.

---

### 9d. Reports (Tier 8, Feature 33)

**New module:** `src/modules/reports/`

**Basic role-gated dashboard endpoints** (aggregate queries against existing data):
- `GET /reports/financial` — revenue, collections, outstanding
- `GET /reports/consultations` — consultation counts by doctor/period
- `GET /reports/lab` — lab order volumes and turnaround
- `GET /reports/pharmacy` — prescription and dispensing stats
- `GET /reports/inventory` — stock levels, low-stock alerts, expiry alerts
- `GET /reports/claims` — HMO claim status summary
- `GET /reports/alerts` — `low_stock`, `overdue_claim`, `long_queue_wait`

Metabase BI embed URLs deferred to a later phase.

---

## Implementation Order Summary

| Phase | Feature(s) | Entities Affected |
|---|---|---|
| **0** | Auth password change + Reference Data | EventLog, State, Lga |
| **1** | Patient Management + Roster | Patient, PatientMedicalHistory, PatientHmo, Roster, StaffShiftSchedule |
| **2** | Appointments + Episodes | Appointment, Episode, EpisodeDiagnosis, EpisodeLog |
| **3** | Queue + Vitals | QueueEntry (Redis+DB), PatientVital |
| **4** | Consultations | Consultation |
| **5** | Storage Adapter + Lab Orders + Prescriptions | LabOrder, LabOrderItem, LabOrderResult, Prescription, PrescriptionItem |
| **6** | Billing & Payments | Bill, BillItem, Payment, BillingCode |
| **7** | HMO Claims | Claim, ClaimItem |
| **8** | Cashier Shifts + Stock Requests + Lab Referrals | Shift, RestockRequest, LabReferral |
| **9** | Notifications + Audit endpoint + Permissions + Reports | Notification, StaffPermissionOverride |

---

## Verification Approach

For each phase:
1. **Run existing tests** — `npm run test` — ensure no regressions
2. **Run app** — `npm run start:dev` — verify app boots without errors
3. **Swagger** — confirm new endpoints appear at `/api/v1/docs`
4. **Postman** — test the happy path: create → fetch → update → delete; verify `EventLog` entry created for each mutation
5. **Migration** — run `npm run migration:run` — verify schema changes apply cleanly

**Phase 0 specific:** Hit `PATCH /staff/auth/password/change` with correct + incorrect current passwords; verify `PASSWORD_CHANGED` event logged. Hit `GET /reference/locations/states` and confirm data returned.

**Phase 1 specific:** Register a patient → verify MRN format `CF-2026-00001`. Create a roster → add assignments → publish → verify status = `published`.
