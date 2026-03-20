import { Usecase } from '@broker/types';
import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AcceptInviteDto } from '../dto/acceptInvite.dto';
import { InviteTokenRepository } from '@adapters/repositories/inviteToken.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { AuthService } from '../services/auth.service';
import { EventLogService } from '../services/eventLog.service';
import { TokenService } from '../services/token.service';
import { EventModule, EventType } from '../../core/entities/eventLog.entity';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RedisKeys } from '@adapters/cache/cache.constants';
import { RequestContextService } from '@shared/context/requestContext.service';

export interface AcceptInviteResult {
  requiresMfaSetup: boolean;
  setupToken: string;
  staffId: string;
}

@Injectable()
export class AcceptInviteUsecase extends Usecase<AcceptInviteResult> {
  constructor(
    private readonly inviteTokenRepository: InviteTokenRepository,
    private readonly staffRepository: StaffRepository,
    private readonly authService: AuthService,
    private readonly eventLogService: EventLogService,
    private readonly tokenService: TokenService,
    private readonly cacheAdapter: CacheAdapter,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    params: AcceptInviteDto,
  ): Promise<AcceptInviteResult> {
    const { token, firstName, lastName, phoneNumber, password, licenseNumber, specialization } =
      params;
    const ipAddress = this.requestContextService.getIp() ?? undefined;
    const userAgent = this.requestContextService.getUserAgent() ?? undefined;

    const tokenHash = this.tokenService.sha256(token);

    // Check Redis first, then DB
    const cached = await this.cacheAdapter.get<{
      email: string;
      roleId: string;
      departmentId: string;
    }>(RedisKeys.invite(tokenHash), { db: CacheDbType.AUTH });

    const inviteRecord =
      await this.inviteTokenRepository.findByTokenHashAndFailIfNotExist(tokenHash);

    if (inviteRecord.isUsed) {
      throw new BadRequestException('Invite token has already been used');
    }

    if (inviteRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invite token has expired');
    }

    const emailToUse = cached?.email ?? inviteRecord.email;
    const roleId = cached?.roleId ?? inviteRecord.roleId;
    const departmentId = cached?.departmentId ?? inviteRecord.departmentId;

    // Ensure no duplicate
    await this.staffRepository.findOneOrFailIfExists({
      where: [{ email: emailToUse }, { phoneNumber }],
      select: { id: true },
    });

    const passwordHash = await this.authService.hashPassword(password);

    const staff = await this.staffRepository.createStaff({
      firstName,
      lastName,
      email: emailToUse,
      phoneNumber,
      passwordHash,
      licenseNumber,
      specialization,
      roleId,
      departmentId,
      isActive: true,
      isApproved: true,
    });

    // Mark invite as used
    await this.inviteTokenRepository.markAsUsed(inviteRecord.id);
    await this.cacheAdapter.del(RedisKeys.invite(tokenHash), { db: CacheDbType.AUTH });

    // Issue MFA setup token
    const setupToken = await this.authService.issueEphemeralSetupToken(staff.id);

    await this.eventLogService.log({
      actorId: staff.id,
      event: EventType.INVITE_ACCEPTED,
      module: EventModule.AUTH,
      ipAddress,
      userAgent,
    });

    return { requiresMfaSetup: true, setupToken, staffId: staff.id };
  }
}
