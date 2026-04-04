import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PriceChange } from '@modules/core/entities/priceChange.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class PriceChangeRepository extends BaseRepository<PriceChange> {
  private readonly logger = new Logger(PriceChangeRepository.name);

  constructor(@InjectRepository(PriceChange) private readonly repo: Repository<PriceChange>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createPriceChange(data: Partial<PriceChange>, em?: EntityManager) {
    const repo = em ? em.getRepository(PriceChange) : this;
    const priceChange = repo.create(data);
    return repo.save(priceChange);
  }

  updatePriceChange(
    id: string,
    data: Partial<PriceChange>,
    em?: EntityManager,
  ): Promise<PriceChange> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<PriceChange>,
      data as QueryDeepPartialEntity<PriceChange>,
      entityManager,
    );
  }
}
