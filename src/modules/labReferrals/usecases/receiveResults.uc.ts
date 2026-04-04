import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { LabReferralsService } from '../service/labReferrals.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { LabReferral, LabReferralStatusEnum } from '@modules/core/entities/labReferral.entity';
import { ReceiveResultsDto } from '../dto/receiveResults.dto';

type TParams = { id: string } & ReceiveResultsDto;
type TResult = { referral: LabReferral };

@Injectable()
export class ReceiveResultsUsecase extends Usecase<TResult, TParams> {
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

    if (
      existing.status !== LabReferralStatusEnum.SENT &&
      existing.status !== LabReferralStatusEnum.PENDING
    ) {
      throw new BadRequestException(
        `Cannot receive results for referral in status '${existing.status}'.`,
      );
    }

    const staffId = this.requestContextService.getUserId();

    await Promise.all(
      params.results.map((result) =>
        this.labReferralsService.updateItem(
          { id: result.itemId },
          {
            result: result.result,
            unit: result.unit,
            isAbnormal: result.isAbnormal ?? false,
          },
          em,
        ),
      ),
    );

    const referral = await this.labReferralsService.updateReferral(
      { id: params.id },
      {
        status: LabReferralStatusEnum.RECEIVED,
        notes: params.notes ?? existing.notes,
      },
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.LAB_REFERRAL_RESULTS_RECEIVED,
        module: EventModule.LAB_REFERRAL,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { referralId: params.id, resultCount: params.results.length },
      },
      em,
    );

    return { referral };
  }
}
