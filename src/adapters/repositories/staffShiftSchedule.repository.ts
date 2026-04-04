import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { StaffShiftSchedule } from '@modules/core/entities/staffShiftSchedule.entity';

@Injectable()
export class StaffShiftScheduleRepository extends BaseRepository<StaffShiftSchedule> {
  private readonly logger = new Logger(StaffShiftScheduleRepository.name);

  constructor(
    @InjectRepository(StaffShiftSchedule)
    private readonly repo: Repository<StaffShiftSchedule>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createAssignment(
    data: Partial<StaffShiftSchedule>,
    em?: EntityManager,
  ): Promise<StaffShiftSchedule> {
    const repo = em ? em.getRepository(StaffShiftSchedule) : this;
    const assignment = repo.create(data);
    return repo.save(assignment);
  }

  findByRosterId(rosterId: string, em?: EntityManager): Promise<StaffShiftSchedule[]> {
    const repo = em ? em.getRepository(StaffShiftSchedule) : this;
    return repo.find({ where: { rosterId }, relations: ['staff', 'shiftSchedule'] });
  }

  async softDeleteAssignment(id: string, em?: EntityManager): Promise<StaffShiftSchedule> {
    const entityManager = em ?? this.manager;
    const assignment = await this.findOneOrFailIfNotExists({ where: { id } }, entityManager);
    return entityManager.getRepository(StaffShiftSchedule).softRemove(assignment);
  }
}
