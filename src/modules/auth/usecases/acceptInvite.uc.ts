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
import { RedisService } from '@shared/redis/redis.service';
import { RedisKeys } from '@shared/redis/redis.constants';

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
    private readonly redisService: RedisService,
  ) {
    super();
  }

  async execute(
    _entityManager: EntityManager,
    params: AcceptInviteDto & { ipAddress?: string; userAgent?: string },
  ): Promise<AcceptInviteResult> {
    const {
      token,
      firstName,
      lastName,
      phoneNumber,
      password,
      licenseNumber,
      specialization,
      ipAddress,
      userAgent,
    } = params;

    const tokenHash = this.tokenService.sha256(token);

    // Check Redis first, then DB
    const cached = await this.redisService.getJson<{
      email: string;
      roleId: string;
      departmentId: string;
    }>(RedisKeys.invite(tokenHash));

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
    await this.redisService.del(RedisKeys.invite(tokenHash));

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
