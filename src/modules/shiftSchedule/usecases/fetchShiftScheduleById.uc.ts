import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ShiftScheduleService } from '../service/shiftSchedule.service';
import { DayOfWeekEnum, ShiftTimeOfDayEnum } from '@modules/core/entities/shiftSchedule.entity';

type TGetShiftScheduleResult = {
  shiftSchedule: {
    id: string;
    createdAt: Date;
    timeOfDay: ShiftTimeOfDayEnum;
    startTime: string;
    endTime: string;
    day: DayOfWeekEnum;
  };
};

type TGetShiftScheduleByIdParams = { id: string };

@Injectable()
export class FetchShiftScheduleByIdUsecase extends Usecase<
  TGetShiftScheduleResult,
  TGetShiftScheduleByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly shiftScheduleService: ShiftScheduleService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TGetShiftScheduleByIdParams,
  ): Promise<TGetShiftScheduleResult> {
    const schedule = await this.shiftScheduleService.getShiftScheduleByDataOrFailIfNotExists(
      {
        where: {
          id: params.id,
        },
        select: {
          id: true,
          createdAt: true,
          timeOfDay: true,
          startTime: true,
          endTime: true,
          day: true,
        },
      },
      em,
    );

    return {
      shiftSchedule: {
        id: schedule.id,
        createdAt: schedule.createdAt,
        timeOfDay: schedule.timeOfDay,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        day: schedule.day,
      },
    };
  }
}
