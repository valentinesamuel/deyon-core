import { Injectable, Logger } from '@nestjs/common';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RedisKeys } from '@adapters/cache/cache.constants';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { RefreshToken } from '@modules/core/entities/refreshToken.entity';

const MAX_SESSIONS = 2;

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly cacheAdapter: CacheAdapter,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async addSession(staffId: string, familyId: string): Promise<void> {
    const key = RedisKeys.sessions(staffId);
    await this.cacheAdapter.sadd(key, familyId, { db: CacheDbType.AUTH });
  }

  async removeSession(staffId: string, familyId: string): Promise<void> {
    const key = RedisKeys.sessions(staffId);
    await this.cacheAdapter.srem(key, familyId, { db: CacheDbType.AUTH });
  }

  async getActiveSessions(staffId: string): Promise<string[]> {
    const key = RedisKeys.sessions(staffId);
    return this.cacheAdapter.smembers(key, { db: CacheDbType.AUTH });
  }

  async getSessionCount(staffId: string): Promise<number> {
    const key = RedisKeys.sessions(staffId);
    return this.cacheAdapter.scard(key, { db: CacheDbType.AUTH });
  }

  /**
   * Enforce max session limit by revoking the oldest family if exceeded.
   */
  async enforceSessionLimit(staffId: string): Promise<void> {
    const count = await this.getSessionCount(staffId);
    if (count >= MAX_SESSIONS) {
      const sessions = await this.getActiveSessions(staffId);
      // Find oldest token family in DB
      const oldest = await this.refreshTokenRepository.findOne({
        where: sessions.map(
          (fid): FindOptionsWhere<RefreshToken> => ({
            staffId,
            familyId: fid,
            isRevoked: false,
          }),
        ),
        order: { createdAt: 'ASC' },
      });
      if (oldest) {
        await this.revokeFamily(staffId, oldest.familyId);
      }
    }
  }

  async revokeFamily(staffId: string, familyId: string): Promise<void> {
    await this.refreshTokenRepository.update({ staffId, familyId }, { isRevoked: true });
    await this.removeSession(staffId, familyId);
    this.logger.log(`Revoked session family ${familyId} for staff ${staffId}`);
  }

  async revokeAllSessions(staffId: string): Promise<void> {
    await this.refreshTokenRepository.update({ staffId }, { isRevoked: true });
    const key = RedisKeys.sessions(staffId);
    const members = await this.cacheAdapter.smembers(key, { db: CacheDbType.AUTH });
    if (members.length > 0) {
      await this.cacheAdapter.del(key, { db: CacheDbType.AUTH });
    }
    this.logger.log(`Revoked all sessions for staff ${staffId}`);
  }
}
