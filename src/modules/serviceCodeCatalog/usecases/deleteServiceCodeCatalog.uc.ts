import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ServiceCodeCatalogService } from '../service/serviceCodeCatalog.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { ServiceCodeCatalog } from '@modules/core/entities/serviceCodeCatalog.entity';

type TDeleteServiceCodeCatalogParams = { serviceId: string; catalogId: string };

type TDeleteServiceCodeCatalogResult = {
  id: string;
  deletedAt: Date;
};

@Injectable()
export class DeleteServiceCodeCatalogUsecase extends Usecase<
  TDeleteServiceCodeCatalogResult,
  TDeleteServiceCodeCatalogParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly serviceCodeCatalogService: ServiceCodeCatalogService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TDeleteServiceCodeCatalogParams,
  ): Promise<TDeleteServiceCodeCatalogResult> {
    const { serviceId, catalogId } = params;

    const catalog =
      await this.serviceCodeCatalogService.getServiceCodeCatalogByDataOrFailIfNotExists(
        { where: { id: catalogId, serviceId } },
        em,
      );

    await em.getRepository(ServiceCodeCatalog).softRemove(catalog);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.SERVICE_CODE_CATALOG_DELETED,
        module: EventModule.SERVICE_CODE_CATALOG,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { catalogId, serviceId },
      },
      em,
    );

    return {
      id: catalogId,
      deletedAt: new Date(),
    };
  }
}
