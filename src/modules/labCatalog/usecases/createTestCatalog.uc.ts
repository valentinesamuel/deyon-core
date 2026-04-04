import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateTestCatalogDto } from '../dto/createTestCatalog.dto';
import { TestCatalogService } from '../service/testCatalog.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TCreateTestCatalogResult = {
  id: string;
  createdAt: Date;
  serviceCodeId: string;
  code: string;
  name: string;
  sampleType: string;
  methodology: string;
  preparationInstructions: string;
  defaultUnit: string;
};

@Injectable()
export class CreateTestCatalogUsecase extends Usecase<
  TCreateTestCatalogResult,
  CreateTestCatalogDto
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly testCatalogService: TestCatalogService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: CreateTestCatalogDto,
  ): Promise<TCreateTestCatalogResult> {
    await this.testCatalogService.getTestCatalogByDataOrFailIfExists(
      {
        where: {
          code: params.code,
        },
      },
      em,
    );

    const testCatalog = await this.testCatalogService.createTestCatalog(
      {
        serviceCodeId: params.serviceCodeId,
        code: params.code,
        name: params.name,
        sampleType: params.sampleType,
        defaultUnit: params.defaultUnit,
        methodology: params.methodology,
        preparationInstructions: params.preparationInstructions,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.TEST_CATALOG_CREATED,
        module: EventModule.TEST_CATALOG,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          id: testCatalog.id,
          code: testCatalog.code,
          name: testCatalog.name,
        },
      },
      em,
    );

    return {
      id: testCatalog.id,
      createdAt: testCatalog.createdAt,
      serviceCodeId: testCatalog.serviceCodeId,
      code: testCatalog.code,
      name: testCatalog.name,
      sampleType: testCatalog.sampleType,
      methodology: testCatalog.methodology,
      preparationInstructions: testCatalog.preparationInstructions,
      defaultUnit: testCatalog.defaultUnit,
    };
  }
}
