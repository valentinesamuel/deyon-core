import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Shift } from '@modules/core/entities/shift.entity';
import { ShiftStatusEnum, ShiftStationEnum } from '@modules/core/entities/shift.entity';

@Injectable()
export class ShiftRepository extends BaseRepository<Shift> {
  constructor(@InjectRepository(Shift) private readonly repo: Repository<Shift>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createShift(data: Partial<Shift>, em?: EntityManager): Promise<Shift> {
    const repo = em ? em.getRepository(Shift) : this;
    const shift = repo.create(data);
    return repo.save(shift);
  }

  findActiveShiftByStaff(staffId: string, em?: EntityManager): Promise<Shift | null> {
    const repo = em ? em.getRepository(Shift) : this;
    return repo.findOne({ where: { staffId, status: ShiftStatusEnum.IN_PROGRESS } });
  }

  countActiveByStation(station: ShiftStationEnum, em?: EntityManager): Promise<number> {
    const repo = em ? em.getRepository(Shift) : this;
    return repo.count({ where: { station, status: ShiftStatusEnum.IN_PROGRESS } });
  }
}
