import { StockAdjustmentRepository } from '@adapters/repositories/stockAdjustment.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { StockAdjustment } from '@modules/core/entities/stockAdjustment.entity';

@Injectable()
export class StockAdjustmentService {
  private readonly logger = new Logger(StockAdjustmentService.name);

  constructor(private readonly stockAdjustmentRepository: StockAdjustmentRepository) {}

  async createStockAdjustment(data: Partial<StockAdjustment>, em?: EntityManager) {
    return this.stockAdjustmentRepository.createStockAdjustment(data, em);
  }
}
