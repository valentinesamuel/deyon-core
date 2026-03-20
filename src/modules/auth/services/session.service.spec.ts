import { mock } from 'vitest-mock-extended';
import { Repository } from 'typeorm';
import { SessionService } from './session.service';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RefreshToken } from '@modules/core/entities/refreshToken.entity';

const AUTH = { db: CacheDbType.AUTH };

describe('SessionService', () => {
  let service: SessionService;
  let cacheAdapter: ReturnType<typeof mock<CacheAdapter>>;
  let refreshTokenRepo: ReturnType<typeof mock<Repository<RefreshToken>>>;

  beforeEach(() => {
    cacheAdapter = mock<CacheAdapter>();
    refreshTokenRepo = mock<Repository<RefreshToken>>();
    service = new SessionService(cacheAdapter, refreshTokenRepo);
  });

  describe('addSession', () => {
    it('should call sadd with the sessions key and familyId', async () => {
      cacheAdapter.sadd.mockResolvedValue(undefined);

      await service.addSession('staff-1', 'family-1');

      expect(cacheAdapter.sadd).toHaveBeenCalledWith(
        expect.stringContaining('staff-1'),
        'family-1',
        AUTH,
      );
    });
  });

  describe('removeSession', () => {
    it('should call srem with the sessions key and familyId', async () => {
      cacheAdapter.srem.mockResolvedValue(undefined);

      await service.removeSession('staff-1', 'family-1');

      expect(cacheAdapter.srem).toHaveBeenCalledWith(
        expect.stringContaining('staff-1'),
        'family-1',
        AUTH,
      );
    });
  });

  describe('getActiveSessions', () => {
    it('should return the set members from cache', async () => {
      cacheAdapter.smembers.mockResolvedValue(['family-1', 'family-2']);

      const sessions = await service.getActiveSessions('staff-1');

      expect(sessions).toEqual(['family-1', 'family-2']);
      expect(cacheAdapter.smembers).toHaveBeenCalledWith(expect.stringContaining('staff-1'), AUTH);
    });
  });

  describe('getSessionCount', () => {
    it('should return the cardinality from scard', async () => {
      cacheAdapter.scard.mockResolvedValue(3);

      const count = await service.getSessionCount('staff-1');

      expect(count).toBe(3);
    });
  });

  describe('enforceSessionLimit', () => {
    it('should revoke the oldest session when at the limit (MAX_SESSIONS=2)', async () => {
      cacheAdapter.scard.mockResolvedValue(2);
      cacheAdapter.smembers.mockResolvedValue(['family-1', 'family-2']);
      refreshTokenRepo.findOne.mockResolvedValue({
        staffId: 'staff-1',
        familyId: 'family-1',
      } as any);
      refreshTokenRepo.update.mockResolvedValue(undefined as any);
      cacheAdapter.srem.mockResolvedValue(undefined);

      await service.enforceSessionLimit('staff-1');

      expect(refreshTokenRepo.findOne).toHaveBeenCalled();
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { staffId: 'staff-1', familyId: 'family-1' },
        { isRevoked: true },
      );
      expect(cacheAdapter.srem).toHaveBeenCalledWith(
        expect.stringContaining('staff-1'),
        'family-1',
        AUTH,
      );
    });

    it('should not revoke any session if below the limit', async () => {
      cacheAdapter.scard.mockResolvedValue(1);

      await service.enforceSessionLimit('staff-1');

      expect(refreshTokenRepo.findOne).not.toHaveBeenCalled();
      expect(refreshTokenRepo.update).not.toHaveBeenCalled();
    });

    it('should handle case where no oldest token is found', async () => {
      cacheAdapter.scard.mockResolvedValue(2);
      cacheAdapter.smembers.mockResolvedValue(['family-1', 'family-2']);
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await service.enforceSessionLimit('staff-1');

      expect(refreshTokenRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('revokeFamily', () => {
    it('should revoke all tokens in the family and remove from cache', async () => {
      refreshTokenRepo.update.mockResolvedValue(undefined as any);
      cacheAdapter.srem.mockResolvedValue(undefined);

      await service.revokeFamily('staff-1', 'family-1');

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { staffId: 'staff-1', familyId: 'family-1' },
        { isRevoked: true },
      );
      expect(cacheAdapter.srem).toHaveBeenCalledWith(
        expect.stringContaining('staff-1'),
        'family-1',
        AUTH,
      );
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all DB tokens and delete the sessions key', async () => {
      refreshTokenRepo.update.mockResolvedValue(undefined as any);
      cacheAdapter.smembers.mockResolvedValue(['family-1', 'family-2']);
      cacheAdapter.del.mockResolvedValue(undefined);

      await service.revokeAllSessions('staff-1');

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { staffId: 'staff-1' },
        { isRevoked: true },
      );
      expect(cacheAdapter.del).toHaveBeenCalledWith(expect.stringContaining('staff-1'), AUTH);
    });

    it('should not call del if there are no active sessions', async () => {
      refreshTokenRepo.update.mockResolvedValue(undefined as any);
      cacheAdapter.smembers.mockResolvedValue([]);

      await service.revokeAllSessions('staff-1');

      expect(refreshTokenRepo.update).toHaveBeenCalled();
      expect(cacheAdapter.del).not.toHaveBeenCalled();
    });
  });
});
