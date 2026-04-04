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
import { ApproveStockRequestDto } from '../dto/approveStockRequest.dto';

type TParams = { id: string } & ApproveStockRequestDto;
type TResult = { stockRequest: RestockRequest };

@Injectable()
export class ApproveStockRequestUsecase extends Usecase<TResult, TParams> {
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
      throw new BadRequestException(`Cannot approve request in status '${existing.status}'.`);
    }

    const staffId = this.requestContextService.getUserId();

    // Update each approved item quantity
    await Promise.all(
      params.approvals.map((approval) =>
        this.stockRequestsService.updateItem(
          { id: approval.itemId },
          { approvedQuantity: approval.approvedQuantity },
          em,
        ),
      ),
    );

    const allApproved = params.approvals.every((a) => a.approvedQuantity > 0);
    const anyApproved = params.approvals.some((a) => a.approvedQuantity > 0);
    const newStatus = allApproved
      ? RestockRequestStatusEnum.APPROVED
      : anyApproved
        ? RestockRequestStatusEnum.PARTIALLY_APPROVED
        : RestockRequestStatusEnum.REJECTED;

    const stockRequest = await this.stockRequestsService.updateRequest(
      { id: params.id },
      { status: newStatus, notes: params.notes ?? existing.notes },
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.STOCK_REQUEST_APPROVED,
        module: EventModule.STOCK_REQUEST,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { stockRequestId: params.id, status: newStatus },
      },
      em,
    );

    return { stockRequest };
  }
}
