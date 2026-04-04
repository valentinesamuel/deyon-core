import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { StockRequestsService } from '../service/stockRequests.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import {
  RestockRequest,
  RestockRequestStatusEnum,
} from '@modules/core/entities/restockRequest.entity';
import { RejectStockRequestDto } from '../dto/rejectStockRequest.dto';

type TParams = { id: string } & RejectStockRequestDto;
type TResult = { stockRequest: RestockRequest };

@Injectable()
export class RejectStockRequestUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly stockRequestsService: StockRequestsService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const existing = await this.stockRequestsService.getRequestOrFail(
      { where: { id: params.id } },
      em,
    );

    if (
      existing.status !== RestockRequestStatusEnum.PENDING &&
      existing.status !== RestockRequestStatusEnum.INFO_REQUESTED
    ) {
      throw new BadRequestException(`Cannot reject request in status '${existing.status}'.`);
    }

    const staffId = this.requestContextService.getUserId();

    const stockRequest = await this.stockRequestsService.updateRequest(
      { id: params.id },
      { status: RestockRequestStatusEnum.REJECTED, notes: params.reason },
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.STOCK_REQUEST_REJECTED,
        module: EventModule.STOCK_REQUEST,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { stockRequestId: params.id, reason: params.reason },
      },
      em,
    );

    return { stockRequest };
  }
}
