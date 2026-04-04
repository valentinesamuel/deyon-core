import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { MedicalServiceCategoryService } from '../service/medicalServiceCategory.service';

type TGetMedicalServiceCategoryResult = {
  medicalServiceCategory: {
    id: string;
    createdAt: Date;
    name: string;
  };
};

type TGetMedicalServiceCategoryByIdParams = { id: string };

@Injectable()
export class FetchMedicalServiceCategoryByIdUsecase extends Usecase<
  TGetMedicalServiceCategoryResult,
  TGetMedicalServiceCategoryByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly medicalServiceCategoryService: MedicalServiceCategoryService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TGetMedicalServiceCategoryByIdParams,
  ): Promise<TGetMedicalServiceCategoryResult> {
    const category =
      await this.medicalServiceCategoryService.getMedicalServiceCategoryByDataOrFailIfNotExists(
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
      medicalServiceCategory: {
        id: category.id,
        createdAt: category.createdAt,
        name: category.name,
      },
    };
  }
}
