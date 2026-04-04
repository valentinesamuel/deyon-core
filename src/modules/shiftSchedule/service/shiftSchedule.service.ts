import { ShiftScheduleRepository } from '@adapters/repositories/shiftSchedule.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ShiftSchedule } from '@modules/core/entities/shiftSchedule.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class ShiftScheduleService {
  private readonly logger = new Logger(ShiftScheduleService.name);

  constructor(private readonly shiftScheduleRepository: ShiftScheduleRepository) {}

  async createShiftSchedule(data: Partial<ShiftSchedule>, em?: EntityManager) {
    return this.shiftScheduleRepository.createShiftSchedule(data, em);
  }

  async getShiftScheduleByDataOrFailIfNotExists(
    data: FindResourceOptions<ShiftSchedule>,
    em?: EntityManager,
  ) {
    return this.shiftScheduleRepository.findOneOrFailIfNotExists(data, em);
  }

  async updateShiftSchedule(id: string, data: Partial<ShiftSchedule>, em?: EntityManager) {
    return this.shiftScheduleRepository.updateShiftSchedule(id, data, em);
  }

  async softDeleteShiftSchedule(id: string, em?: EntityManager) {
    return this.shiftScheduleRepository.softDeleteShiftSchedule(id, em);
  }
}
