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
   - [Feature 4: HMO Provider Management](#feature-4-hmo-provider-management)
   - [Feature 5: Service Pricing & Catalog](#feature-5-service-pricing--catalog)
   - [Feature 6: Lab Test Catalog](#feature-6-lab-test-catalog)
   - [Feature 7: Inventory Management](#feature-7-inventory-management)
   - [Feature 8: Protocol Bundles & Clinical Rules](#feature-8-protocol-bundles--clinical-rules)
4. [Tier 2 — Patient Core](#tier-2--patient-core)
   - [Feature 9: Patient Management](#feature-9-patient-management)
   - [Feature 10: Staff Roster & Scheduling](#feature-10-staff-roster--scheduling)
5. [Tier 3 — Visit Lifecycle](#tier-3--visit-lifecycle)
   - [Feature 11: Appointments](#feature-11-appointments)
   - [Feature 12: Episodes](#feature-12-episodes)
6. [Tier 4 — Clinical Flow Entry](#tier-4--clinical-flow-entry)
   - [Feature 13: Queue Management](#feature-13-queue-management)
   - [Feature 14: Vital Signs](#feature-14-vital-signs)
7. [Tier 5 — Clinical Documentation](#tier-5--clinical-documentation)
   - [Feature 15: Consultations](#feature-15-consultations)
   - [Feature 16: Lab Orders & Results](#feature-16-lab-orders--results)
   - [Feature 17: Prescriptions & Dispensing](#feature-17-prescriptions--dispensing)
8. [Tier 6 — Financial](#tier-6--financial)
   - [Feature 18: Billing & Payments](#feature-18-billing--payments)
   - [Feature 19: HMO Claims](#feature-19-hmo-claims)
9. [Tier 7 — Operations](#tier-7--operations)
   - [Feature 20: Cashier Shift Management](#feature-20-cashier-shift-management)
   - [Feature 21: Stock Requests](#feature-21-stock-requests)
   - [Feature 22: Lab Referrals (Partner Labs)](#feature-22-lab-referrals-partner-labs)
10. [Tier 8 — Cross-Cutting](#tier-8--cross-cutting)
    - [Feature 23: Notifications](#feature-23-notifications)
    - [Feature 24: Audit Logging](#feature-24-audit-logging)
    - [Feature 25: Reports & Analytics](#feature-25-reports--analytics)
    - [Feature 26: Permissions Management](#feature-26-permissions-management)
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

### Feature 4: HMO Provider Management

**Description:** Manages Health Maintenance Organizations registered with the facility. Includes service coverage configuration per HMO. Depends on: Auth, Users (Tier 0–1).

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
  defaultCopay: number;                 // Default flat NGN copay amount per visit (provider-level fallback)
  defaultCopayPercentage: number;       // Default copay percentage (0–100) (provider-level fallback)
  isActive: boolean;
}

// HmoContract: the canonical HMO service coverage entity.
// Defines what the HMO has contracted to cover for a specific service.
// Pricing model:
//   - Non-HMO patients pay MedicalService.defaultPrice
//   - HMO patients pay HmoContract.contractedPrice (falls back to defaultPrice if null)
//   - HMO covers: coveragePercentage% of contractedPrice (PARTIAL_PERCENT),
//                 coverageFlatAmount NGN (PARTIAL_FLAT), or 100% (FULL)
//   - Patient pays the remainder
//   - If no HmoContract exists for a service, HmoProvider.defaultCopay/defaultCopayPercentage applies
interface HMOContract {
  id: string;
  hmoProviderId: string;
  serviceId: string;
  coverageType: 'full' | 'partial_percent' | 'partial_flat' | 'none';
  contractedPrice?: number;       // HMO-negotiated service price (NGN). Null = use MedicalService.defaultPrice
  coveragePercentage?: number;    // 0–100. What the HMO covers. Used when coverageType = partial_percent
  coverageFlatAmount?: number;    // NGN amount the HMO covers. Used when coverageType = partial_flat
  maxCoveredAmount?: number;      // Cap on HMO coverage for partial coverage types
  requiredPreAuthorization: boolean;
  isActive: boolean;
  updatedAt: string;
}

interface HMOVerificationRequest {
  hmoProviderId: string;
  enrollmentId: string;
  patientName: string;
}
```

#### Endpoints

| Method | Path                                         | Roles                                    | Description                                    |
|--------|----------------------------------------------|------------------------------------------|------------------------------------------------|
| GET    | `/hmo/providers`                             | any                                      | List all HMO providers                         |
| POST   | `/hmo/providers`                             | cmo, hospital_admin                      | Create HMO provider                            |
| GET    | `/hmo/providers/:id`                         | any                                      | Get HMO provider detail                        |
| PUT    | `/hmo/providers/:id`                         | cmo, hospital_admin                      | Update HMO provider                            |
| PATCH  | `/hmo/providers/:id/status`                  | cmo, hospital_admin                      | Toggle provider active status                  |
| GET    | `/hmo/providers/:id/coverage`                | any                                      | List service coverage rules for an HMO         |
| POST   | `/hmo/providers/:id/coverage`                | cmo, hospital_admin                      | Add a coverage rule                            |
| PUT    | `/hmo/providers/:id/coverage/:coverageId`    | cmo, hospital_admin                      | Update a coverage rule                         |
| DELETE | `/hmo/providers/:id/coverage/:coverageId`    | cmo, hospital_admin                      | Remove a coverage rule                         |
| POST   | `/hmo/verify`                                | receptionist, cashier, nurse, doctor     | Verify a patient's HMO enrollment in real-time |
| GET    | `/hmo/coverage`                              | any                                      | Query all coverage rules across all HMOs       |

##### POST `/hmo/verify`

**Request Body:**
```json
{
  "hmoProviderId": "hmo-001",
  "enrollmentId": "HYG-2024-88991",
  "patientName": "Chukwuemeka Obiora"
}
```

**Response `200`:**
```json
{
  "data": {
    "id": "ver-001",
    "providerId": "hmo-001",
    "providerName": "Hygeia HMO",
    "policyNumber": "HYG-POL-001",
    "enrollmentId": "HYG-2024-88991",
    "status": "active",
    "expiryDate": "2025-12-31",
    "coveredServices": ["consultation", "lab", "pharmacy"],
    "coPayPercentage": 10,
    "preAuthCode": "PA-2024-5512",
    "verifiedAt": "2024-06-15T09:30:00Z"
  },
  "meta": null,
  "errors": null
}
```

---

### Feature 5: Service Pricing & Catalog

**Description:** Manages the hospital's catalog of billable services and their prices. Includes a price-approval workflow. Depends on: Auth, Users (Tier 0–1).

#### Data Model

```typescript
interface ServicePrice {
  id: string;
  code: string;                 // Hospital-assigned code e.g. "CONS-001". Distinct from ServiceCodeCatalog (HMO/coding-standard codes)
  name: string;
  description?: string;
  category: ServiceCategory;    // 'consultation' | 'lab' | 'pharmacy' | 'procedure' | 'admission' | 'other'
  standardPrice: number;        // NGN — price for cash/corporate patients (MedicalService.defaultPrice)
  // HMO-specific pricing is managed via HMOContract.contractedPrice per provider, not here
  isTaxable: boolean;
  isPremium: boolean;
  isRestricted: boolean;
  restrictionReason?: string;
  department?: 'front_desk' | 'lab' | 'pharmacy' | 'nursing' | 'all';
  status: 'pending' | 'approved' | 'rejected';  // Approval state for new/changed services
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

interface PriceApproval {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  category: ServiceCategory;
  oldPrice?: number;
  newPrice: number;
  changePercentage?: number;
  reason: string;
  requestedBy: string;
  requestedByName: string;
  requestedByRole: UserRole;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  isNewService: boolean;
}
```

#### Endpoints

| Method | Path                              | Roles                                      | Description                                 |
|--------|-----------------------------------|--------------------------------------------|---------------------------------------------|
| GET    | `/services`                       | any                                        | List all services with filters              |
| POST   | `/services`                       | hospital_admin, cmo                        | Create new service (goes to approval queue) |
| GET    | `/services/:id`                   | any                                        | Get service detail                          |
| PUT    | `/services/:id`                   | hospital_admin, cmo                        | Update service (triggers approval if price) |
| PATCH  | `/services/:id/status`            | cmo                                        | Toggle service active/inactive              |
| GET    | `/services/price-approvals`       | cmo, hospital_admin                        | List pending price approvals                |
| POST   | `/services/price-approvals`       | hospital_admin, clinical_lead              | Submit price change request                 |
| PATCH  | `/services/price-approvals/:id`   | cmo                                        | Approve or reject a price change            |
| POST   | `/services/resolve-price`         | doctor, nurse, pharmacist, lab_tech        | Resolve prices for a set of items given payer type |

##### POST `/services/resolve-price`

**Request Body:**
```json
{
  "items": [
    { "itemId": "svc-lab-001", "itemName": "Full Blood Count", "category": "lab" }
  ],
  "payerType": "hmo",
  "hmoProviderId": "hmo-001"
}
```

**Response `200`:**
```json
{
  "data": [
    {
      "itemId": "svc-lab-001",
      "itemName": "Full Blood Count",
      "category": "lab",
      "standardPrice": 5000,
      "payerPrice": 4500,
      "coverageStatus": "partial",
      "patientLiability": 500,
      "hmoLiability": 4000,
      "isPremium": false,
      "isRestricted": false
    }
  ],
  "meta": null,
  "errors": null
}
```

---

### Feature 6: Lab Test Catalog

**Description:** Manages the list of available laboratory tests with reference ranges, methodology, and sample types. Depends on: Auth (Tier 0).

#### Data Model

```typescript
interface TestCatalogEntry {
  testCode: string;               // e.g. "lab-001" (hospital's own code)
  testName: string;               // e.g. "Full Blood Count (FBC)"
  category: string;               // e.g. "Haematology"
  defaultUnit: string;            // e.g. "cells/μL"
  defaultRange: string;           // e.g. "4.5–11.0 x10³/μL"
  criticalLow?: number;
  criticalHigh?: number;
  methodology?: string;           // e.g. "Flow cytometry"
  preparationInstructions?: string;
  sampleType?: string;            // e.g. "EDTA whole blood"
  loincCode?: string;             // LOINC standard code (via ServiceCodeCatalog link)
  isActive: boolean;
}
```

#### Endpoints

| Method | Path                        | Roles                               | Description                              |
|--------|-----------------------------|-------------------------------------|------------------------------------------|
| GET    | `/lab/catalog`              | any                                 | List all lab tests                       |
| POST   | `/lab/catalog`              | cmo, hospital_admin, clinical_lead  | Add test to catalog                      |
| GET    | `/lab/catalog/:code`        | any                                 | Get test detail by code                  |
| PUT    | `/lab/catalog/:code`        | cmo, hospital_admin                 | Update test parameters                   |
| PATCH  | `/lab/catalog/:code/status` | cmo, hospital_admin                 | Activate / deactivate test               |

##### GET `/lab/catalog`

**Query Params:**

| Param      | Type    | Description                  |
|------------|---------|------------------------------|
| `category` | string  | Filter by test category      |
| `search`   | string  | Search by code or name       |
| `isActive` | boolean | Filter active tests only     |

---

### Feature 7: Inventory Management

**Description:** Tracks medicines, consumables, and equipment. Manages stock levels, reorder points, and expiry. Depends on: Auth, Users (Tier 0–1).

#### Data Model

```typescript
interface InventoryItem {
  id: string;
  name: string;
  category: 'medicine' | 'consumable' | 'equipment' | 'utility';
  unit: string;                   // e.g. "tablets", "vials", "units"
  currentStock: number;
  reorderLevel: number;
  unitCost: number;               // NGN
  supplier?: string;
  expiryDate?: string;            // ISO 8601 date
  location: string;               // e.g. "Pharmacy Store A", "Lab Fridge"
  lastRestocked?: string;
  createdAt: string;
  updatedAt: string;
}

interface StockAdjustment {
  inventoryItemId: string;
  adjustmentType: 'restock' | 'dispense' | 'write_off' | 'transfer';
  quantity: number;               // Positive = add, Negative = remove
  reason: string;
  referenceId?: string;           // e.g. prescription ID, stock-request ID
  performedBy: string;
}
```

#### Endpoints

| Method | Path                              | Roles                                         | Description                              |
|--------|-----------------------------------|-----------------------------------------------|------------------------------------------|
| GET    | `/inventory`                      | pharmacist, lab_tech, hospital_admin, cmo      | List inventory with filters              |
| POST   | `/inventory`                      | hospital_admin, cmo                           | Add new inventory item                   |
| GET    | `/inventory/:id`                  | pharmacist, lab_tech, hospital_admin, cmo      | Get item detail                          |
| PUT    | `/inventory/:id`                  | hospital_admin, cmo                           | Update item details                      |
| POST   | `/inventory/:id/adjust`           | pharmacist, lab_tech, hospital_admin           | Adjust stock (restock, dispense, etc.)   |
| GET    | `/inventory/low-stock`            | pharmacist, hospital_admin, cmo               | List items at or below reorder level     |
| GET    | `/inventory/expiring`             | pharmacist, hospital_admin, cmo               | List items expiring within N days        |

##### GET `/inventory`

**Query Params:**

| Param      | Type    | Description                              |
|------------|---------|------------------------------------------|
| `category` | string  | Filter by category                       |
| `search`   | string  | Search by name                           |
| `lowStock` | boolean | Only items at/below reorder level        |
| `location` | string  | Filter by storage location               |

---

### Feature 8: Protocol Bundles & Clinical Rules

**Description:** Manages clinical decision-support data: protocol bundles (ICD-10-triggered sets of lab tests + medications), ICD-10-to-service mappings, drug–lab conflict rules, and HMO clinical rules. Depends on: Auth, Lab Catalog, Services (Tier 0–1).

#### Data Model

```typescript
interface ProtocolBundle {
  id: string;
  name: string;
  description: string;
  icd10Codes: string[];
  labTests: BundleLabItem[];
  medications: BundleMedItem[];
}

interface BundleLabItem {
  testCode: string;
  testName: string;
  priority: 'routine' | 'urgent' | 'stat';
  notes?: string;
}

interface BundleMedItem {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
}

interface ConflictRule {
  id: string;
  drugNamePattern: string;       // Regex pattern to match drug name
  conflictingLabTestCode: string;
  conflictingLabResult: string;  // e.g. "positive", ">7.0"
  description: string;
}

interface HMORule {
  id: string;
  hmoProviderId: string;
  hmoProviderName: string;
  ruleField: 'temperature' | 'bloodPressureSystolic' | 'bloodPressureDiastolic' | 'pulse' | 'oxygenSaturation' | 'labOrder' | 'prescription';
  condition: 'gte' | 'lte' | 'eq' | 'present';
  value: number | string;
  icdCodesApplicable: string[];
  message: string;
  severity: 'warning' | 'error';
}

interface ICD10ServiceMapping {
  id: string;
  icd10Code: string;
  icd10Description: string;
  approvedServiceIds: string[];
  approvedServiceNames: string[];
  bundleId?: string;
}
```

#### Endpoints

| Method | Path                                | Roles                          | Description                                        |
|--------|-------------------------------------|--------------------------------|----------------------------------------------------|
| GET    | `/protocols/bundles`                | any                            | List all protocol bundles                          |
| POST   | `/protocols/bundles`                | cmo, clinical_lead             | Create a new bundle                                |
| GET    | `/protocols/bundles/:id`            | any                            | Get bundle by ID                                   |
| PUT    | `/protocols/bundles/:id`            | cmo, clinical_lead             | Update a bundle                                    |
| DELETE | `/protocols/bundles/:id`            | cmo                            | Delete a bundle                                    |
| GET    | `/protocols/bundles/by-icd/:code`   | any                            | Get bundles matching an ICD-10 code                |
| GET    | `/protocols/conflict-rules`         | any                            | List drug–lab conflict rules                       |
| POST   | `/protocols/conflict-rules`         | cmo, clinical_lead             | Create conflict rule                               |
| PUT    | `/protocols/conflict-rules/:id`     | cmo, clinical_lead             | Update conflict rule                               |
| DELETE | `/protocols/conflict-rules/:id`     | cmo                            | Delete conflict rule                               |
| GET    | `/protocols/hmo-rules`              | any                            | List HMO clinical rules                            |
| POST   | `/protocols/hmo-rules`              | cmo, hospital_admin            | Create HMO rule                                    |
| PUT    | `/protocols/hmo-rules/:id`          | cmo, hospital_admin            | Update HMO rule                                    |
| DELETE | `/protocols/hmo-rules/:id`          | cmo                            | Delete HMO rule                                    |
| GET    | `/protocols/icd10-mappings`         | any                            | List ICD-10 → approved-service mappings            |
| POST   | `/protocols/icd10-mappings`         | cmo, clinical_lead             | Create ICD-10 mapping                              |
| PUT    | `/protocols/icd10-mappings/:id`     | cmo, clinical_lead             | Update ICD-10 mapping                              |

---

## Tier 2 — Patient Core

---

### Feature 9: Patient Management

**Description:** Core patient demographic registry. Supports registration, search, profile editing, and HMO enrollment. MRN is server-generated in `CF-YYYY-NNNNN` format. Depends on: Auth, Reference Data (Tier 0), HMO Providers (Tier 1).

#### Data Model

```typescript
interface Patient {
  id: string;
  mrn: string;                   // CF-YYYY-NNNNN
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;           // ISO 8601 date
  gender: 'male' | 'female' | 'other';
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  phone: string;
  email?: string;                // Optional at registration; unique when provided
  address: string;
  state: string;
  lga: string;
  nationality: string;
  occupation?: string;
  paymentType: 'cash' | 'hmo' | 'corporate';
  hmoDetails?: {
    providerId: string;
    providerName: string;
    enrollmentId: string;
    planType: string;
    expiryDate: string;
    copayAmount: number;
    isActive: boolean;
  };
  nextOfKin: {
    name: string;
    relationship: string;
    phone: string;
    address?: string;
  };
  // Medical history is stored in PatientMedicalHistory records (see GET /patients/:id/medical-history)
  // allergies and chronic conditions are NOT stored as simple string arrays on the Patient record
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface PatientMedicalHistoryEntry {
  id: string;
  patientId: string;
  catalogId: string;             // FK → MedicalCatalog (condition/allergy definition)
  catalogName: string;           // e.g. "Penicillin Allergy", "Type 2 Diabetes"
  customName?: string;           // Override if not in catalog
  severity: string;              // e.g. "mild", "moderate", "severe"
  addedBy: string;               // Staff ID
  addedByName: string;
  createdAt: string;
}
```

#### Endpoints

| Method | Path                              | Roles                                                           | Description                                    |
|--------|-----------------------------------|-----------------------------------------------------------------|------------------------------------------------|
| GET    | `/patients`                       | receptionist, nurse, doctor, cashier, pharmacist, lab_tech, clinical_lead, hospital_admin, cmo | List patients with search/filters |
| POST   | `/patients`                       | receptionist, nurse, hospital_admin, cmo                        | Register new patient (MRN auto-generated)      |
| GET    | `/patients/:id`                   | any                                                             | Get full patient profile                       |
| PUT    | `/patients/:id`                   | receptionist, nurse, hospital_admin, cmo                        | Update patient demographics                    |
| PATCH  | `/patients/:id/hmo`               | receptionist, hospital_admin, cmo                               | Update HMO enrollment details                  |
| PATCH  | `/patients/:id/status`            | hospital_admin, cmo                                             | Activate / deactivate patient record           |
| GET    | `/patients/search`                | any                                                             | Search by name, MRN, phone, email              |
| GET    | `/patients/:id/summary`           | any                                                             | Lightweight summary (MRN, name, age, payer)    |
| GET    | `/patients/:id/episodes`          | doctor, nurse, clinical_lead, cmo, hospital_admin               | List episodes for a patient                    |
| GET    | `/patients/:id/lab-results`       | doctor, nurse, lab_tech, clinical_lead, cmo, patient            | Lab results for a patient (portal view)        |
| GET    | `/patients/:id/medical-history`   | doctor, nurse, clinical_lead, cmo, hospital_admin               | Patient's medical history (allergies, conditions) |
| POST   | `/patients/:id/medical-history`   | doctor, nurse                                                   | Add a medical history entry                    |
| DELETE | `/patients/:id/medical-history/:entryId` | doctor, clinical_lead, cmo                             | Remove a medical history entry                 |

##### GET `/patients/search`

**Query Params:**

| Param   | Type   | Description                            |
|---------|--------|----------------------------------------|
| `q`     | string | Search term (name, MRN, phone, email)  |
| `limit` | int    | Max results (default `10`)             |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "pat-001",
      "mrn": "CF-2024-00142",
      "fullName": "Chukwuemeka Obiora",
      "gender": "male",
      "age": 34,
      "phone": "08023456789",
      "paymentType": "hmo",
      "lastVisit": "2024-05-20T10:00:00Z"
    }
  ],
  "meta": { "total": 1 },
  "errors": null
}
```

---

### Feature 10: Staff Roster & Scheduling

**Description:** Manages weekly duty rosters (shift assignments per staff per day). Separate from user management; this is operational scheduling. Depends on: Auth, Users (Tier 0–1).

#### Data Model

```typescript
interface RosterEntry {
  staffId: string;
  staffName: string;
  role: string;
  shifts: Record<string, ShiftType>;      // key = "YYYY-MM-DD"
  customTimes?: Record<string, {          // key = "YYYY-MM-DD"
    startTime: string;                    // HH:mm
    endTime: string;
  }>;
}

interface WeeklyRoster {
  id: string;
  weekStart: string;      // ISO 8601 date (Monday)
  weekEnd: string;        // ISO 8601 date (Sunday)
  entries: RosterEntry[];
  publishedAt?: string;
  publishedBy?: string;
}

type ShiftType = 'morning' | 'afternoon' | 'night' | 'off';
```

#### Endpoints

| Method | Path                           | Roles                                | Description                              |
|--------|--------------------------------|--------------------------------------|------------------------------------------|
| GET    | `/roster`                      | any                                  | List rosters (filter by week/department) |
| POST   | `/roster`                      | hospital_admin, cmo, clinical_lead   | Create/publish a weekly roster           |
| GET    | `/roster/:id`                  | any                                  | Get full roster for a week               |
| PUT    | `/roster/:id`                  | hospital_admin, cmo, clinical_lead   | Update roster entries                    |
| GET    | `/roster/current`              | any                                  | Get the active roster for current week   |
| GET    | `/roster/staff/:staffId`       | any                                  | Get a staff member's schedule            |

##### GET `/roster`

**Query Params:**

| Param        | Type   | Description                              |
|--------------|--------|------------------------------------------|
| `weekStart`  | string | ISO date — filter to specific week       |
| `department` | string | Filter by department                     |
| `role`       | string | Filter by role                           |

---

## Tier 3 — Visit Lifecycle

---

### Feature 11: Appointments

**Description:** Manages scheduled patient visits. Supports booking, confirmation, rescheduling, and cancellation. Generates check-in queue entries on arrival. Depends on: Patients, Users (Tier 2).

#### Data Model

```typescript
interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  appointmentType: 'consultation' | 'follow_up' | 'emergency' | 'procedure' | 'lab_only';
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  scheduledDate: string;   // ISO 8601 date
  scheduledTime: string;   // HH:mm
  duration: number;        // minutes
  reasonForVisit: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}
```

#### Endpoints

| Method | Path                                    | Roles                                                        | Description                                     |
|--------|-----------------------------------------|--------------------------------------------------------------|-------------------------------------------------|
| GET    | `/appointments`                         | receptionist, doctor, nurse, clinical_lead, hospital_admin, cmo | List appointments with filters              |
| POST   | `/appointments`                         | receptionist, doctor, nurse, clinical_lead, hospital_admin   | Book new appointment                            |
| GET    | `/appointments/:id`                     | any                                                          | Get appointment detail                          |
| PUT    | `/appointments/:id`                     | receptionist, doctor, hospital_admin                         | Update appointment (reschedule, notes)          |
| PATCH  | `/appointments/:id/status`              | receptionist, nurse, doctor, hospital_admin                  | Change appointment status                       |
| DELETE | `/appointments/:id`                     | receptionist, hospital_admin, cmo                            | Cancel/delete appointment                       |
| GET    | `/appointments/doctor/:doctorId/slots`  | receptionist, patient                                        | Get available time slots for a doctor           |
| GET    | `/appointments/today`                   | receptionist, nurse, doctor, clinical_lead                   | Appointments scheduled for today               |

##### GET `/appointments`

**Query Params:**

| Param         | Type   | Description                                     |
|---------------|--------|-------------------------------------------------|
| `patientId`   | string | Filter by patient                               |
| `doctorId`    | string | Filter by doctor                                |
| `status`      | string | Filter by status                                |
| `date`        | string | Filter by scheduled date (ISO date)             |
| `dateFrom`    | string | Date range start                                |
| `dateTo`      | string | Date range end                                  |
| `type`        | string | Filter by appointment type                      |

---

### Feature 12: Episodes

**Description:** An Episode groups all clinical and financial activity for a single visit or care episode. Created at check-in and manually transitioned through statuses by clinical staff. Depends on: Patients, Appointments (Tier 2–3).

#### Data Model

```typescript
interface Episode {
  id: string;
  episodeNumber: string;            // e.g. "EP-2024-0892"
  patientId: string;
  patientName: string;
  patientMrn: string;
  // Status lifecycle: open → closed → locked → archived
  // open: active visit; closed: visit ended; locked: under audit; archived: long-term storage
  status: 'open' | 'closed' | 'locked' | 'archived';
  appointmentId?: string;           // Linked appointment if visit originated from booking
  createdAt: string;
  createdBy: string;
  completedAt?: string;
  billIds: string[];
  consultationIds: string[];
  labOrderIds: string[];
  prescriptionIds: string[];
  claimIds: string[];
  totalBilled: number;
  totalPaid: number;
  totalBalance: number;
  isLockedForAudit: boolean;
  notes?: string;
}

interface EpisodeTimelineEvent {
  id: string;
  episodeId: string;
  timestamp: string;
  eventType: 'created' | 'bill_created' | 'consultation' | 'lab_ordered' | 'lab_results' | 'prescription' | 'follow_up' | 'bill_updated' | 'completed' | 'auto_completed';
  description: string;
  actorName: string;
  actorRole: string;
  linkedEntityId?: string;
  linkedEntityType?: string;
}
```

#### Endpoints

| Method | Path                              | Roles                                                          | Description                                    |
|--------|-----------------------------------|----------------------------------------------------------------|------------------------------------------------|
| GET    | `/episodes`                       | doctor, nurse, clinical_lead, hospital_admin, cmo, cashier     | List episodes with filters                     |
| POST   | `/episodes`                       | receptionist, nurse                                            | Open new episode (on check-in)                 |
| GET    | `/episodes/:id`                   | any                                                            | Get episode detail                             |
| PATCH  | `/episodes/:id/status`            | doctor, nurse, clinical_lead, hospital_admin, cmo              | Update episode status                          |
| PATCH  | `/episodes/:id/diagnosis`         | doctor, clinical_lead                                          | Set provisional/final diagnosis                |
| POST   | `/episodes/:id/follow-up`         | doctor, clinical_lead                                          | Schedule a follow-up                           |
| PATCH  | `/episodes/:id/lock`              | hospital_admin, cmo                                            | Lock episode for audit                         |
| GET    | `/episodes/:id/timeline`          | any                                                            | Get chronological event timeline               |
| GET    | `/episodes/patient/:patientId`    | doctor, nurse, clinical_lead, hospital_admin, cmo              | List all episodes for a patient                |

---

## Tier 4 — Clinical Flow Entry

---

### Feature 13: Queue Management

**Description:** Real-time queue management across five queues: triage, doctor_new, doctor_review, lab, pharmacy. Includes priority management, payment clearance checks, and consultation pause/resume. Depends on: Patients, Episodes (Tier 2–3).

**Architecture — Redis/DB Hybrid:**
- **Redis** holds live queue state (position, current status, assignment, pause state). Updated on every status change. Used for real-time API responses.
- **DB (`QueueEntry` entity)** is written only on patient entry and exit (2 writes per patient). Used for analytics — wait times, throughput, patient flow reports. Not queried for live queue display.
- The `QueueEntry` DB record (analytics snapshot) contains: `enteredAt`, `exitedAt`, `totalWaitMinutes`, `exitReason`, `priority`, `paymentStatus`, `assignedTo`. Live fields like `status`, `pauseReason`, `queueNumber` exist only in Redis.

#### Data Model

```typescript
// Live queue entry — served from Redis, not the DB
interface QueueEntry {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  queueType: 'triage' | 'doctor_new' | 'doctor_review' | 'lab' | 'pharmacy';
  status: 'waiting' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'no_show';
  priority: 'normal' | 'high' | 'emergency';
  joinedAt: string;
  calledAt?: string;
  completedAt?: string;
  waitTimeMinutes: number;
  paymentStatus: 'pending' | 'cleared' | 'hmo_verified' | 'emergency_override';
  paymentClearanceId?: string;
  paymentVerifiedBy?: string;
  paymentVerifiedAt?: string;
  isReview?: boolean;
  originalConsultationId?: string;
  pauseReason?: 'waiting_lab_results' | 'personal_urgent_issue' | 'patient_requested' | 'waiting_specialist' | 'other';
  pauseReasonOther?: string;
  pausedAt?: string;
  pausedBy?: string;
  autoPauseExpiryAt?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedAt?: string;
  chiefComplaint?: string;
  notes?: string;
  queueNumber: number;
}

// Analytics snapshot — written to DB on entry and exit only
interface QueueEntrySnapshot {
  id: string;
  patientId: string;
  episodeId?: string;
  queueType: 'triage' | 'doctor_new' | 'doctor_review' | 'lab' | 'pharmacy';
  priority: 'normal' | 'high' | 'emergency';
  paymentStatus: 'pending' | 'cleared' | 'hmo_verified' | 'emergency_override';
  enteredAt: string;
  exitedAt?: string;
  totalWaitMinutes?: number;          // Calculated on exit
  exitReason?: 'completed' | 'cancelled' | 'no_show' | 'transferred';
  assignedTo?: string;
  chiefComplaint?: string;
  notes?: string;
}

interface QueueStats {
  total: number;
  waiting: number;
  inProgress: number;
  paused: number;
  completed: number;
  averageWaitTime: number;
  longestWaitTime: number;
  emergencyCount: number;
}
```

#### Endpoints

| Method | Path                                    | Roles                                                              | Description                                        |
|--------|-----------------------------------------|--------------------------------------------------------------------|----------------------------------------------------|
| GET    | `/queue`                                | nurse, doctor, pharmacist, lab_tech, receptionist, clinical_lead, hospital_admin, cmo | List queue entries with filters |
| POST   | `/queue`                                | receptionist, nurse                                                | Add patient to a queue                             |
| GET    | `/queue/:id`                            | any                                                                | Get queue entry detail                             |
| PATCH  | `/queue/:id/status`                     | nurse, doctor, pharmacist, lab_tech, receptionist                  | Update queue entry status (call, complete, cancel) |
| PATCH  | `/queue/:id/priority`                   | nurse, doctor, clinical_lead, cmo                                  | Change priority (escalate to emergency)            |
| PATCH  | `/queue/:id/assign`                     | nurse, doctor, pharmacist, lab_tech                                | Assign to specific staff member                    |
| PATCH  | `/queue/:id/pause`                      | doctor                                                             | Pause consultation (with reason)                   |
| PATCH  | `/queue/:id/resume`                     | doctor                                                             | Resume paused consultation                         |
| PATCH  | `/queue/:id/payment`                    | cashier, receptionist                                              | Verify payment clearance                           |
| POST   | `/queue/:id/emergency-override`         | cmo, clinical_lead, hospital_admin                                 | Override payment requirement for emergency         |
| GET    | `/queue/stats`                          | nurse, doctor, clinical_lead, hospital_admin, cmo                  | Real-time queue statistics                         |
| GET    | `/queue/stats/:queueType`               | any                                                                | Stats for a specific queue                         |

##### GET `/queue`

**Query Params:**

| Param         | Type   | Description                                           |
|---------------|--------|-------------------------------------------------------|
| `queueType`   | string | Filter by queue type                                  |
| `status`      | string | Filter by status                                      |
| `priority`    | string | Filter by priority                                    |
| `paymentStatus`| string| Filter by payment clearance status                   |
| `patientId`   | string | Filter by patient                                     |
| `assignedTo`  | string | Filter by assigned staff                              |

##### PATCH `/queue/:id/pause`

**Request Body:**
```json
{
  "pauseReason": "waiting_lab_results",
  "pauseReasonOther": null,
  "notes": "Awaiting FBC and malaria parasite results"
}
```

---

### Feature 14: Vital Signs

**Description:** Records and retrieves patient vital signs (BP, temperature, pulse, SpO2, weight, height, BMI). Generates alert flags for abnormal values. Depends on: Patients, Queue (Tier 2–4).

#### Data Model

```typescript
interface VitalSigns {
  id: string;
  patientId: string;
  episodeId?: string;
  recordedBy: string;
  recordedAt: string;
  bloodPressureSystolic: number;    // mmHg
  bloodPressureDiastolic: number;   // mmHg
  temperature: number;              // Celsius
  pulse: number;                    // BPM
  respiratoryRate: number;          // breaths/min
  oxygenSaturation: number;         // percentage (SpO2)
  weight: number;                   // kg
  height: number;                   // cm
  bmi: number;                      // calculated server-side
  notes?: string;
}

interface VitalAlert {
  field: string;
  value: number;
  severity: 'warning' | 'critical';
  message: string;
}
```

#### Endpoints

| Method | Path                            | Roles                                                          | Description                                    |
|--------|---------------------------------|----------------------------------------------------------------|------------------------------------------------|
| GET    | `/vitals`                       | nurse, doctor, clinical_lead, cmo, hospital_admin              | List vital sign records with filters           |
| POST   | `/vitals`                       | nurse                                                          | Record new vital signs for a patient           |
| GET    | `/vitals/:id`                   | nurse, doctor, clinical_lead, cmo                              | Get vital sign record by ID                    |
| GET    | `/vitals/patient/:patientId`    | nurse, doctor, clinical_lead, cmo, patient                     | Get all vitals for a patient (chronological)   |
| GET    | `/vitals/patient/:patientId/latest` | any                                                        | Get the most recent vitals for a patient       |
| GET    | `/vitals/:id/alerts`            | nurse, doctor                                                  | Get alert flags for a specific vitals record   |

##### POST `/vitals`

**Request Body:**
```json
{
  "patientId": "pat-001",
  "episodeId": "ep-001",
  "bloodPressureSystolic": 140,
  "bloodPressureDiastolic": 90,
  "temperature": 37.8,
  "pulse": 88,
  "respiratoryRate": 18,
  "oxygenSaturation": 97,
  "weight": 72.5,
  "height": 170,
  "notes": "Patient anxious at time of measurement"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "vit-001",
    "bmi": 25.09,
    "alerts": [
      {
        "field": "bloodPressureSystolic",
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

## Tier 5 — Clinical Documentation

---

### Feature 15: Consultations

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
  status: 'draft' | 'in_progress' | 'finalized';
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

#### Endpoints

| Method | Path                               | Roles                                                       | Description                                      |
|--------|------------------------------------|-------------------------------------------------------------|--------------------------------------------------|
| GET    | `/consultations`                   | doctor, clinical_lead, cmo, hospital_admin                  | List consultations with filters                  |
| POST   | `/consultations`                   | doctor                                                      | Start new consultation (status = draft)          |
| GET    | `/consultations/:id`               | doctor, nurse, clinical_lead, cmo, pharmacist, lab_tech     | Get full consultation                            |
| PUT    | `/consultations/:id`               | doctor                                                      | Save/update consultation (draft or in-progress)  |
| PATCH  | `/consultations/:id/finalize`      | doctor                                                      | Finalize consultation (triggers orders/Rx)       |
| POST   | `/consultations/:id/amend`         | doctor, clinical_lead                                       | Create an amendment version                      |
| GET    | `/consultations/:id/versions`      | doctor, clinical_lead, cmo                                  | List all versions for audit trail                |
| GET    | `/consultations/patient/:patientId`| doctor, clinical_lead, cmo, patient                         | All consultations for a patient                  |
| GET    | `/consultations/episode/:episodeId`| any                                                         | Consultations within an episode                  |

##### POST `/consultations/:id/amend`

**Request Body:**
```json
{
  "reason": "hmo_rejection_fix",
  "reasonDetail": "Revised diagnosis code per HMO feedback",
  "snapshot": { "...ConsultationFormData fields..." }
}
```

---

### Feature 16: Lab Orders & Results

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
  episodeId?: string;
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
  priority: 'routine' | 'urgent' | 'stat';
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

#### Endpoints

| Method | Path                                     | Roles                                                      | Description                                      |
|--------|------------------------------------------|------------------------------------------------------------|--------------------------------------------------|
| GET    | `/lab/orders`                            | lab_tech, doctor, nurse, clinical_lead, cmo                | List lab orders with filters                     |
| POST   | `/lab/orders`                            | doctor                                                     | Place a lab order                                |
| GET    | `/lab/orders/:id`                        | lab_tech, doctor, nurse, clinical_lead, cmo, patient       | Get lab order detail                             |
| PATCH  | `/lab/orders/:id/collect`                | lab_tech                                                   | Mark sample as collected                         |
| PATCH  | `/lab/orders/:id/results`                | lab_tech                                                   | Enter test results                               |
| PATCH  | `/lab/orders/:id/submit`                 | lab_tech                                                   | Submit completed results to ordering doctor      |
| PATCH  | `/lab/orders/:id/cancel`                 | doctor, lab_tech, clinical_lead                            | Cancel a lab order                               |
| GET    | `/lab/orders/sample-queue`               | lab_tech, clinical_lead                                    | Get pending sample collection queue              |
| GET    | `/lab/orders/patient/:patientId`         | doctor, nurse, clinical_lead, cmo, patient                 | All lab orders for a patient                     |
| GET    | `/lab/orders/episode/:episodeId`         | any                                                        | Lab orders within an episode                     |

##### PATCH `/lab/orders/:id/results`

**Request Body:**
```json
{
  "tests": [
    {
      "testCode": "lab-001",
      "result": "8.5",
      "unit": "g/dL",
      "normalRange": "12.0–16.0",
      "isAbnormal": true,
      "techNotes": "Hypochromic microcytic cells observed"
    }
  ],
  "notes": "Centrifuge error on first run, repeated"
}
```

---

### Feature 17: Prescriptions & Dispensing

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
  items: Array<{
    drugName: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    instructions?: string;
    metadata?: Partial<OrderMetadata>;
  }>;
  status: 'pending' | 'dispensed' | 'partially_dispensed' | 'cancelled';
  prescribedAt: string;
  dispensedAt?: string;
  dispensedBy?: string;
  notes?: string;
  dispensedItems?: DispensedItem[];
  auditLog?: DispenseAuditEntry[];
}

interface DispenseRequest {
  items: Array<{
    drugName: string;
    dispensedDrugName?: string;
    prescribedQuantity: number;
    dispensedQuantity: number;
    isSubstituted: boolean;
    substitutionType?: 'generic' | 'therapeutic';
    substitutionReason?: string;
    pharmacistNotes?: string;
  }>;
}
```

#### Endpoints

| Method | Path                                   | Roles                                                   | Description                                   |
|--------|----------------------------------------|---------------------------------------------------------|-----------------------------------------------|
| GET    | `/prescriptions`                       | pharmacist, doctor, clinical_lead, cmo, hospital_admin  | List prescriptions with filters               |
| POST   | `/prescriptions`                       | doctor                                                  | Create a new prescription                     |
| GET    | `/prescriptions/:id`                   | pharmacist, doctor, nurse, clinical_lead, cmo, patient  | Get prescription detail                       |
| PATCH  | `/prescriptions/:id/dispense`          | pharmacist                                              | Dispense prescription (full or partial)       |
| PATCH  | `/prescriptions/:id/cancel`            | doctor, pharmacist, clinical_lead                       | Cancel a prescription                         |
| GET    | `/prescriptions/:id/audit`             | pharmacist, clinical_lead, cmo                          | Get dispense audit trail                      |
| GET    | `/prescriptions/patient/:patientId`    | pharmacist, doctor, clinical_lead, cmo, patient         | All prescriptions for a patient               |
| GET    | `/prescriptions/episode/:episodeId`    | any                                                     | Prescriptions within an episode               |
| GET    | `/prescriptions/pending`               | pharmacist                                              | Pending pharmacy queue                        |

---

## Tier 6 — Financial

---

### Feature 18: Billing & Payments

**Description:** Manages bills (invoices), line-item composition, payment processing (cash, card, POS transfer, HMO, split payments), billing codes, and emergency overrides. Supports both registered patients and walk-in customers. Depends on: Patients, Episodes, Services (Tier 1–5).

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
  // patientId is null when isWalkIn = true
  patientId?: string;
  patientName?: string;
  patientMrn?: string;
  visitId?: string;
  episodeId?: string;
  items: BillItem[];
  // Financial totals — stored on the bill for fast reads and receipt generation
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  // HMO split totals (set when patient has HMO coverage)
  hmoTotalCoverage?: number;
  patientTotalLiability?: number;
  status: 'pending' | 'partial' | 'paid' | 'waived' | 'refunded';
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'hmo' | 'corporate';
  hmoClaimId?: string;
  department: 'front_desk' | 'lab' | 'pharmacy' | 'nursing' | 'all';
  notes?: string;
  paidAt?: string;
  // Walk-in support — bills for unregistered patients
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
  episodeId?: string;             // Episode this override is linked to
  reason: string;
  scope: 'consultation' | 'consultation_emergency' | 'full_visit';
  estimatedAmount: number;
  authorizedBy: string;
  authorizedByRole: UserRole;
  authorizedAt: string;
  status: 'active' | 'cleared' | 'expired';
  clearedAt?: string;             // When override was cleared (patient paid)
  clearedBy?: string;             // Staff who cleared it
}
```

#### Endpoints

| Method | Path                              | Roles                                            | Description                                    |
|--------|-----------------------------------|--------------------------------------------------|------------------------------------------------|
| GET    | `/bills`                          | cashier, hospital_admin, cmo, clinical_lead       | List bills with filters                        |
| POST   | `/bills`                          | cashier, nurse, receptionist, doctor, lab_tech    | Create a new bill                              |
| GET    | `/bills/:id`                      | cashier, hospital_admin, cmo, patient             | Get bill detail                                |
| PUT    | `/bills/:id`                      | cashier, hospital_admin                           | Update bill items/details                      |
| PATCH  | `/bills/:id/pay`                  | cashier                                           | Process a payment against the bill             |
| PATCH  | `/bills/:id/waive`                | cmo, hospital_admin                               | Waive a bill                                   |
| PATCH  | `/bills/:id/refund`               | cmo, hospital_admin                               | Issue a refund                                 |
| GET    | `/bills/:id/receipt`              | cashier, patient                                  | Generate/retrieve payment receipt              |
| GET    | `/bills/patient/:patientId`       | cashier, hospital_admin, cmo, patient             | Bills for a patient                            |
| GET    | `/bills/episode/:episodeId`       | any                                               | Bills within an episode                        |
| POST   | `/bills/billing-codes`            | nurse, doctor, pharmacist, lab_tech               | Generate a billing code for dept clearance     |
| GET    | `/bills/billing-codes/:code`      | cashier                                           | Look up a billing code                         |
| PATCH  | `/bills/billing-codes/:code/pay`  | cashier                                           | Process payment via billing code               |
| POST   | `/bills/emergency-overrides`      | cmo, clinical_lead, hospital_admin                | Authorize emergency payment override           |
| GET    | `/bills/emergency-overrides`      | cashier, hospital_admin, cmo, clinical_lead       | List all emergency overrides                   |
| GET    | `/bills/emergency-overrides/:id`  | cashier, hospital_admin, cmo, clinical_lead       | Get emergency override detail                  |
| PATCH  | `/bills/emergency-overrides/:id/clear` | cashier, hospital_admin, cmo               | Clear override after patient pays              |
| GET    | `/payments`                       | cashier, hospital_admin, cmo                      | List all payment records                       |
| GET    | `/payments/:id`                   | cashier, hospital_admin, cmo, patient             | Get payment detail                             |

##### PATCH `/bills/:id/pay`

**Request Body:**
```json
{
  "paymentMethod": "split",
  "paymentSplits": [
    { "method": "cash", "amount": 5000 },
    { "method": "transfer", "amount": 10000, "referenceNumber": "TRF-20240615-001", "bank": "058" }
  ],
  "notes": "Patient paid in two parts"
}
```

**Response `200`:**
```json
{
  "data": {
    "receiptNumber": "RCP-2024-00892",
    "billId": "bill-001",
    "totalPaid": 15000,
    "balance": 0,
    "status": "paid",
    "receiptUrl": "/receipts/RCP-2024-00892.pdf"
  },
  "meta": null,
  "errors": null
}
```

---

### Feature 19: HMO Claims

**Description:** Full HMO claims lifecycle — draft, submission, tracking, approval/denial, resubmission, withdrawal, and retraction. Each claim bundles multiple bills and diagnoses. Includes document upload and multi-version audit trail. Depends on: Bills, HMO Providers, Consultations (Tier 1–6).

#### Data Model

```typescript
interface ClaimItem {
  id: string;
  claimId: string;
  billItemId?: string;           // The BillItem this is derived from
  description: string;
  category: 'consultation' | 'lab' | 'pharmacy' | 'procedure' | 'admission' | 'other';
  quantity: number;
  unitPrice: number;
  claimedAmount: number;
  isExcluded: boolean;           // Excluded from this submission (e.g. patient self-pay)
  clinicalJustification?: string; // Required when isOffProtocol = true
  isOffProtocol: boolean;        // Service not in HMO's approved protocol
  status: 'pending' | 'approved' | 'denied';
  denialReason?: string;
}

interface ClaimDiagnosis {
  code: string;                  // ICD-10 code e.g. "B50"
  description: string;
  isPrimary: boolean;
}

interface HMOClaim {
  id: string;
  claimNumber: string;           // e.g. CLM-2024-00142
  patientId: string;
  patientName: string;
  hmoProviderId: string;
  hmoProviderName: string;
  enrollmentId?: string;         // Patient's HMO enrollment ID (denormalized for HMO submission)
  policyNumber?: string;
  preAuthCode?: string;
  billIds: string[];
  claimItems: ClaimItem[];
  diagnoses: ClaimDiagnosis[];   // ICD-10 codes; { code, description, isPrimary }[]
  claimAmount: number;           // Total amount claimed
  approvedAmount?: number;       // Amount approved by HMO
  status: 'draft' | 'submitted' | 'processing' | 'approved' | 'denied' | 'paid' | 'withdrawn' | 'retracted';
  submittedAt?: string;
  processedAt?: string;
  denialReason?: string;
  resubmissionNotes?: string;
  documents: ClaimDocument[];
  versions: ClaimVersion[];      // Amendment history stored as JSONB
  currentVersion: number;
  createdAt: string;
  createdBy: string;
  withdrawnAt?: string;
  withdrawnReason?: 'patient_self_pay' | 'hospital_cancelled' | 'claim_error' | 'treatment_changed';
  retractionNotes?: string;
  privateBillId?: string;        // Bill created after retraction (patient pays privately)
  privatePaymentId?: string;
}
```

#### Endpoints

| Method | Path                                    | Roles                                    | Description                                        |
|--------|-----------------------------------------|------------------------------------------|----------------------------------------------------|
| GET    | `/claims`                               | cashier, hospital_admin, cmo             | List HMO claims with filters                       |
| POST   | `/claims`                               | cashier, hospital_admin                  | Create a new claim (status = draft)                |
| GET    | `/claims/:id`                           | cashier, hospital_admin, cmo             | Get full claim detail                              |
| PUT    | `/claims/:id`                           | cashier, hospital_admin                  | Update claim (draft only)                          |
| PATCH  | `/claims/:id/submit`                    | cashier, hospital_admin                  | Submit claim to HMO                                |
| PATCH  | `/claims/:id/status`                    | cashier, hospital_admin, cmo             | Update status (processing → approved/denied)       |
| PATCH  | `/claims/:id/resubmit`                  | cashier, hospital_admin                  | Resubmit denied claim with notes                   |
| PATCH  | `/claims/:id/withdraw`                  | cashier, hospital_admin                  | Withdraw a submitted claim                         |
| PATCH  | `/claims/:id/retract`                   | cashier, hospital_admin, cmo             | Retract approved claim (convert to private bill)   |
| POST   | `/claims/:id/documents`                 | cashier, hospital_admin                  | Upload supporting document                         |
| DELETE | `/claims/:id/documents/:docId`          | cashier, hospital_admin                  | Remove a document                                  |
| GET    | `/claims/:id/versions`                  | cashier, hospital_admin, cmo             | Get version history                                |
| GET    | `/claims/patient/:patientId`            | cashier, hospital_admin, cmo             | Claims for a specific patient                      |

---

## Tier 7 — Operations

---

### Feature 20: Cashier Shift Management

**Description:** Tracks cashier shifts — opening balance, transactions, closing balance, and variance reporting. Supports multiple stations (main, lab, pharmacy). Depends on: Auth, Bills, Payments (Tier 0–6).

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
  // Balance fields (null for non-cashier shifts)
  openingBalance?: number;
  closingBalance?: number;
  expectedBalance?: number;
  variance?: number;
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

#### Endpoints

| Method | Path                        | Roles                              | Description                              |
|--------|-----------------------------|------------------------------------|------------------------------------------|
| GET    | `/shifts`                   | cashier, hospital_admin, cmo       | List shifts with filters                 |
| POST   | `/shifts`                   | cashier                            | Open a new shift                         |
| GET    | `/shifts/:id`               | cashier, hospital_admin, cmo       | Get shift detail with transactions       |
| PATCH  | `/shifts/:id/close`         | cashier                            | Close shift with closing balance         |
| GET    | `/shifts/active`            | cashier, hospital_admin            | Get current active shift for caller      |
| GET    | `/shifts/station/:station`  | cashier, hospital_admin, cmo       | Get shifts by station                    |

##### PATCH `/shifts/:id/close`

**Request Body:**
```json
{
  "closingBalance": 125000,
  "notes": "2 transactions were card payments"
}
```

---

### Feature 21: Stock Requests

**Description:** Workflow for requesting inventory restocking from any department to the hospital administrator (or escalated to CMO). Supports partial approval and forwarding. Depends on: Inventory, Users (Tier 1).

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

#### Endpoints

| Method | Path                             | Roles                                                              | Description                               |
|--------|----------------------------------|--------------------------------------------------------------------|-------------------------------------------|
| GET    | `/stock-requests`                | pharmacist, lab_tech, hospital_admin, cmo, clinical_lead, nurse    | List stock requests with filters          |
| POST   | `/stock-requests`                | pharmacist, lab_tech, nurse, clinical_lead                         | Create a new stock request                |
| GET    | `/stock-requests/:id`            | any                                                                | Get stock request detail                  |
| PATCH  | `/stock-requests/:id/review`     | hospital_admin, cmo                                                | Approve, partially approve, or reject     |
| PATCH  | `/stock-requests/:id/forward`    | hospital_admin                                                     | Forward to CMO for escalation             |
| PATCH  | `/stock-requests/:id/fulfill`    | hospital_admin, cmo                                                | Mark as fulfilled (stock delivered)       |
| PATCH  | `/stock-requests/:id/info`       | hospital_admin                                                     | Request additional information            |

---

### Feature 22: Lab Referrals (Partner Labs)

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
  trackingNumber?: string;
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

#### Endpoints

| Method | Path                                    | Roles                                           | Description                                      |
|--------|-----------------------------------------|-------------------------------------------------|--------------------------------------------------|
| GET    | `/lab/partner-labs`                     | lab_tech, clinical_lead, hospital_admin, cmo    | List partner labs                                |
| POST   | `/lab/partner-labs`                     | hospital_admin, cmo                             | Register a partner lab                           |
| GET    | `/lab/partner-labs/:id`                 | any                                             | Get partner lab detail                           |
| PATCH  | `/lab/partner-labs/:id/status`          | hospital_admin, cmo                             | Update connection status                         |
| GET    | `/lab/referrals`                        | lab_tech, clinical_lead, hospital_admin, cmo    | List all referrals                               |
| POST   | `/lab/referrals`                        | lab_tech, doctor                                | Create outbound referral                         |
| GET    | `/lab/referrals/:id`                    | lab_tech, doctor, clinical_lead, cmo            | Get referral detail                              |
| PATCH  | `/lab/referrals/:id/status`             | lab_tech                                        | Update referral status                           |
| PATCH  | `/lab/referrals/:id/results`            | lab_tech                                        | Receive and record results from partner lab      |
| POST   | `/lab/referrals/inbound`                | lab_tech                                        | Register an inbound referral from partner lab    |
| GET    | `/lab/partner-labs/:id/sync`            | lab_tech, hospital_admin                        | Trigger manual sync with partner lab system      |

---

## Tier 8 — Cross-Cutting

---

### Feature 23: Notifications

**Description:** Real-time notification delivery (WebSocket push + persistent read state). Covers patient arrival alerts, result notifications, queue warnings, payment confirmations, and emergency alerts. Depends on: Any event-generating feature.

#### Data Model

```typescript
interface Notification {
  id: string;
  type: 'patient_arrived' | 'results_ready' | 'prescription_ready' | 'consultation_paused' | 'consultation_autoclosed' | 'payment_received' | 'queue_warning' | 'emergency' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  patientId?: string;
  patientName?: string;
  recipientId: string;      // User ID of recipient
  recipientRole: UserRole;
}
```

#### Endpoints

| Method | Path                              | Roles | Description                                     |
|--------|-----------------------------------|-------|-------------------------------------------------|
| GET    | `/notifications`                  | any   | Get all notifications for current user          |
| PATCH  | `/notifications/:id/read`         | any   | Mark a notification as read                     |
| PATCH  | `/notifications/read-all`         | any   | Mark all notifications as read                  |
| DELETE | `/notifications/:id`              | any   | Delete a notification                           |
| GET    | `/notifications/unread-count`     | any   | Get unread notification count                   |

#### WebSocket

```
wss://api.clinicflow.ng/ws/notifications?token=<jwt>
```

Server pushes `Notification` objects as JSON events on the relevant user channel. The client should reconnect with exponential backoff on disconnect.

---

### Feature 24: Audit Logging

**Description:** Immutable audit trail for clinical and administrative actions. Records actor, action, entity, timestamp, and before/after snapshots. Write-only from application; read access restricted to CMO and hospital admin. Depends on: Any feature.

#### Data Model

```typescript
interface AuditEntry {
  id: string;
  action: AuditAction;
  entityType: 'consultation' | 'lab_order' | 'prescription' | 'bundle' | 'bill' | 'claim' | 'patient' | 'user' | 'inventory';
  entityId: string;
  patientId?: string;
  performedBy: string;
  performedByName: string;
  performedByRole: UserRole;
  timestamp: string;
  ipAddress?: string;
  details?: Record<string, unknown>;    // Before/after snapshot or action context
}
```

#### Endpoints

| Method | Path               | Roles                    | Description                                     |
|--------|--------------------|--------------------------|-------------------------------------------------|
| GET    | `/audit`           | cmo, hospital_admin      | Query audit log with filters                    |
| GET    | `/audit/:id`       | cmo, hospital_admin      | Get single audit entry                          |

##### GET `/audit`

**Query Params:**

| Param        | Type   | Description                                       |
|--------------|--------|---------------------------------------------------|
| `entityType` | string | Filter by entity type                             |
| `entityId`   | string | Filter by entity ID                               |
| `patientId`  | string | Filter by patient                                 |
| `performedBy`| string | Filter by actor                                   |
| `action`     | string | Filter by action                                  |
| `dateFrom`   | string | Start of date range (ISO 8601)                   |
| `dateTo`     | string | End of date range (ISO 8601)                     |

---

### Feature 25: Reports & Analytics

**Description:** Aggregated reporting for executive, clinical, billing, pharmacy, lab, nursing, radiology, and surgery dashboards. Reports may be paginated or returned as an embeddable URL for BI tools. Depends on: All features.

#### Data Model

```typescript
interface ReportSummary {
  financial: {
    totalRevenue: number;
    outstandingPayments: number;
    claimsPending: number;
    collectionRate: number;
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

#### Endpoints

| Method | Path                              | Roles                                    | Description                                           |
|--------|-----------------------------------|------------------------------------------|-------------------------------------------------------|
| GET    | `/reports/summary`                | cmo, hospital_admin, clinical_lead       | Overall dashboard summary                             |
| GET    | `/reports/financial`              | cmo, hospital_admin                      | Revenue, collection rate, outstanding bills           |
| GET    | `/reports/executive`              | cmo                                      | Executive KPIs (board-level view)                     |
| GET    | `/reports/claims`                 | cashier, hospital_admin, cmo             | HMO claims report (submission/approval/denial rates)  |
| GET    | `/reports/consultation`           | doctor, clinical_lead, cmo               | Consultation volumes, diagnoses frequency             |
| GET    | `/reports/laboratory`             | lab_tech, clinical_lead, cmo             | Lab test volumes, turnaround times, abnormal rates    |
| GET    | `/reports/pharmacy`               | pharmacist, clinical_lead, cmo           | Dispensing volumes, stock consumption                 |
| GET    | `/reports/nursing`                | nurse, clinical_lead, cmo                | Triage throughput, vital sign trends                  |
| GET    | `/reports/radiology`              | clinical_lead, cmo                       | Radiology scan volumes                                |
| GET    | `/reports/surgery`                | clinical_lead, cmo                       | Surgical procedure volumes                            |
| GET    | `/reports/embed/:dashboardType`   | cmo, hospital_admin, clinical_lead       | Return embed URL for BI dashboard                     |
| GET    | `/reports/alerts`                 | cmo, hospital_admin, clinical_lead       | Active report alerts (red/amber/green flags)          |

##### GET `/reports/financial`

**Query Params:**

| Param       | Type   | Description                            |
|-------------|--------|----------------------------------------|
| `dateFrom`  | string | Start date (ISO 8601)                  |
| `dateTo`    | string | End date (ISO 8601)                    |
| `period`    | string | `day`, `week`, `month`, `year`         |
| `department`| string | Filter by billing department           |

---

### Feature 26: Permissions Management

**Description:** Runtime permission toggle system. Allows CMO to grant cross-role access (e.g., `hospital_admin` gets clinical access, `clinical_lead` gets financial access). These toggles augment the base RBAC defined in the role matrix. Depends on: Auth, Users (Tier 0–1).

#### Data Model

```typescript
interface PermissionToggles {
  hospitalAdminClinicalAccess: boolean;   // hospital_admin can view clinical_records + patient_emr
  clinicalLeadFinancialAccess: boolean;   // clinical_lead can view financial_reports + revenue_data
}

interface RolePermissions {
  role: UserRole;
  resources: ResourceType[];
  effectiveResources: ResourceType[];     // base + active toggles applied
}

type ResourceType =
  | 'clinical_records' | 'patient_emr' | 'financial_reports' | 'revenue_data'
  | 'staff_management' | 'inventory' | 'billing' | 'hmo_claims' | 'lab_results'
  | 'prescriptions' | 'appointments' | 'queue_management' | 'system_settings';
```

#### Endpoints

| Method | Path                              | Roles | Description                                         |
|--------|-----------------------------------|-------|-----------------------------------------------------|
| GET    | `/permissions/toggles`            | cmo   | Get current permission toggle state                 |
| PATCH  | `/permissions/toggles`            | cmo   | Update permission toggles                           |
| GET    | `/permissions/roles`              | cmo   | Get effective permissions for all roles             |
| GET    | `/permissions/roles/:role`        | cmo   | Get effective permissions for a specific role       |

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
| `useLabQueries.ts`                | `usePartnerLabs`              | `GET /lab/partner-labs`                              |
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
| `useHmoQueries.ts`                | `useHmoContracts`             | `GET /hmo/providers/:id/coverage`                    |
| `useHmoQueries.ts`                | `useHmoContract`              | `GET /hmo/providers/:id/coverage/:contractId`        |
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
| `useHmoMutations.ts`              | `useCreateHmoContract`        | `POST /hmo/providers/:id/coverage`                   |
| `useHmoMutations.ts`              | `useUpdateHmoContract`        | `PUT /hmo/providers/:id/coverage/:contractId`        |
| `useHmoMutations.ts`              | `useDeleteHmoContract`        | `DELETE /hmo/providers/:id/coverage/:contractId`     |
| `useBillMutations.ts`             | `useAuthorizeEmergencyOverride` | `POST /bills/emergency-overrides`                  |
| `useBillMutations.ts`             | `useClearEmergencyOverride`   | `PATCH /bills/emergency-overrides/:id/clear`         |
| `useBillMutations.ts`             | `usePayBillingCode`           | `PATCH /bills/billing-codes/:code/pay`               |
| `usePatientMutations.ts`          | `useAddMedicalHistory`        | `POST /patients/:id/medical-history`                 |
| `usePatientMutations.ts`          | `useRemoveMedicalHistory`     | `DELETE /patients/:id/medical-history/:entryId`      |

---

*Document updated: 2026-04-03 | ClinicFlow v1.1.0*
