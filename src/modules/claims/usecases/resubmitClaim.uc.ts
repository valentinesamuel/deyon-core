import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ClaimsService } from '../service/claims.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Claim, ClaimStatusEnum, TClaimVersion } from '@modules/core/entities/claim.entity';
import { ResubmitClaimDto } from '../dto/resubmitClaim.dto';

type TParams = { id: string } & ResubmitClaimDto;
type TResult = { claim: Claim };

@Injectable()
export class ResubmitClaimUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly claimsService: ClaimsService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const existing = await this.claimsService.getClaimOrFail({ where: { id: params.id } }, em);

    if (existing.status !== ClaimStatusEnum.DENIED) {
      throw new BadRequestException(`Only denied claims can be resubmitted.`);
    }

    const staffId = this.requestContextService.getUserId();

    const versionSnapshot: TClaimVersion = {
      version: existing.currentVersion,
      amendedAt: new Date().toISOString(),
      amendedBy: staffId,
      amendedByName: '',
      reason: 'resubmission',
      reasonDetail: params.resubmissionNotes,
      snapshot: {
        status: existing.status,
        denialReason: existing.denialReason,
        totalBilledAmount: existing.totalBilledAmount,
      },
    };

    const versions = [...(existing.versions ?? []), versionSnapshot];

    const claim = await this.claimsService.updateClaim(
      { id: params.id },
      {
        status: ClaimStatusEnum.SUBMITTED,
        resubmissionNotes: params.resubmissionNotes,
        denialReason: null,
        currentVersion: existing.currentVersion + 1,
        versions,
      },
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.CLAIM_RESUBMITTED,
        module: EventModule.CLAIM,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { claimId: params.id, version: claim.currentVersion },
      },
      em,
    );

    return { claim };
  }
}
