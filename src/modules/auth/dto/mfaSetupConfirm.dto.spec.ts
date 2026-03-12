import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MfaSetupConfirmDto } from './mfaSetupConfirm.dto';

describe('MfaSetupConfirmDto', () => {
  const validPayload = {
    setupToken: 'hex-setup-token-string',
    totpCode: '123456',
  };

  it('should pass with valid data', async () => {
    const dto = plainToInstance(MfaSetupConfirmDto, validPayload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when setupToken is missing', async () => {
    const dto = plainToInstance(MfaSetupConfirmDto, { ...validPayload, setupToken: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'setupToken')).toBe(true);
  });

  it('should fail when totpCode is missing', async () => {
    const dto = plainToInstance(MfaSetupConfirmDto, { ...validPayload, totpCode: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'totpCode')).toBe(true);
  });

  it('should fail when totpCode is less than 6 characters', async () => {
    const dto = plainToInstance(MfaSetupConfirmDto, { ...validPayload, totpCode: '12345' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'totpCode')).toBe(true);
  });

  it('should fail when totpCode is more than 6 characters', async () => {
    const dto = plainToInstance(MfaSetupConfirmDto, { ...validPayload, totpCode: '1234567' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'totpCode')).toBe(true);
  });

  it('should fail when setupToken is not a string', async () => {
    const dto = plainToInstance(MfaSetupConfirmDto, { ...validPayload, setupToken: 12345 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'setupToken')).toBe(true);
  });
});
