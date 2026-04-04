# ClinicFlow Backend API Design

**Version:** 1.0.0
**Base URL:** `https://api.clinicflow.ng/api/v1`
**Date:** 2026-02-26

---

## Table of Contents

1. [Global Conventions](#global-conventions)
2. [Tier 0 — Foundation](#tier-0--foundation)
   - [Feature 1: Authentication & Authorization](#feature-1-authentication--authorization)
   - [Feature 2: Reference / Static Data](#feature-2-reference--static-data)
3. [Tier 1 — Configuration Layer](#tier-1--configuration-layer)
   - [Feature 3: User & Staff Management](#feature-3-user--staff-management)
   - [Feature 4: Department Management](#feature-4-department-management)
   - [Feature 5: Medical Service Categories](#feature-5-medical-service-categories)
   - [Feature 6: Medical Coding Standards & Codes](#feature-6-medical-coding-standards--codes)
   - [Feature 7: Suppliers](#feature-7-suppliers)
   - [Feature 8: Inventory Categories](#feature-8-inventory-categories)
   - [Feature 9: Partner Labs](#feature-9-partner-labs)
   - [Feature 10: Shift Schedules](#feature-10-shift-schedules)
   - [Feature 11: Medical Services & Price Approvals](#feature-11-medical-services--price-approvals)
   - [Feature 12: Service Code Catalog](#feature-12-service-code-catalog)
   - [Feature 13: Inventory Management](#feature-13-inventory-management)
   - [Feature 14: HMO Provider Management](#feature-14-hmo-provider-management)
   - [Feature 15: Lab Test Catalog](#feature-15-lab-test-catalog)
   - [Feature 16: Protocol Bundles](#feature-16-protocol-bundles)
4. [Tier 2 — Patient Core](#tier-2--patient-core)
   - [Feature 17: Patient Management](#feature-17-patient-management)
   - [Feature 18: Staff Roster & Scheduling](#feature-18-staff-roster--scheduling)
5. [Tier 3 — Visit Lifecycle](#tier-3--visit-lifecycle)
   - [Feature 19: Appointments](#feature-19-appointments)
   - [Feature 20: Episodes](#feature-20-episodes)
6. [Tier 4 — Clinical Flow Entry](#tier-4--clinical-flow-entry)
   - [Feature 21: Queue Management](#feature-21-queue-management)
   - [Feature 22: Vital Signs](#feature-22-vital-signs)
7. [Tier 5 — Clinical Documentation](#tier-5--clinical-documentation)
   - [Feature 23: Consultations](#feature-23-consultations)
   - [Feature 24: Lab Orders & Results](#feature-24-lab-orders--results)
   - [Feature 25: Prescriptions & Dispensing](#feature-25-prescriptions--dispensing)
8. [Tier 6 — Financial](#tier-6--financial)
   - [Feature 26: Billing & Payments](#feature-26-billing--payments)
   - [Feature 27: HMO Claims](#feature-27-hmo-claims)
9. [Tier 7 — Operations](#tier-7--operations)
   - [Feature 28: Cashier Shift Management](#feature-28-cashier-shift-management)
   - [Feature 29: Stock Requests](#feature-29-stock-requests)
   - [Feature 30: Lab Referrals](#feature-30-lab-referrals)
10. [Tier 8 — Cross-Cutting](#tier-8--cross-cutting)
    - [Feature 31: Notifications](#feature-31-notifications)
    - [Feature 32: Audit Logging](#feature-32-audit-logging)
    - [Feature 33: Reports & Analytics](#feature-33-reports--analytics)
    - [Feature 34: Permissions Management](#feature-34-permissions-management)
11. [Hook-to-Endpoint Mapping](#hook-to-endpoint-mapping)

---

## Global Conventions

### Authentication

All endpoints (except `/auth/login` and `/auth/refresh`) require:

```
Authorization: Bearer <jwt_access_token>
```

JWTs encode `{ userId, role, exp }`. Access tokens expire in **15 minutes**; refresh tokens in **7 days**.

### Response Envelope

All responses are wrapped in a standard envelope:

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 200,
    "totalPages": 8
  },
  "errors": null
}
```

- On success: `data` is populated, `errors` is `null`.
- On error: `data` is `null`, `errors` is an array of error objects.

### Pagination

```
GET /resource?page=1&limit=25&sort=createdAt&order=desc
```

| Param   | Type   | Default    | Description                     |
|---------|--------|------------|---------------------------------|
| `page`  | int    | `1`        | Page number (1-indexed)         |
| `limit` | int    | `25`       | Records per page (max `100`)    |
| `sort`  | string | `createdAt`| Field to sort by                |
| `order` | string | `desc`     | `asc` or `desc`                 |

### Idempotency

All `POST` and `PUT` mutations accept an optional header:

```
Idempotency-Key: <uuid-v4>
```

The server caches the response for 24 hours and returns it verbatim on replay.

### Error Format

```json
{
  "errors": [
    {
      "code": "PATIENT_NOT_FOUND",
      "message": "No patient found with MRN CF-2024-00142",
      "field": null
    }
  ]
}
```

### HTTP Status Codes

| Code | Meaning                                    |
|------|--------------------------------------------|
| 200  | OK — read/update success                   |
| 201  | Created — new resource                     |
| 204  | No Content — delete success                |
| 400  | Bad Request — validation error             |
| 401  | Unauthorized — missing/expired token       |
| 403  | Forbidden — insufficient role              |
| 404  | Not Found                                  |
| 409  | Conflict — duplicate or state mismatch     |
| 422  | Unprocessable Entity — business rule error |
| 429  | Too Many Requests                          |
| 500  | Internal Server Error                      |

### Roles

| Role Key          | Label                 | Category  |
|-------------------|-----------------------|-----------|
| `cmo`             | Chief Medical Officer | Executive |
| `hospital_admin`  | Hospital Administrator| Executive |
| `clinical_lead`   | Clinical Lead         | Executive |
| `doctor`          | Doctor                | Clinical  |
| `nurse`           | Nurse                 | Clinical  |
| `receptionist`    | Receptionist          | Support   |
| `cashier`         | Cashier               | Support   |
| `pharmacist`      | Pharmacist            | Hybrid    |
| `lab_tech`        | Lab Technician        | Hybrid    |
| `patient`         | Patient               | Portal    |

### Nigerian Context

- **MRN Format:** `CF-YYYY-NNNNN` (e.g., `CF-2024-00142`)
- **HMO:** NHIA-registered Health Maintenance Organizations (NHIA = National Health Insurance Authority)
- **LGA:** Local Government Area (sub-state administrative unit used in patient address)
- **Bank Codes:** CBN-assigned 3-digit codes (e.g., GTBank = `058`)
- **Currency:** Nigerian Naira (NGN, ₦)

---

## Tier 0 — Foundation

---

### Feature 1: Authentication & Authorization

**Description:** Handles login, token refresh, logout, and password management. No other feature depends on this being seeded first — it is the authentication gateway.

#### Data Model

```typescript
interface AuthTokenPair {
  accessToken: string;   // JWT, 15-minute expiry
  refreshToken: string;  // Opaque token, 7-day expiry
  expiresIn: number;     // Seconds until access token expiry
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RefreshRequest {
  refreshToken: string;
}
```

#### Endpoints

| Method | Path                       | Roles       | Description                                  |
|--------|----------------------------|-------------|----------------------------------------------|
| POST   | `/auth/login`              | public      | Authenticate user, return token pair         |
| POST   | `/auth/refresh`            | public      | Exchange refresh token for new access token  |
| POST   | `/auth/logout`             | any         | Invalidate refresh token server-side         |
| GET    | `/auth/me`                 | any         | Return current user profile from JWT         |
| POST   | `/auth/password/change`    | any         | Change own password (requires current)       |
| POST   | `/auth/password/reset`     | public      | Send password reset email                    |
| POST   | `/auth/password/reset/confirm` | public  | Confirm reset with token + new password      |

##### POST `/auth/login`

**Request Body:**
```json
{
  "email": "dr.adeola@clinicflow.ng",
  "password": "securePassword123"
}
```

**Response `200`:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
    "expiresIn": 900,
    "user": {
      "id": "usr-001",
      "name": "Dr. Adeola Okafor",
      "email": "dr.adeola@clinicflow.ng",
      "role": "doctor",
      "department": "General Medicine",
      "specialization": "Internal Medicine",
      "licenseNumber": "MDCN-12345",
      "avatar": null,
      "isActive": true,
      "createdAt": "2024-01-15T08:00:00Z"
    }
  },
  "meta": null,
  "errors": null
}
```

##### POST `/auth/refresh`

**Request Body:**
```json
{ "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..." }
```

**Response `200`:** Same shape as login response `data`.

---

### Feature 2: Reference / Static Data

**Description:** Read-only reference datasets consumed across the application — ICD-10 codes, Nigerian states/LGAs, bank codes, and Nigerian name corpus. These are largely static but version-controlled for cache-busting.

#### Endpoints

| Method | Path                            | Roles | Description                                      |
|--------|---------------------------------|-------|--------------------------------------------------|
| GET    | `/reference/icd10`              | any   | Search ICD-10 codes by query string              |
| GET    | `/reference/icd10/:code`        | any   | Get single ICD-10 code detail                    |
| GET    | `/reference/locations/states`   | any   | List all Nigerian states                         |
| GET    | `/reference/locations/lgas`     | any   | List LGAs, optionally filtered by state          |
| GET    | `/reference/banks`              | any   | List all CBN-recognized banks                    |
| GET    | `/reference/names/first`        | any   | List Nigerian first names (for autocomplete)     |
| GET    | `/reference/names/last`         | any   | List Nigerian last names (for autocomplete)      |

##### GET `/reference/icd10`

**Query Params:**

| Param    | Type   | Description                                |
|----------|--------|--------------------------------------------|
| `q`      | string | Search term (code or description)          |
| `category`| string| Filter by ICD-10 chapter category         |
| `limit`  | int    | Max results (default `20`, max `100`)      |

**Response `200`:**
```json
{
  "data": [
    { "code": "B50", "description": "Plasmodium falciparum malaria", "category": "Parasitic diseases" },
    { "code": "B51", "description": "Plasmodium vivax malaria", "category": "Parasitic diseases" }
  ],
  "meta": { "total": 2 },
  "errors": null
}
```

##### GET `/reference/locations/lgas`

**Query Params:**

| Param   | Type   | Description            |
|---------|--------|------------------------|
| `state` | string | Filter LGAs by state   |

**Response `200`:**
```json
{
  "data": [
    { "value": "ikeja", "label": "Ikeja", "state": "Lagos" },
    { "value": "alimosho", "label": "Alimosho", "state": "Lagos" }
  ],
  "meta": null,
  "errors": null
}
```

---

## Tier 1 — Configuration Layer

---

### Feature 3: User & Staff Management

**Description:** CRUD for system users (all roles). Manages staff profiles separate from patient records. Depends on: Auth (Tier 0).

#### Data Model

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  department?: string;
  specialization?: string;
  licenseNumber?: string;   // MDCN number for doctors
  createdAt: string;        // ISO 8601
  isActive: boolean;
}

interface CreateUserRequest {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  department?: string;
  specialization?: string;
  licenseNumber?: string;
  password: string;
}
```

#### Endpoints

| Method | Path                    | Roles                                      | Description                          |
|--------|-------------------------|--------------------------------------------|--------------------------------------|
| GET    | `/users`                | cmo, hospital_admin, clinical_lead         | List all users with filters          |
| POST   | `/users`                | cmo, hospital_admin                        | Create new user account              |
| GET    | `/users/:id`            | cmo, hospital_admin, clinical_lead         | Get user by ID                       |
| PUT    | `/users/:id`            | cmo, hospital_admin                        | Update user profile                  |
| PATCH  | `/users/:id/status`     | cmo, hospital_admin                        | Activate / deactivate user           |
| DELETE | `/users/:id`            | cmo                                        | Soft-delete user                     |
| GET    | `/users/by-role/:role`  | any                                        | List users filtered by role          |
| GET    | `/users/doctors`        | any                                        | Shortcut: list all active doctors    |

##### GET `/users`

**Query Params:**

| Param        | Type    | Description                     |
|--------------|---------|---------------------------------|
| `role`       | string  | Filter by role                  |
| `department` | string  | Filter by department            |
| `isActive`   | boolean | Filter active/inactive          |
| `search`     | string  | Search by name or email         |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "usr-001",
      "name": "Dr. Adeola Okafor",
      "email": "dr.adeola@clinicflow.ng",
      "phone": "08012345678",
      "role": "doctor",
      "department": "General Medicine",
      "specialization": "Internal Medicine",
      "licenseNumber": "MDCN-12345",
      "isActive": true,
      "createdAt": "2024-01-15T08:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 45, "totalPages": 2 },
  "errors": null
}
```

---

### Feature 4: Department Management

**Description:** Manages hospital departments (General Medicine, Pharmacy, Lab, etc.). Departments are required before Staff can be created. ROOT entity — no upstream dependencies.

#### Data Model

```typescript
interface Department {
  id: string;
  name: string;
  alias: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Endpoints

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/departments` | any | `FetchAllDepartmentsUsecase` |
| POST | `/departments` | cmo, hospital_admin | `CreateDepartmentUsecase` |
| GET | `/departments/:id` | any | `FetchDepartmentByIdUsecase` |
| PUT | `/departments/:id` | cmo, hospital_admin | `UpdateDepartmentUsecase` |

##### POST `/departments`

**Request Body:**
```json
{ "name": "General Medicine", "alias": "gen-med" }
```

**Response `201`:**
```json
{
  "data": { "id": "uuid", "name": "General Medicine", "alias": "gen-med", "createdAt": "2026-04-03T10:00:00Z" },
  "meta": null, "errors": null
}
```

##### GET `/departments`

**Query Params:**

| Param    | Type   | Description          |
|----------|--------|----------------------|
| `cursor` | string | Cursor for next page |
| `limit`  | int    | Records per page (default `25`, max `100`) |
| `search` | string | Filter by name       |

---

### Feature 5: Medical Service Categories

**Description:** Manages the top-level groupings for billable services (e.g. Consultation, Laboratory, Pharmacy, Procedure). MedicalService depends on this — categories must exist before services can be created. ROOT entity — no upstream dependencies.

#### Data Model

```typescript
interface MedicalServiceCategory {
  id: string;
  name: string;   // e.g. "Consultation", "Laboratory", "Pharmacy", "Procedure", "Admission"
  createdAt: string;
  updatedAt: string;
}
```

#### Endpoints

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/services/categories` | any | `FetchAllMedicalServiceCategoriesUsecase` |
| POST | `/services/categories` | cmo, hospital_admin | `CreateMedicalServiceCategoryUsecase` |
| GET | `/services/categories/:id` | any | `FetchMedicalServiceCategoryByIdUsecase` |
| PUT | `/services/categories/:id` | cmo, hospital_admin | `UpdateMedicalServiceCategoryUsecase` |

##### POST `/services/categories`

**Request Body:**
```json
{ "name": "Laboratory" }
```

**Response `201`:**
```json
{
  "data": { "id": "uuid", "name": "Laboratory", "createdAt": "2026-04-03T10:00:00Z" },
  "meta": null, "errors": null
}
```

---

### Feature 6: Medical Coding Standards & Codes

**Description:** Manages coding standards (ICD-10-CM, LOINC, NHIS) and their individual codes. Nigerian HMOs require specific code sets for claim submission. MedicalCode depends on CodingStandard. ROOT entity — CodingStandard has no upstream dependencies.

#### Data Model

```typescript
interface CodingStandard {
  id: string;
  name: string;         // e.g. "ICD-10-CM", "LOINC", "NHIS"
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface MedicalCode {
  id: string;
  standardId: string;
  standard: CodingStandard;
  codeValue: string;    // e.g. "B50.0", "58410-2"
  description: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Endpoints

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/coding/standards` | any | `FetchAllCodingStandardsUsecase` |
| POST | `/coding/standards` | cmo, hospital_admin | `CreateCodingStandardUsecase` |
| GET | `/coding/standards/:id` | any | `FetchCodingStandardByIdUsecase` |
| PUT | `/coding/standards/:id` | cmo, hospital_admin | `UpdateCodingStandardUsecase` |
| GET | `/coding/standards/:id/codes` | any | `FetchCodesByStandardUsecase` |
| POST | `/coding/standards/:id/codes` | cmo, hospital_admin | `CreateMedicalCodeUsecase` |
| GET | `/coding/codes/:id` | any | `FetchMedicalCodeByIdUsecase` |
| PUT | `/coding/codes/:id` | cmo, hospital_admin | `UpdateMedicalCodeUsecase` |
| DELETE | `/coding/codes/:id` | cmo | `DeleteMedicalCodeUsecase` |

##### POST `/coding/standards`

**Request Body:**
```json
{ "name": "ICD-10-CM", "description": "International Classification of Diseases, 10th Revision, Clinical Modification" }
```

**Response `201`:**
```json
{
  "data": { "id": "uuid", "name": "ICD-10-CM", "description": "...", "createdAt": "2026-04-03T10:00:00Z" },
  "meta": null, "errors": null
}
```

##### POST `/coding/standards/:id/codes`

**Request Body:**
```json
{ "codeValue": "B50.0", "description": "Plasmodium falciparum malaria with cerebral complications" }
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "standardId": "uuid-of-icd10-standard",
    "codeValue": "B50.0",
    "description": "Plasmodium falciparum malaria with cerebral complications",
    "createdAt": "2026-04-03T10:00:00Z"
  },
  "meta": null, "errors": null
}
```

##### GET `/coding/standards/:id/codes`

**Query Params:**

| Param    | Type   | Description                         |
|----------|--------|-------------------------------------|
| `cursor` | string | Cursor for next page                |
| `limit`  | int    | Records per page (default `25`)     |
| `search` | string | Filter by codeValue or description  |

---

### Feature 7: Suppliers

**Description:** Manages inventory suppliers (pharmaceutical companies, medical equipment vendors). Required before inventory items can be created. ROOT entity — no upstream dependencies.

#### Data Model

```typescript
interface Supplier {
  id: string;
  name: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

#### Endpoints

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/suppliers` | hospital_admin, cmo, pharmacist | `FetchAllSuppliersUsecase` |
| POST | `/suppliers` | hospital_admin, cmo | `CreateSupplierUsecase` |
| GET | `/suppliers/:id` | hospital_admin, cmo, pharmacist | `FetchSupplierByIdUsecase` |
| PUT | `/suppliers/:id` | hospital_admin, cmo | `UpdateSupplierUsecase` |
| PATCH | `/suppliers/:id/status` | hospital_admin, cmo | `ToggleSupplierStatusUsecase` |

##### POST `/suppliers`

**Request Body:**
```json
{
  "name": "PharmaCo Nigeria Ltd",
  "contactPhone": "08012345678",
  "contactEmail": "sales@pharmaco.ng",
  "address": "14 Industrial Ave, Lagos"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "name": "PharmaCo Nigeria Ltd",
    "contactPhone": "08012345678",
    "contactEmail": "sales@pharmaco.ng",
    "address": "14 Industrial Ave, Lagos",
    "isActive": true,
    "createdAt": "2026-04-03T10:00:00Z"
  },
  "meta": null, "errors": null
}
```

##### GET `/suppliers`

**Query Params:**

| Param      | Type    | Description                         |
|------------|---------|-------------------------------------|
| `cursor`   | string  | Cursor for next page                |
| `limit`    | int     | Records per page (default `25`)     |
| `search`   | string  | Filter by name                      |
| `isActive` | boolean | Filter by active status             |

---

### Feature 8: Inventory Categories

**Description:** Manages top-level inventory groupings (Antibiotics, Consumables, Equipment, etc.). Required before inventory items can be created. ROOT entity — no upstream dependencies.

#### Data Model

```typescript
interface InventoryCategory {
  id: string;
  name: string;   // e.g. "Antibiotics", "Consumables", "Surgical Equipment"
  createdAt: string;
  updatedAt: string;
}
```

#### Endpoints

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/inventory/categories` | hospital_admin, cmo, pharmacist, lab_tech | `FetchAllInventoryCategoriesUsecase` |
| POST | `/inventory/categories` | hospital_admin, cmo | `CreateInventoryCategoryUsecase` |
| GET | `/inventory/categories/:id` | hospital_admin, cmo, pharmacist | `FetchInventoryCategoryByIdUsecase` |
| PUT | `/inventory/categories/:id` | hospital_admin, cmo | `UpdateInventoryCategoryUsecase` |

##### POST `/inventory/categories`

**Request Body:**
```json
{ "name": "Antibiotics" }
```

**Response `201`:**
```json
{
  "data": { "id": "uuid", "name": "Antibiotics", "createdAt": "2026-04-03T10:00:00Z" },
  "meta": null, "errors": null
}
```

---

### Feature 9: Partner Labs

**Description:** Manages external partner laboratories for test referrals. Required before lab referrals can be created. ROOT entity — no upstream dependencies. See Feature 30 for referral operations.

#### Data Model

```typescript
interface PartnerLab {
  id: string;
  name: string;
  code: string;               // Short unique identifier e.g. "CLINA"
  address?: string;
  status: 'active' | 'inactive';
  contactPhone: string;
  specializations: string[];  // e.g. ["Microbiology", "Histopathology"]
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Endpoints

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/labs/partners` | any | `FetchAllPartnerLabsUsecase` |
| POST | `/labs/partners` | cmo, hospital_admin | `CreatePartnerLabUsecase` |
| GET | `/labs/partners/:id` | any | `FetchPartnerLabByIdUsecase` |
| PUT | `/labs/partners/:id` | cmo, hospital_admin | `UpdatePartnerLabUsecase` |
| PATCH | `/labs/partners/:id/status` | cmo, hospital_admin | `TogglePartnerLabStatusUsecase` |

##### POST `/labs/partners`

**Request Body:**
```json
{
  "name": "Clina-Lancet Laboratories",
  "code": "CLINA",
  "address": "15 Burma Road, Apapa, Lagos",
  "contactPhone": "07012345678",
  "contactEmail": "referrals@clina-lancet.ng",
  "specializations": ["Microbiology", "Histopathology", "Molecular Diagnostics"]
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Clina-Lancet Laboratories",
    "code": "CLINA",
    "status": "active",
    "specializations": ["Microbiology", "Histopathology", "Molecular Diagnostics"],
    "createdAt": "2026-04-03T10:00:00Z"
  },
  "meta": null, "errors": null
}
```

##### GET `/labs/partners`

**Query Params:**

| Param           | Type    | Description                              |
|-----------------|---------|------------------------------------------|
| `cursor`        | string  | Cursor for next page                     |
| `limit`         | int     | Records per page (default `25`)          |
| `search`        | string  | Filter by name or code                   |
| `status`        | string  | `active` or `inactive`                   |
| `specialization`| string  | Filter by specialization                 |

---

### Feature 10: Shift Schedules

**Description:** Manages the recurring weekly shift schedule templates (morning/afternoon/night per day of week). Staff shift assignments reference these templates. ROOT entity — no upstream dependencies.

#### Data Model

```typescript
interface ShiftSchedule {
  id: string;
  timeOfDay: 'morning' | 'afternoon' | 'night';
  startTime: string;   // HH:mm e.g. "07:00"
  endTime: string;     // HH:mm e.g. "15:00"
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  createdAt: string;
  updatedAt: string;
}
```

#### Endpoints

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/shifts/schedules` | cmo, hospital_admin, clinical_lead | `FetchAllShiftSchedulesUsecase` |
| POST | `/shifts/schedules` | cmo, hospital_admin | `CreateShiftScheduleUsecase` |
| GET | `/shifts/schedules/:id` | cmo, hospital_admin, clinical_lead | `FetchShiftScheduleByIdUsecase` |
| PUT | `/shifts/schedules/:id` | cmo, hospital_admin | `UpdateShiftScheduleUsecase` |
| DELETE | `/shifts/schedules/:id` | cmo | `DeleteShiftScheduleUsecase` |

##### POST `/shifts/schedules`

**Request Body:**
```json
{
  "timeOfDay": "morning",
  "startTime": "07:00",
  "endTime": "15:00",
  "day": "monday"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "timeOfDay": "morning",
    "startTime": "07:00",
    "endTime": "15:00",
    "day": "monday",
    "createdAt": "2026-04-03T10:00:00Z"
  },
  "meta": null, "errors": null
}
```

---

### Feature 11: Medical Services & Price Approvals

**Description:** Manages the hospital's catalog of billable services. All new services start as `pending` and require CMO approval before going live. Depends on: MedicalServiceCategory (Feature 5).

> **Pricing model:** Non-HMO patients pay `MedicalService.defaultPrice`. HMO patients pay `HmoContract.contractedPrice` (falls back to `defaultPrice` if null). See Feature 14 for HMO contract management.

#### Data Model

```typescript
interface MedicalService {
  id: string;
  code: string;                   // Hospital-assigned code e.g. "CONS-001"
  name: string;
  description?: string;
  medicalServiceCategoryId: string;
  category: MedicalServiceCategory;
  defaultPrice: number;           // NGN — price for cash/corporate patients
  isTaxable: boolean;
  isPremium: boolean;
  isRestricted: boolean;
  restrictionReason?: string;
  department?: 'front_desk' | 'lab' | 'pharmacy' | 'nursing' | 'all';
  status: 'pending' | 'approved' | 'rejected';  // Starts as pending; CMO approves
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PriceChange {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  currentPrice: number;
  requestedPrice: number;
  description: string;
  reason: string;
  requestedBy: string;
  requestedByName: string;
  approvedBy?: string;
  approvedByName?: string;
  status: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  createdAt: string;
}
```

#### Endpoints

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/services` | any | `FetchAllMedicalServicesUsecase` |
| POST | `/services` | hospital_admin, cmo | `CreateMedicalServiceUsecase` |
| GET | `/services/:id` | any | `FetchMedicalServiceByIdUsecase` |
| PUT | `/services/:id` | hospital_admin, cmo | `UpdateMedicalServiceUsecase` |
| PATCH | `/services/:id/status` | cmo | `ToggleMedicalServiceStatusUsecase` |
| GET | `/services/approvals` | cmo, hospital_admin | `FetchPendingServiceApprovalsUsecase` |
| PATCH | `/services/approvals/:id` | cmo | `ReviewMedicalServiceApprovalUsecase` |
| POST | `/services/price-approvals` | hospital_admin, clinical_lead | `CreatePriceChangeRequestUsecase` |
| GET | `/services/price-approvals` | cmo, hospital_admin | `FetchAllPriceChangeRequestsUsecase` |
| PATCH | `/services/price-approvals/:id` | cmo | `ReviewPriceChangeRequestUsecase` |
| POST | `/services/resolve-price` | doctor, nurse, pharmacist, lab_tech | `ResolvePriceUsecase` |

##### POST `/services`

**Request Body:**
```json
{
  "code": "CONS-001",
  "name": "General Consultation",
  "description": "Standard outpatient consultation with a general practitioner",
  "medicalServiceCategoryId": "uuid-of-consultation-category",
  "defaultPrice": 5000,
  "isTaxable": false,
  "isPremium": false,
  "isRestricted": false,
  "department": "front_desk"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "code": "CONS-001",
    "name": "General Consultation",
    "status": "pending",
    "isActive": false,
    "defaultPrice": 5000,
    "category": { "id": "uuid", "name": "Consultation" },
    "createdAt": "2026-04-03T10:00:00Z"
  },
  "meta": null, "errors": null
}
```

##### GET `/services`

**Query Params:**

| Param        | Type    | Description                                   |
|--------------|---------|-----------------------------------------------|
| `cursor`     | string  | Cursor for next page                          |
| `limit`      | int     | Records per page (default `25`, max `100`)    |
| `categoryId` | string  | Filter by medical service category            |
| `department` | string  | Filter by department                          |
| `status`     | string  | `pending`, `approved`, `rejected`             |
| `isActive`   | boolean | Filter active services only                   |
| `search`     | string  | Search by code or name                        |

##### PATCH `/services/approvals/:id`

**Request Body:**
```json
{ "action": "approved", "reviewNotes": "Pricing is appropriate and service is needed" }
```

**Response `200`:**
```json
{
  "data": { "id": "uuid", "status": "approved", "isActive": true },
  "meta": null, "errors": null
}
```

##### POST `/services/price-approvals`

**Request Body:**
```json
{
  "serviceId": "uuid-of-service",
  "requestedPrice": 6000,
  "description": "Annual price review",
  "reason": "Increase in cost of materials and inflation adjustment"
}
```

##### PATCH `/services/price-approvals/:id`

**Request Body:**
```json
{ "action": "approved", "reviewNotes": "Pricing aligns with market rates" }
```

---

### Feature 12: Service Code Catalog

**Description:** Links a MedicalService to a MedicalCode from an external coding standard (ICD-10, LOINC, NHIS). Optionally scoped to a specific HMO provider. The TestCatalog (Feature 15) hangs off of this entity. Depends on: MedicalService (Feature 11) + MedicalCode (Feature 6) + optional HmoProvider (Feature 14).

#### Data Model

```typescript
interface ServiceCodeCatalog {
  id: string;
  serviceId: string;
  service: MedicalService;
  medicalCodeId: string;
  medicalCode: MedicalCode;
  hmoProviderId?: string;     // Optional: scoped to a specific HMO's code mapping
  hmoProvider?: HmoProvider;
  createdAt: string;
  updatedAt: string;
}
```

#### Endpoints

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/services/:serviceId/codes` | any | `FetchServiceCodeCatalogsUsecase` |
| POST | `/services/:serviceId/codes` | cmo, hospital_admin | `CreateServiceCodeCatalogUsecase` |
| GET | `/services/:serviceId/codes/:catalogId` | any | `FetchServiceCodeCatalogByIdUsecase` |
| DELETE | `/services/:serviceId/codes/:catalogId` | cmo | `DeleteServiceCodeCatalogUsecase` |

##### POST `/services/:serviceId/codes`

**Request Body:**
```json
{
  "medicalCodeId": "uuid-of-b50-icd10-code",
  "hmoProviderId": "uuid-of-hygeia-hmo"
}
```
> `hmoProviderId` is optional. Omit for a standard (non-HMO-specific) code mapping.

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "serviceId": "uuid-of-service",
    "medicalCode": { "id": "uuid", "codeValue": "B50.0", "description": "Plasmodium falciparum malaria with cerebral complications" },
    "hmoProvider": { "id": "uuid", "name": "Hygeia HMO", "code": "HYGEIA" },
    "createdAt": "2026-04-03T10:00:00Z"
  },
  "meta": null, "errors": null
}
```

---

### Feature 13: Inventory Management

**Description:** Tracks medicines, consumables, and equipment. Manages stock levels, reorder points, and expiry. Depends on: InventoryCategory (Feature 8), Supplier (Feature 7).

#### Data Model

```typescript
interface InventoryItem {
  id: string;
  name: string;
  categoryId: string;
  category: InventoryCategory;
  supplierId?: string;
  supplier?: Supplier;
  unit: string;                // e.g. "tablets", "vials", "units"
  currentStock: number;
  reorderLevel: number;
  unitCost: number;            // NGN
  expiryDate?: string;         // ISO 8601
  location?: string;           // e.g. "Pharmacy Store A", "Lab Fridge"
  createdAt: string;
  updatedAt: string;
}

interface StockAdjustment {
  inventoryItemId: string;
  adjustmentType: 'restock' | 'dispense' | 'write_off' | 'transfer';
  quantity: number;            // Positive = add, Negative = remove
  reason: string;
  referenceId?: string;        // e.g. prescription ID, stock-request ID
  performedBy: string;
}
```

#### Endpoints

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/inventory` | pharmacist, lab_tech, hospital_admin, cmo | `FetchAllInventoryUsecase` |
| POST | `/inventory` | hospital_admin, cmo | `CreateInventoryItemUsecase` |
| GET | `/inventory/:id` | pharmacist, lab_tech, hospital_admin, cmo | `FetchInventoryItemByIdUsecase` |
| PUT | `/inventory/:id` | hospital_admin, cmo | `UpdateInventoryItemUsecase` |
| POST | `/inventory/:id/adjust` | pharmacist, lab_tech, hospital_admin | `AdjustInventoryStockUsecase` |
| GET | `/inventory/low-stock` | pharmacist, hospital_admin, cmo | `FetchLowStockInventoryUsecase` |
| GET | `/inventory/expiring` | pharmacist, hospital_admin, cmo | `FetchExpiringInventoryUsecase` |

##### POST `/inventory`

**Request Body:**
```json
{
  "name": "Amoxicillin 500mg Capsules",
  "categoryId": "uuid-of-antibiotics-category",
  "supplierId": "uuid-of-pharmaco-supplier",
  "unit": "capsules",
  "currentStock": 500,
  "reorderLevel": 100,
  "unitCost": 50,
  "expiryDate": "2027-06-30T00:00:00Z",
  "location": "Pharmacy Store A"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Amoxicillin 500mg Capsules",
    "category": { "id": "uuid", "name": "Antibiotics" },
    "currentStock": 500,
    "reorderLevel": 100,
    "unitCost": 50,
    "location": "Pharmacy Store A",
    "createdAt": "2026-04-03T10:00:00Z"
  },
  "meta": null, "errors": null
}
```

##### GET `/inventory`

**Query Params:**

| Param        | Type    | Description                                 |
|--------------|---------|---------------------------------------------|
| `cursor`     | string  | Cursor for next page                        |
| `limit`      | int     | Records per page (default `25`, max `100`)  |
| `categoryId` | string  | Filter by category                          |
| `supplierId` | string  | Filter by supplier                          |
| `search`     | string  | Search by name                              |
| `lowStock`   | boolean | Only items at/below reorder level           |
| `location`   | string  | Filter by storage location                  |

##### GET `/inventory/expiring`

**Query Params:**

| Param  | Type | Description                                      |
|--------|------|--------------------------------------------------|
| `days` | int  | Items expiring within N days (default `30`)      |

---

### Feature 14: HMO Provider Management

**Description:** Manages Health Maintenance Organizations registered with the facility. Includes service contract configuration and clinical rule management per HMO. ROOT entity for HmoProvider — no upstream dependencies. HmoContract depends on: HmoProvider + MedicalService (Feature 11). HmoRules depends on: HmoProvider + MedicalService (Feature 11).

#### Data Model

```typescript
interface HMOProvider {
  id: string;
  name: string;
  code: string;                         // Short unique code e.g. "HYGEIA"
  contactPhone: string;
  contactEmail: string;
  claimsEmail: string;
  retractionEmail?: string;
  address: string;
  portalUrl?: string;
  relationshipManagerPhone?: string;
  defaultCopay: number;                 // Default flat NGN copay per visit (fallback)
  defaultCopayPercentage: number;       // Default copay percentage 0–100 (fallback)
  isActive: boolean;
}

// HmoContract: canonical HMO service coverage entity.
// Pricing model:
//   - HMO patients pay HmoContract.contractedPrice (falls back to MedicalService.defaultPrice if null)
//   - HMO covers: coveragePercentage% (PARTIAL_PERCENT) | coverageFlatAmount NGN (PARTIAL_FLAT) | 100% (FULL)
//   - Patient pays remainder
//   - If no HmoContract exists for a service, HmoProvider.defaultCopay/defaultCopayPercentage applies
interface HMOContract {
  id: string;
  hmoProviderId: string;
  serviceId: string;
  service: MedicalService;
  coverageType: 'full' | 'partial_percent' | 'partial_flat' | 'none';
  contractedPrice?: number;       // HMO-negotiated price (NGN). Null = use MedicalService.defaultPrice
  coveragePercentage?: number;    // 0–100. Used when coverageType = partial_percent
  coverageFlatAmount?: number;    // NGN. Used when coverageType = partial_flat
  maxCoveredAmount?: number;      // Cap on HMO coverage for partial types
  requiredPreAuthorization: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface HMORule {
  id: string;
  hmoProviderId: string;
  triggerServiceId: string;        // Which service triggers this rule
  triggerService: MedicalService;
  logic: HmoRuleLogicItem[];       // Array of rule conditions (stored as JSONB)
  errorMessage: string;            // Shown to staff when rule is violated
  createdAt: string;
  updatedAt: string;
}

// Example logic items:
// { "type": "require_pre_auth", "condition": "always" }
// { "type": "max_frequency", "value": 2, "period": "year" }
// { "type": "require_diagnosis", "codes": ["B50", "B51"] }
type HmoRuleLogicItem = Record<string, unknown>;
```

#### 14a: HMO Providers

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/hmo/providers` | any | `FetchAllHmoProvidersUsecase` ✅ |
| POST | `/hmo/providers` | cmo, hospital_admin | `CreateHmoProviderUsecase` ✅ |
| GET | `/hmo/providers/:id` | any | `FetchHmoProviderByIdUsecase` ✅ |
| GET | `/hmo/providers/:code/code` | any | `FetchHmoProviderByCodeUsecase` ✅ |
| PUT | `/hmo/providers/:id` | cmo, hospital_admin | `UpdateHmoProviderUsecase` ✅ |
| PATCH | `/hmo/providers/:id/status` | cmo, hospital_admin | `UpdateHmoProviderStatusUsecase` ✅ |

##### POST `/hmo/providers`

**Request Body:**
```json
{
  "name": "Hygeia HMO",
  "code": "HYGEIA",
  "contactPhone": "09087654321",
  "contactEmail": "provider@hygeia.ng",
  "claimsEmail": "claims@hygeia.ng",
  "retractionEmail": "retractions@hygeia.ng",
  "address": "Plot 1684, Sanusi Fafunwa Street, Victoria Island, Lagos",
  "portalUrl": "https://provider.hygeia.ng",
  "relationshipManagerPhone": "08098765432",
  "defaultCopay": 2000,
  "defaultCopayPercentage": 10
}
```

##### GET `/hmo/providers`

**Query Params:**

| Param      | Type    | Description                         |
|------------|---------|-------------------------------------|
| `cursor`   | string  | Cursor for next page                |
| `limit`    | int     | Records per page (default `25`)     |
| `search`   | string  | Filter by name or code              |
| `isActive` | boolean | Filter by active status             |

#### 14b: HMO Contracts

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/hmo/providers/:id/contracts` | any | `FetchHmoContractsByProviderUsecase` |
| POST | `/hmo/providers/:id/contracts` | cmo, hospital_admin | `CreateHmoContractUsecase` |
| GET | `/hmo/providers/:id/contracts/:contractId` | any | `FetchHmoContractByIdUsecase` |
| PUT | `/hmo/providers/:id/contracts/:contractId` | cmo, hospital_admin | `UpdateHmoContractUsecase` |
| PATCH | `/hmo/providers/:id/contracts/:contractId/status` | cmo, hospital_admin | `ToggleHmoContractStatusUsecase` |
| DELETE | `/hmo/providers/:id/contracts/:contractId` | cmo | `DeleteHmoContractUsecase` |

##### POST `/hmo/providers/:id/contracts`

**Request Body:**
```json
{
  "serviceId": "uuid-of-general-consultation-service",
  "coverageType": "partial_percent",
  "contractedPrice": 4500,
  "coveragePercentage": 80,
  "maxCoveredAmount": 3600,
  "requiredPreAuthorization": false
}
```

> For `coverageType: "full"` omit `coveragePercentage`, `coverageFlatAmount`, and `maxCoveredAmount`.
> For `coverageType: "partial_flat"` provide `coverageFlatAmount` instead of `coveragePercentage`.

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "hmoProvider": { "id": "uuid", "name": "Hygeia HMO", "code": "HYGEIA" },
    "service": { "id": "uuid", "code": "CONS-001", "name": "General Consultation", "defaultPrice": 5000 },
    "coverageType": "partial_percent",
    "contractedPrice": 4500,
    "coveragePercentage": 80,
    "coverageFlatAmount": null,
    "maxCoveredAmount": 3600,
    "requiredPreAuthorization": false,
    "isActive": true,
    "createdAt": "2026-04-03T10:00:00Z"
  },
  "meta": null, "errors": null
}
```

##### GET `/hmo/providers/:id/contracts`

**Query Params:**

| Param      | Type    | Description                              |
|------------|---------|------------------------------------------|
| `cursor`   | string  | Cursor for next page                     |
| `limit`    | int     | Records per page (default `25`)          |
| `serviceId`| string  | Filter by service                        |
| `isActive` | boolean | Filter active contracts only             |
| `coverageType` | string | Filter by coverage type              |

#### 14c: HMO Rules

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/hmo/providers/:id/rules` | cmo, hospital_admin | `FetchHmoRulesByProviderUsecase` |
| POST | `/hmo/providers/:id/rules` | cmo, hospital_admin | `CreateHmoRuleUsecase` |
| GET | `/hmo/providers/:id/rules/:ruleId` | cmo, hospital_admin | `FetchHmoRuleByIdUsecase` |
| PUT | `/hmo/providers/:id/rules/:ruleId` | cmo, hospital_admin | `UpdateHmoRuleUsecase` |
| DELETE | `/hmo/providers/:id/rules/:ruleId` | cmo | `DeleteHmoRuleUsecase` |

##### POST `/hmo/providers/:id/rules`

**Request Body:**
```json
{
  "triggerServiceId": "uuid-of-mri-service",
  "errorMessage": "MRI requires pre-authorization from Hygeia HMO before scheduling",
  "logic": [
    { "type": "require_pre_auth", "condition": "always" },
    { "type": "max_frequency", "value": 2, "period": "year" }
  ]
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "triggerService": { "id": "uuid", "code": "IMG-MRI-001", "name": "MRI Brain with Contrast" },
    "logic": [
      { "type": "require_pre_auth", "condition": "always" },
      { "type": "max_frequency", "value": 2, "period": "year" }
    ],
    "errorMessage": "MRI requires pre-authorization from Hygeia HMO before scheduling",
    "createdAt": "2026-04-03T10:00:00Z"
  },
  "meta": null, "errors": null
}
```

#### 14d: HMO Verification

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| POST | `/hmo/verify` | receptionist, cashier, nurse, doctor | `VerifyHmoEnrollmentUsecase` |

##### POST `/hmo/verify`

**Request Body:**
```json
{
  "hmoProviderId": "uuid-of-hygeia",
  "enrollmentId": "HYG-2024-88991",
  "patientName": "Chukwuemeka Obiora"
}
```

---

### Feature 15: Lab Test Catalog

**Description:** Manages available laboratory tests with reference ranges, methodology, and sample types. TestCatalog depends on ServiceCodeCatalog (Feature 12) — the service code link must exist before a test catalog entry can be created. ReferenceRange depends on TestCatalog.

#### Data Model

```typescript
interface TestCatalog {
  id: string;
  serviceCodeId: string;      // FK → ServiceCodeCatalog
  code: string;               // e.g. "LAB-FBC-001"
  name: string;               // e.g. "Full Blood Count (FBC)"
  sampleType: string;         // e.g. "EDTA whole blood"
  methodology?: string;       // e.g. "Flow cytometry"
  preparationInstructions?: string;
  defaultUnit: string;        // e.g. "cells/μL"
  isActive: boolean;
  referenceRanges: ReferenceRange[];
  createdAt: string;
  updatedAt: string;
}

interface ReferenceRange {
  id: string;
  testId: string;
  gender: 'male' | 'female' | 'both';
  minAgeYears?: number;       // null = no lower age bound
  maxAgeYears?: number;       // null = no upper age bound
  lowerBound: number;
  upperBound: number;
  criticalLowerBound?: number;
  criticalUpperBound?: number;
  createdAt: string;
  updatedAt: string;
}
```

#### Endpoints

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/lab/catalog` | any | `FetchAllTestCatalogsUsecase` |
| POST | `/lab/catalog` | cmo, hospital_admin, clinical_lead | `CreateTestCatalogUsecase` |
| GET | `/lab/catalog/:id` | any | `FetchTestCatalogByIdUsecase` |
| PUT | `/lab/catalog/:id` | cmo, hospital_admin | `UpdateTestCatalogUsecase` |
| PATCH | `/lab/catalog/:id/status` | cmo, hospital_admin | `ToggleTestCatalogStatusUsecase` |
| GET | `/lab/catalog/:id/reference-ranges` | any | `FetchReferenceRangesByTestUsecase` |
| POST | `/lab/catalog/:id/reference-ranges` | cmo, hospital_admin | `CreateReferenceRangeUsecase` |
| PUT | `/lab/catalog/:id/reference-ranges/:rangeId` | cmo, hospital_admin | `UpdateReferenceRangeUsecase` |
| DELETE | `/lab/catalog/:id/reference-ranges/:rangeId` | cmo | `DeleteReferenceRangeUsecase` |

##### POST `/lab/catalog`

**Request Body:**
```json
{
  "serviceCodeId": "uuid-of-service-code-catalog-entry",
  "code": "LAB-FBC-001",
  "name": "Full Blood Count (FBC)",
  "sampleType": "EDTA whole blood",
  "methodology": "Flow cytometry",
  "preparationInstructions": "No fasting required. Collect 3 mL EDTA whole blood.",
  "defaultUnit": "cells/μL"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "code": "LAB-FBC-001",
    "name": "Full Blood Count (FBC)",
    "sampleType": "EDTA whole blood",
    "defaultUnit": "cells/μL",
    "isActive": true,
    "referenceRanges": [],
    "createdAt": "2026-04-03T10:00:00Z"
  },
  "meta": null, "errors": null
}
```

##### GET `/lab/catalog`

**Query Params:**

| Param      | Type    | Description                          |
|------------|---------|--------------------------------------|
| `cursor`   | string  | Cursor for next page                 |
| `limit`    | int     | Records per page (default `25`)      |
| `search`   | string  | Search by code or name               |
| `isActive` | boolean | Filter active tests only             |

##### POST `/lab/catalog/:id/reference-ranges`

**Request Body:**
```json
{
  "gender": "both",
  "minAgeYears": 18,
  "maxAgeYears": null,
  "lowerBound": 4.5,
  "upperBound": 11.0,
  "criticalLowerBound": 2.0,
  "criticalUpperBound": 30.0
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "testId": "uuid-of-fbc-catalog",
    "gender": "both",
    "minAgeYears": 18,
    "maxAgeYears": null,
    "lowerBound": 4.5,
    "upperBound": 11.0,
    "criticalLowerBound": 2.0,
    "criticalUpperBound": 30.0,
    "createdAt": "2026-04-03T10:00:00Z"
  },
  "meta": null, "errors": null
}
```

---

### Feature 16: Protocol Bundles

**Description:** Manages clinical decision-support protocol bundles — ICD-10-triggered sets of services (lab tests, medications, procedures). ProtocolBundle depends on MedicalCode (Feature 6). ProtocolBundleItems depend on ProtocolBundle.

#### Data Model

```typescript
interface ProtocolBundle {
  id: string;
  name: string;
  medicalCodeId: string;    // ICD-10 or other code that triggers this bundle
  medicalCode: MedicalCode;
  items: ProtocolBundleItem[];
  createdAt: string;
  updatedAt: string;
}

interface ProtocolBundleItem {
  id: string;
  bundleId: string;
  serviceId: string;        // Points to the service (lab, pharmacy, procedure, etc.)
  serviceType: 'consultation' | 'lab' | 'pharmacy' | 'procedure' | 'admission' | 'other';
  isCompulsory: boolean;    // If false, clinician can opt out
  createdAt: string;
  updatedAt: string;
}
```

#### Endpoints

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/protocols` | any | `FetchAllProtocolBundlesUsecase` |
| POST | `/protocols` | cmo, hospital_admin, clinical_lead | `CreateProtocolBundleUsecase` |
| GET | `/protocols/:id` | any | `FetchProtocolBundleByIdUsecase` |
| PUT | `/protocols/:id` | cmo, hospital_admin | `UpdateProtocolBundleUsecase` |
| DELETE | `/protocols/:id` | cmo | `DeleteProtocolBundleUsecase` |
| GET | `/protocols/by-code/:codeValue` | any | `FetchProtocolBundleByCodeUsecase` |
| POST | `/protocols/:id/items` | cmo, hospital_admin, clinical_lead | `AddProtocolBundleItemUsecase` |
| DELETE | `/protocols/:id/items/:itemId` | cmo, hospital_admin | `RemoveProtocolBundleItemUsecase` |

##### POST `/protocols`

**Request Body:**
```json
{
  "name": "Malaria Workup Bundle",
  "medicalCodeId": "uuid-of-b50-icd10-code"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Malaria Workup Bundle",
    "medicalCode": { "id": "uuid", "codeValue": "B50", "description": "Plasmodium falciparum malaria" },
    "items": [],
    "createdAt": "2026-04-03T10:00:00Z"
  },
  "meta": null, "errors": null
}
```

##### POST `/protocols/:id/items`

**Request Body:**
```json
{
  "serviceId": "uuid-of-malaria-rdt-service",
  "serviceType": "lab",
  "isCompulsory": true
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "bundleId": "uuid-of-bundle",
    "serviceId": "uuid-of-malaria-rdt",
    "serviceType": "lab",
    "isCompulsory": true,
    "createdAt": "2026-04-03T10:00:00Z"
  },
  "meta": null, "errors": null
}
```

---

## Tier 2 — Patient Core

---

### Feature 17: Patient Management

**Description:** Core patient demographic registry. Supports registration, search, profile editing, HMO enrollment, and medical history management. MRN is server-generated in `CF-YYYY-NNNNN` format. Depends on: Auth, Reference Data (Tier 0), HMO Providers (Tier 1).

#### Data Model

```typescript
interface Patient {
  id: string;
  mrn: string;                    // CF-YYYY-NNNNN, server-generated
  firstname: string;
  lastname: string;
  middlename?: string | null;     // nullable
  dateOfBirth: string;            // ISO 8601 date, e.g. "1990-06-15"
  gender: 'male' | 'female' | 'other';
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  phoneNumber: string;            // unique
  email?: string | null;          // optional; unique when provided
  address: string;
  lgaId: string;                  // UUID → LGA; state derived server-side from LGA lookup
  nationality: string;
  occupation?: string;
  paymentType: 'cash' | 'hmo' | 'corporate';
  hmoDetails?: {
    providerId: string;
    providerName: string;
    enrollmentId: string;
    planType: string;
    expiryDate: string;
    copayAmount: number;          // NGN
    isActive: boolean;
  };
  nextOfKin: {
    name: string;
    relationship: string;         // e.g. "Wife", "Son", "Guardian"
    address: string;
    phoneNumber: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PatientMedicalHistoryEntry {
  id: string;
  patientId: string;
  catalogId: string;              // FK → MedicalCatalog
  catalogName: string;            // e.g. "Penicillin Allergy", "Type 2 Diabetes"
  catalogType: 'allergy' | 'chronic_condition' | 'surgical_history' | 'family_history';
  customName?: string | null;     // override if condition not in catalog
  severity?: string;              // e.g. "mild", "moderate", "severe"
  addedBy: string;                // Staff UUID (auto from JWT)
  addedByName: string;
  createdAt: string;
}
```

> **Entity changes:** `middlename` is nullable. `nextOfKin` JSON shape includes `relationship` field. Location stored as `lgaId` (UUID FK); state is derived server-side from the LGA record.

---

#### 17a: Patient Registration & Profile

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/patients` | receptionist, nurse, doctor, cashier, pharmacist, lab_tech, clinical_lead, hospital_admin, cmo | `FetchAllPatientsUsecase` |
| POST | `/patients` | receptionist, nurse, hospital_admin, cmo | `CreatePatientUsecase` |
| GET | `/patients/:id` | any | `FetchPatientByIdUsecase` |
| PUT | `/patients/:id` | receptionist, nurse, hospital_admin, cmo | `UpdatePatientUsecase` |
| PATCH | `/patients/:id/status` | hospital_admin, cmo | `TogglePatientStatusUsecase` |

##### GET `/patients`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `search` | string | Filter by name, MRN, or phone |
| `paymentType` | string | Filter by payment type (`cash`, `hmo`, `corporate`) |
| `isActive` | boolean | Filter by active status |
| `lgaId` | string | Filter by LGA |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "mrn": "CF-2026-00142",
      "firstname": "Chukwuemeka",
      "lastname": "Obiora",
      "gender": "male",
      "dateOfBirth": "1990-06-15",
      "phoneNumber": "08023456789",
      "paymentType": "hmo",
      "isActive": true,
      "createdAt": "2026-04-01T08:00:00Z"
    }
  ],
  "meta": { "cursor": "next-cursor-token", "limit": 25 },
  "errors": null
}
```

##### POST `/patients`

**Request Body:**
```json
{
  "firstname": "Chukwuemeka",
  "lastname": "Obiora",
  "middlename": "Nonso",
  "dateOfBirth": "1990-06-15",
  "gender": "male",
  "bloodGroup": "O+",
  "maritalStatus": "married",
  "phoneNumber": "08023456789",
  "email": "chukwuemeka@example.com",
  "address": "14 Bourdillon Road, Ikoyi",
  "nationality": "Nigerian",
  "occupation": "Engineer",
  "paymentType": "hmo",
  "lgaId": "uuid-of-eti-osa-lga",
  "nextOfKin": {
    "name": "Adaeze Obiora",
    "relationship": "Wife",
    "address": "14 Bourdillon Road, Ikoyi",
    "phoneNumber": "08034567890"
  }
}
```

> **Validation:** `phoneNumber` and `email` (when provided) must be unique across all patients. Duplicate triggers `409 Conflict`.
> **HMO at registration:** Optional. Use `PATCH /patients/:id/hmo` (17b) to add or update HMO details after registration.

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "mrn": "CF-2026-00142",
    "firstname": "Chukwuemeka",
    "lastname": "Obiora",
    "middlename": "Nonso",
    "dateOfBirth": "1990-06-15",
    "gender": "male",
    "bloodGroup": "O+",
    "maritalStatus": "married",
    "phoneNumber": "08023456789",
    "email": "chukwuemeka@example.com",
    "address": "14 Bourdillon Road, Ikoyi",
    "lga": { "id": "uuid-of-eti-osa-lga", "name": "Eti-Osa", "state": "Lagos" },
    "nationality": "Nigerian",
    "occupation": "Engineer",
    "paymentType": "hmo",
    "hmoDetails": null,
    "nextOfKin": {
      "name": "Adaeze Obiora",
      "relationship": "Wife",
      "address": "14 Bourdillon Road, Ikoyi",
      "phoneNumber": "08034567890"
    },
    "isActive": true,
    "createdAt": "2026-04-04T09:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

**Error `409` — Duplicate phoneNumber:**
```json
{
  "data": null,
  "meta": null,
  "errors": [{ "field": "phoneNumber", "message": "A patient with this phone number already exists" }]
}
```

##### PUT `/patients/:id`

**Request Body:** Same shape as `POST /patients` (all fields). Partial updates not supported; send full demographic object.

**Response `200`:** Updated patient profile (same shape as `POST` 201 response).

##### PATCH `/patients/:id/status`

**Request Body:**
```json
{ "isActive": false }
```

**Response `200`:**
```json
{
  "data": { "id": "uuid", "isActive": false },
  "meta": null,
  "errors": null
}
```

---

#### 17b: HMO Enrollment

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| PATCH | `/patients/:id/hmo` | receptionist, hospital_admin, cmo | `UpdatePatientHmoEnrollmentUsecase` |

##### PATCH `/patients/:id/hmo`

**Request Body:**
```json
{
  "hmoProviderId": "uuid-of-hygeia",
  "enrollmentId": "HYG-2024-88991",
  "planType": "comprehensive",
  "expiryDate": "2027-01-31",
  "copayAmount": 2000
}
```

> **Business logic:** Replaces any existing HMO enrollment. If `paymentType` is not `hmo`, server automatically updates it to `hmo`. `expiryDate` must be a future date.

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "mrn": "CF-2026-00142",
    "paymentType": "hmo",
    "hmoDetails": {
      "providerId": "uuid-of-hygeia",
      "providerName": "Hygeia HMO",
      "enrollmentId": "HYG-2024-88991",
      "planType": "comprehensive",
      "expiryDate": "2027-01-31",
      "copayAmount": 2000,
      "isActive": true
    }
  },
  "meta": null,
  "errors": null
}
```

---

#### 17c: Patient Search

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/patients/search` | any | `SearchPatientsUsecase` |
| GET | `/patients/:id/summary` | any | `FetchPatientSummaryUsecase` |

##### GET `/patients/search`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search term — matches against name, MRN, phone, email |
| `limit` | int | Max results (default `10`) |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "mrn": "CF-2026-00142",
      "fullName": "Chukwuemeka Obiora",
      "gender": "male",
      "dateOfBirth": "1990-06-15",
      "phoneNumber": "08023456789",
      "paymentType": "hmo",
      "hmoProvider": "Hygeia HMO",
      "lastVisit": "2026-03-20T10:00:00Z"
    }
  ],
  "meta": { "total": 1 },
  "errors": null
}
```

##### GET `/patients/:id/summary`

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "mrn": "CF-2026-00142",
    "fullName": "Chukwuemeka Obiora",
    "age": 35,
    "gender": "male",
    "bloodGroup": "O+",
    "paymentType": "hmo",
    "hmoProvider": "Hygeia HMO",
    "enrollmentId": "HYG-2024-88991",
    "activeEpisodes": 1,
    "lastVisit": "2026-03-20T10:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

---

#### 17d: Medical History

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/patients/:id/medical-history` | doctor, nurse, clinical_lead, hospital_admin, cmo | `FetchPatientMedicalHistoryUsecase` |
| POST | `/patients/:id/medical-history` | doctor, nurse | `AddPatientMedicalHistoryUsecase` |
| DELETE | `/patients/:id/medical-history/:entryId` | doctor, clinical_lead, cmo | `RemovePatientMedicalHistoryEntryUsecase` |

##### GET `/patients/:id/medical-history`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `catalogType` | string | Filter by type: `allergy`, `chronic_condition`, `surgical_history`, `family_history` |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "catalogId": "uuid-of-penicillin-allergy",
      "catalogName": "Penicillin Allergy",
      "catalogType": "allergy",
      "severity": "severe",
      "addedByName": "Dr. Taiwo Adeyemi",
      "createdAt": "2026-01-15T10:00:00Z"
    },
    {
      "id": "uuid",
      "catalogId": "uuid-of-type2-diabetes",
      "catalogName": "Type 2 Diabetes Mellitus",
      "catalogType": "chronic_condition",
      "severity": null,
      "addedByName": "Dr. Taiwo Adeyemi",
      "createdAt": "2026-01-15T10:05:00Z"
    }
  ],
  "meta": null,
  "errors": null
}
```

##### POST `/patients/:id/medical-history`

**Request Body:**
```json
{
  "catalogId": "uuid-of-penicillin-allergy",
  "customName": null,
  "severity": "severe"
}
```

> `catalogId` must reference a valid `MedicalCatalog` entry. `catalogType` is derived server-side from the catalog record. `severity` is optional for non-allergy types.

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "patientId": "uuid-patient",
    "catalogId": "uuid-of-penicillin-allergy",
    "catalogName": "Penicillin Allergy",
    "catalogType": "allergy",
    "customName": null,
    "severity": "severe",
    "addedByName": "Nurse Ngozi Eze",
    "createdAt": "2026-04-04T09:30:00Z"
  },
  "meta": null,
  "errors": null
}
```

---

#### 17e: Patient Clinical Data

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/patients/:id/episodes` | doctor, nurse, clinical_lead, hospital_admin, cmo | `FetchEpisodesByPatientUsecase` |
| GET | `/patients/:id/lab-results` | doctor, nurse, lab_tech, clinical_lead, cmo | `FetchLabResultsByPatientUsecase` |

> These are convenience read-only projections. Full episode and lab-result detail lives in Feature 20 and Feature 24 endpoints respectively.

---

## Tier 3 — Visit Lifecycle

---

### Feature 18: Staff Roster & Scheduling

**Description:** Manages duty roster assignments — mapping staff to shift template definitions by day of week. Uses existing `ShiftSchedule` and `StaffShiftSchedule` entities (no separate WeeklyRoster table). Rosters can be created as drafts and published. Depends on: Auth, Users (Tier 0–1).

#### Data Model

```typescript
// Uses existing entities:
interface StaffShiftSchedule {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  shiftScheduleId: string;       // FK → ShiftSchedule (defines day + start/end time)
  shiftName: string;             // e.g. "Morning Monday"
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string;             // HH:mm
  endTime: string;               // HH:mm
  isDraft: boolean;
  publishedAt?: string;
  publishedBy?: string;
  createdAt: string;
}

interface ShiftSchedule {
  id: string;
  name: string;                  // e.g. "Morning Monday"
  dayOfWeek: string;
  startTime: string;             // HH:mm
  endTime: string;               // HH:mm
  shiftType: 'morning' | 'afternoon' | 'night';
}
```

---

#### 18a: Roster Assignment

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/roster` | any | `FetchRosterUsecase` |
| POST | `/roster` | hospital_admin, cmo, clinical_lead | `CreateRosterAssignmentsUsecase` |
| GET | `/roster/:id` | any | `FetchRosterByIdUsecase` |
| PUT | `/roster/:id` | hospital_admin, cmo, clinical_lead | `UpdateRosterAssignmentUsecase` |

##### GET `/roster`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `dayOfWeek` | string | Filter by day (`monday`–`sunday`) |
| `isDraft` | boolean | Filter draft/published assignments |
| `staffId` | string | Filter by staff member |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "staffId": "uuid-nurse-001",
      "staffName": "Ngozi Eze",
      "role": "nurse",
      "shiftScheduleId": "uuid-morning-monday",
      "shiftName": "Morning Monday",
      "dayOfWeek": "monday",
      "startTime": "07:00",
      "endTime": "15:00",
      "isDraft": false,
      "publishedAt": "2026-04-01T08:00:00Z"
    }
  ],
  "meta": { "cursor": null, "limit": 25 },
  "errors": null
}
```

##### POST `/roster`

> **Business logic:** `isDraft: true` creates assignments visible only to admin roles. Use `PATCH /roster/:id/publish` to make a draft assignment live.

**Request Body:**
```json
{
  "isDraft": false,
  "assignments": [
    { "staffId": "uuid-nurse-001", "shiftScheduleId": "uuid-morning-monday" },
    { "staffId": "uuid-nurse-002", "shiftScheduleId": "uuid-afternoon-monday" },
    { "staffId": "uuid-doctor-001", "shiftScheduleId": "uuid-morning-tuesday" }
  ]
}
```

**Response `201`:**
```json
{
  "data": [
    {
      "id": "uuid-1",
      "staffId": "uuid-nurse-001",
      "staffName": "Ngozi Eze",
      "shiftName": "Morning Monday",
      "dayOfWeek": "monday",
      "startTime": "07:00",
      "endTime": "15:00",
      "isDraft": false,
      "createdAt": "2026-04-04T10:00:00Z"
    },
    {
      "id": "uuid-2",
      "staffId": "uuid-nurse-002",
      "staffName": "Emeka Obi",
      "shiftName": "Afternoon Monday",
      "dayOfWeek": "monday",
      "startTime": "15:00",
      "endTime": "23:00",
      "isDraft": false,
      "createdAt": "2026-04-04T10:00:00Z"
    }
  ],
  "meta": null,
  "errors": null
}
```

---

#### 18b: Roster Publication & Views

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| PATCH | `/roster/:id/publish` | hospital_admin, cmo, clinical_lead | `PublishRosterAssignmentUsecase` |
| GET | `/roster/current` | any | `FetchCurrentRosterUsecase` |
| GET | `/roster/staff/:staffId` | any | `FetchStaffScheduleUsecase` |

##### PATCH `/roster/:id/publish`

**Request Body:** _(empty — no body required)_

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "isDraft": false,
    "publishedAt": "2026-04-04T10:30:00Z",
    "publishedBy": "uuid-admin-staff"
  },
  "meta": null,
  "errors": null
}
```

##### GET `/roster/current`

**Response `200`:** Array of all published `StaffShiftSchedule` records for the current week, grouped by day.

##### GET `/roster/staff/:staffId`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `dayOfWeek` | string | Filter to specific day |
| `includeDrafts` | boolean | Include draft assignments (admin only) |

---

### Feature 19: Appointments

**Description:** Manages scheduled patient visits. Supports booking, confirmation, rescheduling, and cancellation. Atomically creates a `QueueEntry` when status transitions to `checked_in`. `doctorId` is required (non-nullable). Depends on: Patients, Users (Tier 2).

#### Data Model

```typescript
interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;               // required; non-nullable
  doctorName: string;
  appointmentType: 'consultation' | 'follow_up' | 'emergency' | 'procedure' | 'lab_only';
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  scheduledAt: string;            // ISO 8601 datetime, e.g. "2026-04-10T09:00:00+01:00"
  scheduledDuration: number;      // minutes (default 30)
  reasonForVisit: string;
  notes?: string;
  cancelledBy?: string;           // Staff UUID — populated on soft-delete/cancel
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}
```

---

#### 19a: Appointment Booking

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/appointments` | receptionist, doctor, nurse, clinical_lead, hospital_admin, cmo | `FetchAllAppointmentsUsecase` |
| POST | `/appointments` | receptionist, doctor, nurse, clinical_lead, hospital_admin | `CreateAppointmentUsecase` |
| GET | `/appointments/:id` | any | `FetchAppointmentByIdUsecase` |
| PUT | `/appointments/:id` | receptionist, doctor, hospital_admin | `UpdateAppointmentUsecase` |
| DELETE | `/appointments/:id` | receptionist, hospital_admin, cmo | `CancelAppointmentUsecase` |

##### GET `/appointments`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `patientId` | string | Filter by patient |
| `doctorId` | string | Filter by doctor |
| `status` | string | Filter by status |
| `date` | string | Filter by scheduled date (ISO date) |
| `dateFrom` | string | Date range start |
| `dateTo` | string | Date range end |
| `type` | string | Filter by appointment type |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "patientName": "Chukwuemeka Obiora",
      "patientMrn": "CF-2026-00142",
      "doctorName": "Dr. Taiwo Adeyemi",
      "appointmentType": "consultation",
      "status": "scheduled",
      "scheduledAt": "2026-04-10T09:00:00+01:00",
      "scheduledDuration": 30,
      "reasonForVisit": "Follow-up for hypertension management"
    }
  ],
  "meta": { "cursor": null, "limit": 25 },
  "errors": null
}
```

##### POST `/appointments`

**Request Body:**
```json
{
  "patientId": "uuid-patient",
  "doctorId": "uuid-doctor",
  "appointmentType": "consultation",
  "scheduledAt": "2026-04-10T09:00:00+01:00",
  "scheduledDuration": 30,
  "reasonForVisit": "Follow-up for hypertension management",
  "notes": "Patient requested morning slot"
}
```

> **Validation:** `doctorId` is required. `scheduledAt` must be a future datetime. `scheduledDuration` defaults to `30` minutes if omitted.

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "patientId": "uuid-patient",
    "patientName": "Chukwuemeka Obiora",
    "patientMrn": "CF-2026-00142",
    "doctorId": "uuid-doctor",
    "doctorName": "Dr. Taiwo Adeyemi",
    "appointmentType": "consultation",
    "status": "scheduled",
    "scheduledAt": "2026-04-10T09:00:00+01:00",
    "scheduledDuration": 30,
    "reasonForVisit": "Follow-up for hypertension management",
    "notes": "Patient requested morning slot",
    "createdAt": "2026-04-04T10:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

##### DELETE `/appointments/:id`

> **Soft delete only.** Sets `status` to `cancelled` and records `cancelledBy` (from JWT). The appointment record is retained for audit. Returns `204 No Content`.

---

#### 19b: Check-In & Status Transitions

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| PATCH | `/appointments/:id/status` | receptionist, nurse, doctor, hospital_admin | `UpdateAppointmentStatusUsecase` |

**Status transition rules:**

| From | To | Allowed By |
|------|----|------------|
| `scheduled` | `confirmed` | receptionist, doctor |
| `confirmed` | `checked_in` | receptionist, nurse |
| `checked_in` | `in_progress` | doctor, nurse |
| `in_progress` | `completed` | doctor |
| any (except `completed`) | `cancelled` | receptionist, hospital_admin, cmo |
| `scheduled` or `confirmed` | `no_show` | receptionist |

##### PATCH `/appointments/:id/status` — Check-In (`checked_in`)

> **Atomic queue creation:** When `status` is `checked_in`, the server atomically (1) updates the appointment status and (2) creates a `QueueEntry` in the appropriate queue based on `appointmentType`:
> - `consultation` / `follow_up` → triage queue
> - `lab_only` → lab queue
> - `emergency` → triage queue with `priority: emergency`
> - `procedure` → triage queue

**Request Body:**
```json
{
  "status": "checked_in",
  "chiefComplaint": "Persistent headache and dizziness for 3 days",
  "priority": "normal"
}
```

> `chiefComplaint` and `priority` are optional and forwarded to the created `QueueEntry`. `priority` defaults to `normal`.

**Response `200`:**
```json
{
  "data": {
    "appointment": {
      "id": "uuid-appointment",
      "status": "checked_in"
    },
    "queueEntry": {
      "id": "uuid-queue-entry",
      "queueType": "triage",
      "priority": "normal",
      "queueNumber": 7,
      "status": "waiting"
    }
  },
  "meta": null,
  "errors": null
}
```

##### PATCH `/appointments/:id/status` — Other transitions

**Request Body:**
```json
{ "status": "confirmed" }
```

**Response `200`:**
```json
{
  "data": { "id": "uuid", "status": "confirmed" },
  "meta": null,
  "errors": null
}
```

---

#### 19c: Doctor Availability

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/appointments/doctor/:doctorId/slots` | receptionist, nurse | `FetchDoctorAvailableSlotsUsecase` |
| GET | `/appointments/today` | receptionist, nurse, doctor, clinical_lead | `FetchTodayAppointmentsUsecase` |

##### GET `/appointments/doctor/:doctorId/slots`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `date` | string | ISO date (default today) |
| `duration` | int | Slot duration in minutes (default `30`) |
| `days` | int | How many days ahead to check (default `1`) |

**Response `200`:**
```json
{
  "data": [
    { "time": "09:00", "available": true, "appointmentId": null },
    { "time": "09:30", "available": false, "appointmentId": "uuid-booked-appointment" },
    { "time": "10:00", "available": true, "appointmentId": null }
  ],
  "meta": { "date": "2026-04-10", "doctorId": "uuid-doctor" },
  "errors": null
}
```

##### GET `/appointments/today`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "patientName": "Chukwuemeka Obiora",
      "patientMrn": "CF-2026-00142",
      "doctorName": "Dr. Taiwo Adeyemi",
      "appointmentType": "consultation",
      "status": "confirmed",
      "scheduledAt": "2026-04-04T09:00:00+01:00"
    }
  ],
  "meta": { "date": "2026-04-04", "total": 1 },
  "errors": null
}
```

---

### Feature 20: Episodes

**Description:** An Episode groups all clinical and financial activity for a single care episode. Server-generates episode number in `EP-YYYY-NNNNN` format. Multiple open episodes per patient are allowed (soft warning, no hard block). Depends on: Patients, Appointments (Tier 2–3).

#### Data Model

```typescript
interface Episode {
  id: string;
  episodeNumber: string;              // EP-YYYY-NNNNN, server-generated
  patientId: string;
  patientName: string;
  patientMrn: string;
  status: 'open' | 'closed' | 'locked' | 'archived';
  appointmentId?: string | null;      // nullable UUID FK → Appointment (added via migration)
  autoCloseOnZeroBalance: boolean;    // default false (added via migration)
  // If true, server auto-closes when totalBalance = 0 and no pending lab orders or prescriptions
  createdAt: string;
  createdBy: string;
  closedAt?: string;
  lockedAt?: string;
  lockedBy?: string;
  lockReason?: string;
  billIds: string[];
  consultationIds: string[];
  labOrderIds: string[];
  prescriptionIds: string[];
  totalBilled: number;               // NGN
  totalPaid: number;                 // NGN
  totalBalance: number;              // NGN
  notes?: string;
  updatedAt: string;
}

interface EpisodeTimelineEvent {
  id: string;
  episodeId: string;
  timestamp: string;
  eventType: 'created' | 'bill_created' | 'consultation' | 'lab_ordered' | 'lab_results' | 'prescription' | 'follow_up' | 'status_changed' | 'locked' | 'unlocked' | 'auto_closed';
  description: string;
  actorName: string;
  actorRole: string;
  linkedEntityId?: string;
  linkedEntityType?: string;
}
```

> **Entity changes (migration required):** Add `appointmentId` (nullable UUID FK → Appointment) and `autoCloseOnZeroBalance` (boolean, default false) to the `Episode` entity.

---

#### 20a: Episode Lifecycle

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/episodes` | doctor, nurse, clinical_lead, hospital_admin, cmo, cashier | `FetchAllEpisodesUsecase` |
| POST | `/episodes` | receptionist, nurse | `CreateEpisodeUsecase` |
| GET | `/episodes/:id` | any | `FetchEpisodeByIdUsecase` |
| PATCH | `/episodes/:id/status` | doctor, nurse, clinical_lead, hospital_admin, cmo | `UpdateEpisodeStatusUsecase` |

##### GET `/episodes`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `patientId` | string | Filter by patient |
| `status` | string | Filter by status (`open`, `closed`, `locked`, `archived`) |
| `dateFrom` | string | Created date range start |
| `dateTo` | string | Created date range end |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "episodeNumber": "EP-2026-00089",
      "patientName": "Chukwuemeka Obiora",
      "patientMrn": "CF-2026-00142",
      "status": "open",
      "totalBilled": 15000,
      "totalPaid": 10000,
      "totalBalance": 5000,
      "createdAt": "2026-04-04T09:00:00Z"
    }
  ],
  "meta": { "cursor": null, "limit": 25 },
  "errors": null
}
```

##### POST `/episodes`

> **Warning — multiple open episodes:** If the patient already has an open episode, the server returns a `200` with a warning flag (not a hard block). Staff must confirm intent.

**Request Body:**
```json
{
  "patientId": "uuid-patient",
  "appointmentId": "uuid-appointment",
  "autoCloseOnZeroBalance": true,
  "notes": "Walk-in patient, unscheduled visit"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "episodeNumber": "EP-2026-00089",
    "patientId": "uuid-patient",
    "patientName": "Chukwuemeka Obiora",
    "patientMrn": "CF-2026-00142",
    "status": "open",
    "appointmentId": "uuid-appointment",
    "autoCloseOnZeroBalance": true,
    "notes": "Walk-in patient, unscheduled visit",
    "totalBilled": 0,
    "totalPaid": 0,
    "totalBalance": 0,
    "createdAt": "2026-04-04T09:00:00Z"
  },
  "meta": { "warning": null },
  "errors": null
}
```

**Status transition rules:**

| From | To | Allowed By |
|------|----|------------|
| `open` | `closed` | doctor, nurse, clinical_lead |
| `closed` | `open` | doctor, nurse (reopen) |
| `closed` | `locked` | hospital_admin, cmo |
| `locked` | `archived` | cmo |

##### PATCH `/episodes/:id/status`

**Request Body:**
```json
{ "status": "closed" }
```

**Response `200`:**
```json
{
  "data": { "id": "uuid", "status": "closed", "closedAt": "2026-04-04T14:00:00Z" },
  "meta": null,
  "errors": null
}
```

---

#### 20b: Diagnosis

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| PATCH | `/episodes/:id/diagnosis` | doctor, clinical_lead | `SetEpisodeDiagnosisUsecase` |

##### PATCH `/episodes/:id/diagnosis`

> **Business logic:** Replaces the entire diagnosis list for the episode. `diagnosisType` must be `provisional` or `final`. At most one diagnosis may be `final` per episode; multiple `provisional` are allowed.

**Request Body:**
```json
{
  "diagnoses": [
    { "medicalCodeId": "uuid-icd10-j069", "diagnosisType": "provisional" },
    { "medicalCodeId": "uuid-icd10-j1800", "diagnosisType": "final" }
  ],
  "clinicalNote": "Patient presents with acute URI. No fever. Likely viral."
}
```

**Response `200`:**
```json
{
  "data": {
    "episodeId": "uuid",
    "diagnoses": [
      {
        "medicalCodeId": "uuid-icd10-j069",
        "codeValue": "J06.9",
        "description": "Acute upper respiratory infection, unspecified",
        "diagnosisType": "provisional"
      },
      {
        "medicalCodeId": "uuid-icd10-j1800",
        "codeValue": "J18.0",
        "description": "Bronchopneumonia, unspecified organism",
        "diagnosisType": "final"
      }
    ],
    "clinicalNote": "Patient presents with acute URI. No fever. Likely viral.",
    "updatedAt": "2026-04-04T11:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

---

#### 20c: Follow-Up Scheduling

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| POST | `/episodes/:id/follow-up` | doctor, clinical_lead | `ScheduleEpisodeFollowUpUsecase` |

##### POST `/episodes/:id/follow-up`

> **Business logic:** Creates a new `Appointment` of type `follow_up` linked to the same patient. The episode is not closed — it remains open until staff manually transitions it.

**Request Body:**
```json
{
  "scheduledAt": "2026-05-03T10:00:00+01:00",
  "doctorId": "uuid-doctor",
  "reasonForVisit": "Hypertension follow-up in 4 weeks",
  "scheduledDuration": 20
}
```

**Response `201`:**
```json
{
  "data": {
    "appointmentId": "uuid-new-appointment",
    "scheduledAt": "2026-05-03T10:00:00+01:00",
    "appointmentType": "follow_up",
    "status": "scheduled"
  },
  "meta": null,
  "errors": null
}
```

---

#### 20d: Lock & Unlock (Audit Control)

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| PATCH | `/episodes/:id/lock` | hospital_admin, cmo | `LockEpisodeUsecase` |
| PATCH | `/episodes/:id/unlock` | hospital_admin, cmo | `UnlockEpisodeUsecase` |

##### PATCH `/episodes/:id/lock`

> **Constraint:** Episode must be in `closed` status before locking. Locking prevents any further edits to bills, consultations, prescriptions, or lab orders within the episode.

**Request Body:**
```json
{ "reason": "Billing audit for NHIA quarterly claim" }
```

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "status": "locked",
    "lockedAt": "2026-04-04T12:00:00Z",
    "lockedBy": "uuid-cmo-staff",
    "lockReason": "Billing audit for NHIA quarterly claim"
  },
  "meta": null,
  "errors": null
}
```

##### PATCH `/episodes/:id/unlock`

**Request Body:**
```json
{ "reason": "Audit completed, correcting billing line item" }
```

**Response `200`:**
```json
{
  "data": { "id": "uuid", "status": "closed", "lockedAt": null, "lockedBy": null, "lockReason": null },
  "meta": null,
  "errors": null
}
```

---

#### 20e: Timeline

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/episodes/:id/timeline` | any | `FetchEpisodeTimelineUsecase` |

##### GET `/episodes/:id/timeline`

> Chronological, unpaginated list of all events within an episode.

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "episodeId": "uuid",
      "timestamp": "2026-04-04T09:00:00Z",
      "eventType": "created",
      "description": "Episode opened at check-in",
      "actorName": "Ngozi Eze",
      "actorRole": "receptionist",
      "linkedEntityId": null,
      "linkedEntityType": null
    },
    {
      "id": "uuid",
      "episodeId": "uuid",
      "timestamp": "2026-04-04T10:30:00Z",
      "eventType": "consultation",
      "description": "Consultation started by Dr. Taiwo Adeyemi",
      "actorName": "Dr. Taiwo Adeyemi",
      "actorRole": "doctor",
      "linkedEntityId": "uuid-consultation",
      "linkedEntityType": "consultation"
    }
  ],
  "meta": null,
  "errors": null
}
```

---

## Tier 4 — Clinical Flow Entry

---

### Feature 21: Queue Management

**Description:** Real-time queue management across five queues: `triage`, `doctor_new`, `doctor_review`, `lab`, `pharmacy`. Includes priority management, payment clearance enforcement, pause/resume, and SSE-based real-time streaming. Depends on: Patients, Episodes (Tier 2–3).

**Architecture — Redis/DB Hybrid:**
- **Redis** holds live queue state (position, status, assignment, pause state). Updated on every status change. Used for real-time API responses.
- **DB (`QueueEntry`)** is written on patient entry and exit (2 writes per patient). Used for analytics — wait times, throughput, patient flow reports.

#### Data Model

```typescript
// Live queue entry — served from Redis
interface QueueEntry {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  episodeId?: string;
  queueType: 'triage' | 'doctor_new' | 'doctor_review' | 'lab' | 'pharmacy';
  status: 'waiting' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'no_show';
  priority: 'normal' | 'high' | 'emergency';
  queueNumber: number;
  joinedAt: string;
  calledAt?: string;
  completedAt?: string;
  waitTimeMinutes: number;
  paymentStatus: 'pending' | 'cleared' | 'hmo_verified' | 'emergency_override';
  paymentVerifiedBy?: string;
  paymentVerifiedAt?: string;
  pauseReason?: 'waiting_lab_results' | 'personal_urgent_issue' | 'patient_requested' | 'waiting_specialist' | 'other';
  pauseReasonOther?: string;
  pausedAt?: string;
  pausedBy?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: string;
  chiefComplaint?: string;
  notes?: string;
}

// Analytics snapshot — written to DB on entry and exit
interface QueueEntrySnapshot {
  id: string;
  patientId: string;
  episodeId?: string;
  queueType: string;
  priority: string;
  paymentStatus: string;
  enteredAt: string;
  exitedAt?: string;
  totalWaitMinutes?: number;
  exitReason?: 'completed' | 'cancelled' | 'no_show' | 'transferred';
  assignedTo?: string;
  chiefComplaint?: string;
  notes?: string;
}

interface QueueStats {
  queueType: string;
  total: number;
  waiting: number;
  inProgress: number;
  paused: number;
  averageWaitTime: number;
  longestWaitTime: number;
  emergencyCount: number;
}
```

---

#### 21a: Queue Operations

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/queue` | nurse, doctor, pharmacist, lab_tech, receptionist, clinical_lead, hospital_admin, cmo | `FetchQueueEntriesUsecase` |
| POST | `/queue` | receptionist, nurse | `AddPatientToQueueUsecase` |
| GET | `/queue/:id` | any | `FetchQueueEntryByIdUsecase` |

##### GET `/queue`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `queueType` | string | Filter by queue (`triage`, `doctor_new`, `doctor_review`, `lab`, `pharmacy`) |
| `status` | string | Filter by status |
| `priority` | string | Filter by priority |
| `paymentStatus` | string | Filter by payment clearance status |
| `patientId` | string | Filter by patient |
| `assignedTo` | string | Filter by assigned staff |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "patientName": "Chukwuemeka Obiora",
      "patientMrn": "CF-2026-00142",
      "queueType": "triage",
      "status": "waiting",
      "priority": "normal",
      "queueNumber": 7,
      "waitTimeMinutes": 12,
      "paymentStatus": "cleared",
      "chiefComplaint": "Fever and body aches for 2 days",
      "joinedAt": "2026-04-04T09:00:00Z"
    }
  ],
  "meta": null,
  "errors": null
}
```

##### POST `/queue`

**Request Body:**
```json
{
  "patientId": "uuid-patient",
  "episodeId": "uuid-episode",
  "queueType": "triage",
  "priority": "normal",
  "chiefComplaint": "Fever and body aches for 2 days",
  "notes": "Patient is a known hypertensive"
}
```

> `episodeId` and `chiefComplaint` are optional. `priority` defaults to `normal`. For `checked_in` appointments, this endpoint is called automatically (see 19b). Direct manual use is for walk-ins without an appointment.

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "patientId": "uuid-patient",
    "patientName": "Chukwuemeka Obiora",
    "patientMrn": "CF-2026-00142",
    "episodeId": "uuid-episode",
    "queueType": "triage",
    "status": "waiting",
    "priority": "normal",
    "queueNumber": 8,
    "paymentStatus": "pending",
    "chiefComplaint": "Fever and body aches for 2 days",
    "joinedAt": "2026-04-04T09:05:00Z"
  },
  "meta": null,
  "errors": null
}
```

---

#### 21b: Status & Assignment

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| PATCH | `/queue/:id/status` | nurse, doctor, pharmacist, lab_tech, receptionist | `UpdateQueueEntryStatusUsecase` |
| PATCH | `/queue/:id/assign` | nurse, doctor, pharmacist, lab_tech | `AssignQueueEntryUsecase` |
| PATCH | `/queue/:id/priority` | nurse, doctor, clinical_lead, cmo | `UpdateQueuePriorityUsecase` |

**Status transition rules:**

| From | To | Notes |
|------|----|-------|
| `waiting` | `in_progress` | Payment must be `cleared`, `hmo_verified`, or `emergency_override` |
| `waiting` | `no_show` | Receptionist or nurse action |
| `waiting` | `cancelled` | Any authorized role |
| `in_progress` | `paused` | Doctor only |
| `in_progress` | `completed` | Role matching queue type |
| `paused` | `in_progress` | Doctor only |

##### PATCH `/queue/:id/status`

**Request Body:**
```json
{ "status": "in_progress" }
```

> **Payment enforcement:** Server blocks the `waiting → in_progress` transition if `paymentStatus` is `pending`. Returns `422 Unprocessable Entity` with payment error unless `emergency_override` is set.

**Response `200`:**
```json
{
  "data": { "id": "uuid", "status": "in_progress", "calledAt": "2026-04-04T09:15:00Z" },
  "meta": null,
  "errors": null
}
```

**Error `422` — Payment not cleared:**
```json
{
  "data": null,
  "meta": null,
  "errors": [{ "field": "paymentStatus", "message": "Payment must be cleared before starting consultation" }]
}
```

##### PATCH `/queue/:id/assign`

**Request Body:**
```json
{ "staffId": "uuid-doctor" }
```

##### PATCH `/queue/:id/priority`

**Request Body:**
```json
{ "priority": "emergency" }
```

---

#### 21c: Payment & Emergency Override

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| PATCH | `/queue/:id/payment` | cashier, receptionist | `ClearQueuePaymentUsecase` |
| POST | `/queue/:id/emergency-override` | cmo, clinical_lead, hospital_admin | `EmergencyOverridePaymentUsecase` |

##### PATCH `/queue/:id/payment`

**Request Body:**
```json
{
  "paymentStatus": "hmo_verified",
  "verifiedBy": "uuid-cashier-staff",
  "reference": "HMO-VERF-2026-0042"
}
```

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "paymentStatus": "hmo_verified",
    "paymentVerifiedBy": "uuid-cashier-staff",
    "paymentVerifiedAt": "2026-04-04T09:12:00Z"
  },
  "meta": null,
  "errors": null
}
```

##### POST `/queue/:id/emergency-override`

**Request Body:**
```json
{
  "reason": "Patient in acute distress, cannot delay for payment",
  "authorizedBy": "uuid-cmo-staff"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid", "paymentStatus": "emergency_override" },
  "meta": null,
  "errors": null
}
```

---

#### 21d: Pause & Resume

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| PATCH | `/queue/:id/pause` | doctor | `PauseQueueEntryUsecase` |
| PATCH | `/queue/:id/resume` | doctor | `ResumeQueueEntryUsecase` |

##### PATCH `/queue/:id/pause`

**Request Body:**
```json
{
  "pauseReason": "waiting_lab_results",
  "pauseReasonOther": null,
  "notes": "Awaiting FBC and malaria parasite results"
}
```

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "status": "paused",
    "pauseReason": "waiting_lab_results",
    "pausedAt": "2026-04-04T10:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

##### PATCH `/queue/:id/resume`

**Request Body:** _(empty — no body required)_

**Response `200`:**
```json
{
  "data": { "id": "uuid", "status": "in_progress", "pauseReason": null, "pausedAt": null },
  "meta": null,
  "errors": null
}
```

---

#### 21e: Statistics

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/queue/stats` | nurse, doctor, clinical_lead, hospital_admin, cmo | `FetchAllQueueStatsUsecase` |
| GET | `/queue/stats/:queueType` | any | `FetchQueueStatsByTypeUsecase` |

##### GET `/queue/stats`

**Response `200`:**
```json
{
  "data": {
    "triage": {
      "queueType": "triage",
      "total": 15,
      "waiting": 8,
      "inProgress": 4,
      "paused": 1,
      "averageWaitTime": 18,
      "longestWaitTime": 45,
      "emergencyCount": 2
    },
    "lab": {
      "queueType": "lab",
      "total": 10,
      "waiting": 6,
      "inProgress": 3,
      "paused": 0,
      "averageWaitTime": 12,
      "longestWaitTime": 28,
      "emergencyCount": 0
    }
  },
  "meta": null,
  "errors": null
}
```

---

#### 21f: Real-Time SSE Stream

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/queue/stream/:queueType` | nurse, doctor, pharmacist, lab_tech, receptionist, clinical_lead, hospital_admin, cmo | `StreamQueueEventsByTypeUsecase` |

##### GET `/queue/stream/:queueType`

> **Protocol:** `text/event-stream` (Server-Sent Events). Auth is role-based (same permissions as `GET /queue`). Redis pub/sub channel: `queue:{queueType}` (e.g. `queue:triage`).

**Path param:** `queueType` — one of `triage`, `doctor_new`, `doctor_review`, `lab`, `pharmacy`

**SSE Events:**

| Event | Trigger |
|-------|---------|
| `queue_entry_added` | New patient joined the queue |
| `queue_status_changed` | Patient status updated (called, completed, cancelled, etc.) |
| `queue_stats_updated` | Stats snapshot after each change |
| `payment_cleared` | Payment status changed to `cleared` or `hmo_verified` |

**Sample SSE stream:**
```
event: queue_entry_added
data: {"entryId":"uuid","patientName":"Chukwuemeka Obiora","patientMrn":"CF-2026-00142","queueType":"triage","priority":"normal","queueNumber":8,"timestamp":"2026-04-04T09:05:00Z"}

event: queue_status_changed
data: {"entryId":"uuid","patientName":"Chukwuemeka Obiora","status":"in_progress","queueType":"triage","timestamp":"2026-04-04T09:15:00Z"}

event: queue_stats_updated
data: {"queueType":"triage","waiting":7,"inProgress":5,"paused":1,"averageWaitTime":17,"emergencyCount":2,"timestamp":"2026-04-04T09:15:01Z"}
```

---

### Feature 22: Vital Signs

**Description:** Records and retrieves patient vital signs. All fields are required (entity non-nullable). BMI is calculated server-side. Vital records are immutable after creation (no PUT/PATCH/DELETE). Alert flags are generated against WHO/clinical thresholds. Depends on: Patients, Episodes, Queue (Tier 2–4).

#### Data Model

```typescript
interface PatientVital {
  id: string;
  patientId: string;
  episodeId: string;              // required; non-nullable FK → Episode
  heartRate: number;              // BPM
  celsiusTemperature: number;     // °C
  systolicBloodPressure: number;  // mmHg
  diastolicBloodPressure: number; // mmHg
  kilogramWeight: number;         // kg
  centimetreHeight: number;       // cm
  bmi: number;                    // calculated: weight / (height/100)²
  respiratoryRate: number;        // breaths/min
  oxygenSaturation: number;       // % (SpO2)
  recordedBy: string;             // UUID FK → Staff (auto from JWT, non-nullable — added via migration)
  recordedByName: string;
  notes?: string | null;          // added via migration
  recordedAt: string;
}

interface VitalAlert {
  field: string;
  value: number;
  severity: 'warning' | 'critical';
  message: string;
}
```

> **Entity changes (migration required):** Add `recordedBy` (UUID FK → Staff, non-nullable, auto from JWT) and `notes` (text, nullable) to the `PatientVital` entity.
> **Immutability:** No PUT, PATCH, or DELETE endpoints. Corrections require a new vital record.

---

#### 22a: Recording Vitals

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/vitals` | nurse, doctor, clinical_lead, cmo, hospital_admin | `FetchAllVitalsUsecase` |
| POST | `/vitals` | nurse | `RecordPatientVitalsUsecase` |
| GET | `/vitals/:id` | nurse, doctor, clinical_lead, cmo | `FetchVitalByIdUsecase` |

##### GET `/vitals`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `episodeId` | string | Filter by episode |
| `patientId` | string | Filter by patient |
| `dateFrom` | string | Recorded date range start |
| `dateTo` | string | Recorded date range end |
| `recordedBy` | string | Filter by recording nurse |

##### POST `/vitals`

> **Alert thresholds (WHO/clinical standard):**

| Field | Warning | Critical |
|-------|---------|---------|
| `systolicBloodPressure` | ≥ 130 mmHg | ≥ 180 mmHg |
| `diastolicBloodPressure` | ≥ 80 mmHg | ≥ 120 mmHg |
| `celsiusTemperature` | ≥ 38.0 °C | ≥ 40.0 °C |
| `oxygenSaturation` | ≤ 94 % | ≤ 90 % |
| `heartRate` | < 50 or > 100 BPM | < 40 or > 130 BPM |
| `respiratoryRate` | < 10 or > 20 breaths/min | < 8 or > 30 breaths/min |

**Request Body:**
```json
{
  "episodeId": "uuid-episode",
  "celsiusTemperature": 37.8,
  "systolicBloodPressure": 140,
  "diastolicBloodPressure": 90,
  "heartRate": 88,
  "respiratoryRate": 18,
  "oxygenSaturation": 97,
  "kilogramWeight": 72.5,
  "centimetreHeight": 170,
  "notes": "Patient anxious at time of measurement"
}
```

> `recordedBy` is auto-populated from the JWT. All numeric fields are required. `notes` is optional.

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "episodeId": "uuid-episode",
    "heartRate": 88,
    "celsiusTemperature": 37.8,
    "systolicBloodPressure": 140,
    "diastolicBloodPressure": 90,
    "kilogramWeight": 72.5,
    "centimetreHeight": 170,
    "bmi": 25.09,
    "respiratoryRate": 18,
    "oxygenSaturation": 97,
    "recordedByName": "Ngozi Eze",
    "notes": "Patient anxious at time of measurement",
    "recordedAt": "2026-04-04T09:10:00Z",
    "alerts": [
      {
        "field": "systolicBloodPressure",
        "value": 140,
        "severity": "warning",
        "message": "Stage 1 Hypertension (≥130 mmHg systolic)"
      }
    ]
  },
  "meta": null,
  "errors": null
}
```

---

#### 22b: Patient Vitals History

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/vitals/patient/:patientId` | nurse, doctor, clinical_lead, cmo | `FetchVitalsByPatientUsecase` |
| GET | `/vitals/patient/:patientId/latest` | any | `FetchLatestVitalsByPatientUsecase` |

##### GET `/vitals/patient/:patientId`

> Chronological list of all vital records for a patient (cursor-paginated).

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `episodeId` | string | Filter to a specific episode |
| `dateFrom` | string | Date range start |
| `dateTo` | string | Date range end |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "episodeId": "uuid-episode",
      "celsiusTemperature": 37.8,
      "systolicBloodPressure": 140,
      "diastolicBloodPressure": 90,
      "heartRate": 88,
      "bmi": 25.09,
      "oxygenSaturation": 97,
      "recordedAt": "2026-04-04T09:10:00Z",
      "recordedByName": "Ngozi Eze"
    }
  ],
  "meta": { "cursor": null, "limit": 25 },
  "errors": null
}
```

##### GET `/vitals/patient/:patientId/latest`

**Response `200`:** Single vitals record (same shape as individual record) representing the most recently recorded entry.

---

#### 22c: Alerts

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/vitals/:id/alerts` | nurse, doctor | `FetchVitalAlertsUsecase` |

##### GET `/vitals/:id/alerts`

**Response `200`:**
```json
{
  "data": [
    {
      "field": "systolicBloodPressure",
      "value": 140,
      "severity": "warning",
      "message": "Stage 1 Hypertension (≥130 mmHg systolic)"
    }
  ],
  "meta": null,
  "errors": null
}
```

---


## Tier 5 — Clinical Documentation

---

### Feature 23: Consultations

**Description:** Full consultation lifecycle — draft, in-progress, finalized, and amendment. Captures chief complaint, HPI, examination, ICD-10 diagnoses, treatment plan, linked prescriptions, and lab orders. Supports versioning for audit. Depends on: Patients, Episodes, Queue, Vitals (Tier 2–4).

#### Data Model

```typescript
interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  episodeId: string;
  appointmentId?: string;
  chiefComplaint: string;
  historyOfPresentIllness: string;
  physicalExamination: string;
  selectedDiagnoses: Array<{ code: string; description: string; isPrimary: boolean }>;
  treatmentPlan: string;
  prescriptionItems: ConsultationPrescriptionItem[];
  labOrders: ConsultationLabOrder[];
  followUpDate?: string;
  notes?: string;
  bundleDeselections: BundleDeselectionRecord[];
  justifications: JustificationEntry[];
  status: 'draft' | 'in_progress' | 'finalized' | 'cancelled' | 'auto_closed';
  versions: ConsultationVersion[];
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

interface ConsultationVersion {
  version: number;
  amendedAt: string;
  amendedBy: string;
  amendedByName: string;
  reason: 'typo' | 'new_clinical_data' | 'hmo_rejection_fix' | 'other';
  reasonDetail?: string;
  snapshot: ConsultationFormData;
}
```

#### 23a: Consultation Lifecycle

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/consultations` | doctor, clinical_lead, cmo, hospital_admin | `FetchConsultationsUsecase` |
| POST | `/consultations` | doctor | `CreateConsultationUsecase` |
| GET | `/consultations/:id` | doctor, nurse, clinical_lead, cmo, pharmacist, lab_tech | `FetchConsultationByIdUsecase` |
| PUT | `/consultations/:id` | doctor | `UpdateConsultationUsecase` |
| PATCH | `/consultations/:id/finalize` | doctor | `FinalizeConsultationUsecase` |
| PATCH | `/consultations/:id/cancel` | doctor, clinical_lead, cmo | `CancelConsultationUsecase` |

##### GET `/consultations`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `status` | string | Filter by status: `draft`, `in_progress`, `finalized`, `cancelled` |
| `doctorId` | string | Filter by assigned doctor |
| `patientId` | string | Filter by patient |
| `episodeId` | string | Filter by episode |
| `dateFrom` | string | Start date filter (ISO 8601) |
| `dateTo` | string | End date filter (ISO 8601) |

> Doctor sees own consultations only. `clinical_lead` and `cmo` see all.

##### POST `/consultations`

**Request Body:**
```json
{
  "patientId": "uuid-patient",
  "episodeId": "uuid-episode",
  "doctorId": "uuid-doctor"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid-consultation",
    "patientId": "uuid-patient",
    "episodeId": "uuid-episode",
    "doctorId": "uuid-doctor",
    "status": "draft",
    "currentVersion": 1,
    "createdAt": "2026-04-03T09:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

> Only one active (`draft` or `in_progress`) consultation is allowed per episode at a time.

**Error `409`:**
```json
{
  "errors": [{ "code": "CONSULTATION_ALREADY_ACTIVE", "message": "An active consultation already exists for this episode" }]
}
```

##### PUT `/consultations/:id`

**Request Body:**
```json
{
  "chiefComplaint": "Persistent headache for 3 days",
  "historyOfPresentIllness": "Patient reports throbbing right-sided headache with photophobia...",
  "physicalExamination": "BP 130/85 mmHg, HR 88 bpm. CNS: alert and oriented...",
  "selectedDiagnoses": [
    { "code": "G43.9", "description": "Migraine, unspecified", "isPrimary": true }
  ],
  "treatmentPlan": "Sumatriptan 50mg stat, bed rest, review in 72 hrs",
  "followUpDate": "2026-04-07",
  "notes": "Patient has prior history of migraines"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-consultation", "status": "in_progress", "updatedAt": "2026-04-03T09:30:00Z" },
  "meta": null,
  "errors": null
}
```

> Updates are only allowed when status is `draft` or `in_progress`.

##### PATCH `/consultations/:id/finalize`

> Enforces required fields before finalizing: `chiefComplaint`, `historyOfPresentIllness`, `physicalExamination`, at least one `selectedDiagnoses` entry, and `treatmentPlan`. On success: status → `finalized` (read-only); linked prescriptions and lab orders are locked; doctor and nurse are notified.

**Response `200`:**
```json
{
  "data": { "id": "uuid-consultation", "status": "finalized", "finalizedAt": "2026-04-03T10:00:00Z" },
  "meta": null,
  "errors": null
}
```

**Error `422`:**
```json
{
  "errors": [{ "code": "CONSULTATION_MISSING_REQUIRED_FIELDS", "message": "chiefComplaint, treatmentPlan, and at least one diagnosis are required to finalize" }]
}
```

**Error `409`:**
```json
{
  "errors": [{ "code": "CONSULTATION_ALREADY_FINALIZED", "message": "Consultation has already been finalized" }]
}
```

##### PATCH `/consultations/:id/cancel`

**Request Body:**
```json
{
  "reason": "Patient left before consultation was completed"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-consultation", "status": "cancelled", "cancelledAt": "2026-04-03T10:15:00Z" },
  "meta": null,
  "errors": null
}
```

**Error `409`:**
```json
{
  "errors": [{ "code": "CONSULTATION_ALREADY_CANCELLED", "message": "Consultation has already been cancelled" }]
}
```

#### 23b: Amendment & Versioning

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| POST | `/consultations/:id/amend` | doctor, clinical_lead, cmo | `AmendConsultationUsecase` |
| GET | `/consultations/:id/versions` | doctor, clinical_lead, cmo | `FetchConsultationVersionsUsecase` |

##### POST `/consultations/:id/amend`

> Amendment is instant (no approval step). A full snapshot of the pre-amendment state is stored in the versions array with actor and reason. Allowed only on finalized consultations.

**Request Body:**
```json
{
  "reason": "hmo_rejection_fix",
  "reasonDetail": "Revised diagnosis code per HMO feedback — changed G43.9 to G43.1",
  "snapshot": {
    "chiefComplaint": "Persistent headache for 3 days",
    "historyOfPresentIllness": "Patient reports throbbing right-sided headache with photophobia...",
    "physicalExamination": "BP 130/85 mmHg, HR 88 bpm...",
    "selectedDiagnoses": [
      { "code": "G43.1", "description": "Migraine with aura", "isPrimary": true }
    ],
    "treatmentPlan": "Sumatriptan 50mg stat, bed rest, review in 72 hrs"
  }
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid-consultation",
    "currentVersion": 2,
    "versions": [
      {
        "version": 2,
        "amendedAt": "2026-04-04T08:00:00Z",
        "amendedBy": "uuid-doctor",
        "amendedByName": "Dr. Emeka Okafor",
        "reason": "hmo_rejection_fix",
        "reasonDetail": "Revised diagnosis code per HMO feedback"
      }
    ]
  },
  "meta": null,
  "errors": null
}
```

##### GET `/consultations/:id/versions`

**Response `200`:**
```json
{
  "data": [
    {
      "version": 1,
      "amendedAt": "2026-04-03T10:00:00Z",
      "amendedBy": "uuid-doctor",
      "amendedByName": "Dr. Emeka Okafor",
      "reason": "typo",
      "reasonDetail": null
    },
    {
      "version": 2,
      "amendedAt": "2026-04-04T08:00:00Z",
      "amendedBy": "uuid-doctor",
      "amendedByName": "Dr. Emeka Okafor",
      "reason": "hmo_rejection_fix",
      "reasonDetail": "Revised diagnosis code per HMO feedback"
    }
  ],
  "meta": null,
  "errors": null
}
```

#### 23c: Episode & Patient Views

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/consultations/patient/:patientId` | doctor, clinical_lead, cmo, patient | `FetchPatientConsultationsUsecase` |
| GET | `/consultations/episode/:episodeId` | any | `FetchEpisodeConsultationsUsecase` |

---

### Feature 24: Lab Orders & Results

**Description:** Manages lab test ordering, sample collection workflow, result entry, and result submission to doctors. Includes sample queue management and partner-lab referral status tracking. Depends on: Patients, Episodes, Consultations, Lab Catalog (Tier 1–5).

#### Data Model

```typescript
interface LabOrder {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  episodeId: string;              // Required — lab orders must be linked to an episode
  tests: Array<{
    testCode: string;
    testName: string;
    result?: string;
    normalRange?: string;
    unit?: string;
    isAbnormal?: boolean;
    techNotes?: string;
    images?: string[];
    metadata?: Partial<OrderMetadata>;
  }>;
  status: 'ordered' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';  // affects sample queue ordering
  orderedAt: string;
  collectedAt?: string;
  completedAt?: string;
  collectedBy?: string;
  processedBy?: string;
  notes?: string;
  isSubmittedToDoctor?: boolean;
  submittedAt?: string;
  referralId?: string;
  sourceType?: 'internal' | 'inbound_referral' | 'outbound_referral';
}
```

#### 24a: Order Lifecycle

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/lab/orders` | lab_tech, doctor, nurse, clinical_lead, cmo | `FetchLabOrdersUsecase` |
| POST | `/lab/orders` | doctor | `CreateLabOrderUsecase` |
| GET | `/lab/orders/:id` | lab_tech, doctor, nurse, clinical_lead, cmo, patient | `FetchLabOrderByIdUsecase` |
| PATCH | `/lab/orders/:id/cancel` | doctor, lab_tech, clinical_lead, cmo | `CancelLabOrderUsecase` |

##### GET `/lab/orders`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `status` | string | Filter by status: `ordered`, `sample_collected`, `processing`, `completed`, `cancelled` |
| `priority` | string | Filter by priority: `routine`, `urgent`, `stat` |
| `patientId` | string | Filter by patient |
| `doctorId` | string | Filter by ordering doctor |
| `episodeId` | string | Filter by episode |
| `dateFrom` | string | Start date (ISO 8601) |
| `dateTo` | string | End date (ISO 8601) |

##### POST `/lab/orders`

**Request Body:**
```json
{
  "patientId": "uuid-patient",
  "episodeId": "uuid-episode",
  "doctorId": "uuid-doctor",
  "priority": "urgent",
  "tests": [
    { "testCode": "LAB-FBC-001", "testName": "Full Blood Count" },
    { "testCode": "LAB-BMP-001", "testName": "Basic Metabolic Panel" }
  ],
  "notes": "Suspecting anaemia — check haemoglobin closely"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid-lab-order",
    "patientId": "uuid-patient",
    "episodeId": "uuid-episode",
    "priority": "urgent",
    "status": "ordered",
    "tests": [
      { "testCode": "LAB-FBC-001", "testName": "Full Blood Count", "result": null },
      { "testCode": "LAB-BMP-001", "testName": "Basic Metabolic Panel", "result": null }
    ],
    "orderedAt": "2026-04-03T09:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

##### PATCH `/lab/orders/:id/cancel`

**Request Body:**
```json
{
  "reason": "Duplicate order — already processed"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-lab-order", "status": "cancelled", "cancelledAt": "2026-04-03T09:15:00Z" },
  "meta": null,
  "errors": null
}
```

> Cancelling a paid lab order automatically credits/refunds the associated billing line item.

**Error `409`:**
```json
{
  "errors": [{ "code": "LAB_ORDER_ALREADY_COMPLETED", "message": "Cannot cancel a completed lab order" }]
}
```

#### 24b: Sample Collection & Results

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| PATCH | `/lab/orders/:id/collect` | lab_tech | `CollectLabSampleUsecase` |
| PATCH | `/lab/orders/:id/results` | lab_tech | `EnterLabResultsUsecase` |
| POST | `/lab/orders/:id/results/upload` | lab_tech | `UploadLabResultImageUsecase` |
| PATCH | `/lab/orders/:id/submit` | lab_tech | `SubmitLabResultsUsecase` |

##### PATCH `/lab/orders/:id/collect`

**Request Body:**
```json
{
  "collectedBy": "uuid-lab-tech",
  "collectedAt": "2026-04-03T09:20:00Z",
  "notes": "Sample collected from right antecubital vein"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-lab-order", "status": "sample_collected", "collectedAt": "2026-04-03T09:20:00Z" },
  "meta": null,
  "errors": null
}
```

##### PATCH `/lab/orders/:id/results`

**Request Body:**
```json
{
  "tests": [
    {
      "testCode": "LAB-FBC-001",
      "result": "8.5",
      "unit": "g/dL",
      "normalRange": "12.0–16.0",
      "isAbnormal": true,
      "techNotes": "Hypochromic microcytic cells observed"
    },
    {
      "testCode": "LAB-BMP-001",
      "result": "4.1",
      "unit": "mEq/L",
      "normalRange": "3.5–5.0",
      "isAbnormal": false,
      "techNotes": null
    }
  ],
  "notes": "Centrifuge error on first run, repeated"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-lab-order", "status": "processing", "updatedAt": "2026-04-03T10:00:00Z" },
  "meta": null,
  "errors": null
}
```

**Error `422`:**
```json
{
  "errors": [{ "code": "SAMPLE_NOT_COLLECTED", "message": "Sample must be collected before results can be entered" }]
}
```

##### POST `/lab/orders/:id/results/upload`

> Multipart file upload. Accepted formats: JPEG, PNG, PDF. Server stores file and returns a URL appended to the test's `images` array.

**Request:** `multipart/form-data` — field `file` (binary), field `testCode` (string)

**Response `201`:**
```json
{
  "data": { "testCode": "LAB-FBC-001", "imageUrl": "https://storage.clinicflow.ng/labs/uuid-lab-order/fbc-result.jpg" },
  "meta": null,
  "errors": null
}
```

##### PATCH `/lab/orders/:id/submit`

> Marks results as complete and notifies the referring doctor. No request body required.

**Response `200`:**
```json
{
  "data": { "id": "uuid-lab-order", "status": "completed", "submittedAt": "2026-04-03T10:30:00Z", "isSubmittedToDoctor": true },
  "meta": null,
  "errors": null
}
```

**Error `409`:**
```json
{
  "errors": [{ "code": "LAB_ORDER_ALREADY_COMPLETED", "message": "Results have already been submitted" }]
}
```

#### 24c: Queue & Patient Views

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/lab/orders/sample-queue` | lab_tech, clinical_lead | `FetchSampleQueueUsecase` |
| GET | `/lab/orders/patient/:patientId` | doctor, nurse, clinical_lead, cmo, patient | `FetchPatientLabOrdersUsecase` |
| GET | `/lab/orders/episode/:episodeId` | any | `FetchEpisodeLabOrdersUsecase` |

##### GET `/lab/orders/sample-queue`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `priority` | string | Filter by priority (`routine`, `urgent`, `stat`) |
| `limit` | int | Records per page (default `25`) |

> Returns all orders with status `ordered`, sorted by priority (`stat` first, then `urgent`, then `routine`) and then by `orderedAt` ascending.

---

### Feature 25: Prescriptions & Dispensing

**Description:** Manages prescription lifecycle from doctor ordering through pharmacist dispensing. Supports partial dispensing, drug substitution (generic/therapeutic), and dispense audit trail. Depends on: Patients, Episodes, Consultations, Inventory (Tier 1–5).

#### Data Model

```typescript
interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  episodeId?: string;
  visitId: string;
  items: PrescriptionItem[];
  status: 'pending' | 'dispensed' | 'partially_dispensed' | 'unfulfillable' | 'cancelled';
  prescribedAt: string;
  dispensedAt?: string;
  dispensedBy?: string;
  notes?: string;
  dispenseHistory: DispenseEvent[];   // Per-batch dispense records
  auditLog?: DispenseAuditEntry[];
}

interface PrescriptionItem {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  dispensedQuantity: number;          // Total dispensed so far (across all batches)
  instructions?: string;
  isSubstituted?: boolean;
  substitutionType?: 'generic' | 'therapeutic';
  substitutionReason?: string;
  status: 'pending' | 'partially_dispensed' | 'dispensed' | 'unfulfillable';
}

interface DispenseEvent {
  id: string;
  prescriptionItemId: string;
  dispensedQuantity: number;
  reason?: string;                    // Optional per-item partial dispense reason
  dispensedBy: string;
  dispensedAt: string;
  batchNumber: number;                // Increments per dispense event per item
}
```

#### 25a: Prescription Lifecycle

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/prescriptions` | pharmacist, doctor, clinical_lead, cmo, hospital_admin | `FetchPrescriptionsUsecase` |
| POST | `/prescriptions` | doctor | `CreatePrescriptionUsecase` |
| GET | `/prescriptions/:id` | pharmacist, doctor, nurse, clinical_lead, cmo, patient | `FetchPrescriptionByIdUsecase` |
| PATCH | `/prescriptions/:id/cancel` | doctor, clinical_lead, cmo | `CancelPrescriptionUsecase` |

##### GET `/prescriptions`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `status` | string | Filter by status: `pending`, `dispensed`, `partially_dispensed`, `cancelled` |
| `patientId` | string | Filter by patient |
| `doctorId` | string | Filter by prescribing doctor |
| `pharmacistId` | string | Filter by dispensing pharmacist |
| `episodeId` | string | Filter by episode |
| `dateFrom` | string | Start date (ISO 8601) |
| `dateTo` | string | End date (ISO 8601) |

##### POST `/prescriptions`

**Request Body:**
```json
{
  "patientId": "uuid-patient",
  "episodeId": "uuid-episode",
  "items": [
    {
      "drugName": "Amoxicillin",
      "dosage": "500mg",
      "frequency": "TDS",
      "duration": "7 days",
      "quantity": 21,
      "instructions": "Take with food"
    },
    {
      "drugName": "Paracetamol",
      "dosage": "1000mg",
      "frequency": "QID PRN",
      "duration": "5 days",
      "quantity": 20,
      "instructions": "Take for pain or fever above 38°C"
    }
  ],
  "notes": "Patient allergic to penicillin alternatives — use with caution"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid-prescription",
    "patientId": "uuid-patient",
    "episodeId": "uuid-episode",
    "status": "pending",
    "items": [
      { "drugName": "Amoxicillin", "quantity": 21, "dispensedQuantity": 0, "status": "pending" },
      { "drugName": "Paracetamol", "quantity": 20, "dispensedQuantity": 0, "status": "pending" }
    ],
    "prescribedAt": "2026-04-03T10:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

##### PATCH `/prescriptions/:id/cancel`

**Request Body:**
```json
{
  "reason": "Patient discharged before dispensing"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-prescription", "status": "cancelled", "cancelledAt": "2026-04-03T11:00:00Z" },
  "meta": null,
  "errors": null
}
```

**Error `409`:**
```json
{
  "errors": [{ "code": "PRESCRIPTION_ALREADY_DISPENSED", "message": "Cannot cancel a fully dispensed prescription" }]
}
```

#### 25b: Dispensing

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| POST | `/prescriptions/:id/dispense` | pharmacist | `DispensePrescriptionUsecase` |
| PATCH | `/prescriptions/:id/unfulfillable` | pharmacist | `MarkPrescriptionUnfulfillableUsecase` |
| GET | `/prescriptions/:id/audit` | pharmacist, clinical_lead, cmo | `FetchPrescriptionAuditUsecase` |

##### POST `/prescriptions/:id/dispense`

> Supports both full and partial dispense. Inventory is auto-deducted on each dispense event. For partial dispense, the item stays `partially_dispensed` until full quantity is reached. Each batch creates a new `DispenseEvent` record. Generic/therapeutic substitution is pharmacist-autonomous — recorded in the audit trail with a substitution reason.

**Request Body (partial dispense):**
```json
{
  "items": [
    {
      "drugName": "Amoxicillin",
      "dispensedQuantity": 14,
      "reason": "Only 14 capsules in stock — remainder to follow tomorrow",
      "isSubstituted": false
    },
    {
      "drugName": "Paracetamol",
      "dispensedDrugName": "Ibuprofen",
      "dispensedQuantity": 20,
      "isSubstituted": true,
      "substitutionType": "therapeutic",
      "substitutionReason": "Paracetamol out of stock; ibuprofen is therapeutic equivalent"
    }
  ]
}
```

**Response `200`:**
```json
{
  "data": {
    "id": "uuid-prescription",
    "status": "partially_dispensed",
    "items": [
      { "drugName": "Amoxicillin", "quantity": 21, "dispensedQuantity": 14, "status": "partially_dispensed" },
      { "drugName": "Paracetamol", "quantity": 20, "dispensedQuantity": 20, "status": "dispensed", "isSubstituted": true }
    ],
    "dispenseHistory": [
      { "batchNumber": 1, "dispensedAt": "2026-04-03T11:00:00Z", "dispensedBy": "uuid-pharmacist" }
    ]
  },
  "meta": null,
  "errors": null
}
```

**Error `422`:**
```json
{
  "errors": [{ "code": "INSUFFICIENT_STOCK", "message": "Insufficient stock for Amoxicillin — available: 3, requested: 14" }]
}
```

**Error `404`:**
```json
{
  "errors": [{ "code": "PRESCRIPTION_ITEM_NOT_FOUND", "message": "No prescription item found for drugName: 'Metformin'" }]
}
```

##### PATCH `/prescriptions/:id/unfulfillable`

> Used when the pharmacist determines one or more items cannot be dispensed (out of stock, discontinued, contraindicated). Notifies the prescribing doctor.

**Request Body:**
```json
{
  "items": [
    { "drugName": "Amoxicillin", "reason": "Discontinued — no stock and no reorder pending" }
  ]
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-prescription", "status": "unfulfillable", "updatedAt": "2026-04-03T11:30:00Z" },
  "meta": null,
  "errors": null
}
```

#### 25c: Queue & Patient Views

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/prescriptions/pending` | pharmacist | `FetchPendingPrescriptionsUsecase` |
| GET | `/prescriptions/patient/:patientId` | pharmacist, doctor, clinical_lead, cmo, patient | `FetchPatientPrescriptionsUsecase` |
| GET | `/prescriptions/episode/:episodeId` | any | `FetchEpisodePrescriptionsUsecase` |

##### GET `/prescriptions/pending`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `patientId` | string | Filter by patient |

> Returns prescriptions with status `pending` or `partially_dispensed`, paginated and sorted by `prescribedAt` ascending.

---

## Tier 6 — Financial

---

### Feature 26: Billing & Payments

**Description:** Manages bills (invoices), line-item composition, payment processing (cash, card, POS, transfer, HMO, split payments), billing codes, and emergency overrides. Supports both registered patients and walk-in customers. Depends on: Patients, Episodes, Services (Tier 1–5).

#### Data Model

```typescript
interface BillItem {
  id: string;
  billId: string;
  serviceId: string;
  description: string;
  unitPrice: number;
  quantity: number;
  taxAmount: number;
  discount: number;
  totalAmount: number;
  // HMO coverage tracked per line item at billing time (frozen — not recalculated if rules change)
  hmoStatus?: 'covered' | 'partial' | 'not_covered' | 'opted_out';
  hmoCoveredAmount?: number;
  patientLiabilityAmount?: number;
  hmoContractId?: string;        // Which HmoContract record was used for this item
  isOptedOutOfHMO: boolean;      // Patient chose to self-pay for this item
}

interface Bill {
  id: string;
  billNumber: string;
  patientId?: string;            // null when isWalkIn = true
  patientName?: string;
  patientMrn?: string;
  visitId?: string;
  episodeId?: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  hmoTotalCoverage?: number;
  patientTotalLiability?: number;
  status: 'pending' | 'partial' | 'paid' | 'waived' | 'refunded';
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'hmo' | 'corporate';
  hmoClaimId?: string;
  department: 'front_desk' | 'lab' | 'pharmacy' | 'nursing' | 'all';
  notes?: string;
  paidAt?: string;
  isWalkIn: boolean;
  walkInCustomerName?: string;   // Required when isWalkIn = true
  walkInPhone?: string;
  paymentSplits?: PaymentSplit[];
  createdAt: string;
  createdBy: string;
}

interface PaymentRecord {
  id: string;
  receiptNumber: string;
  patientId: string;
  billId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  bank?: string;
  cashierId: string;
  cashierName: string;
  createdAt: string;
  paymentSplits?: PaymentSplit[];
}

interface BillingCodeEntry {
  id: string;
  code: string;
  billId: string;
  patientId: string;
  department: BillingDepartment;
  amount: number;
  hmoCoverage?: number;
  patientLiability?: number;
  status: 'generated' | 'paid' | 'expired' | 'cancelled';
  generatedBy: string;
  generatedAt: string;
  expiresAt: string;
  paidAt?: string;
  receiptNumber?: string;
}

interface EmergencyOverride {
  id: string;
  patientId: string;
  episodeId?: string;
  reason: string;
  scope: 'consultation' | 'consultation_emergency' | 'full_visit';
  estimatedAmount: number;
  authorizedBy: string;
  authorizedByRole: UserRole;
  authorizedAt: string;
  status: 'active' | 'cleared' | 'expired';
  clearedAt?: string;
  clearedBy?: string;
}
```

#### 26a: Bills

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/bills` | cashier, hospital_admin, cmo, clinical_lead | `FetchBillsUsecase` |
| POST | `/bills` | cashier, nurse, receptionist, doctor, lab_tech | `CreateBillUsecase` |
| GET | `/bills/:id` | cashier, hospital_admin, cmo, patient | `FetchBillByIdUsecase` |
| PATCH | `/bills/:id` | cashier, hospital_admin | `UpdateBillUsecase` |
| PATCH | `/bills/:id/waive` | cmo, hospital_admin | `WaiveBillUsecase` |
| GET | `/bills/patient/:patientId` | cashier, hospital_admin, cmo, patient | `FetchPatientBillsUsecase` |
| GET | `/bills/episode/:episodeId` | any | `FetchEpisodeBillsUsecase` |

##### GET `/bills`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `status` | string | Filter by status: `pending`, `partial`, `paid`, `waived`, `refunded` |
| `patientId` | string | Filter by patient |
| `episodeId` | string | Filter by episode |
| `department` | string | Filter by billing department |
| `isWalkIn` | boolean | Filter walk-in bills |
| `dateFrom` | string | Start date (ISO 8601) |
| `dateTo` | string | End date (ISO 8601) |

##### POST `/bills` — Walk-in customer

**Request Body:**
```json
{
  "isWalkIn": true,
  "walkInCustomerName": "Tunde Bakare",
  "walkInPhone": "08033001122",
  "department": "front_desk",
  "items": [
    { "serviceId": "uuid-service-malaria-test", "quantity": 1, "description": "Malaria RDT", "unitPrice": 1500 }
  ]
}
```

##### POST `/bills` — HMO patient

**Request Body:**
```json
{
  "patientId": "uuid-patient",
  "episodeId": "uuid-episode",
  "department": "lab",
  "items": [
    {
      "serviceId": "uuid-service-fbc",
      "quantity": 1,
      "description": "Full Blood Count",
      "unitPrice": 3000,
      "isOptedOutOfHMO": false
    }
  ]
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid-bill",
    "billNumber": "BILL-2026-00143",
    "patientId": "uuid-patient",
    "status": "pending",
    "subtotal": 3000,
    "hmoTotalCoverage": 2400,
    "patientTotalLiability": 600,
    "total": 3000,
    "amountPaid": 0,
    "balance": 600,
    "items": [
      {
        "serviceId": "uuid-service-fbc",
        "description": "Full Blood Count",
        "unitPrice": 3000,
        "hmoStatus": "partial",
        "hmoCoveredAmount": 2400,
        "patientLiabilityAmount": 600
      }
    ]
  },
  "meta": null,
  "errors": null
}
```

##### PATCH `/bills/:id` (edit line items)

> Adding line items to a partially or fully paid bill is allowed. Removing already-paid line items is NOT allowed. All edits are audit-logged.

**Request Body:**
```json
{
  "items": [
    { "serviceId": "uuid-service-chest-xray", "quantity": 1, "description": "Chest X-Ray (PA)", "unitPrice": 8000 }
  ]
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-bill", "total": 11000, "balance": 10400, "updatedAt": "2026-04-03T12:00:00Z" },
  "meta": null,
  "errors": null
}
```

**Error `422`:**
```json
{
  "errors": [{ "code": "CANNOT_REMOVE_PAID_LINE_ITEM", "message": "Cannot remove Full Blood Count — this line item has already been paid" }]
}
```

##### PATCH `/bills/:id/waive`

**Request Body:**
```json
{
  "reason": "Indigent patient — approved for welfare waiver by CMO"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-bill", "status": "waived", "balance": 0, "waivedAt": "2026-04-03T12:30:00Z" },
  "meta": null,
  "errors": null
}
```

**Error `409`:**
```json
{
  "errors": [{ "code": "BILL_ALREADY_PAID", "message": "Cannot waive a fully paid bill" }]
}
```

#### 26b: Payments & Receipts

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| PATCH | `/bills/:id/pay` | cashier | `ProcessPaymentUsecase` |
| PATCH | `/bills/:id/refund` | cmo, hospital_admin | `ProcessRefundUsecase` |
| GET | `/bills/:id/receipt` | cashier, patient | `FetchReceiptUsecase` |
| GET | `/bills/:id/payments` | cashier, hospital_admin, cmo | `FetchBillPaymentsUsecase` |
| GET | `/payments` | cashier, hospital_admin, cmo | `FetchAllPaymentsUsecase` |
| GET | `/payments/:id` | cashier, hospital_admin, cmo, patient | `FetchPaymentByIdUsecase` |

##### PATCH `/bills/:id/pay`

**Request Body:**
```json
{
  "paymentMethod": "split",
  "paymentSplits": [
    { "method": "cash", "amount": 5000 },
    { "method": "transfer", "amount": 10000, "referenceNumber": "TRF-20260403-001", "bank": "058" }
  ],
  "notes": "Patient paid in two parts"
}
```

**Response `200`:**
```json
{
  "data": {
    "receiptNumber": "RCP-2026-00892",
    "billId": "uuid-bill",
    "totalPaid": 15000,
    "balance": 0,
    "status": "paid",
    "receiptUrl": "/receipts/RCP-2026-00892.pdf"
  },
  "meta": null,
  "errors": null
}
```

**Error `409`:**
```json
{
  "errors": [{ "code": "BILL_ALREADY_PAID", "message": "Bill has already been fully paid" }]
}
```

**Error `422`:**
```json
{
  "errors": [{ "code": "INSUFFICIENT_PAYMENT_AMOUNT", "message": "Payment amount 5000 is less than the balance due 8500" }]
}
```

##### PATCH `/bills/:id/refund`

**Request Body:**
```json
{
  "amount": 15000,
  "refundMethod": "transfer",
  "referenceNumber": "REF-20260403-001",
  "reason": "Duplicate payment — patient paid twice at two different cashier points"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-bill", "status": "refunded", "refundedAmount": 15000, "refundedAt": "2026-04-03T13:00:00Z" },
  "meta": null,
  "errors": null
}
```

#### 26c: Billing Codes

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| POST | `/bills/billing-codes` | nurse, doctor, pharmacist, lab_tech | `GenerateBillingCodeUsecase` |
| GET | `/bills/billing-codes/:code` | cashier | `FetchBillingCodeUsecase` |
| PATCH | `/bills/billing-codes/:code/pay` | cashier | `PayViaBillingCodeUsecase` |

> Billing codes serve two purposes: the clearance code a patient presents to unlock a service, and the invoice reference number. Generated after a service is confirmed and valid until paid or expired.

##### POST `/bills/billing-codes`

**Request Body:**
```json
{
  "billId": "uuid-bill",
  "department": "lab"
}
```

**Response `201`:**
```json
{
  "data": {
    "code": "LAB-2026-009921",
    "billId": "uuid-bill",
    "department": "lab",
    "amount": 3000,
    "status": "generated",
    "expiresAt": "2026-04-03T18:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

#### 26d: Emergency Overrides

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| POST | `/bills/emergency-overrides` | cmo, clinical_lead, hospital_admin | `CreateEmergencyOverrideUsecase` |
| GET | `/bills/emergency-overrides` | cashier, hospital_admin, cmo, clinical_lead | `FetchEmergencyOverridesUsecase` |
| GET | `/bills/emergency-overrides/:id` | cashier, hospital_admin, cmo, clinical_lead | `FetchEmergencyOverrideByIdUsecase` |
| PATCH | `/bills/emergency-overrides/:id/clear` | cashier, hospital_admin, cmo | `ClearEmergencyOverrideUsecase` |

> Emergency overrides are auto-triggered when a patient enters a queue with `priority = emergency`. Any doctor can also request an override, which requires CMO or hospital_admin approval.

##### POST `/bills/emergency-overrides`

**Request Body:**
```json
{
  "patientId": "uuid-patient",
  "episodeId": "uuid-episode",
  "reason": "Trauma case — patient arrived unconscious, no time for pre-payment",
  "scope": "full_visit",
  "estimatedAmount": 75000
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid-override",
    "patientId": "uuid-patient",
    "scope": "full_visit",
    "estimatedAmount": 75000,
    "status": "active",
    "authorizedAt": "2026-04-03T08:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

**Error `409`:**
```json
{
  "errors": [{ "code": "OVERRIDE_ALREADY_ACTIVE", "message": "An active emergency override already exists for this patient" }]
}
```

---

### Feature 27: HMO Claims

**Description:** Full HMO claims lifecycle — draft, submission, tracking, approval/denial, resubmission, withdrawal, and retraction. Each claim bundles multiple bills and diagnoses. Includes document upload and multi-version audit trail. Depends on: Bills, HMO Providers, Consultations (Tier 1–6).

#### Data Model

```typescript
interface ClaimItem {
  id: string;
  claimId: string;
  billItemId?: string;
  description: string;
  category: 'consultation' | 'lab' | 'pharmacy' | 'procedure' | 'admission' | 'other';
  quantity: number;
  unitPrice: number;
  claimedAmount: number;
  isExcluded: boolean;
  clinicalJustification?: string;  // Required when isOffProtocol = true
  isOffProtocol: boolean;          // Service not in HMO's approved protocol
  status: 'pending' | 'approved' | 'denied';
  denialReason?: string;
}

interface HMOClaim {
  id: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  hmoProviderId: string;
  hmoProviderName: string;
  enrollmentId?: string;
  policyNumber?: string;
  preAuthCode?: string;
  billIds: string[];
  claimItems: ClaimItem[];
  diagnoses: Array<{ code: string; description: string; isPrimary: boolean }>;
  claimAmount: number;
  approvedAmount?: number;
  status: 'draft' | 'submitted' | 'processing' | 'approved' | 'denied' | 'paid' | 'withdrawn' | 'retracted';
  submittedAt?: string;
  processedAt?: string;
  denialReason?: string;
  resubmissionNotes?: string;
  documents: ClaimDocument[];
  versions: ClaimVersion[];
  currentVersion: number;
  createdAt: string;
  createdBy: string;
  withdrawnAt?: string;
  withdrawnReason?: 'patient_self_pay' | 'hospital_cancelled' | 'claim_error' | 'treatment_changed';
  retractionNotes?: string;
  privateBillId?: string;          // Auto-created private bill after retraction
}
```

#### 27a: Claim Lifecycle

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/claims` | cashier, hospital_admin, cmo | `FetchClaimsUsecase` |
| POST | `/claims` | cashier, hospital_admin | `CreateClaimUsecase` |
| GET | `/claims/:id` | cashier, hospital_admin, cmo | `FetchClaimByIdUsecase` |
| PUT | `/claims/:id` | cashier, hospital_admin | `UpdateClaimUsecase` |
| GET | `/claims/patient/:patientId` | cashier, hospital_admin, cmo | `FetchPatientClaimsUsecase` |

##### GET `/claims`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `status` | string | Filter by status |
| `hmoProviderId` | string | Filter by HMO provider |
| `patientId` | string | Filter by patient |
| `dateFrom` | string | Start date (ISO 8601) |
| `dateTo` | string | End date (ISO 8601) |

##### POST `/claims`

> Claim items are auto-populated from the selected bill IDs. Staff may add manual items or add off-protocol items with clinical justification.

**Request Body:**
```json
{
  "patientId": "uuid-patient",
  "hmoProviderId": "uuid-hmo-hygeia",
  "billIds": ["uuid-bill-1", "uuid-bill-2"],
  "diagnoses": [
    { "code": "J06.9", "description": "Acute upper respiratory infection", "isPrimary": true }
  ],
  "preAuthCode": "HYGEIA-PA-2026-00112"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid-claim",
    "claimNumber": "CLM-2026-00142",
    "patientId": "uuid-patient",
    "hmoProviderName": "Hygeia HMO",
    "status": "draft",
    "claimAmount": 18500,
    "claimItems": [
      { "description": "General Consultation", "claimedAmount": 4500, "isOffProtocol": false },
      { "description": "Full Blood Count", "claimedAmount": 3000, "isOffProtocol": false }
    ]
  },
  "meta": null,
  "errors": null
}
```

**Error `409`:**
```json
{
  "errors": [{ "code": "BILL_ALREADY_CLAIMED", "message": "Bill BILL-2026-00143 has already been included in another claim" }]
}
```

##### PUT `/claims/:id` (add off-protocol item)

**Request Body:**
```json
{
  "claimItems": [
    {
      "description": "High-resolution CT Brain",
      "category": "procedure",
      "quantity": 1,
      "unitPrice": 45000,
      "claimedAmount": 45000,
      "isOffProtocol": true,
      "clinicalJustification": "CT required to rule out intracranial bleed following trauma"
    }
  ]
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-claim", "claimAmount": 63500, "updatedAt": "2026-04-03T14:00:00Z" },
  "meta": null,
  "errors": null
}
```

#### 27b: Submission & Status

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| POST | `/claims/:id/submit` | cashier, hospital_admin | `SubmitClaimUsecase` |
| PATCH | `/claims/:id/status` | cashier, hospital_admin, cmo | `UpdateClaimStatusUsecase` |
| POST | `/claims/:id/resubmit` | cashier, hospital_admin | `ResubmitClaimUsecase` |
| POST | `/claims/:id/withdraw` | cashier, hospital_admin | `WithdrawClaimUsecase` |
| POST | `/claims/:id/retract` | cashier, hospital_admin, cmo | `RetractClaimUsecase` |

##### POST `/claims/:id/submit`

> Sends the claim to the HMO for processing. Status transitions to `submitted`. No request body required.

**Response `200`:**
```json
{
  "data": { "id": "uuid-claim", "status": "submitted", "submittedAt": "2026-04-03T14:30:00Z" },
  "meta": null,
  "errors": null
}
```

**Error `409`:**
```json
{
  "errors": [{ "code": "CLAIM_ALREADY_SUBMITTED", "message": "Claim has already been submitted to the HMO" }]
}
```

##### PATCH `/claims/:id/status` (HMO webhook / internal simulation)

**Request Body:**
```json
{
  "status": "approved",
  "approvedAmount": 61000,
  "processedAt": "2026-04-05T09:00:00Z",
  "source": "hmo_webhook"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-claim", "status": "approved", "approvedAmount": 61000, "processedAt": "2026-04-05T09:00:00Z" },
  "meta": null,
  "errors": null
}
```

##### POST `/claims/:id/resubmit`

> Adds a new version entry to the claim. Does not create a new claim record.

**Request Body:**
```json
{
  "resubmissionNotes": "Updated diagnosis code from J06.9 to J02.9 per HMO auditor feedback"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-claim", "status": "submitted", "currentVersion": 2, "resubmittedAt": "2026-04-06T09:00:00Z" },
  "meta": null,
  "errors": null
}
```

##### POST `/claims/:id/withdraw`

**Request Body:**
```json
{
  "withdrawnReason": "patient_self_pay"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-claim", "status": "withdrawn", "withdrawnAt": "2026-04-03T15:00:00Z" },
  "meta": null,
  "errors": null
}
```

**Error `409`:**
```json
{
  "errors": [{ "code": "CLAIM_ALREADY_WITHDRAWN", "message": "Claim has already been withdrawn" }]
}
```

##### POST `/claims/:id/retract`

> Retracts an approved or processing claim. Automatically creates a private bill for the patient to pay out-of-pocket. The `privateBillId` field on the claim is set to the new bill's ID.

**Request Body:**
```json
{
  "retractionNotes": "HMO declined coverage after approval — patient to self-pay"
}
```

**Response `200`:**
```json
{
  "data": {
    "id": "uuid-claim",
    "status": "retracted",
    "retractionNotes": "HMO declined coverage after approval — patient to self-pay",
    "privateBillId": "uuid-new-private-bill",
    "retractedAt": "2026-04-07T10:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

**Error `422`:**
```json
{
  "errors": [{ "code": "CLAIM_NOT_RETRACTABLE", "message": "Only claims with status approved or processing can be retracted" }]
}
```

#### 27c: Documents & Versions

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| POST | `/claims/:id/documents` | cashier, hospital_admin | `UploadClaimDocumentUsecase` |
| DELETE | `/claims/:id/documents/:docId` | cashier, hospital_admin | `DeleteClaimDocumentUsecase` |
| GET | `/claims/:id/versions` | cashier, hospital_admin, cmo | `FetchClaimVersionsUsecase` |

##### POST `/claims/:id/documents`

> Accepted formats: PDF, JPG, PNG. Max 10 MB per file. No limit on document count per claim.

**Request:** `multipart/form-data` — field `file` (binary), field `documentType` (string, e.g. `"pre_auth"`, `"lab_result"`, `"referral_letter"`)

**Response `201`:**
```json
{
  "data": {
    "id": "uuid-doc",
    "claimId": "uuid-claim",
    "documentType": "pre_auth",
    "fileUrl": "https://storage.clinicflow.ng/claims/uuid-claim/pre_auth.pdf",
    "uploadedAt": "2026-04-03T15:30:00Z"
  },
  "meta": null,
  "errors": null
}
```

**Error `422`:**
```json
{
  "errors": [{ "code": "DOCUMENT_TOO_LARGE", "message": "File exceeds maximum allowed size of 10 MB" }]
}
```

---

## Tier 7 — Operations

---

### Feature 28: Cashier Shift Management

**Description:** Tracks cashier shifts — opening balance, transactions, closing balance, and variance reporting. Supports multiple stations (reception, pharmacy, nursing_station, imaging, triage) with single-shift enforcement at lab. Depends on: Auth, Bills, Payments (Tier 0–6).

#### Data Model

```typescript
interface CashierShift {
  id: string;
  staffId: string;
  staffName: string;
  station: 'reception' | 'lab' | 'pharmacy' | 'nursing_station' | 'imaging' | 'triage';
  departmentId: string;
  startedAt: string;
  endedAt?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  openingBalance?: number;
  closingBalance?: number;
  expectedBalance?: number;          // Sum of all ShiftTransaction.amount during this shift
  variance?: number;                 // closingBalance - expectedBalance (negative = shortage)
  notes?: string;
  transactions: ShiftTransaction[];
}

interface ShiftTransaction {
  id: string;
  receiptNumber: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  amount: number;
  paymentMethod: PaymentMethod;
  billingCode?: string;
  timestamp: string;
}
```

#### 28a: Shift Lifecycle

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/shifts` | cashier, hospital_admin, cmo | `FetchShiftsUsecase` |
| POST | `/shifts` | cashier | `OpenShiftUsecase` |
| GET | `/shifts/:id` | cashier, hospital_admin, cmo | `FetchShiftByIdUsecase` |
| PATCH | `/shifts/:id/close` | cashier | `CloseShiftUsecase` |
| GET | `/shifts/active` | cashier, hospital_admin | `FetchActiveShiftUsecase` |
| GET | `/shifts/station/:station` | cashier, hospital_admin, cmo | `FetchShiftsByStationUsecase` |

##### GET `/shifts`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `staffId` | string | Filter by staff member |
| `station` | string | Filter by station |
| `status` | string | Filter by status: `in_progress`, `completed`, `cancelled` |
| `date` | string | Filter by shift date (ISO 8601 date) |

##### POST `/shifts`

> At `lab`, only one shift may be in_progress at a time. All other stations allow multiple concurrent shifts.

**Request Body:**
```json
{
  "station": "reception",
  "openingBalance": 20000
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid-shift",
    "staffId": "uuid-cashier",
    "staffName": "Ngozi Adeyemi",
    "station": "reception",
    "status": "in_progress",
    "openingBalance": 20000,
    "startedAt": "2026-04-03T08:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

##### PATCH `/shifts/:id/close`

**Request Body:**
```json
{
  "closingBalance": 125000,
  "notes": "2 transactions were card payments, 1 was a transfer"
}
```

**Response `200`:**
```json
{
  "data": {
    "id": "uuid-shift",
    "status": "completed",
    "openingBalance": 20000,
    "closingBalance": 125000,
    "expectedBalance": 128500,
    "variance": -3500,
    "endedAt": "2026-04-03T17:00:00Z",
    "notes": "Shortage of ₦3,500 — under investigation"
  },
  "meta": null,
  "errors": null
}
```

#### 28b: Balance Reporting

> `expectedBalance` = `openingBalance` + sum of all `ShiftTransaction.amount` recorded during the shift.
> `variance` = `closingBalance` − `expectedBalance`. Negative = shortage; positive = overage.
> Transactions recorded when no shift is active are flagged as `unassigned_shift` in the payment record.

##### GET `/shifts/station/:station`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status (default: `in_progress`) |
| `date` | string | Filter by date (ISO 8601) |

**Response `200` (multiple active shifts at reception):**
```json
{
  "data": [
    { "id": "uuid-shift-1", "staffName": "Ngozi Adeyemi", "station": "reception", "status": "in_progress", "openingBalance": 20000 },
    { "id": "uuid-shift-2", "staffName": "Seun Bello", "station": "reception", "status": "in_progress", "openingBalance": 15000 }
  ],
  "meta": { "total": 2 },
  "errors": null
}
```

---

### Feature 29: Stock Requests

**Description:** Workflow for requesting inventory restocking from any department to the hospital administrator (or escalated to CMO). Supports partial approval and info-request hold. Depends on: Inventory, Users (Tier 1).

#### Data Model

```typescript
interface StockRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterRole: UserRole;
  requesterDepartment: string;
  items: Array<{
    inventoryItemId: string;
    itemName: string;
    currentStock: number;
    requestedQuantity: number;
    approvedQuantity?: number;
  }>;
  urgency: 'normal' | 'urgent';
  reason: string;
  notes?: string;
  status: 'pending' | 'approved' | 'partially_approved' | 'rejected' | 'forwarded_to_cmo' | 'info_requested' | 'fulfilled';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewerNotes?: string;
  forwardedToCmo?: boolean;
  forwardedAt?: string;
}
```

#### 29a: Request Lifecycle

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/stock-requests` | pharmacist, lab_tech, hospital_admin, cmo, clinical_lead, nurse | `FetchStockRequestsUsecase` |
| POST | `/stock-requests` | pharmacist, lab_tech, nurse, clinical_lead | `CreateStockRequestUsecase` |
| GET | `/stock-requests/:id` | any | `FetchStockRequestByIdUsecase` |

##### GET `/stock-requests`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `status` | string | Filter by status |
| `urgency` | string | Filter by urgency: `normal`, `urgent` |
| `requesterDepartment` | string | Filter by requesting department |
| `dateFrom` | string | Start date (ISO 8601) |
| `dateTo` | string | End date (ISO 8601) |

##### POST `/stock-requests`

**Request Body:**
```json
{
  "urgency": "urgent",
  "reason": "IV fluid stock critically low — enough for 2 days only",
  "items": [
    { "inventoryItemId": "uuid-item-iv-fluid", "itemName": "Normal Saline 500ml", "currentStock": 12, "requestedQuantity": 200 },
    { "inventoryItemId": "uuid-item-cannula", "itemName": "IV Cannula 18G", "currentStock": 8, "requestedQuantity": 100 }
  ]
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid-stock-request",
    "urgency": "urgent",
    "status": "pending",
    "items": [
      { "itemName": "Normal Saline 500ml", "requestedQuantity": 200 },
      { "itemName": "IV Cannula 18G", "requestedQuantity": 100 }
    ],
    "createdAt": "2026-04-03T09:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

#### 29b: Review & Fulfillment

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| PATCH | `/stock-requests/:id/review` | hospital_admin, cmo | `ReviewStockRequestUsecase` |
| PATCH | `/stock-requests/:id/forward` | hospital_admin | `ForwardStockRequestToCmoUsecase` |
| PATCH | `/stock-requests/:id/info` | hospital_admin | `RequestStockInfoUsecase` |
| PATCH | `/stock-requests/:id/fulfill` | hospital_admin, cmo | `FulfillStockRequestUsecase` |

##### PATCH `/stock-requests/:id/review`

**Request Body (partial approval):**
```json
{
  "decision": "partially_approved",
  "reviewerNotes": "Approving 100 units of saline — cannulas to follow next week",
  "items": [
    { "inventoryItemId": "uuid-item-iv-fluid", "approvedQuantity": 100 },
    { "inventoryItemId": "uuid-item-cannula", "approvedQuantity": 0 }
  ]
}
```

**Response `200`:**
```json
{
  "data": {
    "id": "uuid-stock-request",
    "status": "partially_approved",
    "reviewedAt": "2026-04-03T10:00:00Z",
    "reviewedByName": "Admin Bola Adekunle",
    "items": [
      { "itemName": "Normal Saline 500ml", "requestedQuantity": 200, "approvedQuantity": 100 },
      { "itemName": "IV Cannula 18G", "requestedQuantity": 100, "approvedQuantity": 0 }
    ]
  },
  "meta": null,
  "errors": null
}
```

##### PATCH `/stock-requests/:id/forward`

> CMO has authority over high-value or controlled items and acts as fallback when the hospital admin is unavailable.

**Request Body:**
```json
{
  "forwardReason": "Request exceeds purchasing threshold — requires CMO sign-off"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-stock-request", "status": "forwarded_to_cmo", "forwardedAt": "2026-04-03T10:30:00Z" },
  "meta": null,
  "errors": null
}
```

##### PATCH `/stock-requests/:id/info`

> Places the request on hold pending further documentation from the requester. Requester updates and re-submits.

**Request Body:**
```json
{
  "clarificationNote": "Please provide the current ward census and consumption rate for the past 7 days"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-stock-request", "status": "info_requested", "updatedAt": "2026-04-03T11:00:00Z" },
  "meta": null,
  "errors": null
}
```

---

### Feature 30: Lab Referrals (Partner Labs)

**Description:** Manages outbound and inbound lab referrals to/from partner laboratories. Tracks sample transit, result receipt, and sync status. Depends on: Lab Orders, Patients (Tier 2–5).

#### Data Model

```typescript
interface PartnerLab {
  id: string;
  name: string;
  code: string;
  location: string;
  status: 'connected' | 'disconnected' | 'pending';
  lastSyncAt?: string;
  specializations: string[];
  contactPhone: string;
  contactEmail: string;
}

interface LabReferral {
  id: string;
  direction: 'outbound' | 'inbound';
  patientId: string;
  patientName: string;
  patientMrn: string;
  partnerLabId: string;
  partnerLabName: string;
  tests: Array<{
    testCode: string;
    testName: string;
    result?: string;
    unit?: string;
    normalRange?: string;
    isAbnormal?: boolean;
  }>;
  status: 'pending' | 'sent' | 'in_transit' | 'received' | 'processing' | 'results_received' | 'completed' | 'cancelled';
  trackingNumber?: string;           // Server-generated on creation
  referredBy: string;
  referredByName: string;
  referredAt: string;
  receivedAt?: string;
  completedAt?: string;
  notes?: string;
  priority: 'routine' | 'urgent';
  labOrderId?: string;
  externalReferenceNumber?: string;
  resultAttachments?: string[];
}
```

#### 30a: Outbound Referrals

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/lab/referrals` | lab_tech, clinical_lead, hospital_admin, cmo | `FetchLabReferralsUsecase` |
| POST | `/lab/referrals` | lab_tech, doctor | `CreateOutboundLabReferralUsecase` |
| GET | `/lab/referrals/:id` | lab_tech, doctor, clinical_lead, cmo | `FetchLabReferralByIdUsecase` |
| PATCH | `/lab/referrals/:id/status` | lab_tech | `UpdateLabReferralStatusUsecase` |

##### GET `/lab/referrals`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `direction` | string | Filter by direction: `outbound`, `inbound` |
| `status` | string | Filter by status |
| `partnerLabId` | string | Filter by partner lab |
| `patientId` | string | Filter by patient |
| `dateFrom` | string | Start date (ISO 8601) |
| `dateTo` | string | End date (ISO 8601) |

##### POST `/lab/referrals`

> Outbound referral is created by a doctor or lab tech (when in-house lab lacks capability). The server auto-generates the tracking number.

**Request Body:**
```json
{
  "direction": "outbound",
  "patientId": "uuid-patient",
  "episodeId": "uuid-episode",
  "labOrderId": "uuid-lab-order",
  "partnerLabId": "uuid-partner-lab-synlab",
  "priority": "urgent",
  "tests": [
    { "testCode": "PCR-TB-001", "testName": "TB PCR (Sputum)" }
  ],
  "notes": "In-house PCR machine out of service — urgent referral"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid-referral",
    "direction": "outbound",
    "trackingNumber": "REF-2026-SYNL-00441",
    "partnerLabName": "SynLab Nigeria",
    "status": "pending",
    "priority": "urgent",
    "referredAt": "2026-04-03T09:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

##### PATCH `/lab/referrals/:id/status`

**Request Body:**
```json
{
  "status": "in_transit",
  "notes": "Sample dispatched via courier — ETA 2 hours"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-referral", "status": "in_transit", "updatedAt": "2026-04-03T10:00:00Z" },
  "meta": null,
  "errors": null
}
```

#### 30b: Inbound Referrals

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| POST | `/lab/referrals/inbound` | lab_tech | `RegisterInboundLabReferralUsecase` |

##### POST `/lab/referrals/inbound`

> Registered when an external patient arrives referred from a partner lab for sample collection or further processing.

**Request Body:**
```json
{
  "direction": "inbound",
  "patientId": "uuid-patient",
  "partnerLabId": "uuid-partner-lab-external",
  "externalReferenceNumber": "EXT-REF-20260403-009",
  "tests": [
    { "testCode": "LAB-CULT-001", "testName": "Blood Culture & Sensitivity" }
  ],
  "priority": "routine",
  "notes": "Patient referred from Medlab Diagnostics — sample already collected externally"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid-referral",
    "direction": "inbound",
    "trackingNumber": "REF-2026-IN-00029",
    "status": "received",
    "externalReferenceNumber": "EXT-REF-20260403-009",
    "createdAt": "2026-04-03T11:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

#### 30c: Results & Sync

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| PATCH | `/lab/referrals/:id/results` | lab_tech | `EnterLabReferralResultsUsecase` |
| POST | `/lab/referrals/:id/results/upload` | lab_tech | `UploadLabReferralResultUsecase` |
| POST | `/lab/referrals/:id/sync` | lab_tech, hospital_admin | `SyncLabReferralUsecase` |

##### PATCH `/lab/referrals/:id/results`

**Request Body:**
```json
{
  "tests": [
    {
      "testCode": "PCR-TB-001",
      "result": "MTB detected — RIF sensitive",
      "unit": null,
      "normalRange": "Not detected",
      "isAbnormal": true
    }
  ],
  "notes": "Results confirmed by partner lab pathologist"
}
```

**Response `200`:**
```json
{
  "data": { "id": "uuid-referral", "status": "results_received", "updatedAt": "2026-04-05T09:00:00Z" },
  "meta": null,
  "errors": null
}
```

##### POST `/lab/referrals/:id/sync`

> Manually triggers a sync with the partner lab's API to pull updated status or results.

**Response `200`:**
```json
{
  "data": { "id": "uuid-referral", "status": "results_received", "lastSyncAt": "2026-04-05T09:05:00Z" },
  "meta": null,
  "errors": null
}
```

---

## Tier 8 — Cross-Cutting

---

### Feature 31: Notifications

**Description:** Real-time notification delivery (WebSocket push + persistent read state). Covers patient arrival alerts, result notifications, queue warnings, payment confirmations, and emergency alerts. Notifications persist for 30 days. Depends on: Any event-generating feature.

#### Data Model

```typescript
interface Notification {
  id: string;
  type: 'patient_arrived' | 'results_ready' | 'prescription_ready' | 'consultation_paused'
       | 'consultation_autoclosed' | 'payment_received' | 'queue_warning' | 'emergency'
       | 'info' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: string;
  expiresAt: string;              // createdAt + 30 days; auto-purged by background cron
  read: boolean;
  actionUrl?: string;             // Frontend route path e.g. /patients/123/episodes/456
  actionLabel?: string;
  patientId?: string;
  patientName?: string;
  recipientId: string;            // Specific user ID — not broadcast to all of a role
  recipientRole: UserRole;
}
```

#### 31a: REST API

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/notifications` | any | `FetchNotificationsUsecase` |
| PATCH | `/notifications/:id/read` | any | `MarkNotificationReadUsecase` |
| PATCH | `/notifications/read-all` | any | `MarkAllNotificationsReadUsecase` |
| DELETE | `/notifications/:id` | any | `DeleteNotificationUsecase` |
| GET | `/notifications/unread-count` | any | `FetchUnreadNotificationCountUsecase` |

##### GET `/notifications`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `read` | boolean | Filter by read status |
| `type` | string | Filter by notification type |

> Returns notifications for the authenticated user only, sorted by `timestamp` descending, within the 30-day retention window.

##### GET `/notifications/unread-count`

**Response `200`:**
```json
{
  "data": { "count": 7 },
  "meta": null,
  "errors": null
}
```

#### 31b: WebSocket

```
wss://api.clinicflow.ng/ws/notifications?token=<jwt>
```

> Server pushes events on the authenticated user's channel. Clients should reconnect with exponential backoff on disconnect.

**WebSocket message format:**
```json
{
  "event": "new_notification",
  "data": {
    "id": "uuid-notification",
    "type": "results_ready",
    "title": "Lab Results Ready",
    "message": "FBC results for Chukwuemeka Obiora are ready for review",
    "actionUrl": "/patients/uuid-patient/lab-orders/uuid-lab-order",
    "timestamp": "2026-04-03T10:30:00Z",
    "read": false
  }
}
```

> **Architecture note:** Notifications are written to the database first (persistent store). Real-time delivery is decoupled via Redis pub/sub → WebSocket gateway, so DB write latency does not block push. A background cron job purges notifications where `expiresAt < NOW()` daily.

#### 31c: Trigger & Recipient Reference

| Type | Trigger | Recipient(s) |
|------|---------|--------------|
| `patient_arrived` | Appointment checked-in or patient joins queue | Doctor and nurse assigned to queue |
| `results_ready` | Lab tech submits lab order results | Referring doctor |
| `prescription_ready` | Pharmacist dispenses (full or partial) | Nurse; patient (if portal enabled) |
| `consultation_paused` | Doctor manually pauses an active consultation | Nurse, receptionist |
| `consultation_autoclosed` | Episode auto-closes | Treating doctor, clinical_lead |
| `payment_received` | Cashier records payment | Cashier station, relevant department head |
| `queue_warning` | Queue length exceeds configured threshold | Clinical lead, department head |
| `emergency` | Patient with `priority = emergency` enters any queue | All on-duty clinical staff, cmo |
| `info` / `success` / `error` | System event (frontend toast mirrored server-side) | The performing user |

---

### Feature 32: Audit Logging

**Description:** Immutable audit trail for clinical and administrative write actions. Records actor, action, entity, timestamp, and before/after snapshots. Read-only via API (CMO and hospital_admin only). No read actions are logged. Depends on: Any feature.

#### Data Model

```typescript
interface AuditEntry {
  id: string;
  action: AuditAction;             // SCREAMING_SNAKE_CASE — see reference table below
  entityType: 'consultation' | 'lab_order' | 'prescription' | 'bundle' | 'bill' | 'claim' | 'patient' | 'user' | 'inventory';
  entityId: string;
  patientId?: string;
  performedBy: string;
  performedByName: string;
  performedByRole: UserRole;
  timestamp: string;
  ipAddress?: string;
  details?: Record<string, unknown>;   // Before/after snapshot or action context
}
```

#### 32a: Endpoints

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/audit` | cmo, hospital_admin | `FetchAuditLogUsecase` |
| GET | `/audit/:id` | cmo, hospital_admin | `FetchAuditEntryByIdUsecase` |

##### GET `/audit`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `cursor` | string | Cursor for next page |
| `limit` | int | Records per page (default `25`) |
| `entityType` | string | Filter by entity type |
| `entityId` | string | Filter by entity ID |
| `patientId` | string | Filter by patient |
| `performedBy` | string | Filter by actor user ID |
| `action` | string | Filter by action constant |
| `dateFrom` | string | Start of date range (ISO 8601) |
| `dateTo` | string | End of date range (ISO 8601) |

**Response `200` (single entry example):**
```json
{
  "data": [
    {
      "id": "uuid-audit",
      "action": "CONSULTATION_FINALIZED",
      "entityType": "consultation",
      "entityId": "uuid-consultation",
      "patientId": "uuid-patient",
      "performedByName": "Dr. Emeka Okafor",
      "performedByRole": "doctor",
      "timestamp": "2026-04-03T10:00:00Z",
      "details": { "status_before": "in_progress", "status_after": "finalized" }
    }
  ],
  "meta": { "cursor": "...", "hasMore": false },
  "errors": null
}
```

#### 32b: Audited Action Reference

| Entity | Actions |
|--------|---------|
| `consultation` | `CONSULTATION_CREATED`, `CONSULTATION_UPDATED`, `CONSULTATION_FINALIZED`, `CONSULTATION_AMENDED`, `CONSULTATION_CANCELLED`, `CONSULTATION_AUTOCLOSED` |
| `lab_order` | `LAB_ORDER_CREATED`, `LAB_ORDER_SAMPLE_COLLECTED`, `LAB_ORDER_RESULTS_ENTERED`, `LAB_ORDER_SUBMITTED`, `LAB_ORDER_CANCELLED` |
| `prescription` | `PRESCRIPTION_CREATED`, `PRESCRIPTION_DISPENSED`, `PRESCRIPTION_PARTIALLY_DISPENSED`, `PRESCRIPTION_UNFULFILLABLE_FLAGGED`, `PRESCRIPTION_CANCELLED`, `PRESCRIPTION_SUBSTITUTED` |
| `bill` | `BILL_CREATED`, `BILL_UPDATED`, `BILL_PAID`, `BILL_PARTIALLY_PAID`, `BILL_WAIVED`, `BILL_REFUNDED` |
| `claim` | `CLAIM_CREATED`, `CLAIM_UPDATED`, `CLAIM_SUBMITTED`, `CLAIM_STATUS_UPDATED`, `CLAIM_RESUBMITTED`, `CLAIM_WITHDRAWN`, `CLAIM_RETRACTED`, `CLAIM_DOCUMENT_UPLOADED` |
| `patient` | `PATIENT_CREATED`, `PATIENT_UPDATED`, `PATIENT_STATUS_CHANGED`, `PATIENT_HMO_ENROLLED` |
| `user` | `USER_CREATED`, `USER_UPDATED`, `USER_STATUS_CHANGED`, `USER_ROLE_CHANGED`, `USER_PERMISSION_GRANTED`, `USER_PERMISSION_REVOKED` |
| `inventory` | `INVENTORY_CREATED`, `INVENTORY_ADJUSTED`, `INVENTORY_STOCK_DEPLETED` |
| `bundle` | `BUNDLE_CREATED`, `BUNDLE_UPDATED`, `BUNDLE_STATUS_CHANGED` |

---

### Feature 33: Reports & Analytics

**Description:** Aggregated reporting for executive, clinical, billing, pharmacy, lab, nursing, radiology, and surgery dashboards. Role-gated access. Supports PDF/CSV export and BI embed URLs. Depends on: All features.

#### Data Model

```typescript
interface ReportSummary {
  financial: {
    totalRevenue: number;
    outstandingPayments: number;
    claimsPending: number;
    collectionRate: number;
    revenueByDepartment: Record<string, number>;
    hmoVsCashRatio: { hmo: number; cash: number };
    claimsAgingBuckets: { '0_30': number; '31_60': number; 'over_60': number };
    top10ServicesByRevenue: Array<{ serviceName: string; revenue: number }>;
  };
  operational: {
    totalPatientsToday: number;
    avgWaitTime: number;
    bedOccupancy: number;
    staffOnDuty: number;
  };
  clinical: {
    consultationsCompleted: number;
    abnormalResults: number;
    prescriptionsFilled: number;
    followUpsScheduled: number;
  };
  inventory: {
    lowStockItems: number;
    totalInventoryValue: number;
    expiringItems: number;
    pendingOrders: number;
  };
}
```

#### 33a: Role-Gated Dashboards

> **Role access:** CMO and `hospital_admin` see all dashboards. `clinical_lead` sees clinical, lab, and pharmacy. `cashier` sees billing and financial. `lab_tech` sees lab dashboard only.

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/reports/summary` | cmo, hospital_admin, clinical_lead | `FetchReportSummaryUsecase` |
| GET | `/reports/financial` | cmo, hospital_admin, cashier | `FetchFinancialReportUsecase` |
| GET | `/reports/executive` | cmo, hospital_admin | `FetchExecutiveReportUsecase` |
| GET | `/reports/claims` | cmo, hospital_admin, clinical_lead | `FetchClaimsReportUsecase` |
| GET | `/reports/consultations` | cmo, hospital_admin, clinical_lead, doctor | `FetchConsultationReportUsecase` |
| GET | `/reports/laboratory` | cmo, hospital_admin, clinical_lead, lab_tech | `FetchLaboratoryReportUsecase` |
| GET | `/reports/pharmacy` | cmo, hospital_admin, clinical_lead, pharmacist | `FetchPharmacyReportUsecase` |
| GET | `/reports/nursing` | cmo, hospital_admin, clinical_lead, nurse | `FetchNursingReportUsecase` |
| GET | `/reports/radiology` | cmo, hospital_admin | `FetchRadiologyReportUsecase` |
| GET | `/reports/surgery` | cmo, hospital_admin, clinical_lead | `FetchSurgeryReportUsecase` |

##### GET `/reports/financial`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `dateFrom` | string | Start date (ISO 8601) |
| `dateTo` | string | End date (ISO 8601) |
| `period` | string | Aggregation period: `day`, `week`, `month`, `year` |
| `department` | string | Filter by billing department |

**Response `200`:**
```json
{
  "data": {
    "totalRevenue": 4820000,
    "outstandingPayments": 350000,
    "claimsPending": 12,
    "collectionRate": 0.87,
    "revenueByDepartment": {
      "lab": 980000,
      "pharmacy": 1200000,
      "front_desk": 2640000
    },
    "hmoVsCashRatio": { "hmo": 0.42, "cash": 0.58 },
    "claimsAgingBuckets": { "0_30": 8, "31_60": 3, "over_60": 1 },
    "top10ServicesByRevenue": [
      { "serviceName": "General Consultation", "revenue": 620000 },
      { "serviceName": "Full Blood Count", "revenue": 310000 }
    ]
  },
  "meta": null,
  "errors": null
}
```

#### 33b: Exports & Alerts

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/reports/alerts` | cmo, hospital_admin, clinical_lead | `FetchReportAlertsUsecase` |

##### GET `/reports/alerts`

**Response `200`:**
```json
{
  "data": [
    { "type": "low_stock", "severity": "red", "message": "Normal Saline 500ml — 12 units remaining", "resourceId": "uuid-inventory-item" },
    { "type": "overdue_claim", "severity": "amber", "message": "3 claims pending over 30 days", "resourceId": null },
    { "type": "long_queue_wait", "severity": "amber", "message": "Lab queue average wait time: 47 minutes", "resourceId": null }
  ],
  "meta": null,
  "errors": null
}
```

#### 33c: BI Embed URL

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/reports/embed-url` | cmo, hospital_admin | `FetchEmbedUrlUsecase` |

##### GET `/reports/embed-url`

**Query Params:**

| Param | Type | Description |
|-------|------|-------------|
| `dashboard` | string | Dashboard type: `financial`, `clinical`, `operations` |
| `dateFrom` | string | Start date for dashboard filter |
| `dateTo` | string | End date for dashboard filter |

**Response `200`:**
```json
{
  "data": {
    "embedUrl": "https://metabase.clinicflow.ng/embed/dashboard/abc123?token=eyJhbGci...",
    "expiresAt": "2026-04-03T16:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

---

### Feature 34: Permissions Management

**Description:** Full RBAC permission management. CMO sets role-level defaults; authorized users can grant or revoke specific permissions for individual users. Effective permissions = role defaults merged with user-level overrides (user override wins). Maintains two legacy toggles for backward compatibility. Depends on: Auth, Users (Tier 0–1).

#### Data Model

```typescript
interface PermissionToggles {
  hospitalAdminClinicalAccess: boolean;   // hospital_admin can view clinical_records + patient_emr
  clinicalLeadFinancialAccess: boolean;   // clinical_lead can view financial_reports + revenue_data
}

interface RolePermission {
  role: UserRole;
  resources: ResourceType[];
  updatedBy: string;
  updatedAt: string;
}

interface UserPermission {
  id: string;
  userId: string;
  resourceType: ResourceType;
  action: 'view' | 'create' | 'edit' | 'delete';
  granted: boolean;                       // true = explicit grant; false = explicit revocation
  grantedBy: string;
  grantedAt: string;
}

interface EffectivePermissions {
  userId: string;
  role: UserRole;
  roleResources: ResourceType[];          // From role defaults
  userGrants: ResourceType[];             // Explicitly granted to this user
  userRevocations: ResourceType[];        // Explicitly revoked from this user
  effectiveResources: ResourceType[];     // Final merged result (user override wins)
}

type ResourceType =
  | 'clinical_records' | 'patient_emr' | 'financial_reports' | 'revenue_data'
  | 'staff_management' | 'inventory' | 'billing' | 'hmo_claims' | 'lab_results'
  | 'prescriptions' | 'appointments' | 'queue_management' | 'system_settings';
```

#### 34a: Role Permissions

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/permissions/roles` | cmo | `FetchRolePermissionsUsecase` |
| GET | `/permissions/roles/:role` | cmo | `FetchRolePermissionByRoleUsecase` |
| PUT | `/permissions/roles/:role` | cmo | `UpdateRolePermissionsUsecase` |

##### PUT `/permissions/roles/:role`

**Request Body:**
```json
{
  "resources": ["clinical_records", "patient_emr", "lab_results", "prescriptions", "appointments"]
}
```

**Response `200`:**
```json
{
  "data": {
    "role": "nurse",
    "resources": ["clinical_records", "patient_emr", "lab_results", "prescriptions", "appointments"],
    "updatedBy": "uuid-cmo",
    "updatedAt": "2026-04-03T09:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

#### 34b: User Permissions

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/permissions/users/:userId` | cmo, hospital_admin | `FetchUserPermissionsUsecase` |
| POST | `/permissions/users/:userId/grant` | cmo, hospital_admin | `GrantUserPermissionUsecase` |
| DELETE | `/permissions/users/:userId/revoke` | cmo, hospital_admin | `RevokeUserPermissionUsecase` |

##### GET `/permissions/users/:userId`

**Response `200`:**
```json
{
  "data": {
    "userId": "uuid-user",
    "grants": [
      { "resourceType": "financial_reports", "action": "view", "grantedBy": "uuid-cmo", "grantedAt": "2026-04-01T09:00:00Z" }
    ],
    "revocations": [
      { "resourceType": "staff_management", "action": "edit", "grantedBy": "uuid-cmo", "grantedAt": "2026-04-01T09:00:00Z" }
    ]
  },
  "meta": null,
  "errors": null
}
```

##### POST `/permissions/users/:userId/grant`

**Request Body:**
```json
{
  "resourceType": "financial_reports",
  "action": "view"
}
```

**Response `201`:**
```json
{
  "data": {
    "userId": "uuid-user",
    "resourceType": "financial_reports",
    "action": "view",
    "granted": true,
    "grantedBy": "uuid-cmo",
    "grantedAt": "2026-04-03T10:00:00Z"
  },
  "meta": null,
  "errors": null
}
```

##### DELETE `/permissions/users/:userId/revoke`

**Request Body:**
```json
{
  "resourceType": "staff_management",
  "action": "edit"
}
```

**Response `200`:**
```json
{
  "data": { "userId": "uuid-user", "resourceType": "staff_management", "action": "edit", "granted": false },
  "meta": null,
  "errors": null
}
```

#### 34c: Effective Permissions

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/permissions/users/:userId/effective` | cmo, hospital_admin | `FetchEffectivePermissionsUsecase` |

##### GET `/permissions/users/:userId/effective`

**Response `200`:**
```json
{
  "data": {
    "userId": "uuid-user",
    "role": "clinical_lead",
    "roleResources": ["clinical_records", "patient_emr", "lab_results", "prescriptions"],
    "userGrants": ["financial_reports"],
    "userRevocations": ["staff_management"],
    "effectiveResources": ["clinical_records", "patient_emr", "lab_results", "prescriptions", "financial_reports"]
  },
  "meta": null,
  "errors": null
}
```

#### 34d: Legacy Toggles

> Kept for backward compatibility. Internally maps to role permission updates.

| Method | Path | Roles | Usecase |
|--------|------|-------|---------|
| GET | `/permissions/toggles` | cmo | `FetchPermissionTogglesUsecase` |
| PATCH | `/permissions/toggles` | cmo | `UpdatePermissionTogglesUsecase` |

##### PATCH `/permissions/toggles`

**Request Body:**
```json
{
  "hospitalAdminClinicalAccess": true,
  "clinicalLeadFinancialAccess": false
}
```

**Response `200`:**
```json
{
  "data": {
    "hospitalAdminClinicalAccess": true,
    "clinicalLeadFinancialAccess": false
  },
  "meta": null,
  "errors": null
}
```

---

## Hook-to-Endpoint Mapping

This table maps every React Query hook in `src/hooks/queries/` and `src/hooks/mutations/` to its corresponding backend endpoint.

### Query Hooks

| Hook File                         | Hook / Key                    | Maps To                                              |
|-----------------------------------|-------------------------------|------------------------------------------------------|
| `useAuthQueries.ts`               | `useCurrentUser`              | `GET /auth/me`                                       |
| `usePatientQueries.ts`            | `usePatients`                 | `GET /patients`                                      |
| `usePatientQueries.ts`            | `usePatient`                  | `GET /patients/:id`                                  |
| `usePatientQueries.ts`            | `usePatientSearch`            | `GET /patients/search`                               |
| `usePatientQueries.ts`            | `usePatientSummary`           | `GET /patients/:id/summary`                          |
| `useAppointmentQueries.ts`        | `useAppointments`             | `GET /appointments`                                  |
| `useAppointmentQueries.ts`        | `useAppointment`              | `GET /appointments/:id`                              |
| `useAppointmentQueries.ts`        | `useTodayAppointments`        | `GET /appointments/today`                            |
| `useAppointmentQueries.ts`        | `useDoctorSlots`              | `GET /appointments/doctor/:doctorId/slots`           |
| `useEpisodeQueries.ts`            | `useEpisodes`                 | `GET /episodes`                                      |
| `useEpisodeQueries.ts`            | `useEpisode`                  | `GET /episodes/:id`                                  |
| `useEpisodeQueries.ts`            | `useEpisodeTimeline`          | `GET /episodes/:id/timeline`                         |
| `useEpisodeQueries.ts`            | `usePatientEpisodes`          | `GET /episodes/patient/:patientId`                   |
| `useQueueQueries.ts`              | `useQueue`                    | `GET /queue`                                         |
| `useQueueQueries.ts`              | `useQueueStats`               | `GET /queue/stats`                                   |
| `useVitalQueries.ts`              | `useVitals`                   | `GET /vitals`                                        |
| `useVitalQueries.ts`              | `usePatientVitals`            | `GET /vitals/patient/:patientId`                     |
| `useVitalQueries.ts`              | `useLatestVitals`             | `GET /vitals/patient/:patientId/latest`              |
| `useConsultationQueries.ts`       | `useConsultations`            | `GET /consultations`                                 |
| `useConsultationQueries.ts`       | `useConsultation`             | `GET /consultations/:id`                             |
| `useConsultationQueries.ts`       | `usePatientConsultations`     | `GET /consultations/patient/:patientId`              |
| `useLabQueries.ts`                | `useLabOrders`                | `GET /lab/orders`                                    |
| `useLabQueries.ts`                | `useLabOrder`                 | `GET /lab/orders/:id`                                |
| `useLabQueries.ts`                | `useSampleQueue`              | `GET /lab/orders/sample-queue`                       |
| `useLabQueries.ts`                | `usePatientLabResults`        | `GET /patients/:id/lab-results`                      |
| `useLabQueries.ts`                | `useLabCatalog`               | `GET /lab/catalog`                                   |
| `useLabQueries.ts`                | `usePartnerLabs`              | `GET /labs/partners`                              |
| `useLabQueries.ts`                | `useLabReferrals`             | `GET /lab/referrals`                                 |
| `usePrescriptionQueries.ts`       | `usePrescriptions`            | `GET /prescriptions`                                 |
| `usePrescriptionQueries.ts`       | `usePrescription`             | `GET /prescriptions/:id`                             |
| `usePrescriptionQueries.ts`       | `usePendingPrescriptions`     | `GET /prescriptions/pending`                         |
| `useBillQueries.ts`               | `useBills`                    | `GET /bills`                                         |
| `useBillQueries.ts`               | `useBill`                     | `GET /bills/:id`                                     |
| `useBillQueries.ts`               | `usePatientBills`             | `GET /bills/patient/:patientId`                      |
| `useClaimQueries.ts`              | `useClaims`                   | `GET /claims`                                        |
| `useClaimQueries.ts`              | `useClaim`                    | `GET /claims/:id`                                    |
| `useClaimQueries.ts`              | `useClaimVersions`            | `GET /claims/:id/versions`                           |
| `usePaymentQueries.ts`            | `usePayments`                 | `GET /payments`                                      |
| `usePaymentQueries.ts`            | `usePayment`                  | `GET /payments/:id`                                  |
| `useInventoryQueries.ts`          | `useInventory`                | `GET /inventory`                                     |
| `useInventoryQueries.ts`          | `useLowStock`                 | `GET /inventory/low-stock`                           |
| `useStaffQueries.ts`              | `useStaff`                    | `GET /users`                                         |
| `useStaffQueries.ts`              | `useDoctors`                  | `GET /users/doctors`                                 |
| `useServicePricingQueries.ts`     | `useServices`                 | `GET /services`                                      |
| `useServicePricingQueries.ts`     | `usePriceApprovals`           | `GET /services/price-approvals`                      |
| `useReferenceQueries.ts`          | `useICD10`                    | `GET /reference/icd10`                               |
| `useReferenceQueries.ts`          | `useStates`                   | `GET /reference/locations/states`                    |
| `useReferenceQueries.ts`          | `useLGAs`                     | `GET /reference/locations/lgas`                      |
| `useReferenceQueries.ts`          | `useBanks`                    | `GET /reference/banks`                               |
| `useReferenceQueries.ts`          | `useHMOProviders`             | `GET /hmo/providers`                                 |
| `useReferenceQueries.ts`          | `useProtocolBundles`          | `GET /protocols/bundles`                             |
| `useReportQueries.ts`             | `useReportSummary`            | `GET /reports/summary`                               |
| `useReportQueries.ts`             | `useFinancialReport`          | `GET /reports/financial`                             |
| `useReportQueries.ts`             | `useReportAlerts`             | `GET /reports/alerts`                                |
| `usePermissionQueries.ts`         | `usePermissionToggles`        | `GET /permissions/toggles`                           |
| `usePermissionQueries.ts`         | `useRolePermissions`          | `GET /permissions/roles`                             |
| `useShiftQueries.ts`              | `useShifts`                   | `GET /shifts`                                        |
| `useShiftQueries.ts`              | `useShift`                    | `GET /shifts/:id`                                    |
| `useShiftQueries.ts`              | `useActiveShift`              | `GET /shifts/active`                                 |
| `useShiftQueries.ts`              | `useStationShifts`            | `GET /shifts/station/:station`                       |
| `useStockRequestQueries.ts`       | `useStockRequests`            | `GET /stock-requests`                                |
| `useStockRequestQueries.ts`       | `useStockRequest`             | `GET /stock-requests/:id`                            |
| `useHmoQueries.ts`                | `useHmoContracts`             | `GET /hmo/providers/:id/contracts`                    |
| `useHmoQueries.ts`                | `useHmoContract`              | `GET /hmo/providers/:id/contracts/:contractId`        |
| `useBillQueries.ts`               | `useBillingCode`              | `GET /bills/billing-codes/:code`                     |
| `useBillQueries.ts`               | `useEmergencyOverrides`       | `GET /bills/emergency-overrides`                     |
| `useBillQueries.ts`               | `useEmergencyOverride`        | `GET /bills/emergency-overrides/:id`                 |
| `usePatientQueries.ts`            | `usePatientMedicalHistory`    | `GET /patients/:id/medical-history`                  |

### Mutation Hooks

| Hook File                         | Mutation                      | Maps To                                              |
|-----------------------------------|-------------------------------|------------------------------------------------------|
| `useAuthMutations.ts`             | `useLogin`                    | `POST /auth/login`                                   |
| `useAuthMutations.ts`             | `useLogout`                   | `POST /auth/logout`                                  |
| `usePatientMutations.ts`          | `useCreatePatient`            | `POST /patients`                                     |
| `usePatientMutations.ts`          | `useUpdatePatient`            | `PUT /patients/:id`                                  |
| `usePatientMutations.ts`          | `useUpdatePatientHMO`         | `PATCH /patients/:id/hmo`                            |
| `useAppointmentMutations.ts`      | `useCreateAppointment`        | `POST /appointments`                                 |
| `useAppointmentMutations.ts`      | `useUpdateAppointment`        | `PUT /appointments/:id`                              |
| `useAppointmentMutations.ts`      | `useCancelAppointment`        | `PATCH /appointments/:id/status`                     |
| `useEpisodeMutations.ts`          | `useCreateEpisode`            | `POST /episodes`                                     |
| `useEpisodeMutations.ts`          | `useUpdateEpisodeStatus`      | `PATCH /episodes/:id/status`                         |
| `useEpisodeMutations.ts`          | `useScheduleFollowUp`         | `POST /episodes/:id/follow-up`                       |
| `useQueueMutations.ts`            | `useAddToQueue`               | `POST /queue`                                        |
| `useQueueMutations.ts`            | `useUpdateQueueStatus`        | `PATCH /queue/:id/status`                            |
| `useQueueMutations.ts`            | `usePauseConsultation`        | `PATCH /queue/:id/pause`                             |
| `useQueueMutations.ts`            | `useResumeConsultation`       | `PATCH /queue/:id/resume`                            |
| `useQueueMutations.ts`            | `useVerifyPayment`            | `PATCH /queue/:id/payment`                           |
| `useVitalMutations.ts`            | `useRecordVitals`             | `POST /vitals`                                       |
| `useConsultationMutations.ts`     | `useCreateConsultation`       | `POST /consultations`                                |
| `useConsultationMutations.ts`     | `useUpdateConsultation`       | `PUT /consultations/:id`                             |
| `useConsultationMutations.ts`     | `useFinalizeConsultation`     | `PATCH /consultations/:id/finalize`                  |
| `useConsultationMutations.ts`     | `useAmendConsultation`        | `POST /consultations/:id/amend`                      |
| `useLabMutations.ts`              | `useCreateLabOrder`           | `POST /lab/orders`                                   |
| `useLabMutations.ts`              | `useCollectSample`            | `PATCH /lab/orders/:id/collect`                      |
| `useLabMutations.ts`              | `useEnterResults`             | `PATCH /lab/orders/:id/results`                      |
| `useLabMutations.ts`              | `useSubmitResults`            | `PATCH /lab/orders/:id/submit`                       |
| `useLabMutations.ts`              | `useCreateReferral`           | `POST /lab/referrals`                                |
| `usePrescriptionMutations.ts`     | `useCreatePrescription`       | `POST /prescriptions`                                |
| `usePrescriptionMutations.ts`     | `useDispensePrescription`     | `PATCH /prescriptions/:id/dispense`                  |
| `usePrescriptionMutations.ts`     | `useCancelPrescription`       | `PATCH /prescriptions/:id/cancel`                    |
| `useBillMutations.ts`             | `useCreateBill`               | `POST /bills`                                        |
| `useBillMutations.ts`             | `useUpdateBill`               | `PUT /bills/:id`                                     |
| `useBillMutations.ts`             | `useProcessPayment`           | `PATCH /bills/:id/pay`                               |
| `useBillMutations.ts`             | `useWaiveBill`                | `PATCH /bills/:id/waive`                             |
| `useBillMutations.ts`             | `useGenerateBillingCode`      | `POST /bills/billing-codes`                          |
| `useClaimMutations.ts`            | `useCreateClaim`              | `POST /claims`                                       |
| `useClaimMutations.ts`            | `useSubmitClaim`              | `PATCH /claims/:id/submit`                           |
| `useClaimMutations.ts`            | `useUpdateClaimStatus`        | `PATCH /claims/:id/status`                           |
| `useClaimMutations.ts`            | `useResubmitClaim`            | `PATCH /claims/:id/resubmit`                         |
| `useClaimMutations.ts`            | `useWithdrawClaim`            | `PATCH /claims/:id/withdraw`                         |
| `useClaimMutations.ts`            | `useRetractClaim`             | `PATCH /claims/:id/retract`                          |
| `useClaimMutations.ts`            | `useUploadClaimDocument`      | `POST /claims/:id/documents`                         |
| `useInventoryMutations.ts`        | `useAdjustStock`              | `POST /inventory/:id/adjust`                         |
| `useStaffMutations.ts`            | `useCreateUser`               | `POST /users`                                        |
| `useStaffMutations.ts`            | `useUpdateUser`               | `PUT /users/:id`                                     |
| `useStaffMutations.ts`            | `useToggleUserStatus`         | `PATCH /users/:id/status`                            |
| `useServicePricingMutations.ts`   | `useCreateService`            | `POST /services`                                     |
| `useServicePricingMutations.ts`   | `useSubmitPriceApproval`      | `POST /services/price-approvals`                     |
| `useServicePricingMutations.ts`   | `useReviewPriceApproval`      | `PATCH /services/price-approvals/:id`                |
| `usePermissionMutations.ts`       | `useUpdatePermissionToggles`  | `PATCH /permissions/toggles`                         |
| `useShiftMutations.ts`            | `useOpenShift`                | `POST /shifts`                                       |
| `useShiftMutations.ts`            | `useCloseShift`               | `PATCH /shifts/:id/close`                            |
| `useStockRequestMutations.ts`     | `useCreateStockRequest`       | `POST /stock-requests`                               |
| `useStockRequestMutations.ts`     | `useReviewStockRequest`       | `PATCH /stock-requests/:id/review`                   |
| `useStockRequestMutations.ts`     | `useForwardStockRequest`      | `PATCH /stock-requests/:id/forward`                  |
| `useStockRequestMutations.ts`     | `useFulfillStockRequest`      | `PATCH /stock-requests/:id/fulfill`                  |
| `useHmoMutations.ts`              | `useCreateHmoContract`        | `POST /hmo/providers/:id/contracts`                   |
| `useHmoMutations.ts`              | `useUpdateHmoContract`        | `PUT /hmo/providers/:id/contracts/:contractId`        |
| `useHmoMutations.ts`              | `useDeleteHmoContract`        | `DELETE /hmo/providers/:id/contracts/:contractId`     |
| `useBillMutations.ts`             | `useAuthorizeEmergencyOverride` | `POST /bills/emergency-overrides`                  |
| `useBillMutations.ts`             | `useClearEmergencyOverride`   | `PATCH /bills/emergency-overrides/:id/clear`         |
| `useBillMutations.ts`             | `usePayBillingCode`           | `PATCH /bills/billing-codes/:code/pay`               |
| `usePatientMutations.ts`          | `useAddMedicalHistory`        | `POST /patients/:id/medical-history`                 |
| `usePatientMutations.ts`          | `useRemoveMedicalHistory`     | `DELETE /patients/:id/medical-history/:entryId`      |

---

*Document updated: 2026-04-03 | ClinicFlow v1.2.0 — Tier 1 full entity redesign*
