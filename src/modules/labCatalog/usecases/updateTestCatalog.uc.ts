import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateTestCatalogDto } from '../dto/updateTestCatalog.dto';
import { TestCatalogService } from '../service/testCatalog.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TUpdateTestCatalogParams = { id: string; dto: UpdateTestCatalogDto };

type TUpdateTestCatalogResult = {
  testCatalog: {
    id: string;
    updatedAt: Date;
    serviceCodeId: string;
    code: string;
    name: string;
    sampleType: string;
    methodology: string;
    preparationInstructions: string;
    defaultUnit: string;
  };
};

@Injectable()
export class UpdateTestCatalogUsecase extends Usecase<
  TUpdateTestCatalogResult,
  TUpdateTestCatalogParams
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
    params: TUpdateTestCatalogParams,
  ): Promise<TUpdateTestCatalogResult> {
    const { id, dto } = params;

    await this.testCatalogService.getTestCatalogByDataOrFailIfNotExists({ where: { id } }, em);

    const updated = await this.testCatalogService.updateTestCatalog(id, dto, em);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.TEST_CATALOG_UPDATED,
        module: EventModule.TEST_CATALOG,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { testCatalogId: id, ...dto },
      },
      em,
    );

    return {
      testCatalog: {
        id: updated.id,
        updatedAt: updated.updatedAt,
        serviceCodeId: updated.serviceCodeId,
        code: updated.code,
        name: updated.name,
        sampleType: updated.sampleType,
        methodology: updated.methodology,
        preparationInstructions: updated.preparationInstructions,
        defaultUnit: updated.defaultUnit,
      },
    };
  }
}
