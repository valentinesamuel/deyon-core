import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { LabOrderService } from '../service/labOrder.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { LabOrder } from '@modules/core/entities/labOrder.entity';
import { LabOrderStatusEnum } from '@modules/core/entities/labOrder.enums';

type TParams = { id: string };
type TResult = { labOrder: LabOrder };

@Injectable()
export class CollectSampleUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly labOrderService: LabOrderService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const existing = await this.labOrderService.getLabOrderOrFail({ where: { id: params.id } }, em);

    if (existing.status !== LabOrderStatusEnum.PENDING) {
      throw new BadRequestException(
        `Cannot collect sample for lab order in status '${existing.status}'.`,
      );
    }

    const labOrder = await this.labOrderService.updateLabOrder(
      { id: params.id },
      { status: LabOrderStatusEnum.COLLECTED, collectedAt: new Date() },
      em,
    );

    await this.eventService.log(
      {
        actorId: this.requestContextService.getUserId(),
        event: EventType.LAB_SAMPLE_COLLECTED,
        module: EventModule.LAB_ORDER,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { labOrderId: params.id },
      },
      em,
    );

    return { labOrder };
  }
}
