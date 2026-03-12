import { describe, it, expect, beforeEach } from 'vitest';
import { IsStrongPasswordConstraint } from './isStrongPassword.decorator';

describe('IsStrongPasswordConstraint', () => {
  let constraint: IsStrongPasswordConstraint;

  beforeEach(() => {
    constraint = new IsStrongPasswordConstraint();
  });

  describe('valid passwords', () => {
    it('should return true for a password meeting all requirements', () => {
      expect(constraint.validate('Str0ng!Pass#2024')).toBe(true);
    });

    it('should return true for exactly 12 characters meeting all requirements', () => {
      expect(constraint.validate('Aa1!Bb2@Cc3#')).toBe(true);
    });

    it('should return true with various special characters', () => {
      expect(constraint.validate('Pass1word@Xyz')).toBe(true);
      expect(constraint.validate('HelloWorld1$z')).toBe(true);
      expect(constraint.validate('TestPass1word!')).toBe(true);
    });
  });

  describe('invalid passwords', () => {
    it('should return false for null/undefined', () => {
      expect(constraint.validate(null as any)).toBe(false);
      expect(constraint.validate(undefined as any)).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(constraint.validate(12345 as any)).toBe(false);
    });

    it('should return false when password is shorter than 12 characters', () => {
      expect(constraint.validate('Aa1!Bb2@C')).toBe(false); // 9 chars
    });

    it('should return false when password has no uppercase letters', () => {
      expect(constraint.validate('str0ng!pass#2024')).toBe(false);
    });

    it('should return false when password has no lowercase letters', () => {
      expect(constraint.validate('STR0NG!PASS#2024')).toBe(false);
    });

    it('should return false when password has no numbers', () => {
      expect(constraint.validate('Strng!Pass#Word')).toBe(false);
    });

    it('should return false when password has no special characters', () => {
      expect(constraint.validate('Str0ngPass2024')).toBe(false);
    });
  });

  describe('defaultMessage', () => {
    it('should return the default validation message', () => {
      const message = constraint.defaultMessage();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('uppercase');
      expect(message).toContain('lowercase');
      expect(message).toContain('special character');
      expect(message).toContain('number');
    });
  });
});
