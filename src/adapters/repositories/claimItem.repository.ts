import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { ClaimItem } from '@modules/core/entities/claimItem.entity';

@Injectable()
export class ClaimItemRepository extends BaseRepository<ClaimItem> {
  constructor(@InjectRepository(ClaimItem) private readonly repo: Repository<ClaimItem>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createMany(items: Partial<ClaimItem>[], em?: EntityManager): Promise<ClaimItem[]> {
    const repo = em ? em.getRepository(ClaimItem) : this;
    const entities = repo.create(items as ClaimItem[]);
    return repo.save(entities);
  }

  findByClaimId(claimId: string, em?: EntityManager): Promise<ClaimItem[]> {
    const repo = em ? em.getRepository(ClaimItem) : this;
    return repo.find({ where: { claimId } });
  }
}
