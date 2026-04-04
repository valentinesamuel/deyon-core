import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PatientHmoRepository } from '@adapters/repositories/patientHmo.repository';
import { PatientHmo } from '@modules/core/entities/patientHmo.entity';

@Injectable()
export class PatientHmoService {
  private readonly logger = new Logger(PatientHmoService.name);

  constructor(private readonly patientHmoRepository: PatientHmoRepository) {}

  upsertPatientHmo(patientId: string, data: Partial<PatientHmo>, em?: EntityManager) {
    return this.patientHmoRepository.upsertPatientHmo(patientId, data, em);
  }

  findByPatientId(patientId: string, em?: EntityManager) {
    return this.patientHmoRepository.findByPatientId(patientId, em);
  }
}
