import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ConsultationService } from '../service/consultation.service';
import { Consultation } from '@modules/core/entities/consultation.entity';

type TParams = { id: string };
type TResult = { consultation: Consultation };

@Injectable()
export class FetchConsultationByIdUsecase extends Usecase<TResult, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly consultationService: ConsultationService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<TResult> {
    const consultation = await this.consultationService.getConsultationOrFail({
      where: { id: params.id },
      relations: { patient: true, doctor: true, episode: true, appointment: true },
    });
    return { consultation };
  }
}
