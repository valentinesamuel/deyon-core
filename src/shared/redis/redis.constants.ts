export const REDIS_CLIENT = 'REDIS_CLIENT';

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
} as const;
