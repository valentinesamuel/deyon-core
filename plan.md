# Entity Schema Plan: Types, Enums, Relationships

## Context
All entities have column names but lack TypeORM decorators (`@Column`, `@ManyToOne`, etc.), type definitions, enum values, and FK relationships. This plan defines exactly what needs to be added to each entity file to produce a complete, production-ready schema.

---

## Decisions Log (from Q&A)

| Topic | Decision |
|---|---|
| PatientVital FK | ManyToOne → Episode |
| Episode.status | open / closed / locked / archived |
| Encounter.type | triage / consultation / lab / imaging / pharmacy / discharge |
| Encounter.data | jsonb snapshot (async, filled after event fires) |
| LabOrder.type | internal / external |
| Lab priority | routine / urgent / stat |
| LabReferral.direction | inbound / outbound / internal_transfer |
| LabOrderResult.value | varchar |
| Prescription.status | pending / partial / fully_dispensed / cancelled |
| PrescriptionItem dosage/freq/duration | Structured: separate value+unit columns |
| Bill.type | walk_in / episode |
| Bill.status | Add it — BillStatusEnum |
| Payment.type | transaction direction: payment / refund / waiver |
| Payment.paymentMethod | PaymentMethodEnum (cash / card / transfer / hmo / corporate) |
| Payment.paymentHandler | Remove (redundant with staffId) |
| Payment.staffId | FK to Staff (cashier) |
| LabOrder.status | pending / collected / processing / completed / cancelled |
| LabReferral.status | pending / sent / received / completed / cancelled |
| Inventory.supplier | FK to new Supplier entity |
| RestockRequest.requestedBy | FK to Staff |
| PriceChange.requestedBy/approvedBy | FK to Staff |
| HmoRules.logic | jsonb — array of compound conditions |
| Shift.station | Enum — fixed role-based stations |
| ShiftSchedule.day | DayOfWeekEnum (mon–sun) |
| ShiftSchedule.timeOfDay | morning / afternoon / night |
| EpisodeLog.actorType | staff / patient / system |
| ProtocolBundleItems.serviceType | ServiceCategoryEnum |
| Consultation.draftMetadata | jsonb — partial form snapshot |
| PatientHmo FKs | Add patientId FK + hmoProviderId FK |

---

## Enums to Define (per file)

### `episode.entity.ts`
```ts
export enum EpisodeStatusEnum {
  OPEN = 'open', CLOSED = 'closed', LOCKED = 'locked', ARCHIVED = 'archived',
}
```

### `encounter.entity.ts`
```ts
export enum EncounterTypeEnum {
  TRIAGE = 'triage', CONSULTATION = 'consultation', LAB = 'lab',
  IMAGING = 'imaging', PHARMACY = 'pharmacy', DISCHARGE = 'discharge',
}
```

### `appointment.entity.ts`
```ts
export enum AppointmentTypeEnum {
  CONSULTATION = 'consultation', FOLLOW_UP = 'follow_up',
  EMERGENCY = 'emergency', PROCEDURE = 'procedure', LAB_ONLY = 'lab_only',
}
export enum AppointmentStatusEnum {
  SCHEDULED = 'scheduled', CONFIRMED = 'confirmed', CHECKED_IN = 'checked_in',
  IN_PROGRESS = 'in_progress', COMPLETED = 'completed',
  CANCELLED = 'cancelled', NO_SHOW = 'no_show',
}
```

### `labOrder.entity.ts`
```ts
export enum LabOrderTypeEnum { INTERNAL = 'internal', EXTERNAL = 'external' }
export enum LabOrderStatusEnum {
  PENDING = 'pending', COLLECTED = 'collected', PROCESSING = 'processing',
  COMPLETED = 'completed', CANCELLED = 'cancelled',
}
export enum LabPriorityEnum { ROUTINE = 'routine', URGENT = 'urgent', STAT = 'stat' }
```

### `labOrderItem.entity.ts`
```ts
// Re-export LabOrderStatusEnum from labOrder.entity.ts
```

### `labReferral.entity.ts`
```ts
export enum LabReferralDirectionEnum {
  INBOUND = 'inbound', OUTBOUND = 'outbound', INTERNAL_TRANSFER = 'internal_transfer',
}
export enum LabReferralStatusEnum {
  PENDING = 'pending', SENT = 'sent', RECEIVED = 'received',
  COMPLETED = 'completed', CANCELLED = 'cancelled',
}
```

### `prescription.entity.ts`
```ts
export enum PrescriptionStatusEnum {
  PENDING = 'pending', PARTIAL = 'partial',
  FULLY_DISPENSED = 'fully_dispensed', CANCELLED = 'cancelled',
}
```

### `bill.entity.ts`
```ts
export enum BillTypeEnum { WALK_IN = 'walk_in', EPISODE = 'episode' }
export enum BillStatusEnum {
  PENDING = 'pending', PARTIAL = 'partial', PAID = 'paid',
  WAIVED = 'waived', REFUNDED = 'refunded',
}
```

### `payment.entity.ts`
```ts
export enum PaymentTransactionTypeEnum {
  PAYMENT = 'payment', REFUND = 'refund', WAIVER = 'waiver',
}
export enum PaymentMethodEnum {
  CASH = 'cash', CARD = 'card', TRANSFER = 'transfer',
  HMO = 'hmo', CORPORATE = 'corporate',
}
```

### `claim.entity.ts`
```ts
export enum ClaimStatusEnum {
  DRAFT = 'draft', SUBMITTED = 'submitted', PROCESSING = 'processing',
  APPROVED = 'approved', DENIED = 'denied', PAID = 'paid',
  WITHDRAWN = 'withdrawn', RETRACTED = 'retracted',
}
```

### `hmoContract.entity.ts`
```ts
export enum HMOCoverageTypeEnum {
  FULL = 'full', PARTIAL_PERCENT = 'partial_percent',
  PARTIAL_FLAT = 'partial_flat', NONE = 'none',
}
```

### `priceChange.entity.ts`
```ts
export enum PriceChangeStatusEnum {
  PENDING = 'pending', APPROVED = 'approved', REJECTED = 'rejected',
}
```

### `restockRequest.entity.ts`
```ts
export enum RestockRequestStatusEnum {
  PENDING = 'pending', APPROVED = 'approved',
  REJECTED = 'rejected', FULFILLED = 'fulfilled',
}
```

### `partnerLab.entity.ts`
```ts
export enum PartnerLabStatusEnum { ACTIVE = 'active', INACTIVE = 'inactive' }
```

### `shift.entity.ts`
```ts
export enum ShiftStatusEnum {
  SCHEDULED = 'scheduled', IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed', CANCELLED = 'cancelled',
}
export enum ShiftStationEnum {
  RECEPTION = 'reception', LAB = 'lab', PHARMACY = 'pharmacy',
  NURSING_STATION = 'nursing_station', IMAGING = 'imaging', TRIAGE = 'triage',
}
```

### `shiftSchedule.entity.ts`
```ts
export enum DayOfWeekEnum {
  MONDAY = 'monday', TUESDAY = 'tuesday', WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday', FRIDAY = 'friday', SATURDAY = 'saturday', SUNDAY = 'sunday',
}
export enum ShiftTimeOfDayEnum { MORNING = 'morning', AFTERNOON = 'afternoon', NIGHT = 'night' }
```

### `episodeLog.entity.ts`
```ts
export enum EpisodeLogActorTypeEnum { STAFF = 'staff', PATIENT = 'patient', SYSTEM = 'system' }
export enum EpisodeEventTypeEnum {
  EPISODE_OPENED = 'episode_opened', EPISODE_CLOSED = 'episode_closed',
  EPISODE_LOCKED = 'episode_locked', VITALS_RECORDED = 'vitals_recorded',
  CONSULTATION_STARTED = 'consultation_started', CONSULTATION_COMPLETED = 'consultation_completed',
  LAB_ORDERED = 'lab_ordered', LAB_RESULTED = 'lab_resulted',
  PRESCRIPTION_ISSUED = 'prescription_issued', PRESCRIPTION_DISPENSED = 'prescription_dispensed',
  BILL_CREATED = 'bill_created', PAYMENT_RECEIVED = 'payment_received',
  CLAIM_SUBMITTED = 'claim_submitted',
}
```

### `referenceRange.entity.ts`
```ts
export enum ReferenceGenderEnum { MALE = 'male', FEMALE = 'female', BOTH = 'both' }
```

---

## New Entity: Supplier
**File:** `deyon_be/src/modules/core/entities/supplier.entity.ts`
```ts
@Entity()
export class Supplier extends BaseEntity {
  @Column({ type: 'varchar' }) name: string;
  @Column({ type: 'varchar', nullable: true }) contactPhone: string;
  @Column({ type: 'varchar', nullable: true }) contactEmail: string;
  @Column({ type: 'varchar', nullable: true }) address: string;
  @Column({ type: 'boolean', default: true }) isActive: boolean;
  @OneToMany(() => Inventory, inv => inv.supplier) inventory: Inventory[];
}
```

---

## Entity Changes

### `patientVitals.entity.ts`
Add episodeId FK + typed columns:
- `celsiusTemperature` → `numeric(5,2)`
- `systolicBloodPressure` → `int`
- `diastolicBloodPressure` → `int`
- `heartRate` → `int`
- `respiratoryRate` → `int`
- `oxygenSaturation` → `numeric(5,2)`
- `kilogramWeight` → `numeric(5,2)`
- `centimetreHeight` → `numeric(5,2)`
- ADD: `episodeId uuid` → `@ManyToOne(() => Episode, ep => ep.vitals)`

### `episode.entity.ts`
```
patientId      uuid    ManyToOne → Patient
episodeNumber  varchar unique
status         enum    EpisodeStatusEnum
totalBilled    numeric(10,2) default 0
totalPaid      numeric(10,2) default 0
totalBalance   numeric(10,2) default 0
isLockedForAudit boolean default false
notes          text nullable
```
Relations: OneToMany → PatientVital, Encounter, Consultation, LabOrder, Bill, EpisodeLog, Claim

### `encounter.entity.ts`
```
episodeId  uuid  ManyToOne → Episode
type       enum  EncounterTypeEnum
staffId    uuid  ManyToOne → Staff
data       jsonb nullable
```
Relations: OneToOne (inverse) → Consultation

### `consultation.entity.ts`
```
encounterId          uuid  ManyToOne → Encounter (OneToOne from this side)
patientId            uuid  ManyToOne → Patient
episodeId            uuid  ManyToOne → Episode
appointmentId        uuid  ManyToOne → Appointment nullable
chiefComplaint       text
presentIllnessBrief  text nullable
treatmentPlan        text nullable
followUpDate         timestamp with time zone nullable
isDraft              boolean default false
draftMetadata        jsonb nullable
```

### `appointment.entity.ts`
```
patientId         uuid  ManyToOne → Patient
doctorId          uuid  ManyToOne → Staff
appointmentType   enum  AppointmentTypeEnum
status            enum  AppointmentStatusEnum
reasonForVisit    text
bookedBy          uuid  ManyToOne → Staff nullable
checkedInBy       uuid  ManyToOne → Staff nullable
scheduledDuration int   (minutes)
checkedInAt       timestamp with time zone nullable
startedAt         timestamp with time zone nullable
startedBy         uuid  ManyToOne → Staff nullable
endedAt           timestamp with time zone nullable
endedBy           uuid  ManyToOne → Staff nullable
scheduleDate      timestamp with time zone
```
Relations: OneToMany → Consultation

### `labOrder.entity.ts`
```
patientId    uuid  ManyToOne → Patient
doctorId     uuid  ManyToOne → Staff
episodeId    uuid  ManyToOne → Episode nullable
encounterId  uuid  ManyToOne → Encounter nullable
type         enum  LabOrderTypeEnum
status       enum  LabOrderStatusEnum default PENDING
priority     enum  LabPriorityEnum default ROUTINE
collectedAt  timestamp with time zone nullable
processedBy  uuid  ManyToOne → Staff nullable
completedAt  timestamp with time zone nullable
```
Relations: OneToMany → LabOrderItem

### `labOrderItem.entity.ts`
```
labOrderId     uuid  ManyToOne → LabOrder
serviceCodeId  uuid  ManyToOne → ServiceCodeCatalog
status         enum  LabOrderStatusEnum default PENDING
```
Relations: OneToOne → LabOrderResult

### `labOrderResult.entity.ts`
```
labOrderItemId  uuid    OneToOne → LabOrderItem
value           varchar
metadata        jsonb nullable
notes           text nullable
```

### `labReferral.entity.ts`
```
direction           enum  LabReferralDirectionEnum
patientId           uuid  ManyToOne → Patient
patientPhoneNumber  varchar nullable (denormalized snapshot)
partnerLabId        uuid  ManyToOne → PartnerLab nullable
status              enum  LabReferralStatusEnum default PENDING
referenceNumber     varchar unique
trackingId          varchar nullable
referredBy          uuid  ManyToOne → Staff
notes               text nullable
priority            enum  LabPriorityEnum default ROUTINE
attachments         jsonb nullable (array of {name, url, mimeType})
```
Relations: OneToMany → LabReferralItem

### `labReferralItem.entity.ts`
```
labReferralId  uuid     ManyToOne → LabReferral
testName       varchar
result         varchar nullable
unit           varchar nullable
isAbnormal     boolean default false
```

### `prescription.entity.ts`
```
patientId    uuid  ManyToOne → Patient
doctorId     uuid  ManyToOne → Staff
status       enum  PrescriptionStatusEnum default PENDING
dispensedAt  timestamp with time zone nullable
dispensedBy  uuid  ManyToOne → Staff nullable
notes        text nullable
auditLog     jsonb nullable
```
Relations: OneToMany → PrescriptionItem

### `prescriptionItem.entity.ts`
```
prescriptionId      uuid           ManyToOne → Prescription
drugId              uuid           ManyToOne → Inventory
dosageValue         numeric(8,2)
dosageUnit          varchar        (mg, ml, tablet, etc.)
frequencyValue      numeric(5,2)   (e.g. 3)
frequencyUnit       varchar        (e.g. 'times per day')
durationValue       int
durationUnit        varchar        (days, weeks, months)
prescribedQuantity  int
dispensedQuantity   int default 0
substitutedMetadata jsonb nullable (reason, notes on substitution)
substitutedDrugId   uuid nullable  ManyToOne → Inventory
```

### `bill.entity.ts`
```
billNumber   varchar unique
code         varchar nullable (authorization/billing code)
patientId    uuid  ManyToOne → Patient
shiftId      uuid  ManyToOne → Shift nullable
encounterId  uuid  ManyToOne → Encounter nullable
type         enum  BillTypeEnum
status       enum  BillStatusEnum default PENDING   ← ADD THIS
episodeId    uuid  ManyToOne → Episode nullable
claimId      uuid  ManyToOne → Claim nullable
departmentId uuid  ManyToOne → Department
createdBy    uuid  ManyToOne → Staff
```
Relations: OneToMany → BillItem, OneToMany → Payment

### `billItem.entity.ts`
```
billId       uuid           ManyToOne → Bill
serviceId    uuid           ManyToOne → MedicalService
description  varchar        (denormalized service name)
unitPrice    numeric(10,2)
quantity     int
taxAmount    numeric(10,2) default 0
discount     numeric(10,2) default 0
totalAmount  numeric(10,2)
```

### `payment.entity.ts`
Remove `paymentHandler` column.
```
shiftId        uuid  ManyToOne → Shift nullable
billId         uuid  ManyToOne → Bill
receiptNumber  varchar unique
patientId      uuid  ManyToOne → Patient
type           enum  PaymentTransactionTypeEnum  (payment/refund/waiver)
amount         numeric(10,2)
paymentMethod  enum  PaymentMethodEnum
staffId        uuid  ManyToOne → Staff  (cashier who recorded)
```

### `claim.entity.ts`
```
episodeId              uuid  ManyToOne → Episode
hmoProviderId          uuid  ManyToOne → HmoProvider
status                 enum  ClaimStatusEnum default DRAFT
totalBilledAmount      numeric(10,2)
primaryDiagnosisCode   varchar (ICD-10 code, e.g. 'I10')
attachments            jsonb nullable (array of {name, url, type, uploadedAt})
```
Relations: OneToMany → Bill (via claimId on Bill)

### `hmoContract.entity.ts`
```
coverageType             enum     HMOCoverageTypeEnum
hmoProviderId            uuid     ManyToOne → HmoProvider
serviceId                uuid     ManyToOne → MedicalService
contractedPrice          numeric(10,2) nullable
copayPercentage          numeric(5,2) nullable (0-100)
isFullyCovered           boolean default false
isActive                 boolean default true
requiredPreAuthorization boolean default false
```

### `hmoRules.entity.ts`
```
hmoProviderId     uuid   ManyToOne → HmoProvider
triggerServiceId  uuid   ManyToOne → MedicalService
logic             jsonb  (array of condition objects: [{field, operator, value}, ...])
errorMessage      varchar
```

### `patientHmo.entity.ts`
Add missing FKs:
```
patientId    uuid  ManyToOne → Patient    ← ADD
hmoProviderId uuid ManyToOne → HmoProvider ← ADD
providerName varchar (keep as denormalized snapshot)
enrollmentId varchar
planType     varchar
expiryDate   timestamp with time zone
copayAmount  numeric(10,2)
isActive     boolean
```

### `medicalService.entity.ts`
```
name                      varchar
medicalServiceCategoryId  uuid  ManyToOne → MedicalServiceCategory
defaultPrice              numeric(10,2)
isActive                  boolean default true
```
Relations: OneToMany → BillItem, HmoContract, PriceChange, HmoRules, ServiceCodeCatalog

### `medicalServiceCategory.entity.ts`
```
name  varchar unique
```
Relations: OneToMany → MedicalService

### `inventory.entity.ts`
Replace `supplier varchar` with `supplierId uuid FK → Supplier`.
```
categoryId    uuid  ManyToOne → InventoryCategory
supplierId    uuid  ManyToOne → Supplier nullable  ← replace varchar supplier
name          varchar
unit          varchar (tablet, vial, bottle, piece, etc.)
currentStock  int default 0
reorderLevel  int default 0
unitCost      numeric(10,2)
expiryDate    timestamp with time zone nullable
location      varchar nullable
```
Relations: OneToMany → PrescriptionItem (drugId), RestockRequestItem

### `inventoryCategory.entity.ts`
```
name  varchar unique
```
Relations: OneToMany → Inventory

### `restockRequest.entity.ts`
```
reason       text
requestedBy  uuid  ManyToOne → Staff
status       enum  RestockRequestStatusEnum default PENDING
notes        text nullable
```
Relations: OneToMany → RestockRequestItem

### `restockRequestItem.entity.ts`
```
restockRequestId   uuid  ManyToOne → RestockRequest
inventoryId        uuid  ManyToOne → Inventory
requestedQuantity  int
approvedQuantity   int nullable
```

### `shift.entity.ts`
```
staffId       uuid  ManyToOne → Staff
status        enum  ShiftStatusEnum
station       enum  ShiftStationEnum
startedAt     timestamp with time zone
endedAt       timestamp with time zone nullable
departmentId  uuid  ManyToOne → Department
```
Relations: OneToMany → Payment, Bill, StaffShiftSchedule

### `shiftSchedule.entity.ts`
```
timeOfDay  enum  ShiftTimeOfDayEnum
startTime  time  (PostgreSQL TIME type, e.g. '08:00:00')
endTime    time  (PostgreSQL TIME type)
day        enum  DayOfWeekEnum
```
Relations: OneToMany → StaffShiftSchedule

### `staffShiftSchedule.entity.ts`
Note: `shiftId` here refers to `ShiftSchedule` (template), not `Shift` (instance).
```
shiftScheduleId  uuid  ManyToOne → ShiftSchedule   ← rename shiftId for clarity
staffId          uuid  ManyToOne → Staff
```

### `testCatalog.entity.ts`
```
serviceCodeId             uuid    OneToOne → ServiceCodeCatalog
code                      varchar unique
name                      varchar
sampleType                varchar (blood, urine, stool, swab, tissue, etc.)
methodology               varchar nullable
preparationInstructions   text nullable
defaultUnit               varchar
```
Relations: OneToMany → ReferenceRange

### `referenceRange.entity.ts`
```
testId              uuid           ManyToOne → TestCatalog
gender              enum           ReferenceGenderEnum (male/female/both)
minAgeYears         int nullable
maxAgeYears         int nullable
lowerBound          numeric(10,4)
upperBound          numeric(10,4)
criticalLowerBound  numeric(10,4) nullable
criticalUpperBound  numeric(10,4) nullable
```

### `partnerLab.entity.ts`
```
name              varchar
code              varchar unique
address           varchar nullable
status            enum  PartnerLabStatusEnum default ACTIVE
contactPhone      varchar (fix typo: contactphone → contactPhone)
specializations   jsonb  (string array of specialization names)
contactEmail      varchar nullable
```
Relations: OneToMany → LabReferral

### `episodeLog.entity.ts`
```
episodeId   uuid  ManyToOne → Episode
eventType   enum  EpisodeEventTypeEnum
description text
actorId     uuid nullable (polymorphic — Staff or Patient UUID)
actorType   enum  EpisodeLogActorTypeEnum
metadata    jsonb nullable
```

### `protocolBundles.entity.ts`
```
name          varchar
medicalCodeId uuid  ManyToOne → MedicalCode
```
Relations: OneToMany → ProtocolBundleItems

### `protocolBundleItems.entity.ts`
```
bundleId      uuid  ManyToOne → ProtocolBundle
serviceType   enum  ServiceCategoryEnum (from bills.types.ts: consultation/lab/pharmacy/procedure/admission/other)
serviceId     uuid  (polymorphic ref — resolved by serviceType at runtime, no enforced FK)
isCompulsory  boolean default false
```
Note: `serviceId` is a bare UUID discriminated by `serviceType`. TypeORM does not support native polymorphic FKs; this is handled at application level.

### `serviceCodeCatalog.entity.ts`
```
medicalCodeId   uuid  ManyToOne → MedicalCode
serviceId       uuid  ManyToOne → MedicalService
hmoProviderId   uuid  ManyToOne → HmoProvider nullable (null = global, not HMO-specific)
```
Relations: OneToMany → LabOrderItem (serviceCodeId), OneToOne (inverse) → TestCatalog

### `codingStandard.entity.ts`
```
name         varchar unique (e.g. 'ICD-10', 'CPT', 'NHIS')
description  text nullable
```
Relations: OneToMany → MedicalCode

### `medicalCode.entity.ts`
```
standardId   uuid  ManyToOne → CodingStandard
codeValue    varchar (e.g. 'I10', '99213')
description  text
```
Relations: OneToMany → ServiceCodeCatalog, OneToMany → ProtocolBundle

### `priceChange.entity.ts`
```
serviceId      uuid  ManyToOne → MedicalService
description    text
standardPrice  numeric(10,2)
requestedBy    uuid  ManyToOne → Staff
approvedBy     uuid  ManyToOne → Staff nullable
status         enum  PriceChangeStatusEnum default PENDING
isActive       boolean default false
reason         text
```

---

## Files to Modify

All files under: `deyon_be/src/modules/core/entities/`

| File | Change type |
|---|---|
| `patientVitals.entity.ts` | Add episodeId FK, type all numeric columns |
| `episode.entity.ts` | Full rewrite with enums, columns, relations |
| `encounter.entity.ts` | Full rewrite with enums, columns, relations |
| `consultation.entity.ts` | Full rewrite with columns, relations |
| `appointment.entity.ts` | Full rewrite with enums, columns, relations |
| `labOrder.entity.ts` | Full rewrite with enums, columns, relations |
| `labOrderItem.entity.ts` | Full rewrite with relations |
| `labOrderResult.entity.ts` | Full rewrite with columns, relations |
| `labReferral.entity.ts` | Full rewrite with enums, columns, relations |
| `labReferralItem.entity.ts` | Full rewrite with columns, relations |
| `prescription.entity.ts` | Full rewrite with enum, columns, relations |
| `prescriptionItem.entity.ts` | Full rewrite — split dosage/freq/duration into value+unit pairs |
| `bill.entity.ts` | Full rewrite — add status column, enums, relations |
| `billItem.entity.ts` | Full rewrite with columns, relations |
| `payment.entity.ts` | Full rewrite — remove paymentHandler, add enums, relations |
| `claim.entity.ts` | Full rewrite with enum, columns, relations |
| `hmoContract.entity.ts` | Full rewrite with enum, columns, relations |
| `hmoRules.entity.ts` | Full rewrite with jsonb logic, relations |
| `patientHmo.entity.ts` | Add patientId + hmoProviderId FK columns |
| `medicalService.entity.ts` | Full rewrite with columns, relations |
| `medicalServiceCategory.entity.ts` | Add column type, relations |
| `inventory.entity.ts` | Replace supplier varchar → supplierId FK, type all columns |
| `inventoryCategory.entity.ts` | Add column type, relations |
| `restockRequest.entity.ts` | Full rewrite with enum, columns, relations |
| `restockRequestItem.entity.ts` | Full rewrite with columns, relations |
| `shift.entity.ts` | Full rewrite with enums, relations |
| `shiftSchedule.entity.ts` | Full rewrite with enums, time type |
| `staffShiftSchedule.entity.ts` | Rename shiftId → shiftScheduleId, add FKs |
| `testCatalog.entity.ts` | Full rewrite with columns, relations |
| `referenceRange.entity.ts` | Full rewrite with enum, numeric types, relations |
| `partnerLab.entity.ts` | Full rewrite — fix typo, add enum, jsonb specializations |
| `episodeLog.entity.ts` | Full rewrite with enums, relations |
| `protocolBundles.entity.ts` | Full rewrite with columns, relations |
| `protocolBundleItems.entity.ts` | Full rewrite with enum, polymorphic serviceId |
| `serviceCodeCatalog.entity.ts` | Full rewrite with relations |
| `codingStandard.entity.ts` | Add column types |
| `medicalCode.entity.ts` | Full rewrite with columns, relations |
| `priceChange.entity.ts` | Full rewrite with enum, FK columns |
| `supplier.entity.ts` | **CREATE NEW** |

---

## Verification
1. Run `npm run build` in `deyon_be/` — no TypeScript errors.
2. Run TypeORM migration dry-run (`npx typeorm migration:generate`) — verify all tables/columns/FKs appear correctly.
3. Check for circular import issues (entities importing each other).
4. Verify each enum column renders as a PostgreSQL `ENUM` type in the generated SQL.
