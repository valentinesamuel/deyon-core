import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { StockRequestsService } from '../service/stockRequests.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import {
  RestockRequest,
  RestockRequestStatusEnum,
  RestockRequestUrgencyEnum,
} from '@modules/core/entities/restockRequest.entity';
import { CreateStockRequestDto } from '../dto/createStockRequest.dto';

type TResult = { stockRequest: RestockRequest };

@Injectable()
export class CreateStockRequestUsecase extends Usecase<TResult, CreateStockRequestDto> {
  constructor(
    private readonly stockRequestsService: StockRequestsService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: CreateStockRequestDto): Promise<TResult> {
    const staffId = this.requestContextService.getUserId();

    const stockRequest = await this.stockRequestsService.createRequest(
      {
        urgency: params.urgency ?? RestockRequestUrgencyEnum.NORMAL,
        reason: params.reason,
        requestedBy: staffId,
        status: RestockRequestStatusEnum.PENDING,
        notes: params.notes,
      },
      em,
    );

    await this.stockRequestsService.createItems(
      params.items.map((item) => ({
        restockRequestId: stockRequest.id,
        inventoryId: item.inventoryId,
        requestedQuantity: item.requestedQuantity,
      })),
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.STOCK_REQUEST_CREATED,
        module: EventModule.STOCK_REQUEST,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { stockRequestId: stockRequest.id, urgency: stockRequest.urgency },
      },
      em,
    );

    return { stockRequest };
  }
}
