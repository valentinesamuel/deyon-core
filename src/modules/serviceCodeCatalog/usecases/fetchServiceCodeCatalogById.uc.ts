import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ServiceCodeCatalogService } from '../service/serviceCodeCatalog.service';
import { ServiceCodeCatalog } from '@modules/core/entities/serviceCodeCatalog.entity';

type TFetchServiceCodeCatalogByIdParams = { serviceId: string; catalogId: string };

@Injectable()
export class FetchServiceCodeCatalogByIdUsecase extends Usecase<
  ServiceCodeCatalog,
  TFetchServiceCodeCatalogByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly serviceCodeCatalogService: ServiceCodeCatalogService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TFetchServiceCodeCatalogByIdParams,
  ): Promise<ServiceCodeCatalog> {
    return this.serviceCodeCatalogService.getServiceCodeCatalogByDataOrFailIfNotExists(
      {
        where: {
          id: params.catalogId,
          serviceId: params.serviceId,
        },
      },
      em,
    );
  }
}
