import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StaffInviteDto } from './staffInvite.dto';

describe('StaffInviteDto', () => {
  const validPayload = {
    email: 'staff@hospital.com',
    roleId: '550e8400-e29b-41d4-a716-446655440000',
    departmentId: '550e8400-e29b-41d4-a716-446655440001',
  };

  it('should pass with valid data', async () => {
    const dto = plainToInstance(StaffInviteDto, validPayload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when email is missing', async () => {
    const dto = plainToInstance(StaffInviteDto, { ...validPayload, email: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should fail when email is invalid', async () => {
    const dto = plainToInstance(StaffInviteDto, { ...validPayload, email: 'bad-email' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should fail when roleId is not a UUID', async () => {
    const dto = plainToInstance(StaffInviteDto, { ...validPayload, roleId: 'not-a-uuid' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'roleId')).toBe(true);
  });

  it('should fail when departmentId is not a UUID', async () => {
    const dto = plainToInstance(StaffInviteDto, {
      ...validPayload,
      departmentId: 'not-a-uuid',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'departmentId')).toBe(true);
  });

  it('should fail when roleId is missing', async () => {
    const dto = plainToInstance(StaffInviteDto, { ...validPayload, roleId: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'roleId')).toBe(true);
  });

  it('should fail when departmentId is missing', async () => {
    const dto = plainToInstance(StaffInviteDto, { ...validPayload, departmentId: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'departmentId')).toBe(true);
  });
});
