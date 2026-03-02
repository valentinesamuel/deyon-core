import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'node:crypto';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RedisService } from '@shared/redis/redis.service';
import { RedisKeys, RedisTTL } from '@shared/redis/redis.constants';

const MAX_FAILED_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly redisService: RedisService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }

  async checkLockout(email: string): Promise<void> {
    const locked = await this.redisService.exists(RedisKeys.loginLockout(email));
    if (locked) {
      throw new UnauthorizedException('Account is temporarily locked. Please try again later.');
    }
  }

  async recordFailedAttempt(email: string, staffId?: string): Promise<void> {
    const attemptsKey = RedisKeys.loginAttempts(email);
    const count = await this.redisService.incr(attemptsKey);
    await this.redisService.expire(attemptsKey, RedisTTL.loginAttempts);

    if (count >= MAX_FAILED_ATTEMPTS) {
      await this.redisService.set(RedisKeys.loginLockout(email), '1', RedisTTL.loginLockout);
      if (staffId) {
        await this.staffRepository.update(staffId, {
          lockedUntil: new Date(Date.now() + RedisTTL.loginLockout * 1000),
        });
      }
      throw new UnauthorizedException('Too many failed attempts. Account locked for 15 minutes.');
    }
  }

  async clearFailedAttempts(email: string): Promise<void> {
    await this.redisService.del(RedisKeys.loginAttempts(email));
  }

  async issueEphemeralMfaToken(staffId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await this.redisService.setJson(RedisKeys.mfaPending(token), { staffId }, RedisTTL.mfaPending);
    return token;
  }

  async issueEphemeralSetupToken(staffId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await this.redisService.setJson(RedisKeys.mfaSetup(token), { staffId }, RedisTTL.mfaSetup);
    return token;
  }

  async validateStaffStatus(staff: { isActive: boolean; isApproved: boolean }): Promise<void> {
    if (!staff.isActive) {
      throw new UnauthorizedException('Account is not active.');
    }
    if (!staff.isApproved) {
      throw new UnauthorizedException('Account is pending approval.');
    }
  }
}
