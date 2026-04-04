import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PatientService } from '../service/patient.service';
import { Patient } from '@modules/core/entities/patient.entity';

type TFetchPatientByIdParams = { id: string };
type TFetchPatientByIdResult = { patient: Patient };

@Injectable()
export class FetchPatientByIdUsecase extends Usecase<
  TFetchPatientByIdResult,
  TFetchPatientByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly patientService: PatientService) {
    super();
  }

  async execute(
    _em: EntityManager,
    params: TFetchPatientByIdParams,
  ): Promise<TFetchPatientByIdResult> {
    const patient = await this.patientService.getPatientOrFail(
      { where: { id: params.id }, relations: { lga: true } },
      _em,
    );
    return { patient };
  }
}
