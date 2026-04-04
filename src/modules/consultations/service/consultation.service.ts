import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ConsultationRepository } from '@adapters/repositories/consultation.repository';
import { Consultation } from '@modules/core/entities/consultation.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class ConsultationService {
  private readonly logger = new Logger(ConsultationService.name);

  constructor(private readonly consultationRepository: ConsultationRepository) {}

  createConsultation(data: Partial<Consultation>, em?: EntityManager): Promise<Consultation> {
    return this.consultationRepository.createConsultation(data, em);
  }

  getConsultationOrFail(
    options: FindResourceOptions<Consultation>,
    em?: EntityManager,
  ): Promise<Consultation> {
    return this.consultationRepository.findOneOrFailIfNotExists(options, em);
  }

  updateConsultation(
    criteria: { id: string },
    data: Partial<Consultation>,
    em?: EntityManager,
  ): Promise<Consultation> {
    return this.consultationRepository.updateExistingRecord(criteria, data as any, em);
  }

  findByEpisodeId(episodeId: string, em?: EntityManager): Promise<Consultation[]> {
    return this.consultationRepository.findByEpisodeId(episodeId, em);
  }
}
