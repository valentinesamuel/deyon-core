import { Usecase } from '@broker/types';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { StaffInviteDto } from '../dto/staffInvite.dto';
import { InviteTokenRepository } from '@adapters/repositories/inviteToken.repository';
import { TokenService } from '../services/token.service';
import { AuditService } from '../services/audit.service';
import { AuthEventType } from '../../core/entities/authAuditLog.entity';
import { RedisService } from '@shared/redis/redis.service';
import { RedisKeys, RedisTTL } from '@shared/redis/redis.constants';

export interface CreateInviteResult {
  inviteToken: string;
  email: string;
}

@Injectable()
export class CreateInviteUsecase extends Usecase<CreateInviteResult> {
  constructor(
    private readonly inviteTokenRepository: InviteTokenRepository,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    params: StaffInviteDto & { invitedById?: string; ipAddress?: string; userAgent?: string },
  ): Promise<CreateInviteResult> {
    const { email, roleId, departmentId, invitedById, ipAddress, userAgent } = params;

    const plainToken = this.tokenService.generateOpaqueToken();
    const tokenHash = this.tokenService.sha256(plainToken);

    const expiresAt = new Date(Date.now() + RedisTTL.invite * 1000);

    await this.inviteTokenRepository.createToken({
      tokenHash,
      email,
      roleId,
      departmentId,
      expiresAt,
      invitedById,
    });

    // Also cache in Redis for fast lookup
    await this.redisService.setJson(
      RedisKeys.invite(tokenHash),
      { email, roleId, departmentId },
      RedisTTL.invite,
    );

    await this.auditService.log({
      staffId: invitedById,
      event: AuthEventType.INVITE_SENT,
      ipAddress,
      userAgent,
      metadata: { email },
    });

    return { inviteToken: plainToken, email };
  }
}
