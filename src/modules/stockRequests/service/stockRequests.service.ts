import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { RestockRequestRepository } from '@adapters/repositories/restockRequest.repository';
import { RestockRequestItemRepository } from '@adapters/repositories/restockRequestItem.repository';
import { RestockRequest } from '@modules/core/entities/restockRequest.entity';
import { RestockRequestItem } from '@modules/core/entities/restockRequestItem.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class StockRequestsService {
  private readonly logger = new Logger(StockRequestsService.name);

  constructor(
    private readonly restockRequestRepository: RestockRequestRepository,
    private readonly restockRequestItemRepository: RestockRequestItemRepository,
  ) {}

  createRequest(data: Partial<RestockRequest>, em?: EntityManager): Promise<RestockRequest> {
    return this.restockRequestRepository.createRequest(data, em);
  }

  getRequestOrFail(
    options: FindResourceOptions<RestockRequest>,
    em?: EntityManager,
  ): Promise<RestockRequest> {
    return this.restockRequestRepository.findOneOrFailIfNotExists(options, em);
  }

  updateRequest(
    criteria: { id: string },
    data: Partial<RestockRequest>,
    em?: EntityManager,
  ): Promise<RestockRequest> {
    return this.restockRequestRepository.updateExistingRecord(criteria, data as any, em);
  }

  createItems(
    items: Partial<RestockRequestItem>[],
    em?: EntityManager,
  ): Promise<RestockRequestItem[]> {
    return this.restockRequestItemRepository.createMany(items, em);
  }

  updateItem(
    criteria: { id: string },
    data: Partial<RestockRequestItem>,
    em?: EntityManager,
  ): Promise<RestockRequestItem> {
    return this.restockRequestItemRepository.updateExistingRecord(criteria, data as any, em);
  }

  findItemsByRequestId(
    restockRequestId: string,
    em?: EntityManager,
  ): Promise<RestockRequestItem[]> {
    return this.restockRequestItemRepository.findByRequestId(restockRequestId, em);
  }
}
