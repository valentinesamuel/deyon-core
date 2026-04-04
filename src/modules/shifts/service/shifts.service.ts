import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ShiftRepository } from '@adapters/repositories/shift.repository';
import { Shift, ShiftStationEnum } from '@modules/core/entities/shift.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class ShiftsService {
  private readonly logger = new Logger(ShiftsService.name);

  constructor(private readonly shiftRepository: ShiftRepository) {}

  createShift(data: Partial<Shift>, em?: EntityManager): Promise<Shift> {
    return this.shiftRepository.createShift(data, em);
  }

  getShiftOrFail(options: FindResourceOptions<Shift>, em?: EntityManager): Promise<Shift> {
    return this.shiftRepository.findOneOrFailIfNotExists(options, em);
  }

  updateShift(criteria: { id: string }, data: Partial<Shift>, em?: EntityManager): Promise<Shift> {
    return this.shiftRepository.updateExistingRecord(criteria, data as any, em);
  }

  findActiveShiftByStaff(staffId: string, em?: EntityManager): Promise<Shift | null> {
    return this.shiftRepository.findActiveShiftByStaff(staffId, em);
  }

  countActiveByStation(station: ShiftStationEnum, em?: EntityManager): Promise<number> {
    return this.shiftRepository.countActiveByStation(station, em);
  }
}
