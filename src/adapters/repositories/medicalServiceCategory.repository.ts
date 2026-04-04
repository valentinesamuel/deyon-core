import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { MedicalServiceCategory } from '@modules/core/entities/medicalServiceCategory.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class MedicalServiceCategoryRepository extends BaseRepository<MedicalServiceCategory> {
  constructor(
    @InjectRepository(MedicalServiceCategory)
    private readonly repo: Repository<MedicalServiceCategory>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createMedicalServiceCategory(data: Partial<MedicalServiceCategory>, em?: EntityManager) {
    const repo = em ? em.getRepository(MedicalServiceCategory) : this;
    const category = repo.create(data);
    return repo.save(category);
  }

  updateMedicalServiceCategory(
    id: string,
    data: Partial<MedicalServiceCategory>,
    em?: EntityManager,
  ): Promise<MedicalServiceCategory> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<MedicalServiceCategory>,
      data as QueryDeepPartialEntity<MedicalServiceCategory>,
      entityManager,
    );
  }
}
