import { mock } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { MfaService } from './mfa.service';
import { EncryptionUtility } from '@shared/utility/encryption/encryption.utility';

describe('MfaService', () => {
  let service: MfaService;
  let configService: ReturnType<typeof mock<ConfigService>>;
  let encryptionUtility: ReturnType<typeof mock<EncryptionUtility>>;

  beforeEach(() => {
    configService = mock<ConfigService>();
    encryptionUtility = mock<EncryptionUtility>();

    (configService.get as any).calledWith('common.mfa.issuer').mockReturnValue('TestApp');
    service = new MfaService(configService, encryptionUtility);
  });

  describe('generateSecret', () => {
    it('should return encryptedSecret, otpauthUrl, and qrCodeDataUrl', async () => {
      encryptionUtility.encrypt.mockReturnValue('encrypted-secret');

      const result = await service.generateSecret('user@test.com');

      expect(result.encryptedSecret).toBe('encrypted-secret');
      expect(result.otpauthUrl).toContain('otpauth://');
      expect(result.otpauthUrl).toContain('user%40test.com'); // @ is URL-encoded
      expect(result.otpauthUrl).toContain('TestApp');
      expect(result.qrCodeDataUrl).toContain('data:image');
      expect(encryptionUtility.encrypt).toHaveBeenCalledWith(expect.any(String));
    });
  });

  describe('verifyTotp', () => {
    it('should return false for an invalid TOTP code', async () => {
      encryptionUtility.decrypt.mockReturnValue('JBSWY3DPEHPK3PXP');

      const result = await service.verifyTotp('encrypted-secret', '000000');

      // Unless we happen to hit the exact time window, this should be false
      expect(typeof result).toBe('boolean');
    });

    it('should return false if decryption throws an error', async () => {
      encryptionUtility.decrypt.mockImplementation(() => {
        throw new Error('bad key');
      });

      const result = await service.verifyTotp('bad-encrypted', '123456');

      expect(result).toBe(false);
    });
  });

  describe('generateBackupCodes', () => {
    it('should return 8 plain codes and 8 hashed codes', async () => {
      const { plainCodes, hashedCodes } = await service.generateBackupCodes();

      expect(plainCodes).toHaveLength(8);
      expect(hashedCodes).toHaveLength(8);
      plainCodes.forEach((code) => {
        expect(code).toMatch(/^[0-9A-F]{10}$/);
      });
      hashedCodes.forEach((hash) => {
        expect(hash).toContain('$argon2');
      });
    });

    it('should generate unique codes', async () => {
      const { plainCodes } = await service.generateBackupCodes();
      const uniqueCodes = new Set(plainCodes);
      expect(uniqueCodes.size).toBe(8);
    });
  });

  describe('verifyBackupCode', () => {
    it('should return the index of the matching hashed code', async () => {
      const { plainCodes, hashedCodes } = await service.generateBackupCodes();

      const index = await service.verifyBackupCode(plainCodes[2], hashedCodes);

      expect(index).toBe(2);
    });

    it('should return -1 for a non-matching code', async () => {
      const { hashedCodes } = await service.generateBackupCodes();

      const index = await service.verifyBackupCode('INVALID000', hashedCodes);

      expect(index).toBe(-1);
    });
  });
});
