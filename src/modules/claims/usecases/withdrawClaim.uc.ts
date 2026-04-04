import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ClaimsService } from '../service/claims.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Claim, ClaimStatusEnum } from '@modules/core/entities/claim.entity';
import { WithdrawClaimDto } from '../dto/withdrawClaim.dto';

type TParams = { id: string } & WithdrawClaimDto;
type TResult = { claim: Claim };

const WITHDRAWABLE_STATUSES = [
  ClaimStatusEnum.DRAFT,
  ClaimStatusEnum.SUBMITTED,
  ClaimStatusEnum.PROCESSING,
];

@Injectable()
export class WithdrawClaimUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly claimsService: ClaimsService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const existing = await this.claimsService.getClaimOrFail({ where: { id: params.id } }, em);

    if (!WITHDRAWABLE_STATUSES.includes(existing.status)) {
      throw new BadRequestException(`Cannot withdraw claim in status '${existing.status}'.`);
    }

    const staffId = this.requestContextService.getUserId();

    const claim = await this.claimsService.updateClaim(
      { id: params.id },
      {
        status: ClaimStatusEnum.WITHDRAWN,
        withdrawnReason: params.reason,
        withdrawnAt: new Date(),
      },
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.CLAIM_WITHDRAWN,
        module: EventModule.CLAIM,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { claimId: params.id, reason: params.reason },
      },
      em,
    );

    return { claim };
  }
}
