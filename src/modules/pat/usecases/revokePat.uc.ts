import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PersonalAccessTokenRepository } from '@adapters/repositories/personalAccessToken.repository';
import { RequestContextService } from '@shared/context/requestContext.service';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RedisKeys, RedisTTL } from '@adapters/cache/cache.constants';
import { TokenService } from '@modules/auth/services/token.service';

export interface RevokePatResult {
  revoked: boolean;
}

@Injectable()
export class RevokePatUsecase extends Usecase<RevokePatResult> {
  readonly config = { requiresTransaction: false };

  constructor(
    private readonly patRepository: PersonalAccessTokenRepository,
    private readonly requestContextService: RequestContextService,
    private readonly cacheAdapter: CacheAdapter,
    private readonly tokenService: TokenService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: { id: string }): Promise<RevokePatResult> {
    const staffId = this.requestContextService.getUserId();

    const revoked = await this.patRepository.revokeById(params.id, staffId, em);
    if (!revoked) {
      throw new NotFoundException('Personal access token not found');
    }

    // Write revocation sentinel to Redis (25hr TTL — longer than positive cache)
    await this.cacheAdapter.set(RedisKeys.patRevoked(revoked.tokenHash), '1', {
      db: CacheDbType.AUTH,
      ttl: RedisTTL.patRevoked,
    });

    // Delete positive cache entry
    await this.cacheAdapter.del(RedisKeys.pat(revoked.tokenHash), { db: CacheDbType.AUTH });

    return { revoked: true };
  }
}
