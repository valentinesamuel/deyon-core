import { mock } from 'vitest-mock-extended';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { EncryptionUtility } from '@shared/utility/encryption/encryption.utility';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: ReturnType<typeof mock<JwtService>>;
  let configService: ReturnType<typeof mock<ConfigService>>;
  let encryptionUtility: ReturnType<typeof mock<EncryptionUtility>>;

  let configGet: any;

  beforeEach(() => {
    jwtService = mock<JwtService>();
    configService = mock<ConfigService>();
    encryptionUtility = mock<EncryptionUtility>();

    configGet = configService.get as any;
    service = new TokenService(jwtService, configService, encryptionUtility);
  });

  describe('signAccessToken', () => {
    it('should call jwtService.sign with payload and config-derived options', () => {
      configGet.calledWith('common.jwt.accessSecret').mockReturnValue('test-secret');
      configGet.calledWith('common.jwt.accessExpiry').mockReturnValue(900);
      jwtService.sign.mockReturnValue('signed-token');
      encryptionUtility.encrypt.mockReturnValue('encrypted-token');

      const payload = { sub: 'id1', jti: 'jti1', role: 'admin' };
      const result = service.signAccessToken(payload);

      expect(result).toBe('encrypted-token');
      expect(jwtService.sign).toHaveBeenCalledWith(payload, {
        secret: 'test-secret',
        expiresIn: 900,
      });
    });
  });

  describe('verifyAccessToken', () => {
    it('should return payload on valid token', () => {
      configGet.calledWith('common.jwt.accessSecret').mockReturnValue('test-secret');
      const payload = { sub: 'id1', jti: 'jti1', role: 'admin' };
      encryptionUtility.decrypt.mockReturnValue('decrypted-jwt');
      jwtService.verify.mockReturnValue(payload);

      const result = service.verifyAccessToken('valid-token');

      expect(result).toEqual(payload);
      expect(jwtService.verify).toHaveBeenCalledWith('decrypted-jwt', {
        secret: 'test-secret',
      });
    });

    it('should return null when token verification throws', () => {
      configGet.calledWith('common.jwt.accessSecret').mockReturnValue('test-secret');
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      const result = service.verifyAccessToken('bad-token');

      expect(result).toBeNull();
    });
  });

  describe('generateOpaqueToken', () => {
    it('should return a 64-char hex string', () => {
      const token = service.generateOpaqueToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should return different tokens on each call', () => {
      const token1 = service.generateOpaqueToken();
      const token2 = service.generateOpaqueToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('sha256', () => {
    it('should return a deterministic 64-char hex hash', () => {
      const hash1 = service.sha256('test');
      const hash2 = service.sha256('test');
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = service.sha256('hello');
      const hash2 = service.sha256('world');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateJti', () => {
    it('should return a valid UUID', () => {
      const jti = service.generateJti();
      expect(jti).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should return unique values on each call', () => {
      const jti1 = service.generateJti();
      const jti2 = service.generateJti();
      expect(jti1).not.toBe(jti2);
    });
  });

  describe('setAuthCookies', () => {
    it('should set access_token and refresh_token cookies with correct options', () => {
      configGet.calledWith('common.nodeEnv').mockReturnValue('test');
      configGet.calledWith('common.jwt.accessExpiry').mockReturnValue(900);
      configGet.calledWith('common.jwt.refreshExpiry').mockReturnValue(604800);

      const res = { cookie: vi.fn() } as any;
      service.setAuthCookies(res, 'access-val', 'refresh-val');

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-val',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
          maxAge: 900000,
        }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-val',
        expect.objectContaining({
          httpOnly: true,
          path: '/staff/auth/refresh',
          maxAge: 604800000,
        }),
      );
    });

    it('should set secure flag in production', () => {
      configGet.calledWith('common.nodeEnv').mockReturnValue('production');
      configGet.calledWith('common.jwt.accessExpiry').mockReturnValue(900);
      configGet.calledWith('common.jwt.refreshExpiry').mockReturnValue(604800);

      const res = { cookie: vi.fn() } as any;
      service.setAuthCookies(res, 'access-val', 'refresh-val');

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-val',
        expect.objectContaining({ secure: true }),
      );
    });
  });

  describe('clearAuthCookies', () => {
    it('should clear both access_token and refresh_token cookies', () => {
      const res = { clearCookie: vi.fn() } as any;
      service.clearAuthCookies(res);

      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(res.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({
          httpOnly: true,
          path: '/staff/auth/refresh',
        }),
      );
    });
  });
});
