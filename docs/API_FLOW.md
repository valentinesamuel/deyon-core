# API Flow: Getting the System Functional

This document describes the ordered sequence of API calls needed to take the system from a
freshly migrated state to fully operational. It covers three phases: first-time system setup
(CMO registration + bootstrap), staff onboarding, and day-to-day authenticated usage.

---

## Phase 1 — First-Time System Setup

**Pre-condition:** Migrations have run. `system_config.setup_complete = { completed: false }`.
**Gate:** All setup endpoints use `SetupNotCompleteGuard` — they are disabled once setup completes.

### Step 1 — Check setup status

```
GET /setup/status
```

Response:

```json
{ "completed": false }
```

Confirms the setup window is open. If `completed: true`, setup has already been run and steps
2–7 are permanently disabled.

---

### Step 2 — Register the Chief Medical Officer (CMO)

```
POST /setup/register
```

Body:

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "cmo@hospital.org",
  "phoneNumber": "+2348000000000",
  "password": "StrongP@ssw0rd!",
  "hospitalName": "General Hospital",
  "hospitalAddress": "123 Medical Center Drive"
}
```

Response:

```json
{
  "requiresMfaSetup": true,
  "setupToken": "<hex token>"
}
```

Creates the CMO staff account (no role assigned yet). Issues an ephemeral MFA setup token
used in steps 3–4.

---

### Step 3 — Initialise TOTP for the CMO

```
POST /staff/auth/mfa/setup
```

Body:

```json
{ "setupToken": "<hex from step 2>" }
```

Response:

```json
{
  "otpAuthUri": "otpauth://totp/Hospital%3Acmo%40hospital.org?secret=BASE32SECRET&issuer=Hospital",
  "qrCodeDataUrl": ["otpauth://totp/DeyonHMS:cmo%40hospital.com?secret=...&issuer=DeyonHMS"]
}
```

Returns the TOTP QR code URI. Scan it with an authenticator app (Google Authenticator, Authy,
etc.).

---

### Step 4 — Confirm TOTP is working

```
POST /staff/auth/mfa/setup/confirm
```

Body:

```json
{
  "setupToken": "<hex from step 2>",
  "totpCode": "123456"
}
```

Response:

```json
{
  "accessGranted": true,
  "backupCodes": ["...", "..."]
}
```

Verifies the authenticator app is producing valid codes. MFA is now enabled on the CMO account. Store the backup codes in a safe place

---

### Step 5 — CMO logs in (step 1 of 2)

```
POST /staff/auth/login
```

Body:

```json
{
  "email": "cmo@hospital.org",
  "password": "StrongP@ssw0rd!"
}
```

Response:

```json
{ "mfaToken": "<mfa challenge token>", "requiresMfa": true }
```

Validates credentials and issues an MFA challenge token.

---

### Step 6 — CMO completes MFA login (step 2 of 2)

```
POST /staff/auth/login/mfa-verify
```

Body:

```json
{
  "mfaToken": "<token from step 5>",
  "totpCode": "123456"
}
```

Response: Sets two HttpOnly cookies:

| Cookie          | TTL        |
| --------------- | ---------- |
| `access_token`  | 15 minutes |
| `refresh_token` | 7 days     |

The CMO is now authenticated. All subsequent requests in this phase use the `access_token` cookie.

---

### Step 7 — Bootstrap: assign CMO role and lock setup

```
POST /setup/bootstrap
```

Requires: `access_token` cookie (from step 6).

Body:

```json
{ "totpCode": "123456" }
```

Response:

```json
{ "success": true, "roleAssigned": "super_admin" }
```

This step:

1. Verifies TOTP a second time as a race-condition guard.
2. Assigns the `super_admin` role to the CMO.
3. Sets `system_config.setup_complete = { completed: true }`.

**All setup endpoints (`/setup/*`) are now permanently disabled.**

---

## Phase 2 — Staff Onboarding

**Pre-condition:** CMO (or any `super_admin`) is logged in with a valid `access_token` cookie.
**Note:** This phase is repeatable whenever new staff members join.

### Step 8 — Create a role

```
POST /role
```

Requires: `role:create` permission.

Body:

```json
{
  "name": "Doctor",
  "permissions": ["staff:read", "department:read"]
}
```

Response:

```json
{
  "id": "<uuid>",
  "name": "Doctor",
  "alias": "doctor",
  ...
}
```

Create the application roles needed before inviting staff. Repeat for each role (Nurse, Admin,
Pharmacist, etc.).

---

### Step 9 — Invite a staff member

```
POST /staff/auth/invite
```

Requires: `staff:invite` permission.

Body:

```json
{
  "email": "john.smith@hospital.org",
  "roleId": "<uuid from step 8>",
  "departmentId": "<uuid>"
}
```

Response:

```json
{ "success": true }
```

Sends an invite email containing a one-time token. The invitee uses this token in step 10.

---

### Step 10 — Invitee accepts the invite

```
POST /staff/auth/invite/accept
```

Public endpoint.

Body:

```json
{
  "token": "<from invite email>",
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+2348111111111",
  "password": "AnotherStr0ng!Pass",
  "licenseNumber": "MDN-12345",
  "specialization": "Cardiology"
}
```

> `licenseNumber` and `specialization` are optional.

Response:

```json
{
  "requiresMfaSetup": true,
  "setupToken": "<hex token>"
}
```

Creates the staff account and sets the password. Issues an ephemeral MFA setup token.

---

### Step 11 — Staff initialises TOTP

```
POST /staff/auth/mfa/setup
```

Body:

```json
{ "setupToken": "<hex from step 10>" }
```

Response:

```json
{
  "otpAuthUri": "otpauth://totp/...",
  "backupCodes": ["xxxxx-xxxxx", "..."]
}
```

Staff scans the QR code with their authenticator app.

---

### Step 12 — Staff confirms TOTP

```
POST /staff/auth/mfa/setup/confirm
```

Body:

```json
{
  "setupToken": "<hex from step 10>",
  "totpCode": "654321"
}
```

Response:

```json
{ "success": true }
```

MFA confirmed. The staff account is fully activated and ready to log in.

---

## Phase 3 — Day-to-Day: Login & Session Management

### Step 13 — Login (step 1 of 2)

```
POST /staff/auth/login
```

Body:

```json
{
  "email": "john.smith@hospital.org",
  "password": "AnotherStr0ng!Pass"
}
```

Response:

```json
{ "mfaToken": "<mfa challenge token>" }
```

---

### Step 14a — Complete login with TOTP

```
POST /staff/auth/login/mfa-verify
```

Body:

```json
{
  "mfaToken": "<token from step 13>",
  "totpCode": "123456"
}
```

Response: Sets `access_token` and `refresh_token` cookies.

---

### Step 14b — Complete login with a backup code

```
POST /staff/auth/login/mfa-backup
```

Use this when the authenticator app is unavailable.

Body:

```json
{
  "mfaToken": "<token from step 13>",
  "backupCode": "xxxxx-xxxxx"
}
```

Response: Sets `access_token` and `refresh_token` cookies.

---

### Step 15 — Refresh the access token

```
POST /staff/auth/refresh
```

Requires: `refresh_token` cookie.
Body: none.

Response: Rotates the `access_token` cookie. Call this before the token expires (15-minute TTL).

---

### Step 16 — Logout current session

```
POST /staff/auth/logout
```

Requires: `access_token` cookie.

Revokes the current session: JTI is blocklisted in Redis and the session entry is removed.

---

### Step 17 — Logout all sessions

```
POST /staff/auth/logout-all
```

Requires: `access_token` cookie.

Revokes **all** active sessions for this staff member across all devices.

---

## Password Recovery Flow

### Step A — Request a password reset

```
POST /staff/auth/forgot-password
```

Body:

```json
{ "email": "john.smith@hospital.org" }
```

Response:

```json
{ "success": true }
```

Always returns `success: true` regardless of whether the email exists, to prevent email
enumeration. Sends a password reset link to the address if it belongs to an active account.

---

### Step B — Submit the new password

```
POST /staff/auth/reset-password
```

Body:

```json
{
  "token": "<from reset email>",
  "newPassword": "BrandNewStr0ng!Pass"
}
```

Response:

```json
{ "success": true }
```

Password is updated and **all existing sessions are invalidated**.

---

## Token Reference

| Token           | Type                  | Transport                     | TTL    | Notes                               |
| --------------- | --------------------- | ----------------------------- | ------ | ----------------------------------- |
| `access_token`  | JWT (JTI-tracked)     | HttpOnly cookie               | 15 min | Required for all protected routes   |
| `refresh_token` | Opaque (Redis-backed) | HttpOnly cookie (narrow path) | 7 days | Only valid at `/staff/auth/refresh` |
| `mfaToken`      | Ephemeral (Redis)     | JSON body                     | Short  | Bridges login step 1 → step 2       |
| `setupToken`    | Ephemeral (Redis)     | JSON body                     | Short  | Bridges register/invite → MFA setup |
