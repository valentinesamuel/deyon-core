import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AcceptInviteDto } from './acceptInvite.dto';

describe('AcceptInviteDto', () => {
  const validPayload = {
    token: 'some-invite-token',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '+2348012345678',
    password: 'Str0ng!Pass#2024',
  };

  it('should pass with valid required fields', async () => {
    const dto = plainToInstance(AcceptInviteDto, validPayload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass with optional licenseNumber and specialization', async () => {
    const dto = plainToInstance(AcceptInviteDto, {
      ...validPayload,
      licenseNumber: 'LIC-12345',
      specialization: 'Cardiology',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when token is missing', async () => {
    const dto = plainToInstance(AcceptInviteDto, { ...validPayload, token: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'token')).toBe(true);
  });

  it('should fail when firstName is missing', async () => {
    const dto = plainToInstance(AcceptInviteDto, { ...validPayload, firstName: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'firstName')).toBe(true);
  });

  it('should fail when lastName is missing', async () => {
    const dto = plainToInstance(AcceptInviteDto, { ...validPayload, lastName: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'lastName')).toBe(true);
  });

  it('should fail when phoneNumber is invalid', async () => {
    const dto = plainToInstance(AcceptInviteDto, { ...validPayload, phoneNumber: 'invalid' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'phoneNumber')).toBe(true);
  });

  it('should fail when password does not meet strong password requirements', async () => {
    const dto = plainToInstance(AcceptInviteDto, { ...validPayload, password: 'weakpassword' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('should fail when password is missing', async () => {
    const dto = plainToInstance(AcceptInviteDto, { ...validPayload, password: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });
});
