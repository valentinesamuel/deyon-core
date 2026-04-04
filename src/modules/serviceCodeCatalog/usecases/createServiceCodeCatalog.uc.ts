import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateServiceCodeCatalogDto } from '../dto/createServiceCodeCatalog.dto';
import { ServiceCodeCatalogService } from '../service/serviceCodeCatalog.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TCreateServiceCodeCatalogParams = {
  serviceId: string;
  dto: CreateServiceCodeCatalogDto;
};

type TCreateServiceCodeCatalogResult = {
  id: string;
  createdAt: Date;
  serviceId: string;
  medicalCodeId: string;
  hmoProviderId: string | null;
};

@Injectable()
export class CreateServiceCodeCatalogUsecase extends Usecase<
  TCreateServiceCodeCatalogResult,
  TCreateServiceCodeCatalogParams
> {
  constructor(
    private readonly serviceCodeCatalogService: ServiceCodeCatalogService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TCreateServiceCodeCatalogParams,
  ): Promise<TCreateServiceCodeCatalogResult> {
    const { serviceId, dto } = params;

    const catalog = await this.serviceCodeCatalogService.createServiceCodeCatalog(
      {
        serviceId,
        medicalCodeId: dto.medicalCodeId,
        hmoProviderId: dto.hmoProviderId ?? undefined,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.SERVICE_CODE_CATALOG_CREATED,
        module: EventModule.SERVICE_CODE_CATALOG,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          serviceId,
          medicalCodeId: dto.medicalCodeId,
          hmoProviderId: dto.hmoProviderId ?? undefined,
        },
      },
      em,
    );

    return {
      id: catalog.id,
      createdAt: catalog.createdAt,
      serviceId: catalog.serviceId,
      medicalCodeId: catalog.medicalCodeId,
      hmoProviderId: catalog.hmoProviderId ?? null,
    };
  }
}
