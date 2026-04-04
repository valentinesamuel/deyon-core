import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ClaimsService } from '../service/claims.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Claim, ClaimStatusEnum } from '@modules/core/entities/claim.entity';
import { ApproveClaimDto } from '../dto/approveClaim.dto';

type TParams = { id: string } & ApproveClaimDto;
type TResult = { claim: Claim };

@Injectable()
export class ApproveClaimUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly claimsService: ClaimsService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const existing = await this.claimsService.getClaimOrFail({ where: { id: params.id } }, em);

    if (
      existing.status !== ClaimStatusEnum.SUBMITTED &&
      existing.status !== ClaimStatusEnum.PROCESSING
    ) {
      throw new BadRequestException(`Cannot approve claim in status '${existing.status}'.`);
    }

    const staffId = this.requestContextService.getUserId();

    const claim = await this.claimsService.updateClaim(
      { id: params.id },
      { status: ClaimStatusEnum.APPROVED, approvedAmount: params.approvedAmount },
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.CLAIM_APPROVED,
        module: EventModule.CLAIM,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { claimId: params.id, approvedAmount: params.approvedAmount },
      },
      em,
    );

    return { claim };
  }
}
