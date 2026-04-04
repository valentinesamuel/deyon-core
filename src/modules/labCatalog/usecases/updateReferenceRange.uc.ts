import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateReferenceRangeDto } from '../dto/updateReferenceRange.dto';
import { ReferenceRangeService } from '../service/referenceRange.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { ReferenceGenderEnum } from '@modules/core/entities/referenceRange.entity';

type TUpdateReferenceRangeParams = {
  testId: string;
  rangeId: string;
  dto: UpdateReferenceRangeDto;
};

type TUpdateReferenceRangeResult = {
  range: {
    id: string;
    updatedAt: Date;
    testId: string;
    gender: ReferenceGenderEnum;
    minAgeYears: number;
    maxAgeYears: number;
    lowerBound: number;
    upperBound: number;
    criticalLowerBound: number;
    criticalUpperBound: number;
  };
};

@Injectable()
export class UpdateReferenceRangeUsecase extends Usecase<
  TUpdateReferenceRangeResult,
  TUpdateReferenceRangeParams
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
    params: TUpdateReferenceRangeParams,
  ): Promise<TUpdateReferenceRangeResult> {
    const { testId, rangeId, dto } = params;

    await this.referenceRangeService.getReferenceRangeByDataOrFailIfNotExists(
      { where: { id: rangeId, testId } },
      em,
    );

    const updated = await this.referenceRangeService.updateReferenceRange(rangeId, dto, em);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.REFERENCE_RANGE_UPDATED,
        module: EventModule.REFERENCE_RANGE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { rangeId, testId, ...dto },
      },
      em,
    );

    return {
      range: {
        id: updated.id,
        updatedAt: updated.updatedAt,
        testId: updated.testId,
        gender: updated.gender,
        minAgeYears: updated.minAgeYears,
        maxAgeYears: updated.maxAgeYears,
        lowerBound: updated.lowerBound,
        upperBound: updated.upperBound,
        criticalLowerBound: updated.criticalLowerBound,
        criticalUpperBound: updated.criticalUpperBound,
      },
    };
  }
}
