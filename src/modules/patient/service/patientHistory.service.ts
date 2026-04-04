import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PatientMedicalHistoryRepository } from '@adapters/repositories/patientMedicalHistory.repository';
import { PatientMedicalHistory } from '@modules/core/entities/patientMedicalHistory.entity';

@Injectable()
export class PatientHistoryService {
  private readonly logger = new Logger(PatientHistoryService.name);

  constructor(private readonly historyRepository: PatientMedicalHistoryRepository) {}

  createHistoryItem(data: Partial<PatientMedicalHistory>, em?: EntityManager) {
    return this.historyRepository.createHistoryItem(data, em);
  }

  findByPatientId(patientId: string, em?: EntityManager) {
    return this.historyRepository.findByPatientId(patientId, em);
  }

  getHistoryItemOrFail(id: string, patientId: string, em?: EntityManager) {
    return this.historyRepository.findOneOrFailIfNotExists({ where: { id, patientId } }, em);
  }

  softDeleteHistoryItem(id: string, em?: EntityManager) {
    return this.historyRepository.softDeleteHistoryItem(id, em);
  }
}
