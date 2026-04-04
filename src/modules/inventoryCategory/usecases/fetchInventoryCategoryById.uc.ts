import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { InventoryCategoryService } from '../service/inventoryCategory.service';

type TGetInventoryCategoryResult = {
  inventoryCategory: {
    id: string;
    createdAt: Date;
    name: string;
  };
};

type TGetInventoryCategoryByIdParams = { id: string };

@Injectable()
export class FetchInventoryCategoryByIdUsecase extends Usecase<
  TGetInventoryCategoryResult,
  TGetInventoryCategoryByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly inventoryCategoryService: InventoryCategoryService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TGetInventoryCategoryByIdParams,
  ): Promise<TGetInventoryCategoryResult> {
    const category =
      await this.inventoryCategoryService.getInventoryCategoryByDataOrFailIfNotExists(
        {
          where: {
            id: params.id,
          },
          select: {
            id: true,
            createdAt: true,
            name: true,
          },
        },
        em,
      );

    return {
      inventoryCategory: {
        id: category.id,
        createdAt: category.createdAt,
        name: category.name,
      },
    };
  }
}
