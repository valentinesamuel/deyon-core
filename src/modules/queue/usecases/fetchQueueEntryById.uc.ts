import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { QueueService } from '../service/queue.service';
import { QueueEntry } from '@modules/core/entities/queueEntry.entity';

type TParams = { id: string };
type TResult = { queueEntry: QueueEntry };

@Injectable()
export class FetchQueueEntryByIdUsecase extends Usecase<TResult, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queueService: QueueService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<TResult> {
    const queueEntry = await this.queueService.getQueueEntryOrFail(
      { where: { id: params.id }, relations: ['patient', 'episode', 'assignedStaff'] },
      _em,
    );
    return { queueEntry };
  }
}
