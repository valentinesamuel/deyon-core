import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { BillItem } from '@modules/core/entities/billItem.entity';

@Injectable()
export class BillItemRepository extends BaseRepository<BillItem> {
  private readonly logger = new Logger(BillItemRepository.name);

  constructor(@InjectRepository(BillItem) private readonly repo: Repository<BillItem>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createMany(items: Partial<BillItem>[], em?: EntityManager): Promise<BillItem[]> {
    const repo = em ? em.getRepository(BillItem) : this;
    const entities = repo.create(items);
    return repo.save(entities);
  }

  findByBillId(billId: string, em?: EntityManager): Promise<BillItem[]> {
    const repo = em ? em.getRepository(BillItem) : this;
    return repo.find({ where: { billId }, relations: { service: true } });
  }
}
