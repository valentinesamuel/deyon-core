import { mock } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { EncryptionUtility } from './encryption.utility';

describe('EncryptionUtility', () => {
  let utility: EncryptionUtility;
  let configService: ReturnType<typeof mock<ConfigService>>;

  beforeEach(() => {
    configService = mock<ConfigService>();

    (configService.get as any)
      .calledWith('common.encryption.algorithm')
      .mockReturnValue('aes-256-gcm');
    // 32-byte key as utf8 string (32 chars = 32 bytes)

    (configService.get as any).calledWith('common.encryption.key').mockReturnValue('a'.repeat(32));
    utility = new EncryptionUtility(configService);
  });

  describe('encrypt', () => {
    it('should return a string in encrypted:rnauthTag:rniv format', () => {
      const result = utility.encrypt('hello');
      const parts = result.split(':rn');
      expect(parts).toHaveLength(3);
      // Each part should be a hex string
      parts.forEach((part) => expect(part).toMatch(/^[0-9a-f]+$/));
    });
  });

  describe('decrypt', () => {
    it('should recover the original plaintext after encryption', () => {
      const plaintext = 'hello world secret';
      const encrypted = utility.encrypt(plaintext);
      const decrypted = utility.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = utility.encrypt(plaintext);
      const decrypted = utility.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode strings', () => {
      const plaintext = 'hello world 123';
      const encrypted = utility.encrypt(plaintext);
      const decrypted = utility.decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });
  });

  describe('encrypt randomness', () => {
    it('should produce different ciphertexts for same plaintext due to random IV', () => {
      const plaintext = 'same text';
      const enc1 = utility.encrypt(plaintext);
      const enc2 = utility.encrypt(plaintext);
      expect(enc1).not.toBe(enc2);
    });
  });

  describe('tampered ciphertext', () => {
    it('should throw when auth tag is tampered', () => {
      const encrypted = utility.encrypt('test data');
      const parts = encrypted.split(':rn');
      // Tamper with the auth tag
      const tamperedAuthTag = parts[1].slice(0, -2) + (parts[1].slice(-2) === '00' ? 'ff' : '00');
      const tampered = `${parts[0]}:rn${tamperedAuthTag}:rn${parts[2]}`;
      expect(() => utility.decrypt(tampered)).toThrow();
    });

    it('should throw when encrypted data is tampered', () => {
      const encrypted = utility.encrypt('test data');
      const parts = encrypted.split(':rn');
      const tamperedData = parts[0].slice(0, -2) + (parts[0].slice(-2) === '00' ? 'ff' : '00');
      const tampered = `${tamperedData}:rn${parts[1]}:rn${parts[2]}`;
      expect(() => utility.decrypt(tampered)).toThrow();
    });
  });

  describe('wrong key', () => {
    it('should throw when decrypting with a different key', () => {
      const encrypted = utility.encrypt('secret');

      // Create a new utility with a different key
      const otherConfig = mock<ConfigService>();

      (otherConfig.get as any)
        .calledWith('common.encryption.algorithm')
        .mockReturnValue('aes-256-gcm');

      (otherConfig.get as any).calledWith('common.encryption.key').mockReturnValue('b'.repeat(32));
      const otherUtility = new EncryptionUtility(otherConfig);

      expect(() => otherUtility.decrypt(encrypted)).toThrow();
    });
  });
});
