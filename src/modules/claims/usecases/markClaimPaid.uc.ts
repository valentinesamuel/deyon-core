import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ClaimsService } from '../service/claims.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Claim, ClaimStatusEnum } from '@modules/core/entities/claim.entity';

type TParams = { id: string };
type TResult = { claim: Claim };

@Injectable()
export class MarkClaimPaidUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly claimsService: ClaimsService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const existing = await this.claimsService.getClaimOrFail({ where: { id: params.id } }, em);

    if (existing.status !== ClaimStatusEnum.APPROVED) {
      throw new BadRequestException(`Cannot mark as paid — claim must be in 'approved' status.`);
    }

    const staffId = this.requestContextService.getUserId();

    const claim = await this.claimsService.updateClaim(
      { id: params.id },
      { status: ClaimStatusEnum.PAID },
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.CLAIM_PAID,
        module: EventModule.CLAIM,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { claimId: params.id, approvedAmount: existing.approvedAmount },
      },
      em,
    );

    return { claim };
  }
}
