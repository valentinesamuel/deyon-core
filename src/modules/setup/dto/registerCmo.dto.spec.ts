import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterCmoDto } from './registerCmo.dto';

describe('RegisterCmoDto', () => {
  const validPayload = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'cmo@hospital.com',
    phoneNumber: '+2348012345678',
    password: 'Secure1234pass',
  };

  it('should pass with valid data', async () => {
    const dto = plainToInstance(RegisterCmoDto, validPayload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when firstName is missing', async () => {
    const dto = plainToInstance(RegisterCmoDto, { ...validPayload, firstName: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'firstName')).toBe(true);
  });

  it('should fail when lastName is missing', async () => {
    const dto = plainToInstance(RegisterCmoDto, { ...validPayload, lastName: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'lastName')).toBe(true);
  });

  it('should fail when email is invalid', async () => {
    const dto = plainToInstance(RegisterCmoDto, { ...validPayload, email: 'not-an-email' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should fail when email is missing', async () => {
    const dto = plainToInstance(RegisterCmoDto, { ...validPayload, email: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should fail when phoneNumber is missing', async () => {
    const dto = plainToInstance(RegisterCmoDto, { ...validPayload, phoneNumber: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'phoneNumber')).toBe(true);
  });

  it('should fail when password is shorter than 8 characters', async () => {
    const dto = plainToInstance(RegisterCmoDto, { ...validPayload, password: 'short' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('should fail when password is missing', async () => {
    const dto = plainToInstance(RegisterCmoDto, { ...validPayload, password: undefined });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('should pass when password is exactly 8 characters', async () => {
    const dto = plainToInstance(RegisterCmoDto, { ...validPayload, password: '12345678' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(false);
  });
});
