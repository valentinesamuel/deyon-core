import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { LabOrderItem } from '@modules/core/entities/labOrderItem.entity';

@Injectable()
export class LabOrderItemRepository extends BaseRepository<LabOrderItem> {
  private readonly logger = new Logger(LabOrderItemRepository.name);

  constructor(@InjectRepository(LabOrderItem) private readonly repo: Repository<LabOrderItem>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createLabOrderItem(data: Partial<LabOrderItem>, em?: EntityManager): Promise<LabOrderItem> {
    const repo = em ? em.getRepository(LabOrderItem) : this;
    const item = repo.create(data);
    return repo.save(item);
  }

  createMany(items: Partial<LabOrderItem>[], em?: EntityManager): Promise<LabOrderItem[]> {
    const repo = em ? em.getRepository(LabOrderItem) : this;
    const entities = repo.create(items);
    return repo.save(entities);
  }
}
