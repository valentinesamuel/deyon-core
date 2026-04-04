import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ReferenceRangeService } from '../service/referenceRange.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TDeleteReferenceRangeParams = { testId: string; rangeId: string };

type TDeleteReferenceRangeResult = {
  id: string;
  deletedAt: Date;
};

@Injectable()
export class DeleteReferenceRangeUsecase extends Usecase<
  TDeleteReferenceRangeResult,
  TDeleteReferenceRangeParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly referenceRangeService: ReferenceRangeService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TDeleteReferenceRangeParams,
  ): Promise<TDeleteReferenceRangeResult> {
    const { testId, rangeId } = params;

    await this.referenceRangeService.getReferenceRangeByDataOrFailIfNotExists(
      { where: { id: rangeId, testId } },
      em,
    );

    await this.referenceRangeService.softDeleteReferenceRange(rangeId, em);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.REFERENCE_RANGE_DELETED,
        module: EventModule.REFERENCE_RANGE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { rangeId, testId },
      },
      em,
    );

    return {
      id: rangeId,
      deletedAt: new Date(),
    };
  }
}
