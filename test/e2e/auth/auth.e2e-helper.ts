import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';

const API_KEY_HEADER = { 'x-api-key': 'test-api-key' };

/** Returns the mfaToken from a successful Step-1 login */
export async function doLogin(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/staff/auth/login')
    .set(API_KEY_HEADER)
    .send({ email, password })
    .expect(201);

  return res.body.result.mfaToken;
}

/** Returns the full supertest response so callers can extract Set-Cookie headers */
export async function doMfaVerify(
  app: INestApplication,
  mfaToken: string,
  totpCode: string,
): Promise<request.Response> {
  return request(app.getHttpServer())
    .post('/api/v1/staff/auth/login/mfa-verify')
    .set(API_KEY_HEADER)
    .send({ mfaToken, totpCode });
}

/**
 * Parse Set-Cookie header(s) from a supertest response into a single cookie string
 * suitable for subsequent `.set('Cookie', ...)` calls.
 *
 * Each Set-Cookie header looks like: `name=value; Path=/; HttpOnly; ...`
 * We extract only the `name=value` part so the Cookie request header is well-formed.
 */
export function extractCookies(response: request.Response): string {
  const raw = response.headers['set-cookie'];
  if (!raw) return '';
  const headers = Array.isArray(raw) ? raw : [raw];
  // Keep only the `name=value` segment (first token before the first `;`)
  return headers.map((h) => h.split(';')[0].trim()).join('; ');
}

/** Generate a current TOTP code for the given plain base-32 secret */
export async function generateTotpCode(plainSecret: string): Promise<string> {
  const totp = new TOTP({
    crypto: new NobleCryptoPlugin(),
    base32: new ScureBase32Plugin(),
  });
  // otplib v13: generate({ secret }) returns Promise<string> with NobleCryptoPlugin
  return totp.generate({ secret: plainSecret } as any);
}

/** Full login+MFA-verify flow — returns cookie string for authenticated requests */
export async function authenticatedCookies(
  app: INestApplication,
  email: string,
  password: string,
  plainTotpSecret: string,
): Promise<string> {
  const mfaToken = await doLogin(app, email, password);
  const totpCode = await generateTotpCode(plainTotpSecret);
  const mfaRes = await doMfaVerify(app, mfaToken, totpCode);
  return extractCookies(mfaRes);
}

export { API_KEY_HEADER };
