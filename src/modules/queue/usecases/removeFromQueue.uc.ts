import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { QueueService } from '../service/queue.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { QueueEntry, QueueExitReasonEnum } from '@modules/core/entities/queueEntry.entity';

type TParams = { id: string };
type TResult = { queueEntry: QueueEntry };

@Injectable()
export class RemoveFromQueueUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly queueService: QueueService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const { id } = params;
    const queueEntry = await this.queueService.exitQueueEntry(
      id,
      QueueExitReasonEnum.CANCELLED,
      em,
    );

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.QUEUE_PATIENT_REMOVED,
        module: EventModule.QUEUE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { queueEntryId: id },
      },
      em,
    );

    return { queueEntry };
  }
}
