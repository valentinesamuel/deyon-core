import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ClaimsService } from '../service/claims.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Claim, ClaimStatusEnum } from '@modules/core/entities/claim.entity';
import { CreateClaimDto } from '../dto/createClaim.dto';

type TResult = { claim: Claim };

@Injectable()
export class CreateClaimUsecase extends Usecase<TResult, CreateClaimDto> {
  constructor(
    private readonly claimsService: ClaimsService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: CreateClaimDto): Promise<TResult> {
    const staffId = this.requestContextService.getUserId();

    const claim = await this.claimsService.createClaim(
      {
        episodeId: params.episodeId,
        hmoProviderId: params.hmoProviderId,
        status: ClaimStatusEnum.DRAFT,
        totalBilledAmount: params.totalBilledAmount,
        enrollmentId: params.enrollmentId ?? null,
        policyNumber: params.policyNumber ?? null,
        preAuthCode: params.preAuthCode ?? null,
        currentVersion: 1,
        versions: [],
      },
      em,
    );

    if (params.items?.length) {
      await this.claimsService.createClaimItems(
        params.items.map((item) => ({
          claimId: claim.id,
          billItemId: item.billItemId ?? null,
          description: item.description,
          category: item.category,
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice,
          claimedAmount: item.claimedAmount,
          isOffProtocol: item.isOffProtocol ?? false,
          clinicalJustification: item.clinicalJustification ?? null,
          isExcluded: false,
        })),
        em,
      );
    }

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.CLAIM_CREATED,
        module: EventModule.CLAIM,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { claimId: claim.id, claimNumber: claim.claimNumber },
      },
      em,
    );

    return { claim };
  }
}
