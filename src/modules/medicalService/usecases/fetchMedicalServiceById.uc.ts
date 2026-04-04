import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { MedicalServiceService } from '../service/medicalService.service';
import { MedicalService } from '@modules/core/entities/medicalService.entity';

type TFetchMedicalServiceByIdResult = {
  medicalService: MedicalService;
};

type TFetchMedicalServiceByIdParams = { id: string };

@Injectable()
export class FetchMedicalServiceByIdUsecase extends Usecase<
  TFetchMedicalServiceByIdResult,
  TFetchMedicalServiceByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly medicalServiceService: MedicalServiceService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TFetchMedicalServiceByIdParams,
  ): Promise<TFetchMedicalServiceByIdResult> {
    const medicalService =
      await this.medicalServiceService.getMedicalServiceByDataOrFailIfNotExists(
        {
          where: { id: params.id },
        },
        em,
      );

    return { medicalService };
  }
}
