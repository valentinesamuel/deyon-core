export const RedisKeys = {
  loginAttempts: (email: string) => `auth:attempts:${email}`,
  loginLockout: (email: string) => `auth:lockout:${email}`,
  sessions: (staffId: string) => `auth:sessions:${staffId}`,
  mfaPending: (token: string) => `auth:mfa:pending:${token}`,
  mfaSetup: (token: string) => `auth:mfa:setup:${token}`,
  jtiBlocklist: (jti: string) => `auth:jti:blocklist:${jti}`,
  totpUsed: (staffId: string, code: string) => `auth:totp:used:${staffId}:${code}`,
  pwReset: (tokenHash: string) => `auth:pwreset:${tokenHash}`,
  pwResetRate: (email: string) => `auth:pwreset:rate:${email}`,
  invite: (tokenHash: string) => `auth:invite:${tokenHash}`,
  profile: (staffId: string) => `auth:profile:${staffId}`,
  role: (roleId: string) => `auth:role:${roleId}`,
  pat: (tokenHash: string) => `auth:pat:${tokenHash}`,
  patRevoked: (tokenHash: string) => `auth:pat:revoked:${tokenHash}`,
  idempotencyKey: (
    userId: string,
    method: string,
    path: string,
    clientKey: string,
    bodyHash: string,
  ) => `idempotency:${userId}:${method}:${path}:${clientKey}:${bodyHash}`,
} as const;

export const RedisTTL = {
  loginAttempts: 900, // 15 min
  loginLockout: 900, // 15 min
  mfaPending: 300, // 5 min
  mfaSetup: 600, // 10 min
  totpAntiReplay: 90, // 90 sec
  pwReset: 900, // 15 min
  pwResetRate: 3600, // 1 hour
  invite: 172800, // 48 hours
  profile: 86400, // 24 hours
  pat: 3600, // 1 hour
  patRevoked: 90000, // 25 hours (longer than positive cache to eliminate race between instances)
  idempotency: 86400, // 24 hours
  idempotencyPending: 60, // 60s in-flight sentinel
} as const;
