import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LabOrderRepository } from '@adapters/repositories/labOrder.repository';
import { LabOrderItemRepository } from '@adapters/repositories/labOrderItem.repository';
import { LabOrderResultRepository } from '@adapters/repositories/labOrderResult.repository';
import { LabOrder } from '@modules/core/entities/labOrder.entity';
import { LabOrderItem } from '@modules/core/entities/labOrderItem.entity';
import { LabOrderResult } from '@modules/core/entities/labOrderResult.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class LabOrderService {
  private readonly logger = new Logger(LabOrderService.name);

  constructor(
    private readonly labOrderRepository: LabOrderRepository,
    private readonly labOrderItemRepository: LabOrderItemRepository,
    private readonly labOrderResultRepository: LabOrderResultRepository,
  ) {}

  createLabOrder(data: Partial<LabOrder>, em?: EntityManager): Promise<LabOrder> {
    return this.labOrderRepository.createLabOrder(data, em);
  }

  getLabOrderOrFail(options: FindResourceOptions<LabOrder>, em?: EntityManager): Promise<LabOrder> {
    return this.labOrderRepository.findOneOrFailIfNotExists(options, em);
  }

  updateLabOrder(
    criteria: { id: string },
    data: Partial<LabOrder>,
    em?: EntityManager,
  ): Promise<LabOrder> {
    return this.labOrderRepository.updateExistingRecord(criteria, data as any, em);
  }

  createLabOrderItems(items: Partial<LabOrderItem>[], em?: EntityManager): Promise<LabOrderItem[]> {
    return this.labOrderItemRepository.createMany(items, em);
  }

  getLabOrderItemOrFail(
    options: FindResourceOptions<LabOrderItem>,
    em?: EntityManager,
  ): Promise<LabOrderItem> {
    return this.labOrderItemRepository.findOneOrFailIfNotExists(options, em);
  }

  createLabResult(data: Partial<LabOrderResult>, em?: EntityManager): Promise<LabOrderResult> {
    return this.labOrderResultRepository.createResult(data, em);
  }

  findSampleQueue(em?: EntityManager): Promise<LabOrder[]> {
    return this.labOrderRepository.findSampleQueue(em);
  }
}
