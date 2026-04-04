import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { LabReferralItem } from '@modules/core/entities/labReferralItem.entity';

@Injectable()
export class LabReferralItemRepository extends BaseRepository<LabReferralItem> {
  constructor(
    @InjectRepository(LabReferralItem) private readonly repo: Repository<LabReferralItem>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createMany(items: Partial<LabReferralItem>[], em?: EntityManager): Promise<LabReferralItem[]> {
    const repo = em ? em.getRepository(LabReferralItem) : this;
    const entities = repo.create(items as LabReferralItem[]);
    return repo.save(entities);
  }

  findByReferralId(labReferralId: string, em?: EntityManager): Promise<LabReferralItem[]> {
    const repo = em ? em.getRepository(LabReferralItem) : this;
    return repo.find({ where: { labReferralId } });
  }

  updateItem(
    criteria: { id: string },
    data: Partial<LabReferralItem>,
    em?: EntityManager,
  ): Promise<LabReferralItem> {
    return this.updateExistingRecord(criteria, data as any, em);
  }
}
