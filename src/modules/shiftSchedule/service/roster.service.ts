import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { RosterRepository } from '@adapters/repositories/roster.repository';
import { StaffShiftScheduleRepository } from '@adapters/repositories/staffShiftSchedule.repository';
import { Roster } from '@modules/core/entities/roster.entity';
import { StaffShiftSchedule } from '@modules/core/entities/staffShiftSchedule.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class RosterService {
  private readonly logger = new Logger(RosterService.name);

  constructor(
    private readonly rosterRepository: RosterRepository,
    private readonly staffShiftScheduleRepository: StaffShiftScheduleRepository,
  ) {}

  createRoster(data: Partial<Roster>, em?: EntityManager) {
    return this.rosterRepository.createRoster(data, em);
  }

  getRosterOrFail(options: FindResourceOptions<Roster>, em?: EntityManager) {
    return this.rosterRepository.findOneOrFailIfNotExists(options, em);
  }

  updateRoster(id: string, data: Partial<Roster>, em?: EntityManager) {
    return this.rosterRepository.updateRoster(id, data, em);
  }

  publishRoster(id: string, publishedById: string, em?: EntityManager) {
    return this.rosterRepository.publishRoster(id, publishedById, em);
  }

  softDeleteRoster(id: string, em?: EntityManager) {
    return this.rosterRepository.softDeleteRoster(id, em);
  }

  addAssignment(data: Partial<StaffShiftSchedule>, em?: EntityManager) {
    return this.staffShiftScheduleRepository.createAssignment(data, em);
  }

  getAssignmentOrFail(id: string, rosterId: string, em?: EntityManager) {
    return this.staffShiftScheduleRepository.findOneOrFailIfNotExists(
      { where: { id, rosterId } },
      em,
    );
  }

  removeAssignment(id: string, em?: EntityManager) {
    return this.staffShiftScheduleRepository.softDeleteAssignment(id, em);
  }

  findAssignmentsByRoster(rosterId: string, em?: EntityManager) {
    return this.staffShiftScheduleRepository.findByRosterId(rosterId, em);
  }
}
