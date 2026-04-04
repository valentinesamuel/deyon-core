import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { HmoRules } from '@modules/core/entities/hmoRules.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class HmoRulesRepository extends BaseRepository<HmoRules> {
  private readonly logger = new Logger(HmoRulesRepository.name);

  constructor(@InjectRepository(HmoRules) private readonly repo: Repository<HmoRules>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createHmoRule(data: Partial<HmoRules>, em?: EntityManager): Promise<HmoRules> {
    const repo = em ? em.getRepository(HmoRules) : this;
    const rule = repo.create(data);
    return repo.save(rule);
  }

  updateHmoRule(id: string, data: Partial<HmoRules>, em?: EntityManager): Promise<HmoRules> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<HmoRules>,
      data as QueryDeepPartialEntity<HmoRules>,
      entityManager,
    );
  }

  async softDeleteHmoRule(id: string, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(HmoRules) : this;
    const rule = await this.findOneOrFailIfNotExists({ where: { id } }, em);
    await repo.softRemove(rule);
  }
}
