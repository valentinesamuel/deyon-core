import { mock } from 'vitest-mock-extended';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';

const AUTH = { db: CacheDbType.AUTH };

describe('AuthService', () => {
  let service: AuthService;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let cacheAdapter: ReturnType<typeof mock<CacheAdapter>>;

  beforeEach(() => {
    staffRepo = mock<StaffRepository>();
    cacheAdapter = mock<CacheAdapter>();
    service = new AuthService(staffRepo, cacheAdapter);
  });

  describe('hashPassword', () => {
    it('should return an argon2id hash different from the plain password', async () => {
      const hash = await service.hashPassword('password123');
      expect(hash).not.toBe('password123');
      expect(hash).toContain('$argon2');
    });

    it('should produce different hashes for the same password due to salt', async () => {
      const hash1 = await service.hashPassword('password123');
      const hash2 = await service.hashPassword('password123');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for matching password and hash', async () => {
      const hash = await service.hashPassword('TestPassword1!');
      const result = await service.verifyPassword(hash, 'TestPassword1!');
      expect(result).toBe(true);
    });

    it('should return false for wrong password', async () => {
      const hash = await service.hashPassword('TestPassword1!');
      const result = await service.verifyPassword(hash, 'WrongPassword!');
      expect(result).toBe(false);
    });
  });

  describe('checkLockout', () => {
    it('should throw UnauthorizedException if lockout key exists in cache', async () => {
      cacheAdapter.exists.mockResolvedValue(true);
      await expect(service.checkLockout('test@example.com')).rejects.toThrow(UnauthorizedException);
      expect(cacheAdapter.exists).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com'),
        AUTH,
      );
    });

    it('should not throw if lockout key does not exist', async () => {
      cacheAdapter.exists.mockResolvedValue(false);
      await expect(service.checkLockout('test@example.com')).resolves.not.toThrow();
    });
  });

  describe('recordFailedAttempt', () => {
    it('should increment counter and set expiry without locking if below threshold', async () => {
      cacheAdapter.incr.mockResolvedValue(3);
      cacheAdapter.expire.mockResolvedValue(undefined);

      await service.recordFailedAttempt('test@example.com');

      expect(cacheAdapter.incr).toHaveBeenCalledWith(expect.any(String), AUTH);
      expect(cacheAdapter.expire).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        AUTH,
      );
      expect(cacheAdapter.set).not.toHaveBeenCalled();
    });

    it('should set lockout key and throw at MAX_FAILED_ATTEMPTS (5)', async () => {
      cacheAdapter.incr.mockResolvedValue(5);
      cacheAdapter.expire.mockResolvedValue(undefined);
      cacheAdapter.set.mockResolvedValue(undefined);
      staffRepo.update.mockResolvedValue(undefined as any);

      await expect(service.recordFailedAttempt('test@example.com', 'staff-id')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(cacheAdapter.set).toHaveBeenCalledWith(
        expect.any(String),
        '1',
        expect.objectContaining({ db: CacheDbType.AUTH }),
      );
      expect(staffRepo.update).toHaveBeenCalledWith(
        'staff-id',
        expect.objectContaining({ lockedUntil: expect.any(Date) }),
      );
    });

    it('should not update staff record if staffId is not provided', async () => {
      cacheAdapter.incr.mockResolvedValue(5);
      cacheAdapter.expire.mockResolvedValue(undefined);
      cacheAdapter.set.mockResolvedValue(undefined);

      await expect(service.recordFailedAttempt('test@example.com')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(staffRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('clearFailedAttempts', () => {
    it('should delete the login attempts key from cache', async () => {
      cacheAdapter.del.mockResolvedValue(undefined);
      await service.clearFailedAttempts('test@example.com');
      expect(cacheAdapter.del).toHaveBeenCalledWith(
        expect.stringContaining('test@example.com'),
        AUTH,
      );
    });
  });

  describe('issueEphemeralMfaToken', () => {
    it('should return a 64-char hex token and store it in cache', async () => {
      cacheAdapter.set.mockResolvedValue(undefined);
      const token = await service.issueEphemeralMfaToken('staff-123');
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(cacheAdapter.set).toHaveBeenCalledWith(
        expect.stringContaining(token),
        expect.objectContaining({ staffId: 'staff-123' }),
        expect.objectContaining({ db: CacheDbType.AUTH }),
      );
    });
  });

  describe('issueEphemeralSetupToken', () => {
    it('should return a 64-char hex token and store it in cache with setup key', async () => {
      cacheAdapter.set.mockResolvedValue(undefined);
      const token = await service.issueEphemeralSetupToken('staff-456');
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(cacheAdapter.set).toHaveBeenCalledWith(
        expect.stringContaining(token),
        expect.objectContaining({ staffId: 'staff-456' }),
        expect.objectContaining({ db: CacheDbType.AUTH }),
      );
    });
  });

  describe('validateStaffStatus', () => {
    it('should throw UnauthorizedException if staff is not active', async () => {
      await expect(
        service.validateStaffStatus({ isActive: false, isApproved: true }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if staff is not approved', async () => {
      await expect(
        service.validateStaffStatus({ isActive: true, isApproved: false }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should not throw for active and approved staff', async () => {
      await expect(
        service.validateStaffStatus({ isActive: true, isApproved: true }),
      ).resolves.not.toThrow();
    });
  });
});
