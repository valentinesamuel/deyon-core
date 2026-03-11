import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { StaffLoginDto } from './staffLogin.dto';

describe('StaffLoginDto', () => {
  it('should pass with valid email and password', async () => {
    const dto = plainToInstance(StaffLoginDto, {
      email: 'user@example.com',
      password: 'SecurePass123!',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail when email is missing', async () => {
    const dto = plainToInstance(StaffLoginDto, { password: 'SecurePass123!' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should fail when email is invalid', async () => {
    const dto = plainToInstance(StaffLoginDto, {
      email: 'not-an-email',
      password: 'SecurePass123!',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should fail when password is missing', async () => {
    const dto = plainToInstance(StaffLoginDto, { email: 'user@example.com' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('should fail when password is not a string', async () => {
    const dto = plainToInstance(StaffLoginDto, {
      email: 'user@example.com',
      password: 12345,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });
});
