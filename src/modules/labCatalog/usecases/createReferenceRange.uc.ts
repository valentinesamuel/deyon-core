import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateReferenceRangeDto } from '../dto/createReferenceRange.dto';
import { ReferenceRangeService } from '../service/referenceRange.service';
import { TestCatalogService } from '../service/testCatalog.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { ReferenceGenderEnum } from '@modules/core/entities/referenceRange.entity';

type TCreateReferenceRangeParams = { testId: string; dto: CreateReferenceRangeDto };

type TCreateReferenceRangeResult = {
  id: string;
  createdAt: Date;
  testId: string;
  gender: ReferenceGenderEnum;
  minAgeYears: number;
  maxAgeYears: number;
  lowerBound: number;
  upperBound: number;
  criticalLowerBound: number;
  criticalUpperBound: number;
};

@Injectable()
export class CreateReferenceRangeUsecase extends Usecase<
  TCreateReferenceRangeResult,
  TCreateReferenceRangeParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly referenceRangeService: ReferenceRangeService,
    private readonly testCatalogService: TestCatalogService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TCreateReferenceRangeParams,
  ): Promise<TCreateReferenceRangeResult> {
    const { testId, dto } = params;

    await this.testCatalogService.getTestCatalogByDataOrFailIfNotExists(
      { where: { id: testId } },
      em,
    );

    const range = await this.referenceRangeService.createReferenceRange(
      {
        testId,
        gender: dto.gender,
        minAgeYears: dto.minAgeYears,
        maxAgeYears: dto.maxAgeYears,
        lowerBound: dto.lowerBound,
        upperBound: dto.upperBound,
        criticalLowerBound: dto.criticalLowerBound,
        criticalUpperBound: dto.criticalUpperBound,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.REFERENCE_RANGE_CREATED,
        module: EventModule.REFERENCE_RANGE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { rangeId: range.id, testId },
      },
      em,
    );

    return {
      id: range.id,
      createdAt: range.createdAt,
      testId: range.testId,
      gender: range.gender,
      minAgeYears: range.minAgeYears,
      maxAgeYears: range.maxAgeYears,
      lowerBound: range.lowerBound,
      upperBound: range.upperBound,
      criticalLowerBound: range.criticalLowerBound,
      criticalUpperBound: range.criticalUpperBound,
    };
  }
}
