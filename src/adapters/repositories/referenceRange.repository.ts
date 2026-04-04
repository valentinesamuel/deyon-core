import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { ReferenceRange } from '@modules/core/entities/referenceRange.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class ReferenceRangeRepository extends BaseRepository<ReferenceRange> {
  private readonly logger = new Logger(ReferenceRangeRepository.name);

  constructor(@InjectRepository(ReferenceRange) private readonly repo: Repository<ReferenceRange>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createReferenceRange(data: Partial<ReferenceRange>, em?: EntityManager): Promise<ReferenceRange> {
    const repo = em ? em.getRepository(ReferenceRange) : this;
    const range = repo.create(data);
    return repo.save(range);
  }

  updateReferenceRange(
    id: string,
    data: Partial<ReferenceRange>,
    em?: EntityManager,
  ): Promise<ReferenceRange> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<ReferenceRange>,
      data as QueryDeepPartialEntity<ReferenceRange>,
      entityManager,
    );
  }

  async softDeleteReferenceRange(id: string, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(ReferenceRange) : this;
    const range = await this.findOneOrFailIfNotExists({ where: { id } }, em);
    await repo.softRemove(range);
  }
}
