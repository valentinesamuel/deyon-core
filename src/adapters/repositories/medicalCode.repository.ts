import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { MedicalCode } from '@modules/core/entities/medicalCode.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class MedicalCodeRepository extends BaseRepository<MedicalCode> {
  constructor(@InjectRepository(MedicalCode) private readonly repo: Repository<MedicalCode>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createMedicalCode(data: Partial<MedicalCode>, em?: EntityManager) {
    const repo = em ? em.getRepository(MedicalCode) : this;
    const code = repo.create(data);
    return repo.save(code);
  }

  updateMedicalCode(
    id: string,
    data: Partial<MedicalCode>,
    em?: EntityManager,
  ): Promise<MedicalCode> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<MedicalCode>,
      data as QueryDeepPartialEntity<MedicalCode>,
      entityManager,
    );
  }

  async softDeleteMedicalCode(id: string, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(MedicalCode) : this;
    const code = await this.findOneOrFailIfNotExists(
      { where: { id } as FindOptionsWhere<MedicalCode> },
      em,
    );
    await repo.softRemove(code);
  }
}
