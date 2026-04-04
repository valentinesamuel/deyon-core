import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { TestCatalogService } from '../service/testCatalog.service';

type TFetchTestCatalogByIdParams = { id: string };

type TFetchTestCatalogByIdResult = {
  testCatalog: {
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
};

@Injectable()
export class FetchTestCatalogByIdUsecase extends Usecase<
  TFetchTestCatalogByIdResult,
  TFetchTestCatalogByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly testCatalogService: TestCatalogService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TFetchTestCatalogByIdParams,
  ): Promise<TFetchTestCatalogByIdResult> {
    const testCatalog = await this.testCatalogService.getTestCatalogByDataOrFailIfNotExists(
      {
        where: {
          id: params.id,
        },
      },
      em,
    );

    return {
      testCatalog: {
        id: testCatalog.id,
        createdAt: testCatalog.createdAt,
        serviceCodeId: testCatalog.serviceCodeId,
        code: testCatalog.code,
        name: testCatalog.name,
        sampleType: testCatalog.sampleType,
        methodology: testCatalog.methodology,
        preparationInstructions: testCatalog.preparationInstructions,
        defaultUnit: testCatalog.defaultUnit,
      },
    };
  }
}
