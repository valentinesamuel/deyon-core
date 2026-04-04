import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import {
  QueueEntry,
  QueueExitReasonEnum,
  QueueTypeEnum,
} from '@modules/core/entities/queueEntry.entity';

@Injectable()
export class QueueEntryRepository extends BaseRepository<QueueEntry> {
  private readonly logger = new Logger(QueueEntryRepository.name);

  constructor(@InjectRepository(QueueEntry) private readonly repo: Repository<QueueEntry>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createQueueEntry(data: Partial<QueueEntry>, em?: EntityManager): Promise<QueueEntry> {
    const repo = em ? em.getRepository(QueueEntry) : this;
    const entry = repo.create(data);
    return repo.save(entry);
  }

  updateQueueEntry(id: string, data: Partial<QueueEntry>, em?: EntityManager): Promise<QueueEntry> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord({ id }, data as any, entityManager);
  }

  exitQueueEntry(
    id: string,
    exitReason: QueueExitReasonEnum,
    em?: EntityManager,
  ): Promise<QueueEntry> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id },
      { exitReason, exitedAt: new Date() } as any,
      entityManager,
    );
  }

  findActiveByQueueType(queueType: QueueTypeEnum, em?: EntityManager): Promise<QueueEntry[]> {
    const repo = em ? em.getRepository(QueueEntry) : this;
    return repo.find({
      where: { queueType, exitedAt: undefined as any },
      relations: ['patient', 'assignedStaff'],
      order: { priority: 'DESC', enteredAt: 'ASC' },
    });
  }
}
