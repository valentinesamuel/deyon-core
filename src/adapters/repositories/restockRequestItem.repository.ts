import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { RestockRequestItem } from '@modules/core/entities/restockRequestItem.entity';

@Injectable()
export class RestockRequestItemRepository extends BaseRepository<RestockRequestItem> {
  constructor(
    @InjectRepository(RestockRequestItem)
    private readonly repo: Repository<RestockRequestItem>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createMany(
    items: Partial<RestockRequestItem>[],
    em?: EntityManager,
  ): Promise<RestockRequestItem[]> {
    const repo = em ? em.getRepository(RestockRequestItem) : this;
    const entities = repo.create(items as RestockRequestItem[]);
    return repo.save(entities);
  }

  findByRequestId(restockRequestId: string, em?: EntityManager): Promise<RestockRequestItem[]> {
    const repo = em ? em.getRepository(RestockRequestItem) : this;
    return repo.find({ where: { restockRequestId } });
  }
}
