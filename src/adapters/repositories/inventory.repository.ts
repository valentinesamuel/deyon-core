import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { Inventory } from '@modules/core/entities/inventory.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class InventoryRepository extends BaseRepository<Inventory> {
  private readonly logger = new Logger(InventoryRepository.name);

  constructor(@InjectRepository(Inventory) private readonly repo: Repository<Inventory>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createInventoryItem(data: Partial<Inventory>, em?: EntityManager) {
    const repo = em ? em.getRepository(Inventory) : this;
    const item = repo.create(data);
    return repo.save(item);
  }

  updateInventoryItem(
    id: string,
    data: Partial<Inventory>,
    em?: EntityManager,
  ): Promise<Inventory> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<Inventory>,
      data as QueryDeepPartialEntity<Inventory>,
      entityManager,
    );
  }
}
