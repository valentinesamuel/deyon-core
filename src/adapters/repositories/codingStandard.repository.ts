import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { CodingStandard } from '@modules/core/entities/codingStandard.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class CodingStandardRepository extends BaseRepository<CodingStandard> {
  constructor(@InjectRepository(CodingStandard) private readonly repo: Repository<CodingStandard>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createCodingStandard(data: Partial<CodingStandard>, em?: EntityManager) {
    const repo = em ? em.getRepository(CodingStandard) : this;
    const standard = repo.create(data);
    return repo.save(standard);
  }

  updateCodingStandard(
    id: string,
    data: Partial<CodingStandard>,
    em?: EntityManager,
  ): Promise<CodingStandard> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<CodingStandard>,
      data as QueryDeepPartialEntity<CodingStandard>,
      entityManager,
    );
  }
}
