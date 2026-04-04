import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { LabReferralsService } from '../service/labReferrals.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { LabReferral, LabReferralStatusEnum } from '@modules/core/entities/labReferral.entity';

type TParams = { id: string };
type TResult = { referral: LabReferral };

@Injectable()
export class CompleteReferralUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly labReferralsService: LabReferralsService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const existing = await this.labReferralsService.getReferralOrFail(
      { where: { id: params.id } },
      em,
    );

    if (existing.status !== LabReferralStatusEnum.RECEIVED) {
      throw new BadRequestException(
        `Cannot complete referral in status '${existing.status}'. Results must be received first.`,
      );
    }

    const staffId = this.requestContextService.getUserId();

    const referral = await this.labReferralsService.updateReferral(
      { id: params.id },
      { status: LabReferralStatusEnum.COMPLETED },
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.LAB_REFERRAL_COMPLETED,
        module: EventModule.LAB_REFERRAL,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { referralId: params.id },
      },
      em,
    );

    return { referral };
  }
}
