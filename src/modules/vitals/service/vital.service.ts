import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PatientVitalRepository } from '@adapters/repositories/patientVital.repository';
import { PatientVital } from '@modules/core/entities/patientVitals.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class VitalService {
  private readonly logger = new Logger(VitalService.name);

  constructor(private readonly vitalRepository: PatientVitalRepository) {}

  createVital(data: Partial<PatientVital>, em?: EntityManager) {
    return this.vitalRepository.createVital(data, em);
  }

  getVitalOrFail(options: FindResourceOptions<PatientVital>, em?: EntityManager) {
    return this.vitalRepository.findOneOrFailIfNotExists(options, em);
  }

  findByEpisodeId(episodeId: string, em?: EntityManager) {
    return this.vitalRepository.findByEpisodeId(episodeId, em);
  }
}
