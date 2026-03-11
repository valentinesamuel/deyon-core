import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MfaVerifyDto } from './mfaVerify.dto';

describe('MfaVerifyDto', () => {
  const validPayload = {
    mfaToken: 'hex-mfa-token-string',
    totpCode: '123456',
  };

  it('should pass with valid data', async () => {
    const dto = plainToInstance(MfaVerifyDto, validPayload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when mfaToken is missing', async () => {
    const dto = plainToInstance(MfaVerifyDto, { ...validPayload, mfaToken: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'mfaToken')).toBe(true);
  });

  it('should fail when totpCode is missing', async () => {
    const dto = plainToInstance(MfaVerifyDto, { ...validPayload, totpCode: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'totpCode')).toBe(true);
  });

  it('should fail when totpCode is less than 6 characters', async () => {
    const dto = plainToInstance(MfaVerifyDto, { ...validPayload, totpCode: '12345' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'totpCode')).toBe(true);
  });

  it('should fail when totpCode is more than 6 characters', async () => {
    const dto = plainToInstance(MfaVerifyDto, { ...validPayload, totpCode: '1234567' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'totpCode')).toBe(true);
  });

  it('should fail when mfaToken is not a string', async () => {
    const dto = plainToInstance(MfaVerifyDto, { ...validPayload, mfaToken: 12345 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'mfaToken')).toBe(true);
  });
});
