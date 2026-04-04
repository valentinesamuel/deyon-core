import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ServiceCodeCatalog } from '@modules/core/entities/serviceCodeCatalog.entity';
import { QueryInput } from '@shared/queryEngine';

type FetchAllServiceCodeCatalogsParams = { serviceId: string; query: QueryInput };

@Injectable()
export class FetchAllServiceCodeCatalogsUsecase extends Usecase<
  ServiceCodeCatalog[],
  FetchAllServiceCodeCatalogsParams
> {
  readonly config = { requiresTransaction: false };

  async execute(
    em: EntityManager,
    params: FetchAllServiceCodeCatalogsParams,
  ): Promise<ServiceCodeCatalog[]> {
    return em.getRepository(ServiceCodeCatalog).find({
      where: { serviceId: params.serviceId },
    });
  }
}
