import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { InventoryCategory } from '@modules/core/entities/inventoryCategory.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class InventoryCategoryRepository extends BaseRepository<InventoryCategory> {
  private readonly logger = new Logger(InventoryCategoryRepository.name);

  constructor(
    @InjectRepository(InventoryCategory) private readonly repo: Repository<InventoryCategory>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createInventoryCategory(data: Partial<InventoryCategory>, em?: EntityManager) {
    const repo = em ? em.getRepository(InventoryCategory) : this;
    const inventoryCategory = repo.create(data);
    return repo.save(inventoryCategory);
  }

  updateInventoryCategory(
    id: string,
    data: Partial<InventoryCategory>,
    em?: EntityManager,
  ): Promise<InventoryCategory> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<InventoryCategory>,
      data as QueryDeepPartialEntity<InventoryCategory>,
      entityManager,
    );
  }
}
