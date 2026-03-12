import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BootstrapSystemDto } from './bootstrapSystem.dto';

describe('BootstrapSystemDto', () => {
  it('should pass with a valid 6-character totpCode', async () => {
    const dto = plainToInstance(BootstrapSystemDto, { totpCode: '123456' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when totpCode is missing', async () => {
    const dto = plainToInstance(BootstrapSystemDto, {});
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'totpCode')).toBe(true);
  });

  it('should fail when totpCode is less than 6 characters', async () => {
    const dto = plainToInstance(BootstrapSystemDto, { totpCode: '12345' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'totpCode')).toBe(true);
  });

  it('should fail when totpCode is more than 6 characters', async () => {
    const dto = plainToInstance(BootstrapSystemDto, { totpCode: '1234567' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'totpCode')).toBe(true);
  });

  it('should fail when totpCode is not a string', async () => {
    const dto = plainToInstance(BootstrapSystemDto, { totpCode: 123456 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'totpCode')).toBe(true);
  });
});
