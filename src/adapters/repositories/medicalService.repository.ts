import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { MedicalService } from '@modules/core/entities/medicalService.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class MedicalServiceRepository extends BaseRepository<MedicalService> {
  private readonly logger = new Logger(MedicalServiceRepository.name);

  constructor(@InjectRepository(MedicalService) private readonly repo: Repository<MedicalService>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createMedicalService(data: Partial<MedicalService>, em?: EntityManager) {
    const repo = em ? em.getRepository(MedicalService) : this;
    const medicalService = repo.create(data);
    return repo.save(medicalService);
  }

  updateMedicalService(
    id: string,
    data: Partial<MedicalService>,
    em?: EntityManager,
  ): Promise<MedicalService> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<MedicalService>,
      data as QueryDeepPartialEntity<MedicalService>,
      entityManager,
    );
  }
}
