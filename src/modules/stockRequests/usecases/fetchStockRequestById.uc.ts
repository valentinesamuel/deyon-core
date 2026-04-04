import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { StockRequestsService } from '../service/stockRequests.service';
import { RestockRequest } from '@modules/core/entities/restockRequest.entity';

type TParams = { id: string };
type TResult = { stockRequest: RestockRequest };

@Injectable()
export class FetchStockRequestByIdUsecase extends Usecase<TResult, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly stockRequestsService: StockRequestsService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<TResult> {
    const stockRequest = await this.stockRequestsService.getRequestOrFail({
      where: { id: params.id },
      relations: { requestedByStaff: true, items: true },
    });
    return { stockRequest };
  }
}
