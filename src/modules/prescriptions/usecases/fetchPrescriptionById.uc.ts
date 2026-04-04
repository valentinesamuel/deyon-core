import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PrescriptionService } from '../service/prescription.service';
import { Prescription } from '@modules/core/entities/prescription.entity';

type TParams = { id: string };
type TResult = { prescription: Prescription };

@Injectable()
export class FetchPrescriptionByIdUsecase extends Usecase<TResult, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly prescriptionService: PrescriptionService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<TResult> {
    const prescription = await this.prescriptionService.getPrescriptionOrFail({
      where: { id: params.id },
      relations: { patient: true, doctor: true, items: { drug: true, substitutedDrug: true } },
    });
    return { prescription };
  }
}
