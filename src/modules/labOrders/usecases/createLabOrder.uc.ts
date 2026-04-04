import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateLabOrderDto } from '../dto/createLabOrder.dto';
import { LabOrderService } from '../service/labOrder.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { LabOrder } from '@modules/core/entities/labOrder.entity';
import { LabOrderStatusEnum } from '@modules/core/entities/labOrder.enums';
import { LabPriorityEnum } from '@modules/core/entities/labOrder.entity';

type TResult = { labOrder: LabOrder };

@Injectable()
export class CreateLabOrderUsecase extends Usecase<TResult, CreateLabOrderDto> {
  constructor(
    private readonly labOrderService: LabOrderService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: CreateLabOrderDto): Promise<TResult> {
    const labOrder = await this.labOrderService.createLabOrder(
      {
        patientId: params.patientId,
        doctorId: params.doctorId,
        episodeId: params.episodeId,
        encounterId: params.encounterId,
        type: params.type,
        status: LabOrderStatusEnum.PENDING,
        priority: params.priority ?? LabPriorityEnum.ROUTINE,
      },
      em,
    );

    await this.labOrderService.createLabOrderItems(
      params.items.map((item) => ({
        labOrderId: labOrder.id,
        serviceCodeId: item.serviceCodeId,
        status: LabOrderStatusEnum.PENDING,
      })),
      em,
    );

    await this.eventService.log(
      {
        actorId: this.requestContextService.getUserId(),
        event: EventType.LAB_ORDER_CREATED,
        module: EventModule.LAB_ORDER,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { labOrderId: labOrder.id, patientId: params.patientId },
      },
      em,
    );

    return { labOrder };
  }
}
