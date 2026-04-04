import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PatientHistoryService } from '../service/patientHistory.service';
import { PatientMedicalHistory } from '@modules/core/entities/patientMedicalHistory.entity';

type TFetchPatientHistoryParams = { id: string };
type TFetchPatientHistoryResult = { history: PatientMedicalHistory[] };

@Injectable()
export class FetchPatientHistoryUsecase extends Usecase<
  TFetchPatientHistoryResult,
  TFetchPatientHistoryParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly historyService: PatientHistoryService) {
    super();
  }

  async execute(
    _em: EntityManager,
    params: TFetchPatientHistoryParams,
  ): Promise<TFetchPatientHistoryResult> {
    const history = await this.historyService.findByPatientId(params.id, _em);
    return { history };
  }
}
