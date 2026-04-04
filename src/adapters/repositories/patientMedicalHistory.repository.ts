import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { PatientMedicalHistory } from '@modules/core/entities/patientMedicalHistory.entity';

@Injectable()
export class PatientMedicalHistoryRepository extends BaseRepository<PatientMedicalHistory> {
  private readonly logger = new Logger(PatientMedicalHistoryRepository.name);

  constructor(
    @InjectRepository(PatientMedicalHistory)
    private readonly repo: Repository<PatientMedicalHistory>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createHistoryItem(
    data: Partial<PatientMedicalHistory>,
    em?: EntityManager,
  ): Promise<PatientMedicalHistory> {
    const repo = em ? em.getRepository(PatientMedicalHistory) : this;
    const item = repo.create(data);
    return repo.save(item);
  }

  findByPatientId(patientId: string, em?: EntityManager): Promise<PatientMedicalHistory[]> {
    const repo = em ? em.getRepository(PatientMedicalHistory) : this;
    return repo.find({ where: { patientId }, relations: ['catalog'] });
  }

  async softDeleteHistoryItem(id: string, em?: EntityManager): Promise<PatientMedicalHistory> {
    const entityManager = em ?? this.manager;
    const item = await this.findOneOrFailIfNotExists({ where: { id } }, entityManager);
    return entityManager.getRepository(PatientMedicalHistory).softRemove(item);
  }
}
