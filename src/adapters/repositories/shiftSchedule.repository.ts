import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { ShiftSchedule } from '@modules/core/entities/shiftSchedule.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class ShiftScheduleRepository extends BaseRepository<ShiftSchedule> {
  private readonly logger = new Logger(ShiftScheduleRepository.name);

  constructor(@InjectRepository(ShiftSchedule) private readonly repo: Repository<ShiftSchedule>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createShiftSchedule(data: Partial<ShiftSchedule>, em?: EntityManager) {
    const repo = em ? em.getRepository(ShiftSchedule) : this;
    const shiftSchedule = repo.create(data);
    return repo.save(shiftSchedule);
  }

  updateShiftSchedule(
    id: string,
    data: Partial<ShiftSchedule>,
    em?: EntityManager,
  ): Promise<ShiftSchedule> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<ShiftSchedule>,
      data as QueryDeepPartialEntity<ShiftSchedule>,
      entityManager,
    );
  }

  async softDeleteShiftSchedule(id: string, em?: EntityManager): Promise<ShiftSchedule> {
    const entityManager = em ?? this.manager;
    const schedule = await this.findOneOrFailIfNotExists({ where: { id } }, entityManager);
    return entityManager.getRepository(ShiftSchedule).softRemove(schedule);
  }
}
