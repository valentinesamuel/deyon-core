import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { QueueEntryRepository } from '@adapters/repositories/queueEntry.repository';
import {
  QueueEntry,
  QueueExitReasonEnum,
  QueueTypeEnum,
} from '@modules/core/entities/queueEntry.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(private readonly queueEntryRepository: QueueEntryRepository) {}

  createQueueEntry(data: Partial<QueueEntry>, em?: EntityManager) {
    return this.queueEntryRepository.createQueueEntry(data, em);
  }

  getQueueEntryOrFail(options: FindResourceOptions<QueueEntry>, em?: EntityManager) {
    return this.queueEntryRepository.findOneOrFailIfNotExists(options, em);
  }

  updateQueueEntry(id: string, data: Partial<QueueEntry>, em?: EntityManager) {
    return this.queueEntryRepository.updateQueueEntry(id, data, em);
  }

  exitQueueEntry(id: string, exitReason: QueueExitReasonEnum, em?: EntityManager) {
    return this.queueEntryRepository.exitQueueEntry(id, exitReason, em);
  }

  findActiveByType(queueType: QueueTypeEnum, em?: EntityManager) {
    return this.queueEntryRepository.findActiveByQueueType(queueType, em);
  }
}
