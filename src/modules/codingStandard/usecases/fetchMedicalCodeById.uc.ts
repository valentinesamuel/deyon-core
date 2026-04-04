import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { MedicalCodeService } from '../service/medicalCode.service';
import { MedicalCode } from '@modules/core/entities/medicalCode.entity';

type TFetchMedicalCodeByIdParams = { id: string };

@Injectable()
export class FetchMedicalCodeByIdUsecase extends Usecase<MedicalCode, TFetchMedicalCodeByIdParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly medicalCodeService: MedicalCodeService) {
    super();
  }

  async execute(em: EntityManager, params: TFetchMedicalCodeByIdParams): Promise<MedicalCode> {
    return this.medicalCodeService.getMedicalCodeByDataOrFailIfNotExists(
      {
        where: {
          id: params.id,
        },
      },
      em,
    );
  }
}
