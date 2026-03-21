import { Usecase } from '@broker/types';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { StaffInviteDto } from '../dto/staffInvite.dto';
import { InviteTokenRepository } from '@adapters/repositories/inviteToken.repository';
import { TokenService } from '../services/token.service';
import { EventLogService } from '../services/eventLog.service';
import { EventModule, EventType } from '../../core/entities/eventLog.entity';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RedisKeys, RedisTTL } from '@adapters/cache/cache.constants';
import { RequestContextService } from '@shared/context/requestContext.service';

export interface CreateInviteResult {
  inviteToken: string;
  email: string;
}

@Injectable()
export class CreateInviteUsecase extends Usecase<CreateInviteResult> {
  constructor(
    private readonly inviteTokenRepository: InviteTokenRepository,
    private readonly tokenService: TokenService,
    private readonly eventLogService: EventLogService,
    private readonly cacheAdapter: CacheAdapter,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: StaffInviteDto & { invitedById?: string },
  ): Promise<CreateInviteResult> {
    const { email, roleId, departmentId, invitedById } = params;
    const ipAddress = this.requestContextService.getIp() ?? undefined;
    const userAgent = this.requestContextService.getUserAgent() ?? undefined;

    const plainToken = this.tokenService.generateOpaqueToken();
    const tokenHash = this.tokenService.sha256(plainToken);

    const expiresAt = new Date(Date.now() + RedisTTL.invite * 1000);

    await this.inviteTokenRepository.createToken(
      {
        tokenHash,
        email,
        roleId,
        departmentId,
        expiresAt,
        invitedById,
      },
      em,
    );

    // Also cache in Redis for fast lookup
    await this.cacheAdapter.set(
      RedisKeys.invite(tokenHash),
      { email, roleId, departmentId },
      { db: CacheDbType.AUTH, ttl: RedisTTL.invite },
    );

    await this.eventLogService.log(
      {
        actorId: invitedById,
        event: EventType.INVITE_SENT,
        module: EventModule.AUTH,
        ipAddress,
        userAgent,
        metadata: { email },
      },
      em,
    );

    return { inviteToken: plainToken, email };
  }
}
