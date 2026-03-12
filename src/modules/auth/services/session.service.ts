import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@shared/redis/redis.service';
import { RedisKeys } from '@shared/redis/redis.constants';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { RefreshToken } from '@modules/core/entities/refreshToken.entity';

const MAX_SESSIONS = 2;

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async addSession(staffId: string, familyId: string): Promise<void> {
    const key = RedisKeys.sessions(staffId);
    await this.redisService.sadd(key, familyId);
  }

  async removeSession(staffId: string, familyId: string): Promise<void> {
    const key = RedisKeys.sessions(staffId);
    await this.redisService.srem(key, familyId);
  }

  async getActiveSessions(staffId: string): Promise<string[]> {
    const key = RedisKeys.sessions(staffId);
    return this.redisService.smembers(key);
  }

  async getSessionCount(staffId: string): Promise<number> {
    const key = RedisKeys.sessions(staffId);
    return this.redisService.scard(key);
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
    const members = await this.redisService.smembers(key);
    if (members.length > 0) {
      await this.redisService.del(key);
    }
    this.logger.log(`Revoked all sessions for staff ${staffId}`);
  }
}
