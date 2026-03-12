import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRoleDto } from './createRole.dto';

describe('CreateRoleDto', () => {
  const validPayload = {
    name: 'Doctor',
    permissions: ['staff:read', 'patient:view'],
  };

  it('should pass with valid data', async () => {
    const dto = plainToInstance(CreateRoleDto, validPayload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when name is missing', async () => {
    const dto = plainToInstance(CreateRoleDto, { ...validPayload, name: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('should fail when name is not a string', async () => {
    const dto = plainToInstance(CreateRoleDto, { ...validPayload, name: 123 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('should fail when permissions is missing', async () => {
    const dto = plainToInstance(CreateRoleDto, { ...validPayload, permissions: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'permissions')).toBe(true);
  });

  it('should fail when permissions array is empty', async () => {
    const dto = plainToInstance(CreateRoleDto, { ...validPayload, permissions: [] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'permissions')).toBe(true);
  });

  it('should fail when permissions contains non-string values', async () => {
    const dto = plainToInstance(CreateRoleDto, { ...validPayload, permissions: [123, 456] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'permissions')).toBe(true);
  });

  it('should fail when permissions is not an array', async () => {
    const dto = plainToInstance(CreateRoleDto, { ...validPayload, permissions: 'staff:read' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'permissions')).toBe(true);
  });
});
