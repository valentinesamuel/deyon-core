import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { VitalService } from '../service/vital.service';
import { PatientVital } from '@modules/core/entities/patientVitals.entity';

type TParams = { id: string };
type TResult = { vital: PatientVital };

@Injectable()
export class FetchVitalByIdUsecase extends Usecase<TResult, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly vitalService: VitalService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<TResult> {
    const vital = await this.vitalService.getVitalOrFail({ where: { id: params.id } }, _em);
    return { vital };
  }
}
