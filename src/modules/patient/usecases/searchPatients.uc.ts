import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PatientService } from '../service/patient.service';
import { Patient } from '@modules/core/entities/patient.entity';

type TSearchPatientsParams = { q: string };
type TSearchPatientsResult = { patients: Patient[] };

@Injectable()
export class SearchPatientsUsecase extends Usecase<TSearchPatientsResult, TSearchPatientsParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly patientService: PatientService) {
    super();
  }

  async execute(_em: EntityManager, params: TSearchPatientsParams): Promise<TSearchPatientsResult> {
    const patients = await this.patientService.searchPatients(params.q, _em);
    return { patients };
  }
}
