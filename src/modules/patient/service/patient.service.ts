import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PatientRepository } from '@adapters/repositories/patient.repository';
import { Patient } from '@modules/core/entities/patient.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class PatientService {
  private readonly logger = new Logger(PatientService.name);

  constructor(private readonly patientRepository: PatientRepository) {}

  createPatient(data: Partial<Patient>, em?: EntityManager) {
    return this.patientRepository.createPatient(data, em);
  }

  getPatientOrFail(options: FindResourceOptions<Patient>, em?: EntityManager) {
    return this.patientRepository.findOneOrFailIfNotExists(options, em);
  }

  updatePatient(id: string, data: Partial<Patient>, em?: EntityManager) {
    return this.patientRepository.updatePatient(id, data, em);
  }

  softDeletePatient(id: string, em?: EntityManager) {
    return this.patientRepository.softDeletePatient(id, em);
  }

  searchPatients(q: string, em?: EntityManager) {
    return this.patientRepository.searchPatients(q, em);
  }
}
