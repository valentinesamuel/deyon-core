import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AddToQueueDto } from '../dto/addToQueue.dto';
import { QueueService } from '../service/queue.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import {
  QueueEntry,
  QueuePaymentStatusEnum,
  QueuePriorityEnum,
} from '@modules/core/entities/queueEntry.entity';

type TAddToQueueResult = { queueEntry: QueueEntry };

@Injectable()
export class AddToQueueUsecase extends Usecase<TAddToQueueResult, AddToQueueDto> {
  constructor(
    private readonly queueService: QueueService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: AddToQueueDto): Promise<TAddToQueueResult> {
    const queueEntry = await this.queueService.createQueueEntry(
      {
        ...params,
        priority: params.priority ?? QueuePriorityEnum.NORMAL,
        paymentStatus: QueuePaymentStatusEnum.PENDING,
        enteredAt: new Date(),
      } as Partial<QueueEntry>,
      em,
    );

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.QUEUE_PATIENT_ADDED,
        module: EventModule.QUEUE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          queueEntryId: queueEntry.id,
          patientId: params.patientId,
          queueType: params.queueType,
        },
      },
      em,
    );

    return { queueEntry };
  }
}
