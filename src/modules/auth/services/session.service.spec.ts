import { mock } from 'vitest-mock-extended';
import { Repository } from 'typeorm';
import { SessionService } from './session.service';
import { RedisService } from '@shared/redis/redis.service';
import { RefreshToken } from '@modules/core/entities/refreshToken.entity';

describe('SessionService', () => {
  let service: SessionService;
  let redisService: ReturnType<typeof mock<RedisService>>;
  let refreshTokenRepo: ReturnType<typeof mock<Repository<RefreshToken>>>;

  beforeEach(() => {
    redisService = mock<RedisService>();
    refreshTokenRepo = mock<Repository<RefreshToken>>();
    service = new SessionService(redisService, refreshTokenRepo);
  });

  describe('addSession', () => {
    it('should call sadd with the sessions key and familyId', async () => {
      redisService.sadd.mockResolvedValue(undefined);

      await service.addSession('staff-1', 'family-1');

      expect(redisService.sadd).toHaveBeenCalledWith(
        expect.stringContaining('staff-1'),
        'family-1',
      );
    });
  });

  describe('removeSession', () => {
    it('should call srem with the sessions key and familyId', async () => {
      redisService.srem.mockResolvedValue(undefined);

      await service.removeSession('staff-1', 'family-1');

      expect(redisService.srem).toHaveBeenCalledWith(
        expect.stringContaining('staff-1'),
        'family-1',
      );
    });
  });

  describe('getActiveSessions', () => {
    it('should return the set members from Redis', async () => {
      redisService.smembers.mockResolvedValue(['family-1', 'family-2']);

      const sessions = await service.getActiveSessions('staff-1');

      expect(sessions).toEqual(['family-1', 'family-2']);
      expect(redisService.smembers).toHaveBeenCalledWith(expect.stringContaining('staff-1'));
    });
  });

  describe('getSessionCount', () => {
    it('should return the cardinality from Redis scard', async () => {
      redisService.scard.mockResolvedValue(3);

      const count = await service.getSessionCount('staff-1');

      expect(count).toBe(3);
    });
  });

  describe('enforceSessionLimit', () => {
    it('should revoke the oldest session when at the limit (MAX_SESSIONS=2)', async () => {
      redisService.scard.mockResolvedValue(2);
      redisService.smembers.mockResolvedValue(['family-1', 'family-2']);
      refreshTokenRepo.findOne.mockResolvedValue({
        staffId: 'staff-1',
        familyId: 'family-1',
      } as any);
      refreshTokenRepo.update.mockResolvedValue(undefined as any);
      redisService.srem.mockResolvedValue(undefined);

      await service.enforceSessionLimit('staff-1');

      expect(refreshTokenRepo.findOne).toHaveBeenCalled();
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { staffId: 'staff-1', familyId: 'family-1' },
        { isRevoked: true },
      );
      expect(redisService.srem).toHaveBeenCalledWith(
        expect.stringContaining('staff-1'),
        'family-1',
      );
    });

    it('should not revoke any session if below the limit', async () => {
      redisService.scard.mockResolvedValue(1);

      await service.enforceSessionLimit('staff-1');

      expect(refreshTokenRepo.findOne).not.toHaveBeenCalled();
      expect(refreshTokenRepo.update).not.toHaveBeenCalled();
    });

    it('should handle case where no oldest token is found', async () => {
      redisService.scard.mockResolvedValue(2);
      redisService.smembers.mockResolvedValue(['family-1', 'family-2']);
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await service.enforceSessionLimit('staff-1');

      expect(refreshTokenRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('revokeFamily', () => {
    it('should revoke all tokens in the family and remove from Redis', async () => {
      refreshTokenRepo.update.mockResolvedValue(undefined as any);
      redisService.srem.mockResolvedValue(undefined);

      await service.revokeFamily('staff-1', 'family-1');

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { staffId: 'staff-1', familyId: 'family-1' },
        { isRevoked: true },
      );
      expect(redisService.srem).toHaveBeenCalledWith(
        expect.stringContaining('staff-1'),
        'family-1',
      );
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all DB tokens and delete the Redis sessions key', async () => {
      refreshTokenRepo.update.mockResolvedValue(undefined as any);
      redisService.smembers.mockResolvedValue(['family-1', 'family-2']);
      redisService.del.mockResolvedValue(undefined);

      await service.revokeAllSessions('staff-1');

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { staffId: 'staff-1' },
        { isRevoked: true },
      );
      expect(redisService.del).toHaveBeenCalledWith(expect.stringContaining('staff-1'));
    });

    it('should not call del if there are no active sessions', async () => {
      refreshTokenRepo.update.mockResolvedValue(undefined as any);
      redisService.smembers.mockResolvedValue([]);

      await service.revokeAllSessions('staff-1');

      expect(refreshTokenRepo.update).toHaveBeenCalled();
      expect(redisService.del).not.toHaveBeenCalled();
    });
  });
});
