import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { StockAdjustment } from '@modules/core/entities/stockAdjustment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class StockAdjustmentRepository extends BaseRepository<StockAdjustment> {
  private readonly logger = new Logger(StockAdjustmentRepository.name);

  constructor(
    @InjectRepository(StockAdjustment)
    private readonly repo: Repository<StockAdjustment>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createStockAdjustment(
    data: Partial<StockAdjustment>,
    em?: EntityManager,
  ): Promise<StockAdjustment> {
    const repo = em ? em.getRepository(StockAdjustment) : this;
    const adjustment = repo.create(data);
    return repo.save(adjustment);
  }
}
