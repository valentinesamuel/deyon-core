import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateShiftScheduleDto } from '../dto/createShiftSchedule.dto';
import { ShiftScheduleService } from '../service/shiftSchedule.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { DayOfWeekEnum, ShiftTimeOfDayEnum } from '@modules/core/entities/shiftSchedule.entity';

type TCreateShiftScheduleResult = {
  id: string;
  createdAt: Date;
  timeOfDay: ShiftTimeOfDayEnum;
  startTime: string;
  endTime: string;
  day: DayOfWeekEnum;
};

@Injectable()
export class CreateShiftScheduleUsecase extends Usecase<
  TCreateShiftScheduleResult,
  CreateShiftScheduleDto
> {
  constructor(
    private readonly shiftScheduleService: ShiftScheduleService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: CreateShiftScheduleDto,
  ): Promise<TCreateShiftScheduleResult> {
    const newSchedule = await this.shiftScheduleService.createShiftSchedule(
      {
        timeOfDay: params.timeOfDay,
        startTime: params.startTime,
        endTime: params.endTime,
        day: params.day,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.SHIFT_SCHEDULE_CREATED,
        module: EventModule.SHIFT_SCHEDULE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          timeOfDay: params.timeOfDay,
          startTime: params.startTime,
          endTime: params.endTime,
          day: params.day,
        },
      },
      em,
    );

    return {
      id: newSchedule.id,
      createdAt: newSchedule.createdAt,
      timeOfDay: newSchedule.timeOfDay,
      startTime: newSchedule.startTime,
      endTime: newSchedule.endTime,
      day: newSchedule.day,
    };
  }
}
