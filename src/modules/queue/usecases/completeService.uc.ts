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
export class CompleteServiceUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly queueService: QueueService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const { id } = params;

    const existing = await this.queueService.getQueueEntryOrFail({ where: { id } }, em);
    const enteredAt = existing.enteredAt;
    const exitedAt = new Date();
    const totalWaitMinutes = Math.round(
      (exitedAt.getTime() - new Date(enteredAt).getTime()) / 60000,
    );

    const queueEntry = await this.queueService.updateQueueEntry(
      id,
      {
        exitReason: QueueExitReasonEnum.COMPLETED,
        exitedAt,
        totalWaitMinutes,
      } as Partial<QueueEntry>,
      em,
    );

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.QUEUE_SERVICE_COMPLETED,
        module: EventModule.QUEUE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { queueEntryId: id, totalWaitMinutes },
      },
      em,
    );

    return { queueEntry };
  }
}
